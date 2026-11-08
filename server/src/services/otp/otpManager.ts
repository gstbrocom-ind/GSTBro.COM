import crypto from 'crypto';
import { env } from '../../config/env.js';
import { supabase } from '../../lib/supabase.js';
import { logAuthAudit } from '../auditLogger.js';
import type {
  MobileOtpPurpose,
  MobileOtpSession,
  OtpProvider,
  OtpProviderName,
  SendOtpResponse,
} from './types.js';
import { ApiTxtProvider } from './providers/apitxtProvider.js';
import { TwoFactorProvider } from './providers/twoFactorProvider.js';

const OTP_EXPIRY_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_VERIFICATION_ATTEMPTS = 5;
const MAX_OTPS_PER_MINUTE = 3; // APITxT official rate limit safeguard
const MAX_OTPS_PER_HOUR = 5; // GST Bro abuse prevention policy

// Provider Registry
const providers: Record<OtpProviderName, OtpProvider> = {
  apitxt: new ApiTxtProvider(),
  '2factor': new TwoFactorProvider(),
};

// In-memory session and rate-limiting stores
const memorySessions = new Map<string, MobileOtpSession>();
const phoneMinuteTimestamps = new Map<string, number[]>();
const phoneHourTimestamps = new Map<string, number[]>();

/**
 * Normalizes Indian mobile number to strict 10-digit format.
 * Accepts:
 *   "+919876543210" -> "9876543210"
 *   "919876543210"  -> "9876543210"
 *   "09876543210"   -> "9876543210"
 *   " 98765 43210 " -> "9876543210"
 */
export function normalizeIndianMobile(raw: string): { valid: boolean; normalized: string; error?: string } {
  if (!raw || typeof raw !== 'string') {
    return { valid: false, normalized: '', error: 'Mobile number is required' };
  }

  // Remove non-digit characters
  let digits = raw.replace(/\D/g, '');

  // Strip international country code prefix
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Check validity: must be 10 digits starting with 6, 7, 8, or 9
  if (digits.length !== 10) {
    return {
      valid: false,
      normalized: digits,
      error: 'Enter a valid 10-digit Indian mobile number',
    };
  }

  if (!/^[6-9]/.test(digits)) {
    return {
      valid: false,
      normalized: digits,
      error: 'Indian mobile numbers must begin with 6, 7, 8, or 9',
    };
  }

  return { valid: true, normalized: digits };
}

/**
 * Returns the currently active OTP provider configured server-side.
 */
export function getActiveOtpProvider(): OtpProvider {
  const providerName = (env.OTP_PROVIDER || 'apitxt') as OtpProviderName;
  const provider = providers[providerName];
  if (!provider) {
    console.warn(`[OTP] Provider '${providerName}' not found. Falling back to 'apitxt'.`);
    return providers.apitxt;
  }
  return provider;
}

/**
 * Cryptographically secure 6-digit OTP generation using crypto.randomInt
 */
function generateSecureOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Cryptographically secure keyed HMAC-SHA256 hashing for short OTPs
 */
function hashOtp(otp: string, salt: string): string {
  const secretKey = env.OTP_HASH_SECRET;
  return crypto
    .createHmac('sha256', secretKey)
    .update(`${otp}:${salt}`)
    .digest('hex');
}

/**
 * Constant-time comparison between submitted and stored hash
 */
