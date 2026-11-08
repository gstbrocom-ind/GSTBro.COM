import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { sendOtp, verifyOtp } from '../services/otpService.js';
import {
  sendMobileOtp,
  verifyMobileOtp,
  normalizeIndianMobile,
  type MobileOtpPurpose,
} from '../services/twoFactorService.js';
import {
  createResetAuthorization,
  consumeResetAuthorization,
} from '../services/resetAuthService.js';
import { logAuthAudit } from '../services/auditLogger.js';
import { hashPassword, verifyPassword, validatePassword } from '../services/passwordService.js';
import { supabase, type UserRole } from '../lib/supabase.js';
import { authenticate, requireRole, getRawAuthToken } from '../middleware/auth.js';
import { revokeToken } from '../services/sessionRevocationService.js';
import { INDIAN_STATES, isValidIndianState } from '../constants/indianStates.js';
import { verifyWelcomeCode, consumeWelcomeCode } from '../services/welcomeCodeService.js';
import { recordSignupConsents } from '../services/consentService.js';

import { uuidParamSchema, sanitizeText } from '../lib/security.js';
import {
  LOGIN_RATE_LIMIT,
  OTP_GENERATE_RATE_LIMIT,
  OTP_VERIFY_RATE_LIMIT,
  SIGNUP_RATE_LIMIT,
  PASSWORD_RESET_RATE_LIMIT,
  PUBLIC_LEADS_RATE_LIMIT,
  isAccountLockedOut,
  recordFailedLogin,
  resetFailedLogins,
  getClientIp,
} from '../lib/rateLimiter.js';
import { verifyTurnstileToken } from '../services/turnstileService.js';

const gstinSchema = z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? undefined : String(v).trim().toUpperCase()),
  z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format')
    .optional()
);

const mobileSchema = z
  .string()
  .trim()
  .max(15, 'Mobile number exceeds maximum allowable length')
  .refine((val) => normalizeIndianMobile(val).valid, 'Enter a valid 10-digit Indian mobile number');

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, 'Full name is required').max(100, 'Full name cannot exceed 100 characters'),
    businessName: z.string().trim().min(2, 'Business name is required').max(150, 'Business name cannot exceed 150 characters'),
    phone: mobileSchema,
    email: z.string().trim().email('Enter a valid email address').max(255, 'Email cannot exceed 255 characters'),
    gstin: gstinSchema,
    state: z.string().trim().refine(isValidIndianState, 'Select a valid Indian state'),
    address: z.string().trim().min(5, 'Business address is required').max(500, 'Address cannot exceed 500 characters'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password cannot exceed 128 characters'),
    welcomeCode: z
      .string()
      .trim()
      .min(5, 'A valid Welcome Code (5 to 8 characters) is required to register an account')
      .max(16, 'Welcome Code cannot exceed 16 characters'),
    marketingConsent: z.boolean().optional().default(false),
  })
  .strict();

function publicUser(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  business_name?: string | null;
  phone?: string | null;
  gstin?: string | null;
  state?: string | null;
  must_reset_password?: boolean | null;
  mobile_verified?: boolean | null;
  mobile_verified_at?: string | null;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    businessName: user.business_name,
    phone: user.phone,
    gstin: user.gstin,
    state: user.state,
    mustResetPassword: user.must_reset_password ?? false,
    mobileVerified: Boolean(user.mobile_verified),
    mobileVerifiedAt: user.mobile_verified_at,
  };
}

