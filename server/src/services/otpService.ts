import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { Resend } from 'resend';
import { env } from '../config/env.js';
import { supabase } from '../lib/supabase.js';
import { logAuthAudit } from './auditLogger.js';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_VERIFICATION_ATTEMPTS = 5;
const SALT_ROUNDS = 10;

export type OtpPurpose = 'SIGNUP' | 'RESET_PASSWORD';

// Rate limiting & attempts tracking
interface EmailOtpTracker {
  lastSentAt: number;
  attempts: number;
}
const emailTracker = new Map<string, EmailOtpTracker>();

function trackerKey(email: string, purpose: OtpPurpose): string {
  return `${email.trim().toLowerCase()}:${purpose}`;
}

function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

function emailContent(purpose: OtpPurpose, code: string): { subject: string; html: string } {
  const expiry = `<p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>`;
  const footer = `<p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>`;

  if (purpose === 'RESET_PASSWORD') {
    return {
      subject: 'Reset your GSTBro password',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Password Reset Code</h2>
          <p>Use this code to reset your GSTBro password:</p>
          <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb;">${code}</p>
          ${expiry}${footer}
        </div>
      `,
    };
  }

  return {
    subject: 'Verify your GSTBro account',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Verify Your Email</h2>
        <p>Your GSTBro signup verification code is:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb;">${code}</p>
        ${expiry}${footer}
      </div>
    `,
  };
}

export async function sendOtp(
  email: string,
  purpose: OtpPurpose = 'SIGNUP',
  ipAddress?: string
): Promise<{ success: boolean; message: string; cooldownSeconds?: number }> {
  const normalizedEmail = email.trim().toLowerCase();
  const key = trackerKey(normalizedEmail, purpose);
  const now = Date.now();

  const tracker = emailTracker.get(key);
  if (tracker) {
    const elapsedSeconds = Math.floor((now - tracker.lastSentAt) / 1000);
    if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
      const wait = RESEND_COOLDOWN_SECONDS - elapsedSeconds;
      return {
        success: false,
        message: `Please wait ${wait} seconds before requesting a new email code.`,
        cooldownSeconds: wait,
      };
    }
  }

  const code = generateOtp();
  const codeHash = await bcrypt.hash(code, SALT_ROUNDS);
  const expiresAt = new Date(now + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Invalidate any previous unused OTP for this email and purpose
  await supabase.from('otp_codes').delete().eq('email', normalizedEmail).eq('purpose', purpose);

  const { error } = await supabase.from('otp_codes').insert({
    email: normalizedEmail,
    code_hash: codeHash,
    expires_at: expiresAt.toISOString(),
    purpose,
  });

  if (error) {
    console.error('OTP insert error:', error);
    return { success: false, message: `Failed to save OTP in Supabase: ${error.message}` };
  }

  // Update tracker
  emailTracker.set(key, { lastSentAt: now, attempts: 0 });

  const { subject, html } = emailContent(purpose, code);

  if (!resend) {
    // SECURITY: Never log the OTP code value — only log that simulation occurred.
    // In production, if RESEND_API_KEY is not configured this is a misconfiguration, not a feature.
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[DEV ONLY] Email OTP simulated for ${normalizedEmail.replace(/^(.{2}).*(@.*)$/, '$1***$2')} (purpose: ${purpose}). OTP value intentionally not logged.`);
    } else {
      console.error('[SECURITY] RESEND_API_KEY is not configured — email OTP cannot be sent in production. This is a critical misconfiguration.');
    }
    await logAuthAudit({
      eventType: 'EMAIL_OTP_REQUESTED',
      identifier: normalizedEmail,
      ipAddress,
      metadata: { purpose, simulated: true },
    });
    return { success: true, message: 'OTP sent to your email (simulated in development)', cooldownSeconds: RESEND_COOLDOWN_SECONDS };
  }

  const { data: sendData, error: sendError } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: normalizedEmail,
    subject,
    html,
  });

  if (sendError) {
    console.error('Resend error:', sendError);
    return { success: false, message: 'Failed to send OTP email' };
  }

  console.info(`Resend accepted OTP email for ${normalizedEmail} (id: ${sendData?.id ?? 'unknown'})`);

  await logAuthAudit({
    eventType: 'EMAIL_OTP_REQUESTED',
    identifier: normalizedEmail,
    ipAddress,
    metadata: { purpose },
  });

  return { success: true, message: 'OTP sent to your email', cooldownSeconds: RESEND_COOLDOWN_SECONDS };
}

export async function verifyOtp(
  email: string,
  code: string,
  purpose: OtpPurpose = 'SIGNUP',
  ipAddress?: string
): Promise<{ valid: boolean; message: string; remainingAttempts?: number }> {
  const normalizedEmail = email.trim().toLowerCase();
  const key = trackerKey(normalizedEmail, purpose);
  const tracker = emailTracker.get(key) ?? { lastSentAt: 0, attempts: 0 };

  if (tracker.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    return {
      valid: false,
      message: 'Maximum verification attempts exceeded. Please request a new code.',
      remainingAttempts: 0,
    };
  }

  tracker.attempts += 1;
  emailTracker.set(key, tracker);
  const remaining = Math.max(0, MAX_VERIFICATION_ATTEMPTS - tracker.attempts);

  const { data: otpRecord, error } = await supabase
    .from('otp_codes')
    .select('*')
    .eq('email', normalizedEmail)
    .eq('purpose', purpose)
    .eq('used', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !otpRecord) {
    return { valid: false, message: 'Invalid or expired OTP', remainingAttempts: remaining };
  }

  if (new Date(otpRecord.expires_at) < new Date()) {
    return { valid: false, message: 'OTP has expired', remainingAttempts: remaining };
  }

  const match = await bcrypt.compare(code, otpRecord.code_hash);
  if (!match) {
    return {
      valid: false,
      message: remaining > 0 ? `Invalid OTP code. ${remaining} attempts remaining.` : 'Maximum attempts exceeded.',
      remainingAttempts: remaining,
    };
  }

  await supabase.from('otp_codes').update({ used: true }).eq('id', otpRecord.id);
  emailTracker.delete(key);

  await logAuthAudit({
    eventType: 'EMAIL_OTP_VERIFIED',
    identifier: normalizedEmail,
    ipAddress,
    metadata: { purpose },
  });

  return { valid: true, message: 'OTP verified' };
}