function compareOtpHash(submittedOtp: string, salt: string, expectedHash: string): boolean {
  try {
    const computed = hashOtp(submittedOtp, salt);
    const bufA = Buffer.from(computed, 'hex');
    const bufB = Buffer.from(expectedHash, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Check if a recent OTP was requested within cooldown period (60 seconds)
 */
export function getCooldownRemainingSeconds(phone: string, purpose: MobileOtpPurpose): number {
  const now = Date.now();
  for (const session of memorySessions.values()) {
    if (session.phone === phone && session.purpose === purpose && !session.verified && session.status === 'SENT') {
      const elapsed = Math.floor((now - session.createdAt.getTime()) / 1000);
      if (elapsed < RESEND_COOLDOWN_SECONDS) {
        return RESEND_COOLDOWN_SECONDS - elapsed;
      }
    }
  }
  return 0;
}

/**
 * Check rate limits: 3 per minute (APITxT requirement) & 5 per hour (GST Bro policy)
 */
function checkRateLimits(phone: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneHourAgo = now - 60 * 60 * 1000;

  // 1. Minute sliding window
  const minuteEntries = (phoneMinuteTimestamps.get(phone) || []).filter((t) => t > oneMinuteAgo);
  if (minuteEntries.length >= MAX_OTPS_PER_MINUTE) {
    return {
      allowed: false,
      reason: 'Rate limit exceeded: Maximum 3 OTP requests per minute allowed.',
    };
  }

  // 2. Hour sliding window
  const hourEntries = (phoneHourTimestamps.get(phone) || []).filter((t) => t > oneHourAgo);
  if (hourEntries.length >= MAX_OTPS_PER_HOUR) {
    return {
      allowed: false,
      reason: 'Hourly limit exceeded: Maximum 5 OTP requests per hour allowed. Please try again later.',
    };
  }

  return { allowed: true };
}

function recordRateLimitHit(phone: string): void {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneHourAgo = now - 60 * 60 * 1000;

  const minuteEntries = (phoneMinuteTimestamps.get(phone) || []).filter((t) => t > oneMinuteAgo);
  minuteEntries.push(now);
  phoneMinuteTimestamps.set(phone, minuteEntries);

  const hourEntries = (phoneHourTimestamps.get(phone) || []).filter((t) => t > oneHourAgo);
  hourEntries.push(now);
  phoneHourTimestamps.set(phone, hourEntries);
}

/**
 * Send SMS OTP via configured Provider (APITxT or 2Factor)
 */
export async function sendMobileOtp(
  rawPhone: string,
  purpose: MobileOtpPurpose,
  ipAddress?: string
): Promise<{ success: boolean; sessionId?: string; message: string; cooldownSeconds: number }> {
  const norm = normalizeIndianMobile(rawPhone);
  if (!norm.valid) {
    return { success: false, message: norm.error ?? 'Invalid mobile number', cooldownSeconds: 0 };
  }
  const phone = norm.normalized;

  // 1. Enforce cooldown (1 OTP / 60 seconds)
  const remainingCooldown = getCooldownRemainingSeconds(phone, purpose);
  if (remainingCooldown > 0) {
    return {
      success: false,
      message: `Please wait ${remainingCooldown} seconds before requesting a new OTP.`,
      cooldownSeconds: remainingCooldown,
    };
  }

  // 2. Enforce minute & hourly rate limits
  const rateLimitCheck = checkRateLimits(phone);
  if (!rateLimitCheck.allowed) {
    await logAuthAudit({
      eventType: 'MOBILE_OTP_FAILED',
      identifier: phone,
      ipAddress,
      metadata: { purpose, reason: rateLimitCheck.reason },
    });
    return {
      success: false,
      message: rateLimitCheck.reason || 'Rate limit reached. Please wait before requesting another OTP.',
      cooldownSeconds: RESEND_COOLDOWN_SECONDS,
    };
  }

  // 3. Invalidate previous active sessions for this phone + purpose
  for (const session of memorySessions.values()) {
    if (session.phone === phone && session.purpose === purpose && !session.verified) {
      session.status = 'EXPIRED';
    }
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const sessionId = crypto.randomUUID();
  const salt = crypto.randomBytes(16).toString('hex');

  // 4. Generate cryptographically secure OTP
  const plainOtp = generateSecureOtp();
  const otpHash = hashOtp(plainOtp, salt);

  const provider = getActiveOtpProvider();

  // 5. Call Provider to dispatch SMS (passing plain OTP temporarily in memory)
  let sendResult: SendOtpResponse;
  try {
    sendResult = await provider.sendOtp({
      phone,
      otp: plainOtp,
      purpose,
      ipAddress,
    });
  } catch (err: any) {
    console.error(`[OTP Service] Provider exception (${provider.name}):`, err);
    sendResult = {
      success: false,
      provider: provider.name,
      message: 'Unable to deliver SMS OTP at this moment. Please try again.',
      rawError: err?.message,
      cooldownSeconds: 0,
    };
  }

  if (!sendResult.success) {
    await logAuthAudit({
      eventType: 'MOBILE_OTP_FAILED',
      identifier: phone,
      ipAddress,
      metadata: {
        purpose,
        provider: provider.name,
        reason: sendResult.rawError || 'Provider delivery rejection',
      },
    });
    return {
      success: false,
      message: sendResult.message || 'Unable to deliver SMS OTP at this moment. Please try again.',
      cooldownSeconds: 0,
    };
  }

  // Record rate limit hit only after successful provider acceptance
  recordRateLimitHit(phone);

  const isMock = Boolean(sendResult.simulated);
  const sessionRecord: MobileOtpSession = {
    id: sessionId,
    phone,
    sessionId,
    purpose,
    otpHash,
    salt,
    attempts: 0,
    maxAttempts: MAX_VERIFICATION_ATTEMPTS,
    status: 'SENT',
    verified: false,
    provider: provider.name,
    providerRequestId: sendResult.providerRequestId,
    providerCost: sendResult.providerCost,
    mockOtp: isMock ? plainOtp : undefined,
    expiresAt,
    createdAt: now,
  };

  // Save to in-memory store
  memorySessions.set(sessionId, sessionRecord);

  // Persist to Supabase mobile_otp_sessions table
  try {
    await supabase.from('mobile_otp_sessions').insert({
      id: sessionRecord.id,
      phone,
      session_id: sessionId,
      purpose,
      attempts: 0,
      max_attempts: MAX_VERIFICATION_ATTEMPTS,
      verified: false,
      otp_hash: otpHash,
      salt,
      provider: provider.name,
      provider_request_id: sendResult.providerRequestId,
      expires_at: expiresAt.toISOString(),
      created_at: now.toISOString(),
    });
  } catch (err) {
    // Non-fatal, memory store acts as resilient buffer
  }

  await logAuthAudit({
    eventType: 'MOBILE_OTP_REQUESTED',
    identifier: phone,
    ipAddress,
    metadata: {
      purpose,
      provider: provider.name,
      providerRequestId: sendResult.providerRequestId,
      simulated: isMock,
    },
  });

  return {
    success: true,
    sessionId,
    message: 'OTP has been dispatched via SMS to your mobile number.',
    cooldownSeconds: RESEND_COOLDOWN_SECONDS,
  };
}

/**
 * Verify Mobile OTP against stored cryptographic hash (strictly server-side)
 */
export async function verifyMobileOtp(
  rawPhone: string,
  sessionId: string,
  otpInput: string,
  purpose: MobileOtpPurpose,
  ipAddress?: string
): Promise<{ valid: boolean; message: string; remainingAttempts?: number }> {
  const norm = normalizeIndianMobile(rawPhone);
  if (!norm.valid) {
    return { valid: false, message: norm.error ?? 'Invalid phone number' };
  }
  const phone = norm.normalized;

  if (!sessionId || typeof sessionId !== 'string') {
    return { valid: false, message: 'Invalid OTP session' };
  }

  const cleanOtp = String(otpInput || '').trim();
  if (!/^\d{4,6}$/.test(cleanOtp)) {
    return { valid: false, message: 'Enter a valid numeric OTP' };
  }

  const now = new Date();

  // Retrieve session (check memory store first, fallback to Supabase DB)
  let session = memorySessions.get(sessionId);

  if (!session) {
    try {
      const { data, error } = await supabase
        .from('mobile_otp_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (!error && data) {
        session = {
          id: data.id,
          phone: data.phone,
          sessionId: data.session_id,
          purpose: data.purpose as MobileOtpPurpose,
          otpHash: data.otp_hash || '',
          salt: data.salt || '',
          attempts: data.attempts || 0,
          maxAttempts: data.max_attempts || MAX_VERIFICATION_ATTEMPTS,
          status: data.verified ? 'VERIFIED' : (new Date(data.expires_at) < now ? 'EXPIRED' : 'SENT'),
          verified: data.verified || false,
          provider: (data.provider as OtpProviderName) || 'apitxt',
          providerRequestId: data.provider_request_id,
          expiresAt: new Date(data.expires_at),
          createdAt: new Date(data.created_at),
        };
        memorySessions.set(sessionId, session);
      }
    } catch {
      // Memory store lookup fallback
    }
  }

  if (!session) {
    return { valid: false, message: 'Invalid or expired OTP session. Please request a new OTP.' };
  }

  // 1. Verify purpose strictly
  if (session.purpose !== purpose) {
    return { valid: false, message: 'OTP was issued for a different action. Please request a new OTP.' };
  }

  // 2. Verify phone strictly
  if (session.phone !== phone) {
    return { valid: false, message: 'Mobile number mismatch. Please request a new OTP.' };
  }

  // 3. Prevent replay attacks
  if (session.verified || session.status === 'VERIFIED') {
    return { valid: false, message: 'This OTP has already been verified.' };
  }

  // 4. Check expiry (5 minutes maximum)
  if (session.expiresAt < now || session.status === 'EXPIRED') {
    session.status = 'EXPIRED';
    await logAuthAudit({
      eventType: 'MOBILE_OTP_EXPIRED',
      identifier: phone,
      ipAddress,
      metadata: { purpose },
    });
    return { valid: false, message: 'OTP has expired. Please request a new OTP.' };
  }

  // 5. Check attempt limits (Maximum 5 attempts)
  if (session.attempts >= session.maxAttempts || session.status === 'BLOCKED') {
    session.status = 'BLOCKED';
    await logAuthAudit({
      eventType: 'MOBILE_OTP_FAILED',
      identifier: phone,
      ipAddress,
      metadata: { purpose, reason: 'Exceeded maximum verification attempts' },
    });
    return {
      valid: false,
      message: 'Maximum verification attempts exceeded. Please request a new OTP.',
      remainingAttempts: 0,
    };
  }

  // 6. Increment attempt counter
  session.attempts += 1;
  const remainingAttempts = Math.max(0, session.maxAttempts - session.attempts);

  // Update DB attempts
  try {
    await supabase
      .from('mobile_otp_sessions')
      .update({ attempts: session.attempts })
      .eq('session_id', sessionId);
  } catch {}

  // 7. Verify OTP against cryptographic hash (or simulated OTP in local dev)
  let isMatch = false;

  if (session.mockOtp && process.env.NODE_ENV === 'development') {
    isMatch = session.mockOtp === cleanOtp;
  }

  // Real cryptographic HMAC comparison
  if (!isMatch && session.otpHash && session.salt) {
    isMatch = compareOtpHash(cleanOtp, session.salt, session.otpHash);
  }

  if (!isMatch) {
    if (remainingAttempts === 0) {
      session.status = 'BLOCKED';
    }
    await logAuthAudit({
      eventType: 'MOBILE_OTP_FAILED',
      identifier: phone,
      ipAddress,
      metadata: { purpose, attempts: session.attempts, remainingAttempts },
    });
    return {
      valid: false,
      message:
        remainingAttempts > 0
          ? `Incorrect OTP. ${remainingAttempts} attempts remaining.`
          : 'Maximum verification attempts exceeded. Please request a new OTP.',
      remainingAttempts,
    };
  }

  // 8. Successful Verification — Mark session as verified & single-use
  session.verified = true;
  session.status = 'VERIFIED';
  session.verifiedAt = now;

  try {
    await supabase
      .from('mobile_otp_sessions')
      .update({
        verified: true,
        verified_at: now.toISOString(),
      })
      .eq('session_id', sessionId);
  } catch {}

  await logAuthAudit({
    eventType: 'MOBILE_OTP_VERIFIED',
    identifier: phone,
    ipAddress,
    metadata: {
      purpose,
      provider: session.provider,
      providerRequestId: session.providerRequestId,
    },
  });

  return { valid: true, message: 'Mobile OTP verified successfully' };
}