export async function authRoutes(app: FastifyInstance) {
  app.get('/api/auth/states', async () => ({ states: INDIAN_STATES }));

  // -------------------------------------------------------------
  // 1. NORMAL LOGIN (Zero OTP required — Email OR Mobile + Password)
  // -------------------------------------------------------------
  app.post('/api/auth/login', { config: { rateLimit: LOGIN_RATE_LIMIT } }, async (request, reply) => {
    const body = z
      .object({
        identifier: z.string().trim().max(255).optional(),
        email: z.string().trim().max(255).optional(),
        password: z.string().min(1, 'Password is required').max(128, 'Password cannot exceed 128 characters'),
        turnstileToken: z.string().trim().optional(),
      })
      .strict()
      .refine((data) => Boolean(data.identifier || data.email), {
        message: 'Email address or mobile number is required',
      })
      .parse(request.body);

    const clientIp = getClientIp(request);

    // Verify Cloudflare Turnstile token if provided
    if (body.turnstileToken) {
      const turnstileResult = await verifyTurnstileToken(body.turnstileToken, clientIp);
      if (!turnstileResult.success) {
        return reply.status(400).send({
          error: turnstileResult.error || 'Security verification failed. Please complete the CAPTCHA check.',
        });
      }
    }

    const loginId = (body.identifier || body.email || '').trim();

    // Check account-level lockout (anti-credential stuffing defense)
    const lockout = await isAccountLockedOut(loginId);
    if (lockout.locked) {
      await logAuthAudit({
        eventType: 'LOGIN_FAILED',
        identifier: loginId,
        ipAddress: request.ip,
        metadata: { reason: 'Account locked due to brute force attempts' },
      });
      return reply.status(429).send({
        error: `Account temporarily locked due to excessive failed attempts. Please wait ${lockout.remainingSeconds} seconds before trying again.`,
        retryAfter: lockout.remainingSeconds,
      });
    }

    let query = supabase.from('users').select('*');

    if (loginId.includes('@')) {
      // Lookup by email
      query = query.ilike('email', loginId.toLowerCase());
    } else {
      // Lookup by normalized Indian mobile number
      const norm = normalizeIndianMobile(loginId);
      if (!norm.valid) {
        await logAuthAudit({
          eventType: 'LOGIN_FAILED',
          identifier: loginId,
          ipAddress: request.ip,
          metadata: { reason: 'Invalid mobile format' },
        });
        await recordFailedLogin(loginId);
        return reply.status(401).send({ error: 'Invalid email or mobile number.' });
      }
      query = query.eq('phone', norm.normalized);
    }

    const { data: user, error: dbError } = await query.maybeSingle();

    if (dbError || !user || !user.password_hash) {
      await logAuthAudit({
        eventType: 'LOGIN_FAILED',
        identifier: loginId,
        ipAddress: request.ip,
        metadata: { reason: 'User not found or no password set' },
      });
      await recordFailedLogin(loginId);
      return reply.status(401).send({ error: 'Invalid credentials. Please verify your details.' });
    }

    // Check verification for CLIENT accounts
    if (user.role === 'CLIENT' && !user.email_verified && !user.mobile_verified) {
      await logAuthAudit({
        eventType: 'LOGIN_FAILED',
        userId: user.id,
        identifier: user.email,
        ipAddress: request.ip,
        metadata: { reason: 'Unverified account' },
      });
      return reply.status(403).send({
        error: 'Account not verified. Please complete signup verification to continue.',
        needsVerification: true,
        phone: user.phone,
        email: user.email,
      });
    }

    const valid = await verifyPassword(body.password, user.password_hash);
    if (!valid) {
      await logAuthAudit({
        eventType: 'LOGIN_FAILED',
        userId: user.id,
        identifier: loginId,
        ipAddress: request.ip,
        metadata: { reason: 'Password mismatch' },
      });
      const lockStatus = await recordFailedLogin(loginId);
      if (lockStatus.locked) {
        return reply.status(429).send({
          error: `Too many failed login attempts. Account temporarily locked for ${lockStatus.remainingSeconds} seconds.`,
          retryAfter: lockStatus.remainingSeconds,
        });
      }
      return reply.status(401).send({ error: 'Invalid credentials. Please verify your details.' });
    }

    // Reset failed counter upon successful authentication
    await resetFailedLogins(loginId);

    // Provision Drive folder for TEAM users if needed
    if (user.role === 'TEAM') {
      try {
        const { data: existingFolder } = await supabase
          .from('drive_folders')
          .select('id')
          .eq('owner_type', 'TEAM')
          .eq('owner_id', user.id)
          .eq('is_shortcut', false)
          .maybeSingle();
        if (!existingFolder) {
          const { getDriveService } = await import('../services/googleDrive.js');
          const drive = getDriveService();
          if (drive) await drive.createTeamFolder(user.id, user.name, user.id);
        }
      } catch (err) {
        request.log.warn({ err, userId: user.id }, 'Team Drive folder provisioning skipped during login');
      }
    }

    await logAuthAudit({
      eventType: 'LOGIN_SUCCESS',
      userId: user.id,
      identifier: loginId,
      ipAddress: request.ip,
      metadata: { role: user.role },
    });

    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role });
    return { token, user: publicUser(user) };
  });

  // -------------------------------------------------------------
  // 2. FIRST-TIME SIGNUP — MOBILE OTP (2Factor.in)
  // -------------------------------------------------------------

  // Step 2A: Request Mobile OTP for Signup
  app.post('/api/auth/signup/request-mobile-otp', { config: { rateLimit: OTP_GENERATE_RATE_LIMIT } }, async (request, reply) => {
    const parsed = signupSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0]?.message ?? 'Invalid signup details' });
    }
    const body = parsed.data;

    const passwordError = validatePassword(body.password);
    if (passwordError) return reply.status(400).send({ error: passwordError });

    const email = body.email.trim().toLowerCase();
    const norm = normalizeIndianMobile(body.phone);
    if (!norm.valid) return reply.status(400).send({ error: norm.error });
    const phone = norm.normalized;

    // Verify Welcome Code before dispatching OTP
    const codeCheck = await verifyWelcomeCode(body.welcomeCode);
    if (!codeCheck.valid) {
      return reply.status(400).send({
        error: codeCheck.error || 'Invalid, expired, or already redeemed Welcome Code. Registration is by invite only.',
      });
    }

    // Check if verified account already exists with email or phone
    const { data: existing } = await supabase
      .from('users')
      .select('id, email, phone, email_verified, mobile_verified')
      .or(`email.eq.${email},phone.eq.${phone}`)
      .limit(2);

    if (existing && existing.length > 0) {
      const verified = existing.find((u) => u.email_verified || u.mobile_verified);
      if (verified) {
        return reply.status(409).send({ error: 'An account with this email or mobile number already exists. Please login.' });
      }
    }

    // Trigger 2Factor SMS OTP
    const otpResult = await sendMobileOtp(phone, 'SIGNUP_MOBILE_VERIFICATION', request.ip);
    if (!otpResult.success) {
      return reply.status(400).send({ error: otpResult.message, cooldownSeconds: otpResult.cooldownSeconds });
    }

    await logAuthAudit({
      eventType: 'SIGNUP_STARTED',
      identifier: phone,
      ipAddress: request.ip,
      metadata: { email },
    });

    return {
      success: true,
      sessionId: otpResult.sessionId,
      message: 'OTP has been dispatched via SMS to your mobile number.',
      cooldownSeconds: otpResult.cooldownSeconds,
    };
  });

  // Step 2B: Verify Mobile OTP & Activate Account
  app.post('/api/auth/signup/verify-mobile-otp', { config: { rateLimit: OTP_VERIFY_RATE_LIMIT } }, async (request, reply) => {
    const body = z
      .object({
        sessionId: z.string().trim().min(1, 'Session ID is required').max(128, 'Session ID exceeds maximum length'),
        otp: z.string().trim().regex(/^\d{4,6}$/, 'Enter the 4-6 digit numeric OTP received via SMS'),
        signupData: signupSchema,
      })
      .strict()
      .parse(request.body);

    const norm = normalizeIndianMobile(body.signupData.phone);
    if (!norm.valid) return reply.status(400).send({ error: norm.error });
    const phone = norm.normalized;
    const email = body.signupData.email.trim().toLowerCase();

    // Verify OTP with 2Factor
    const verifyResult = await verifyMobileOtp(
      phone,
      body.sessionId,
      body.otp,
      'SIGNUP_MOBILE_VERIFICATION',
      request.ip
    );

    if (!verifyResult.valid) {
      return reply.status(400).send({
        error: verifyResult.message,
        remainingAttempts: verifyResult.remainingAttempts,
      });
    }

    // Re-verify Welcome Code
    const codeCheck = await verifyWelcomeCode(body.signupData.welcomeCode);
    if (!codeCheck.valid) {
      return reply.status(400).send({
        error: codeCheck.error || 'Invalid or already used Welcome Code. Registration is by invite only.',
      });
    }

    // Clean up any unverified duplicate records
    const { data: existingUsers } = await supabase
      .from('users')
      .select('id, email_verified, mobile_verified')
      .or(`email.eq.${email},phone.eq.${phone}`);

    if (existingUsers && existingUsers.length > 0) {
      for (const u of existingUsers) {
        if (!u.email_verified && !u.mobile_verified) {
          await supabase.from('users').delete().eq('id', u.id);
        }
      }
    }

    const passwordHash = await hashPassword(body.signupData.password);
    const now = new Date().toISOString();

    const insertPayload: Record<string, unknown> = {
      email,
      name: body.signupData.name,
      phone,
      business_name: body.signupData.businessName,
      gstin: body.signupData.gstin || null,
      state: body.signupData.state,
      address: body.signupData.address,
      password_hash: passwordHash,
      email_verified: false,
      role: 'CLIENT',
    };

    // Try inserting with mobile_verified fields; fallback if migration not yet applied
    let createdUser: Record<string, unknown> | null = null;
    try {
      const { data: user, error } = await supabase
        .from('users')
        .insert({
          ...insertPayload,
          mobile_verified: true,
          mobile_verified_at: now,
          mobile_verification_method: '2FACTOR',
        })
        .select('*')
        .single();

      if (!error && user) {
        createdUser = user;
      }
    } catch {
      // Migration fallback
    }

    if (!createdUser) {
      const { data: userFallback, error: fallbackError } = await supabase
        .from('users')
        .insert(insertPayload)
        .select('*')
        .single();

      if (fallbackError || !userFallback) {
        request.log.error({ fallbackError }, 'Signup insert error');
        return reply.status(500).send({ error: 'Failed to create account. Please try again.' });
      }
      createdUser = userFallback;
    }

    if (!createdUser) {
      return reply.status(500).send({ error: 'Failed to create account. Please try again.' });
    }

    // Mark Welcome Code as consumed/registered
    try {
      await consumeWelcomeCode(body.signupData.welcomeCode, {
        id: String(createdUser.id),
        email: String(createdUser.email),
        name: String(createdUser.name),
      });
    } catch (codeErr) {
      request.log.warn({ codeErr }, 'Welcome code consumption warning');
    }

    // Provision Drive client folder
    try {
      const { getDriveService } = await import('../services/googleDrive.js');
      const drive = getDriveService();
      if (drive) {
        await drive.createClientFolder(
          String(createdUser.id),
          String(createdUser.business_name ?? createdUser.name),
          String(createdUser.id)
        );
      }
    } catch (err) {
      request.log.warn({ err }, 'Client Drive folder creation skipped during signup');
    }

    // Record DPDP Consents (DPDP Act, 2023 & Rules 2025)
    try {
      await recordSignupConsents({
        userId: String(createdUser.id),
        email: String(createdUser.email),
        marketingConsent: Boolean(body.signupData.marketingConsent),
        ipAddress: request.ip,
        userAgent: (request.headers['user-agent'] as string) ?? null,
      });
    } catch (consentErr) {
      request.log.warn({ consentErr }, 'DPDP consent recording warning');
    }

    const token = app.jwt.sign({
      id: String(createdUser.id),
      email: String(createdUser.email),
      role: (createdUser.role as UserRole) || 'CLIENT',
    });

    return {
      token,
      user: publicUser(createdUser as any),
      message: 'Mobile number verified and account created successfully!',
    };
  });

  // -------------------------------------------------------------
  // 3. EXISTING EMAIL SIGNUP & VERIFY (Retained for backwards compatibility)
  // -------------------------------------------------------------
  app.post('/api/auth/signup', { config: { rateLimit: SIGNUP_RATE_LIMIT } }, async (request, reply) => {
    const parsed = signupSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0]?.message ?? 'Invalid input' });
    }
    const body = parsed.data;

    const passwordError = validatePassword(body.password);
    if (passwordError) return reply.status(400).send({ error: passwordError });

    const email = body.email.trim().toLowerCase();
    const norm = normalizeIndianMobile(body.phone);
    if (!norm.valid) return reply.status(400).send({ error: norm.error });
    const phone = norm.normalized;

    // Verify Welcome Code before creating account
    const codeCheck = await verifyWelcomeCode(body.welcomeCode);
    if (!codeCheck.valid) {
      return reply.status(400).send({
        error: codeCheck.error || 'Invalid, expired, or already redeemed Welcome Code. Registration is by invite only.',
      });
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id, email, phone, email_verified, mobile_verified')
      .or(`email.eq.${email},phone.eq.${phone}`)
      .limit(2);

    if (existing && existing.length > 0) {
      const verified = existing.find((u) => u.email_verified || u.mobile_verified);
      if (verified) {
        return reply.status(409).send({ error: 'An account with this email or mobile number already exists. Please login.' });
      }
      for (const u of existing) {
        await supabase.from('users').delete().eq('id', u.id);
      }
    }

    const passwordHash = await hashPassword(body.password);

    const { error } = await supabase.from('users').insert({
      email,
      name: body.name,
      phone,
      business_name: body.businessName,
      gstin: body.gstin || null,
      state: body.state,
      address: body.address,
      password_hash: passwordHash,
      email_verified: false,
      mobile_verified: false,
      role: 'CLIENT',
    });

    if (error) {
      return reply.status(500).send({ error: 'Failed to create account' });
    }

    const otpResult = await sendOtp(email, 'SIGNUP', request.ip);
    if (!otpResult.success) return reply.status(502).send({ error: otpResult.message });

    return {
      success: true,
      message: 'Verification code has been dispatched to your email address.',
      cooldownSeconds: otpResult.cooldownSeconds || 60,
    };
  });

  app.post('/api/auth/signup/verify', { config: { rateLimit: OTP_VERIFY_RATE_LIMIT } }, async (request, reply) => {
    const body = z
      .object({
        email: z.string().trim().email('Enter a valid email address').max(255),
        code: z.string().trim().regex(/^\d{6}$/, 'Verification code must be 6 digits'),
        welcomeCode: z.string().trim().min(5).max(16).optional(),
      })
      .strict()
      .parse(request.body);

    const email = body.email.toLowerCase();
    const otpResult = await verifyOtp(email, body.code, 'SIGNUP', request.ip);
    if (!otpResult.valid) return reply.status(401).send({ error: otpResult.message });

    const { data: user, error } = await supabase
      .from('users')
      .update({ email_verified: true, mobile_verified: true })
      .eq('email', email)
      .select('*')
      .single();

    if (error || !user) return reply.status(404).send({ error: 'Account not found' });

    if (body.welcomeCode) {
      try {
        await consumeWelcomeCode(body.welcomeCode, {
          id: user.id,
          email: user.email,
          name: user.name,
        });
      } catch (codeErr) {
        request.log.warn({ codeErr }, 'Welcome code consumption warning');
      }
    }

    try {
      const { getDriveService } = await import('../services/googleDrive.js');
      const drive = getDriveService();
      if (drive) await drive.createClientFolder(user.id, user.business_name ?? user.name, user.id);
    } catch (err) {
      request.log.warn({ err }, 'Client Drive folder creation skipped during signup verification');
    }

    // Record DPDP Consents (DPDP Act, 2023 & Rules 2025)
    try {
      await recordSignupConsents({
        userId: user.id,
        email: user.email,
        ipAddress: request.ip,
        userAgent: (request.headers['user-agent'] as string) ?? null,
      });
    } catch (consentErr) {
      request.log.warn({ consentErr }, 'DPDP consent recording warning');
    }

    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role });
    return { token, user: publicUser(user) };
  });

  // -------------------------------------------------------------
  // 4. FORGOT PASSWORD — MOBILE OTP (2Factor.in)
  // -------------------------------------------------------------

  // Step 4A: Request Mobile OTP for Password Reset
  app.post('/api/auth/forgot-password/mobile-otp', { config: { rateLimit: PASSWORD_RESET_RATE_LIMIT } }, async (request, reply) => {
    const { mobile } = z
      .object({ mobile: z.string().trim().min(10, 'Enter your registered 10-digit mobile number').max(15) })
      .strict()
      .parse(request.body);

    const norm = normalizeIndianMobile(mobile);
    if (!norm.valid) return reply.status(400).send({ error: norm.error });
    const phone = norm.normalized;

    const { data: user } = await supabase.from('users').select('id, phone').eq('phone', phone).maybeSingle();

    if (!user) {
      // Don't leak whether mobile exists, return friendly response
      return {
        success: true,
        message: 'If an account is associated with this mobile number, an OTP has been sent.',
        cooldownSeconds: 60,
      };
    }

    const otpResult = await sendMobileOtp(phone, 'PASSWORD_RESET_MOBILE', request.ip);
    if (!otpResult.success) {
      return reply.status(400).send({ error: otpResult.message, cooldownSeconds: otpResult.cooldownSeconds });
    }

    await logAuthAudit({
      eventType: 'PASSWORD_RESET_REQUESTED',
      userId: user.id,
      identifier: phone,
      ipAddress: request.ip,
      metadata: { method: 'MOBILE_OTP' },
    });

    return {
      success: true,
      sessionId: otpResult.sessionId,
      message: 'Password reset OTP has been sent to your registered mobile number.',
      cooldownSeconds: otpResult.cooldownSeconds,
    };
  });

  // Step 4B: Verify Mobile OTP & Issue Short-Lived Reset Authorization Token
  app.post('/api/auth/forgot-password/verify-mobile-otp', { config: { rateLimit: OTP_VERIFY_RATE_LIMIT } }, async (request, reply) => {
    const body = z
      .object({
        mobile: z.string().trim().min(10).max(15),
        sessionId: z.string().trim().min(1).max(128),
        otp: z.string().trim().regex(/^\d{4,6}$/, 'Enter the 4-6 digit numeric OTP'),
      })
      .strict()
      .parse(request.body);

    const norm = normalizeIndianMobile(body.mobile);
    if (!norm.valid) return reply.status(400).send({ error: norm.error });
    const phone = norm.normalized;

    const verifyResult = await verifyMobileOtp(
      phone,
      body.sessionId,
      body.otp,
      'PASSWORD_RESET_MOBILE',
      request.ip
    );

    if (!verifyResult.valid) {
      return reply.status(400).send({
        error: verifyResult.message,
        remainingAttempts: verifyResult.remainingAttempts,
      });
    }

    const { data: user } = await supabase.from('users').select('id, email').eq('phone', phone).maybeSingle();
    if (!user) return reply.status(404).send({ error: 'Account not found' });

    // Generate single-use, 15-minute reset token
    const { resetToken, expiresAt } = await createResetAuthorization(
      user.id,
      user.email,
      'MOBILE_OTP',
      request.ip
    );

    return {
      valid: true,
      resetToken,
      expiresAt,
      message: 'Mobile OTP verified. Please choose a new secure password.',
    };
  });

  // Step 4C: Set New Password using Reset Authorization Token
  app.post('/api/auth/forgot-password/reset-with-token', { config: { rateLimit: PASSWORD_RESET_RATE_LIMIT } }, async (request, reply) => {
    const body = z
      .object({
        resetToken: z.string().trim().min(16).max(128, 'Invalid reset token length'),
        password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password exceeds 128 characters'),
      })
      .strict()
      .parse(request.body);

    const passwordError = validatePassword(body.password);
    if (passwordError) return reply.status(400).send({ error: passwordError });

    const authResult = await consumeResetAuthorization(body.resetToken, request.ip);
    if (!authResult.valid || !authResult.userId) {
      return reply.status(400).send({ error: authResult.message });
    }

    const passwordHash = await hashPassword(body.password);
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: passwordHash, must_reset_password: false })
      .eq('id', authResult.userId);

    if (updateError) {
      request.log.error({ err: updateError, userId: authResult.userId }, 'Password reset update error');
      return reply.status(500).send({ error: 'Failed to update password. Please try again.' });
    }

    return { message: 'Password updated successfully. You can now login with your new password.' };
  });

  // -------------------------------------------------------------
  // 5. FORGOT PASSWORD — EMAIL (Existing GST Bro system)
  // -------------------------------------------------------------
  app.post('/api/auth/forgot-password', { config: { rateLimit: PASSWORD_RESET_RATE_LIMIT } }, async (request, reply) => {
    const { email } = z.object({ email: z.string().trim().email().max(255) }).strict().parse(request.body);
    const normalized = email.trim().toLowerCase();

    const { data: user } = await supabase.from('users').select('id').ilike('email', normalized).maybeSingle();
    if (!user) {
      return { message: 'If an account exists, a reset code has been sent to your email.' };
    }

    const otpResult = await sendOtp(normalized, 'RESET_PASSWORD', request.ip);
    if (!otpResult.success) return reply.status(500).send({ error: otpResult.message });

    await logAuthAudit({
      eventType: 'PASSWORD_RESET_REQUESTED',
      userId: user.id,
      identifier: normalized,
      ipAddress: request.ip,
      metadata: { method: 'EMAIL_OTP' },
    });

    return { message: 'If an account exists, a reset code has been sent to your email.', cooldownSeconds: otpResult.cooldownSeconds };
  });

  // Verify email OTP and issue reset token
  app.post('/api/auth/forgot-password/verify-email-otp', { config: { rateLimit: OTP_VERIFY_RATE_LIMIT } }, async (request, reply) => {
    const body = z
      .object({
        email: z.string().trim().email().max(255),
        code: z.string().trim().regex(/^\d{6}$/, 'Verification code must be 6 digits'),
      })
      .strict()
      .parse(request.body);

    const email = body.email.trim().toLowerCase();
    const otpResult = await verifyOtp(email, body.code, 'RESET_PASSWORD', request.ip);
    if (!otpResult.valid) {
      return reply.status(401).send({ error: otpResult.message, remainingAttempts: otpResult.remainingAttempts });
    }

    const { data: user } = await supabase.from('users').select('id, email').ilike('email', email).maybeSingle();
    if (!user) return reply.status(404).send({ error: 'Account not found' });

    const { resetToken, expiresAt } = await createResetAuthorization(
      user.id,
      user.email,
      'EMAIL_OTP',
      request.ip
    );

    return {
      valid: true,
      resetToken,
      expiresAt,
      message: 'Email code verified. Please choose a new secure password.',
    };
  });

  // Legacy reset-password endpoint (supports both resetToken OR direct email+code)
  app.post('/api/auth/reset-password', { config: { rateLimit: PASSWORD_RESET_RATE_LIMIT } }, async (request, reply) => {
    const body = z
      .object({
        resetToken: z.string().trim().max(128).optional(),
        email: z.string().trim().email().max(255).optional(),
        code: z.string().trim().regex(/^\d{6}$/).optional(),
        password: z.string().min(8).max(128),
      })
      .strict()
      .parse(request.body);

    const passwordError = validatePassword(body.password);
    if (passwordError) return reply.status(400).send({ error: passwordError });

    if (body.resetToken) {
      const authResult = await consumeResetAuthorization(body.resetToken, request.ip);
      if (!authResult.valid || !authResult.userId) {
        return reply.status(400).send({ error: authResult.message });
      }

      const passwordHash = await hashPassword(body.password);
      await supabase
        .from('users')
        .update({ password_hash: passwordHash, email_verified: true, must_reset_password: false })
        .eq('id', authResult.userId);

      return { message: 'Password reset successfully. You can now login.' };
    }

    if (!body.email || !body.code) {
      return reply.status(400).send({ error: 'Missing reset verification parameters' });
    }

    const email = body.email.trim().toLowerCase();
    const otpResult = await verifyOtp(email, body.code, 'RESET_PASSWORD', request.ip);
    if (!otpResult.valid) return reply.status(401).send({ error: otpResult.message });

    const { data: user } = await supabase.from('users').select('id, email').ilike('email', email).maybeSingle();
    if (!user) return reply.status(404).send({ error: 'Account not found' });

    const passwordHash = await hashPassword(body.password);
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: passwordHash, email_verified: true, must_reset_password: false })
      .eq('id', user.id);

    if (updateError) {
      return reply.status(500).send({ error: 'Password reset could not be saved. Please try again.' });
    }

    return { message: 'Password reset successfully. You can now login.' };
  });

  // -------------------------------------------------------------
  // 6. RESEND & MOBILE VERIFICATION UTILITIES
  // -------------------------------------------------------------
  app.post('/api/auth/resend-mobile-otp', { config: { rateLimit: OTP_GENERATE_RATE_LIMIT } }, async (request, reply) => {
    const { mobile, purpose } = z
      .object({
        mobile: z.string().trim().min(10).max(15),
        purpose: z.enum([
          'SIGNUP_MOBILE_VERIFICATION',
          'PASSWORD_RESET_MOBILE',
          'MOBILE_CHANGE',
          'TEAM_MOBILE_VERIFICATION',
        ]),
      })
      .strict()
      .parse(request.body);

    const norm = normalizeIndianMobile(mobile);
    if (!norm.valid) return reply.status(400).send({ error: norm.error });

    const result = await sendMobileOtp(norm.normalized, purpose, request.ip);
    if (!result.success) {
      return reply.status(400).send({ error: result.message, cooldownSeconds: result.cooldownSeconds });
    }

    return {
      success: true,
      sessionId: result.sessionId,
      message: 'New OTP dispatched via SMS.',
      cooldownSeconds: result.cooldownSeconds,
    };
  });

  app.post('/api/auth/resend-signup-otp', { config: { rateLimit: OTP_GENERATE_RATE_LIMIT } }, async (request, reply) => {
    const { email } = z.object({ email: z.string().trim().email().max(255) }).strict().parse(request.body);
    const normalized = email.trim().toLowerCase();

    const { data: user } = await supabase.from('users').select('id, email_verified').eq('email', normalized).single();
    if (!user) {
      // Return generic message — do NOT reveal whether the email is registered (MED-AUTH-04)
      return { message: 'If an unverified account exists, a verification code has been sent.', cooldownSeconds: 60 };
    }
    if (user.email_verified) return reply.status(400).send({ error: 'Email already verified. Please login.' });

    const otpResult = await sendOtp(normalized, 'SIGNUP', request.ip);
    if (!otpResult.success) return reply.status(500).send({ error: otpResult.message });

    return { message: 'Verification code sent.', cooldownSeconds: otpResult.cooldownSeconds };
  });

  app.post('/api/auth/resend-reset-otp', { config: { rateLimit: OTP_GENERATE_RATE_LIMIT } }, async (request, reply) => {
    const { email } = z.object({ email: z.string().trim().email().max(255) }).strict().parse(request.body);
    const normalized = email.trim().toLowerCase();

    const { data: user } = await supabase.from('users').select('id, email').ilike('email', normalized).maybeSingle();
    if (!user) {
      // Return generic message — do NOT reveal whether the email is registered (MED-AUTH-03)
      return { message: 'If an account exists, a reset code has been sent to your email.', cooldownSeconds: 60 };
    }

    const otpResult = await sendOtp(normalized, 'RESET_PASSWORD', request.ip);
    if (!otpResult.success) return reply.status(500).send({ error: otpResult.message });

    return { message: 'Reset code sent to your email.', cooldownSeconds: otpResult.cooldownSeconds };
  });

  app.post('/api/auth/change-password', { config: { rateLimit: PASSWORD_RESET_RATE_LIMIT }, preHandler: authenticate }, async (request, reply) => {
    const body = z
      .object({
        currentPassword: z.string().min(1, 'Current password is required').max(128),
        password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password cannot exceed 128 characters'),
      })
      .strict()
      .parse(request.body);

    const passwordError = validatePassword(body.password);
    if (passwordError) return reply.status(400).send({ error: passwordError });

    const { data: user } = await supabase
      .from('users')
      .select('id, password_hash')
      .eq('id', request.user.id)
      .single();

    if (!user || !(await verifyPassword(body.currentPassword, user.password_hash))) {
      return reply.status(401).send({ error: 'Current password is incorrect' });
    }

    const passwordHash = await hashPassword(body.password);
    await supabase
      .from('users')
      .update({ password_hash: passwordHash, must_reset_password: false })
      .eq('id', request.user.id);

    return { message: 'Password changed successfully.' };
  });

  // Mobile number verification for authenticated users (Client / Team / Admin)
  app.post('/api/auth/verify-mobile/request', { config: { rateLimit: OTP_GENERATE_RATE_LIMIT }, preHandler: authenticate }, async (request, reply) => {
    const { phone } = z.object({ phone: mobileSchema }).strict().parse(request.body);
    const norm = normalizeIndianMobile(phone);
    if (!norm.valid) return reply.status(400).send({ error: norm.error });

    const purpose: MobileOtpPurpose = request.user.role === 'TEAM' ? 'TEAM_MOBILE_VERIFICATION' : 'MOBILE_CHANGE';
    const otpResult = await sendMobileOtp(norm.normalized, purpose, request.ip);

    if (!otpResult.success) {
      return reply.status(400).send({ error: otpResult.message, cooldownSeconds: otpResult.cooldownSeconds });
    }

    return {
      success: true,
      sessionId: otpResult.sessionId,
      message: 'Verification OTP sent to mobile.',
      cooldownSeconds: otpResult.cooldownSeconds,
    };
  });

  app.post('/api/auth/verify-mobile/verify', { config: { rateLimit: OTP_VERIFY_RATE_LIMIT }, preHandler: authenticate }, async (request, reply) => {
    const { phone, sessionId, otp } = z
      .object({
        phone: mobileSchema,
        sessionId: z.string().trim().min(1).max(128),
        otp: z.string().trim().regex(/^\d{4,6}$/, 'Enter the 4-6 digit numeric OTP'),
      })
      .strict()
      .parse(request.body);

    const norm = normalizeIndianMobile(phone);
    if (!norm.valid) return reply.status(400).send({ error: norm.error });

    const purpose: MobileOtpPurpose = request.user.role === 'TEAM' ? 'TEAM_MOBILE_VERIFICATION' : 'MOBILE_CHANGE';
    const result = await verifyMobileOtp(norm.normalized, sessionId, otp, purpose, request.ip);

    if (!result.valid) {
      return reply.status(400).send({ error: result.message, remainingAttempts: result.remainingAttempts });
    }

    await supabase
      .from('users')
      .update({
        phone: norm.normalized,
        mobile_verified: true,
        mobile_verified_at: new Date().toISOString(),
        mobile_verification_method: '2FACTOR',
      })
      .eq('id', request.user.id);

    await logAuthAudit({
      eventType: 'MOBILE_NUMBER_CHANGED',
      userId: request.user.id,
      identifier: norm.normalized,
      ipAddress: request.ip,
    });

    return { success: true, message: 'Mobile number verified and updated successfully.' };
  });

  app.get('/api/auth/me', { preHandler: authenticate }, async (request) => {
    const { data: user } = await supabase
      .from('users')
      .select('id, email, name, phone, role, business_name, gstin, state, address, must_reset_password, mobile_verified, mobile_verified_at')
      .eq('id', request.user.id)
      .single();
    return { user: user ? publicUser(user) : null };
  });

  // -------------------------------------------------------------
  // LOGOUT (Server-side Session Revocation & Token Invalidation)
  // -------------------------------------------------------------
  app.post('/api/auth/logout', { preHandler: authenticate }, async (request, reply) => {
    const rawToken = getRawAuthToken(request);
    if (rawToken) {
      const payload = (request.user as any);
      await revokeToken(rawToken, request.user.id, payload?.exp);
    }
    await logAuthAudit({
      eventType: 'LOGOUT',
      userId: request.user.id,
      identifier: request.user.email,
      ipAddress: request.ip,
      metadata: { role: request.user.role },
    });
    return { success: true, message: 'Session logged out and invalidated successfully' };
  });
}

