import { supabase } from '../lib/supabase.js';

export type AuthAuditEvent =
  | 'SIGNUP_STARTED'
  | 'MOBILE_OTP_REQUESTED'
  | 'MOBILE_OTP_VERIFIED'
  | 'MOBILE_OTP_FAILED'
  | 'MOBILE_OTP_EXPIRED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_VERIFIED'
  | 'PASSWORD_RESET_COMPLETED'
  | 'EMAIL_OTP_REQUESTED'
  | 'EMAIL_OTP_VERIFIED'
  | 'MOBILE_NUMBER_CHANGED'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT';

export interface AuditLogPayload {
  eventType: AuthAuditEvent;
  userId?: string | null;
  identifier?: string | null; // Normalized email or phone (NEVER a password or OTP)
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

// Memory buffer in case DB table is not yet migrated
const memoryAuditLogs: (AuditLogPayload & { timestamp: string })[] = [];

/**
 * Log security and authentication events securely.
 * STRICT: Never accepts or logs OTP values, passwords, reset tokens, or API keys.
 */
export async function logAuthAudit(payload: AuditLogPayload): Promise<void> {
  const timestamp = new Date().toISOString();

  // Sanitize metadata to guarantee no secrets leak into logs
  const sanitizedMetadata: Record<string, unknown> = {};
  if (payload.metadata) {
    for (const [key, value] of Object.entries(payload.metadata)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('otp') ||
        lower.includes('password') ||
        lower.includes('token') ||
        lower.includes('secret') ||
        lower.includes('key')
      ) {
        sanitizedMetadata[key] = '[REDACTED]';
      } else {
        sanitizedMetadata[key] = value;
      }
    }
  }

  // Console structured log (safe for CloudWatch/Render logs)
  console.info(
    JSON.stringify({
      level: 'AUDIT',
      timestamp,
      event: payload.eventType,
      identifier: payload.identifier ? payload.identifier.replace(/^(.{2}).*(.{2}@|.{2}$)/, '$1***$2') : undefined,
      userId: payload.userId,
      ip: payload.ipAddress,
      metadata: sanitizedMetadata,
    })
  );

  // Persist to Supabase if table exists
  try {
    const { error } = await supabase.from('auth_audit_logs').insert({
      event_type: payload.eventType,
      user_id: payload.userId || null,
      identifier: payload.identifier || null,
      ip_address: payload.ipAddress || null,
      user_agent: payload.userAgent || null,
      metadata: sanitizedMetadata,
    });

    if (error) {
      // In-memory fallback if table does not exist in Supabase yet
      memoryAuditLogs.push({ ...payload, metadata: sanitizedMetadata, timestamp });
      if (memoryAuditLogs.length > 500) memoryAuditLogs.shift();
    }
  } catch {
    memoryAuditLogs.push({ ...payload, metadata: sanitizedMetadata, timestamp });
  }
}
