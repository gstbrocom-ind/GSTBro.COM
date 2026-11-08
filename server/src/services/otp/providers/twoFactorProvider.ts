import { env } from '../../../config/env.js';
import type { OtpProvider, SendOtpParams, SendOtpResponse } from '../types.js';

const RESEND_COOLDOWN_SECONDS = 60;
const REQUEST_TIMEOUT_MS = 10000;

export class TwoFactorProvider implements OtpProvider {
  readonly name = '2factor' as const;

  async sendOtp(params: SendOtpParams): Promise<SendOtpResponse> {
    const apiKey = env.TWOFACTOR_API_KEY?.trim();
    const isMock = !apiKey || apiKey === 'mock-key';

    // Development / Test simulation mode
    if (isMock) {
      const mockSessionId = `2FACTOR-MOCK-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      if (process.env.NODE_ENV !== 'production') {
        const masked = params.phone.replace(/^(\d{2})\d{4}(\d{4})$/, '$1****$2');
        console.info(
          `\x1b[33m[2FACTOR DEV MODE]\x1b[0m SMS OTP dispatched to \x1b[36m${masked}\x1b[0m (Purpose: ${params.purpose}, Session: ${mockSessionId})`
        );
      }
      return {
        success: true,
        provider: this.name,
        providerRequestId: mockSessionId,
        message: 'OTP has been dispatched via SMS to your mobile number.',
        cooldownSeconds: RESEND_COOLDOWN_SECONDS,
        simulated: true,
      };
    }

    // Live call to 2Factor.in REST API (passing the generated OTP directly)
    try {
      const baseUrl = env.TWOFACTOR_API_BASE_URL.replace(/\/+$/, '');
      const template = env.TWOFACTOR_TEMPLATE_NAME ? `/${encodeURIComponent(env.TWOFACTOR_TEMPLATE_NAME)}` : '';
      const requestUrl = `${baseUrl}/${apiKey}/SMS/${params.phone}/${params.otp}${template}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const res = await fetch(requestUrl, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = (await res.json()) as { Status?: string; Details?: string };

      if (data.Status !== 'Success' || !data.Details) {
        console.error('[2Factor] Error sending SMS:', data);
        return {
          success: false,
          provider: this.name,
          message: data.Details || 'Unable to deliver SMS OTP at this moment. Please try again.',
          rawError: data.Details,
          cooldownSeconds: 0,
        };
      }

      return {
        success: true,
        provider: this.name,
        providerRequestId: data.Details,
        message: 'OTP has been dispatched via SMS to your mobile number.',
        cooldownSeconds: RESEND_COOLDOWN_SECONDS,
      };
    } catch (err: any) {
      const isTimeout = err?.name === 'AbortError';
      console.error(`[2Factor] Network failure: ${isTimeout ? 'Request timed out' : err?.message || 'Unknown error'}`);
      return {
        success: false,
        provider: this.name,
        message: 'SMS provider connection error. Please try again later.',
        rawError: isTimeout ? 'Request timed out' : err?.message,
        cooldownSeconds: 0,
      };
    }
  }
}
