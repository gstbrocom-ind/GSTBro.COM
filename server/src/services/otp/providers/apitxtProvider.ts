import { env } from '../../../config/env.js';
import type { OtpProvider, SendOtpParams, SendOtpResponse } from '../types.js';

const RESEND_COOLDOWN_SECONDS = 60;
const REQUEST_TIMEOUT_MS = 10000;

export class ApiTxtProvider implements OtpProvider {
  readonly name = 'apitxt' as const;

  async sendOtp(params: SendOtpParams): Promise<SendOtpResponse> {
    const authkey = env.APITXT_AUTHKEY?.trim();
    const isMock = !authkey || authkey === 'mock-key';

    // Development / Test simulation mode
    if (isMock) {
      const mockReqId = `APITXT-MOCK-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      if (process.env.NODE_ENV !== 'production') {
        const masked = params.phone.replace(/^(\d{2})\d{4}(\d{4})$/, '$1****$2');
        console.info(
          `\x1b[33m[APITxT DEV MODE]\x1b[0m SMS OTP dispatched to \x1b[36m${masked}\x1b[0m (Purpose: ${params.purpose}, Request ID: ${mockReqId})`
        );
      }
      return {
        success: true,
        provider: this.name,
        providerRequestId: mockReqId,
        providerCost: 0,
        message: 'OTP has been dispatched via SMS to your mobile number.',
        cooldownSeconds: RESEND_COOLDOWN_SECONDS,
        simulated: true,
      };
    }

    // Production / Live POST request
    const endpoint = `${env.APITXT_API_BASE_URL.replace(/\/+$/, '')}/sendOTP`;

    // Ensure 12-digit Indian format (e.g. 919876543210) for APITxT
    const formattedMobile = params.phone.length === 10 ? `91${params.phone}` : params.phone;

    const formBody = new URLSearchParams();
    formBody.set('authkey', authkey);
    formBody.set('mobile', formattedMobile);
    formBody.set('otp', params.otp);
    formBody.set('channel', 'sms');
    formBody.set('country', '91');

    if (env.APITXT_SMS_TEMPLATE_ID?.trim()) {
      formBody.set('template_id', env.APITXT_SMS_TEMPLATE_ID.trim());
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: formBody.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const rawText = await res.text();
      let responseJson: any = null;
      try {
        responseJson = JSON.parse(rawText);
      } catch {
        // Non-JSON response
        console.error('[APITxT] Malformed response from provider');
        return {
          success: false,
          provider: this.name,
          message: 'Unable to deliver SMS OTP at this moment. Please try again.',
          rawError: 'Malformed response from SMS gateway',
          cooldownSeconds: 0,
        };
      }

      const isSuccess =
        responseJson?.status === 'success' ||
        responseJson?.status === 200 ||
        responseJson?.type === 'success' ||
        (res.ok && responseJson?.status !== 'error');

      if (!isSuccess) {
        const errorMsg = responseJson?.message || responseJson?.error || 'Provider rejected OTP send request';
        console.error('[APITxT] API returned failure status:', errorMsg);
        return {
          success: false,
          provider: this.name,
          message: 'Unable to deliver SMS OTP at this moment. Please try again.',
          rawError: errorMsg,
          cooldownSeconds: 0,
        };
      }

      const requestId = responseJson?.data?.request_id || responseJson?.request_id || `APITXT-${Date.now()}`;
      const cost = typeof responseJson?.data?.cost === 'number' ? responseJson.data.cost : undefined;

      return {
        success: true,
        provider: this.name,
        providerRequestId: requestId,
        providerCost: cost,
        message: 'OTP has been dispatched via SMS to your mobile number.',
        cooldownSeconds: RESEND_COOLDOWN_SECONDS,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isTimeout = err?.name === 'AbortError';
      console.error(`[APITxT] Network error: ${isTimeout ? 'Request timed out' : err?.message || 'Unknown error'}`);
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
