import crypto from 'crypto';
import { supabase } from '../lib/supabase.js';
import { redisClient } from '../lib/rateLimiter.js';

// Fast in-memory cache of revoked token hashes: Map<tokenHash, expiresAtMs>
const revokedTokenMemoryCache = new Map<string, number>();

// In-memory cache of user-level revocation timestamps: Map<userId, revokedBeforeMs>
const userRevocationTimestamps = new Map<string, number>();

// In-memory cache of active single-device session per user: Map<userId, { sid: string, setAt: number }>
const activeUserSessionCache = new Map<string, { sid: string; setAt: number }>();

let dbTableExists = true;

/**
 * Periodically purge expired tokens from in-memory cache to prevent memory leaks.
 */
const purgeTimer: NodeJS.Timeout = setInterval(() => {
  const now = Date.now();
  for (const [hash, expiresAt] of revokedTokenMemoryCache.entries()) {
    if (expiresAt <= now) {
      revokedTokenMemoryCache.delete(hash);
    }
  }
}, 10 * 60 * 1000);
purgeTimer.unref();

/**
 * Computes a standard SHA-256 hash of a JWT string.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Sets the single active session ID for a user.
 * Any previous active session on another device is immediately superseded.
 */
export async function setActiveUserSession(userId: string, sid: string): Promise<void> {
  const now = Date.now();
  // 1. High-speed in-memory store
  activeUserSessionCache.set(userId, { sid, setAt: now });

  // 2. Redis distributed store if available
  if (redisClient) {
    try {
      await redisClient.set(`active_session:${userId}`, sid, 'EX', 30 * 24 * 60 * 60);
    } catch (err) {
      console.warn('[SessionRevocation] Redis active session write failed:', err);
    }
  }

  // 3. Supabase database persistence for survival across restarts
  try {
    await supabase.from('site_settings').upsert({
      key: `active_session_${userId}`,
      value: sid,
    });
  } catch (err) {
    console.warn('[SessionRevocation] DB active session upsert failed:', err);
  }
}

/**
 * Retrieves the currently active session ID for a user.
 */
export async function getActiveUserSession(userId: string): Promise<string | null> {
  // 1. In-memory
  const cached = activeUserSessionCache.get(userId);
  if (cached) return cached.sid;

  // 2. Redis
  if (redisClient) {
    try {
      const redisSid = await redisClient.get(`active_session:${userId}`);
      if (redisSid) {
        activeUserSessionCache.set(userId, { sid: redisSid, setAt: Date.now() });
        return redisSid;
      }
    } catch (err) {
      console.warn('[SessionRevocation] Redis active session get failed:', err);
    }
  }

  // 3. Supabase
  try {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', `active_session_${userId}`)
      .maybeSingle();

    if (data?.value) {
      activeUserSessionCache.set(userId, { sid: data.value, setAt: Date.now() });
      return data.value;
    }
  } catch (err) {
    console.warn('[SessionRevocation] DB active session read failed:', err);
  }

  return null;
}

/**
 * Clears the active session for a user (e.g. on manual personal logout).
 */
export async function clearActiveUserSession(userId: string): Promise<void> {
  activeUserSessionCache.delete(userId);
  if (redisClient) {
    try {
      await redisClient.del(`active_session:${userId}`);
    } catch {}
  }
  try {
    await supabase.from('site_settings').delete().eq('key', `active_session_${userId}`);
  } catch {}
}

/**
 * Revokes a specific JWT token (e.g. on user logout).
 */
