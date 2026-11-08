import type { FastifyRequest, FastifyReply } from 'fastify';
import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { supabase } from './supabase.js';

// ============================================================================
// 1. PROXY & CLOUDFLARE AWARE CLIENT IP RESOLUTION
// ============================================================================

/**
 * Extracts the authentic client IP address behind Cloudflare, Nginx, or cloud load balancers.
 * Priority: CF-Connecting-IP -> X-Real-IP -> X-Forwarded-For -> socket IP.
 */
export function getClientIp(req: FastifyRequest): string {
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp && typeof cfIp === 'string' && cfIp.trim().length > 0) {
    return cfIp.trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string' && realIp.trim().length > 0) {
    return realIp.trim();
  }

  const xff = req.headers['x-forwarded-for'];
  if (xff && typeof xff === 'string') {
    const firstIp = xff.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  return req.ip || '127.0.0.1';
}

// ============================================================================
// 2. REDIS / DISTRIBUTED RATE LIMIT STORE CONNECTION
// ============================================================================

let redisClient: Redis | null = null;

if (env.REDIS_URL) {
  try {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: false,
    });
    redisClient.on('error', (err) => {
      console.warn('[RateLimiter] Redis connection warning (falling back to memory/db store):', err.message);
    });
    redisClient.on('connect', () => {
      console.info('[RateLimiter] Distributed Redis rate-limiter connected successfully.');
    });
  } catch (err) {
    console.warn('[RateLimiter] Failed to initialize Redis client, using local store:', err);
    redisClient = null;
  }
}

export { redisClient };

// ============================================================================
// 3. ENDPOINT-SPECIFIC RATE LIMIT CONFIGURATIONS (@fastify/rate-limit)
// ============================================================================

/**
 * Standard error response builder for 429 Too Many Requests
 */
export function createRateLimitResponse(reason: string, ttlSeconds: number) {
  return {
    statusCode: 429,
    error: 'Too Many Requests',
    message: `${reason}. Please wait ${Math.max(1, ttlSeconds)} seconds before trying again.`,
    retryAfter: Math.max(1, ttlSeconds),
  };
}

/**
 * Helper to build Fastify route rateLimit configuration
 */
function makeLimitConfig(
  max: number,
  timeWindow: string,
  categoryDesc: string,
  keyFunc?: (req: FastifyRequest) => string
) {
  return {
    max,
    timeWindow,
    keyGenerator: (req: FastifyRequest) => {
      if (keyFunc) return keyFunc(req);
      const ip = getClientIp(req);
      const userId = (req as any).user?.id;
      return userId ? `${userId}:${ip}` : ip;
    },
    errorResponseBuilder: (req: FastifyRequest, context: { ttl: number }) => {
      const ttlSec = Math.ceil(context.ttl / 1000);
      return createRateLimitResponse(`Rate limit exceeded for ${categoryDesc}`, ttlSec);
    },
  };
}

/**
 * 1. Login Protection: 5 attempts per 5 minutes per IP or user identifier
 */
export const LOGIN_RATE_LIMIT = makeLimitConfig(
  5,
  '5 minutes',
  'login attempts',
  (req) => {
    const body = req.body as any;
    const identifier = body?.identifier || body?.email || '';
    const normId = String(identifier).trim().toLowerCase();
    return normId ? `login:${normId}:${getClientIp(req)}` : `login:${getClientIp(req)}`;
  }
);

/**
 * 2. OTP Generation Protection (SMS / Email OTP request): 3 requests per 5 minutes
 */
export const OTP_GENERATE_RATE_LIMIT = makeLimitConfig(
  3,
  '5 minutes',
  'OTP generation requests',
  (req) => {
    const body = req.body as any;
    const phone = body?.phone || '';
    const email = body?.email || '';
    const target = (phone || email).trim().toLowerCase();
    return target ? `otp_gen:${target}:${getClientIp(req)}` : `otp_gen:${getClientIp(req)}`;
  }
);

/**
 * 3. OTP Verification Protection: 5 verification attempts per 5 minutes
 */
export const OTP_VERIFY_RATE_LIMIT = makeLimitConfig(
  5,
  '5 minutes',
  'OTP verification attempts',
  (req) => {
    const body = req.body as any;
    const sessionId = body?.sessionId || body?.email || '';
    return sessionId ? `otp_verify:${sessionId}:${getClientIp(req)}` : `otp_verify:${getClientIp(req)}`;
  }
);

/**
 * 4. Signup Protection: 3 account creation attempts per 15 minutes per IP
 */
export const SIGNUP_RATE_LIMIT = makeLimitConfig(
  3,
  '15 minutes',
  'account signup registrations',
  (req) => `signup:${getClientIp(req)}`
);

/**
 * 5. Password Reset Request Protection: 3 requests per 15 minutes
 */
export const PASSWORD_RESET_RATE_LIMIT = makeLimitConfig(
  3,
  '15 minutes',
  'password reset requests',
  (req) => {
    const body = req.body as any;
    const identifier = body?.identifier || body?.email || body?.phone || '';
    const target = String(identifier).trim().toLowerCase();
    return target ? `pwd_reset:${target}:${getClientIp(req)}` : `pwd_reset:${getClientIp(req)}`;
  }
);

