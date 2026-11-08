import { env } from '../config/env.js';

export interface TurnstileVerificationResult {
  success: boolean;
  error?: string;
  challengeTs?: string;
  hostname?: string;
  errorCodes?: string[];
}

/**
 * Validates a Cloudflare Turnstile token server-side via the official Siteverify API.
 * Never trusts frontend-only assertions.
 */
export async function verifyTurnstileToken(
  token: string,
  clientIp?: string,
  secretKeyOverride?: string
): Promise<TurnstileVerificationResult> {
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return {
      success: false,
      error: 'Missing Cloudflare Turnstile verification token',
    };
  }

  // Allow seamless local dev verification when running on localhost / dev environment
  if (token === 'turnstile_local_verified_token') {
    if (env.NODE_ENV !== 'production' || clientIp === '127.0.0.1' || clientIp === '::1') {
      return {
        success: true,
        challengeTs: new Date().toISOString(),
        hostname: 'localhost',
      };
    }
  }

  const secretKey = secretKeyOverride || env.TURNSTILE_SECRET_KEY;

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token.trim());
    if (clientIp) {
      formData.append('remoteip', clientIp);
    }

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = (await res.json()) as {
      success: boolean;
      'error-codes'?: string[];
      challenge_ts?: string;
      hostname?: string;
    };

    if (!data.success) {
      const errorCodes = data['error-codes'] || [];
      let friendlyMsg = 'Bot verification failed. Please complete the security check again.';
      if (errorCodes.includes('timeout-or-duplicate')) {
        friendlyMsg = 'Verification token has expired or has already been used. Please try again.';
      } else if (errorCodes.includes('invalid-input-response')) {
        friendlyMsg = 'Invalid verification response token.';
      } else if (errorCodes.includes('missing-input-response')) {
        friendlyMsg = 'Missing verification response token.';
      }

      return {
        success: false,
        error: friendlyMsg,
        errorCodes,
      };
    }

    return {
      success: true,
      challengeTs: data.challenge_ts,
      hostname: data.hostname,
    };
  } catch (err: any) {
    console.error('Turnstile verification network error:', err);
    return {
      success: false,
      error: 'Turnstile verification service temporarily unreachable. Please retry.',
    };
  }
}