export async function revokeToken(token: string, userId?: string, expUnixSeconds?: number): Promise<void> {
  const tokenHash = hashToken(token);
  const expiresAtMs = expUnixSeconds ? expUnixSeconds * 1000 : Date.now() + 30 * 24 * 60 * 60 * 1000;

  // 1. Store in memory
  revokedTokenMemoryCache.set(tokenHash, expiresAtMs);

  // 2. Store in Redis if available
  if (redisClient) {
    try {
      const ttlSeconds = Math.max(1, Math.ceil((expiresAtMs - Date.now()) / 1000));
      await redisClient.set(`revoked_jwt:${tokenHash}`, '1', 'EX', ttlSeconds);
    } catch (err) {
      console.warn('[SessionRevocation] Redis write failed:', err);
    }
  }

  // 3. Persist to Supabase revoked_tokens table if available
  if (dbTableExists) {
    try {
      const expiresAtIso = new Date(expiresAtMs).toISOString();
      const { error } = await supabase.from('revoked_tokens').insert({
        token_hash: tokenHash,
        user_id: userId || null,
        expires_at: expiresAtIso,
      });

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          dbTableExists = false;
          console.info('[SessionRevocation] revoked_tokens table pending migration; operating via high-speed memory/Redis store.');
        } else if (error.code !== '23505') { // Ignore unique constraint violation
          console.warn('[SessionRevocation] DB insert warning:', error.message);
        }
      }
    } catch (err) {
      console.warn('[SessionRevocation] DB error:', err);
    }
  }
}

/**
 * Checks if a JWT token has been revoked, either specifically or because
 * a newer session was established on another device (Single Active Device Policy).
 */
export async function isTokenRevoked(
  token: string,
  userId?: string,
  issuedAtUnixSeconds?: number,
  tokenSid?: string
): Promise<boolean> {
  const tokenHash = hashToken(token);
  const now = Date.now();

  // 1. Single Active Device Policy enforcement:
  // If the token carries a session ID (sid), verify it matches the currently active session.
  // If another device logged in, activeSid was updated, meaning this token is superseded.
  if (userId && tokenSid) {
    const activeSid = await getActiveUserSession(userId);
    if (activeSid && activeSid !== tokenSid) {
      return true; // Revoked because another device logged in
    }
  }

  // 2. Check user-level revocation timestamp (e.g. password reset / logout all devices)
  if (userId && issuedAtUnixSeconds) {
    const userRevokedBefore = userRevocationTimestamps.get(userId);
    if (userRevokedBefore && issuedAtUnixSeconds * 1000 < userRevokedBefore) {
      return true;
    }
  }

  // 3. Check specific token revocation in memory
  const memoryExp = revokedTokenMemoryCache.get(tokenHash);
  if (memoryExp) {
    if (memoryExp > now) {
      return true;
    } else {
      revokedTokenMemoryCache.delete(tokenHash);
    }
  }

  // 4. Check Redis if available
  if (redisClient) {
    try {
      const exists = await redisClient.get(`revoked_jwt:${tokenHash}`);
      if (exists) return true;
    } catch (err) {
      console.warn('[SessionRevocation] Redis check failed:', err);
    }
  }

  // 5. Check Supabase DB
  if (dbTableExists) {
    try {
      const { data, error } = await supabase
        .from('revoked_tokens')
        .select('id, expires_at')
        .eq('token_hash', tokenHash)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          dbTableExists = false;
        }
      } else if (data) {
        const expMs = new Date(data.expires_at).getTime();
        if (expMs > now) {
          revokedTokenMemoryCache.set(tokenHash, expMs);
          return true;
        }
      }
    } catch {
      // Fallback gracefully
    }
  }

  return false;
}

/**
 * Revokes all sessions for a specific user (e.g. after password change).
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  userRevocationTimestamps.set(userId, Date.now());
  activeUserSessionCache.delete(userId);
  if (redisClient) {
    try {
      await redisClient.set(`revoked_user:${userId}`, Date.now().toString(), 'EX', 30 * 24 * 60 * 60);
      await redisClient.del(`active_session:${userId}`);
    } catch (err) {
      console.warn('[SessionRevocation] Redis user revocation failed:', err);
    }
  }
  try {
    await supabase.from('site_settings').delete().eq('key', `active_session_${userId}`);
  } catch {}
}
