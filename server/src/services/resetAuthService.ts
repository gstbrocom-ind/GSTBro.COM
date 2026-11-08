import crypto from 'node:crypto';
import { supabase } from '../lib/supabase.js';
import { logAuthAudit } from './auditLogger.js';

const RESET_TOKEN_EXPIRY_MINUTES = 15;

export interface ResetAuthorization {
  id: string;
  tokenHash: string;
  userId: string;
  userEmail: string;
  verifiedVia: 'MOBILE_OTP' | 'EMAIL_OTP';
  purpose: string;
  used: boolean;
  expiresAt: Date;
  createdAt: Date;
}

// In-memory fallback in case DB table is not yet migrated in Supabase
const memoryResetAuthStore = new Map<string, ResetAuthorization>();

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Creates a single-use, short-lived (15 minutes) password reset authorization.
 * Returns the plaintext reset token to return to the client.
 */
export async function createResetAuthorization(
  userId: string,
  userEmail: string,
  verifiedVia: 'MOBILE_OTP' | 'EMAIL_OTP',
  ipAddress?: string
): Promise<{ resetToken: string; expiresAt: Date }> {
  const resetToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(resetToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

  const authRecord: ResetAuthorization = {
    id: crypto.randomUUID(),
    tokenHash,
    userId,
    userEmail,
    verifiedVia,
    purpose: 'PASSWORD_RESET',
    used: false,
    expiresAt,
    createdAt: new Date(),
  };

  // Always keep in memory store as fast buffer / fallback
  memoryResetAuthStore.set(tokenHash, authRecord);

  // Clean old memory tokens
  const now = Date.now();
  for (const [hash, item] of memoryResetAuthStore.entries()) {
    if (item.expiresAt.getTime() < now || item.used) {
      memoryResetAuthStore.delete(hash);
    }
  }

  // Attempt DB persistence
  try {
    await supabase.from('password_reset_authorizations').insert({
      id: authRecord.id,
      token_hash: tokenHash,
      user_id: userId,
      verified_via: verifiedVia,
      purpose: 'PASSWORD_RESET',
      used: false,
      expires_at: expiresAt.toISOString(),
    });
  } catch (err) {
    console.warn('Could not persist reset authorization to DB, using secure memory store fallback:', err);
  }

  await logAuthAudit({
    eventType: 'PASSWORD_RESET_VERIFIED',
    userId,
    identifier: userEmail,
    ipAddress,
    metadata: { verifiedVia, expiresInMinutes: RESET_TOKEN_EXPIRY_MINUTES },
  });

  return { resetToken, expiresAt };
}

/**
 * Validates and consumes the single-use reset authorization token.
 * Immediately invalidates the token upon consumption.
 */
export async function consumeResetAuthorization(
  resetToken: string,
  ipAddress?: string
): Promise<{ valid: boolean; userId?: string; userEmail?: string; message: string }> {
  if (!resetToken || typeof resetToken !== 'string') {
    return { valid: false, message: 'Missing reset authorization token' };
  }

  const tokenHash = hashToken(resetToken);
  const now = new Date();

  // 1. Try DB lookup first
  try {
    const { data: record, error } = await supabase
      .from('password_reset_authorizations')
      .select('id, user_id, used, expires_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (!error && record) {
      if (record.used) {
        return { valid: false, message: 'Password reset link has already been used. Please request a new one.' };
      }
      if (new Date(record.expires_at) < now) {
        return { valid: false, message: 'Password reset authorization has expired. Please request a new code.' };
      }

      // Invalidate immediately (single-use)
      await supabase.from('password_reset_authorizations').update({ used: true }).eq('id', record.id);
      const mem = memoryResetAuthStore.get(tokenHash);
      if (mem) mem.used = true;

      return { valid: true, userId: record.user_id, message: 'Authorization verified' };
    }
  } catch (err) {
    console.warn('DB query error on reset auth, checking memory fallback:', err);
  }

  // 2. Check memory store fallback
  const memoryRecord = memoryResetAuthStore.get(tokenHash);
  if (!memoryRecord) {
    return { valid: false, message: 'Invalid or expired password reset authorization' };
  }

  if (memoryRecord.used) {
    return { valid: false, message: 'Password reset link has already been used. Please request a new one.' };
  }

  if (memoryRecord.expiresAt < now) {
    memoryResetAuthStore.delete(tokenHash);
    return { valid: false, message: 'Password reset authorization has expired. Please request a new code.' };
  }

  // Mark used (keep record so subsequent attempts detect it was already used)
  memoryRecord.used = true;

  await logAuthAudit({
    eventType: 'PASSWORD_RESET_COMPLETED',
    userId: memoryRecord.userId,
    identifier: memoryRecord.userEmail,
    ipAddress,
  });

  return {
    valid: true,
    userId: memoryRecord.userId,
    userEmail: memoryRecord.userEmail,
    message: 'Authorization verified',
  };
}