export async function leadsRoutes(app: FastifyInstance) {
  app.post('/api/leads', { config: { rateLimit: PUBLIC_LEADS_RATE_LIMIT } }, async (request, reply) => {
    const body = z
      .object({
        name: z.string().trim().min(2, 'Name is required').max(100, 'Name cannot exceed 100 characters'),
        email: z.string().trim().email('Enter a valid email address').max(255, 'Email cannot exceed 255 characters'),
        phone: z
          .string()
          .trim()
          .max(20, 'Phone number cannot exceed 20 characters')
          .regex(/^[+]?[0-9\s\-()]{7,20}$/, 'Invalid phone number format')
          .optional(),
        company: z.string().trim().max(150, 'Company cannot exceed 150 characters').optional(),
        turnover: z.string().trim().max(50, 'Turnover exceeds maximum length').optional(),
        serviceType: z
          .enum(['REGISTRATION', 'RETURNS', 'CANCELLATION', 'GENERAL', 'ADVISORY', 'COMPLIANCE', 'REFUND', 'AUDIT', 'TDS_TCS'])
          .optional(),
        message: z.string().trim().max(3000, 'Message cannot exceed 3000 characters').optional(),
        turnstileToken: z.string().trim().min(1, 'Security verification token is required'),
      })
      .strict()
      .parse(request.body);

    // 1. Verify Turnstile Token Server-Side
    const clientIp = getClientIp(request);
    const turnstileResult = await verifyTurnstileToken(body.turnstileToken, clientIp);
    if (!turnstileResult.success) {
      return reply.status(400).send({
        error: turnstileResult.error || 'Cloudflare Turnstile verification failed. Please try again.',
        details: turnstileResult.errorCodes,
      });
    }

    // 2. Sanitize and Insert Lead
    const safeName = sanitizeText(body.name, 100);
    const safeMessage = body.message ? sanitizeText(body.message, 3000, true) : null;
    const safePhone = body.phone ? sanitizeText(body.phone, 20) : null;
    const safeCompany = body.company ? sanitizeText(body.company, 150) : null;

    const formattedMessage = safeCompany
      ? `[Company: ${safeCompany}]${safeMessage ? ` ${safeMessage}` : ''}`
      : safeMessage;

    const { data, error } = await supabase
      .from('leads')
      .insert({
        name: safeName,
        email: body.email.toLowerCase(),
        phone: safePhone,
        service_type: body.serviceType || 'GENERAL',
        message: formattedMessage,
      })
      .select()
      .single();

    if (error) return reply.status(500).send({ error: 'Failed to submit lead' });
    return { lead: data, verified: true };
  });

  app.get('/api/admin/leads', { preHandler: [authenticate, requireRole('ADMIN')] }, async () => {
    const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    return { leads: data ?? [] };
  });

  app.patch(
    '/api/admin/leads/:id',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (request) => {
      const { id } = z.object({ id: uuidParamSchema }).parse(request.params);
      const body = z
        .object({ status: z.enum(['NEW', 'CONTACTED', 'CONVERTED', 'CLOSED']) })
        .strict()
        .parse(request.body);
      const { data } = await supabase.from('leads').update(body).eq('id', id).select().single();
      return { lead: data };
    }
  );
}
