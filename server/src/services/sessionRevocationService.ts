import crypto from 'crypto';
import { supabase } from '../lib/supabase.js';
import { redisClient } from '../lib/rateLimiter.js';

// Fast in-memory cache of revoked token hashes: Map<tokenHash, expiresAtMs>
const revokedTokenMemoryCache = new Map<string, number>();

// In-memory cache of user-level revocation timestamps: Map<userId, revokedBeforeMs>
const userRevocationTimestamps = new Map<string, number>();

let dbTableExists = true;

/**
 * Periodically purge expired tokens from in-memory cache to prevent memory leaks.
 */
setInterval(() => {
  const now = Date.now();
  for (const [hash, expiresAt] of revokedTokenMemoryCache.entries()) {
    if (expiresAt <= now) {
      revokedTokenMemoryCache.delete(hash);
    }
  }
}, 10 * 60 * 1000).unref();

/**
 * Computes a standard SHA-256 hash of a JWT string.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Revokes a specific JWT token (e.g. on user logout).
 */
export async function revokeToken(token: string, userId?: string, expUnixSeconds?: number): Promise<void> {
  const tokenHash = hashToken(token);
  const expiresAtMs = expUnixSeconds ? expUnixSeconds * 1000 : Date.now() + 7 * 24 * 60 * 60 * 1000;

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
 * Checks if a JWT token has been revoked.
 */
export async function isTokenRevoked(token: string, userId?: string, issuedAtUnixSeconds?: number): Promise<boolean> {
  const tokenHash = hashToken(token);
  const now = Date.now();

  // 1. Check user-level revocation timestamp (e.g. password reset / logout all devices)
  if (userId && issuedAtUnixSeconds) {
    const userRevokedBefore = userRevocationTimestamps.get(userId);
    if (userRevokedBefore && issuedAtUnixSeconds * 1000 < userRevokedBefore) {
      return true;
    }
  }

  // 2. Check in-memory cache
  const memoryExp = revokedTokenMemoryCache.get(tokenHash);
  if (memoryExp) {
    if (memoryExp > now) {
      return true;
    } else {
      revokedTokenMemoryCache.delete(tokenHash);
    }
  }

  // 3. Check Redis if available
  if (redisClient) {
    try {
      const exists = await redisClient.get(`revoked_jwt:${tokenHash}`);
      if (exists) return true;
    } catch (err) {
      console.warn('[SessionRevocation] Redis check failed:', err);
    }
  }

  // 4. Check Supabase DB
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
  if (redisClient) {
    try {
      await redisClient.set(`revoked_user:${userId}`, Date.now().toString(), 'EX', 7 * 24 * 60 * 60);
    } catch (err) {
      console.warn('[SessionRevocation] Redis user revocation failed:', err);
    }
  }
}