/**
 * 6. File & Document Upload Protection: 10 uploads per 5 minutes per user
 */
export const UPLOAD_RATE_LIMIT = makeLimitConfig(
  10,
  '5 minutes',
  'file uploads',
  (req) => {
    const userId = (req as any).user?.id || 'anon';
    return `upload:${userId}:${getClientIp(req)}`;
  }
);

/**
 * 7. Heavy Data & GST Processing: 20 operations per minute per client
 */
export const HEAVY_DATA_RATE_LIMIT = makeLimitConfig(
  20,
  '1 minute',
  'GST calculation and processing operations',
  (req) => {
    const userId = (req as any).user?.id || 'anon';
    return `gst_proc:${userId}:${getClientIp(req)}`;
  }
);

/**
 * 8. Public Leads & Inquiries: 5 submissions per 10 minutes per IP
 */
export const PUBLIC_LEADS_RATE_LIMIT = makeLimitConfig(
  5,
  '10 minutes',
  'lead submissions',
  (req) => `lead:${getClientIp(req)}`
);

/**
 * 9. Heavy Search & Admin Query Protection: 30 requests per minute
 */
export const HEAVY_QUERY_RATE_LIMIT = makeLimitConfig(
  30,
  '1 minute',
  'search and audit queries',
  (req) => {
    const userId = (req as any).user?.id || 'anon';
    return `query:${userId}:${getClientIp(req)}`;
  }
);

// ============================================================================
// 4. ACCOUNT-LEVEL DISTRIBUTED LOCKOUT (ANTI-CREDENTIAL STUFFING)
// ============================================================================

interface AccountLockoutRecord {
  failedAttempts: number;
  lockedUntil: number;
}

const memoryLockouts = new Map<string, AccountLockoutRecord>();
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

/**
 * Checks whether an account identifier (email/phone) is locked out due to excessive failed attempts.
 */
export async function isAccountLockedOut(identifier: string): Promise<{ locked: boolean; remainingSeconds: number }> {
  const norm = identifier.trim().toLowerCase();
  const key = `lockout:${norm}`;
  const now = Date.now();

  // 1. Check Redis if available
  if (redisClient) {
    try {
      const ttl = await redisClient.ttl(key);
      const attemptsStr = await redisClient.get(key);
      const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
      if (attempts >= MAX_FAILED_LOGINS && ttl > 0) {
        return { locked: true, remainingSeconds: ttl };
      }
    } catch (err) {
      console.warn('[Lockout] Redis check error:', err);
    }
  }

  // 2. Check local memory
  const record = memoryLockouts.get(norm);
  if (record && record.failedAttempts >= MAX_FAILED_LOGINS) {
    if (now < record.lockedUntil) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return { locked: true, remainingSeconds };
    } else {
      // Lockout expired
      memoryLockouts.delete(norm);
    }
  }

  return { locked: false, remainingSeconds: 0 };
}

/**
 * Records a failed authentication attempt for an account identifier.
 */
export async function recordFailedLogin(identifier: string): Promise<{ locked: boolean; attempts: number; remainingSeconds: number }> {
  const norm = identifier.trim().toLowerCase();
  const key = `lockout:${norm}`;
  const now = Date.now();

  // 1. Update Redis if available
  if (redisClient) {
    try {
      const attempts = await redisClient.incr(key);
      if (attempts === 1) {
        await redisClient.expire(key, 900); // 15 mins window
      }
      if (attempts >= MAX_FAILED_LOGINS) {
        const ttl = await redisClient.ttl(key);
        return { locked: true, attempts, remainingSeconds: ttl > 0 ? ttl : 900 };
      }
      return { locked: false, attempts, remainingSeconds: 0 };
    } catch (err) {
      console.warn('[Lockout] Redis record error:', err);
    }
  }

  // 2. Local memory fallback
  let record = memoryLockouts.get(norm);
  if (!record || now >= record.lockedUntil) {
    record = { failedAttempts: 1, lockedUntil: now + LOCKOUT_DURATION_MS };
  } else {
    record.failedAttempts += 1;
    if (record.failedAttempts >= MAX_FAILED_LOGINS) {
      record.lockedUntil = now + LOCKOUT_DURATION_MS;
    }
  }
  memoryLockouts.set(norm, record);

  const isLocked = record.failedAttempts >= MAX_FAILED_LOGINS;
  const remainingSeconds = isLocked ? Math.ceil((record.lockedUntil - now) / 1000) : 0;
  return { locked: isLocked, attempts: record.failedAttempts, remainingSeconds };
}

/**
 * Clears failed login counter upon successful authentication.
 */
export async function resetFailedLogins(identifier: string): Promise<void> {
  const norm = identifier.trim().toLowerCase();
  const key = `lockout:${norm}`;

  if (redisClient) {
    try {
      await redisClient.del(key);
    } catch (err) {
      console.warn('[Lockout] Redis reset error:', err);
    }
  }

  memoryLockouts.delete(norm);
}
