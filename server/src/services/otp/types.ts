export type MobileOtpPurpose =
  | 'SIGNUP_MOBILE_VERIFICATION'
  | 'PASSWORD_RESET_MOBILE'
  | 'MOBILE_CHANGE'
  | 'TEAM_MOBILE_VERIFICATION';

export type OtpStatus = 'PENDING' | 'SENT' | 'VERIFIED' | 'EXPIRED' | 'FAILED' | 'BLOCKED';

export type OtpProviderName = 'apitxt' | '2factor';

export interface SendOtpParams {
  phone: string; // 10-digit normalized Indian phone
  otp: string; // 6-digit cryptographic plain OTP (held strictly temporarily in memory)
  purpose: MobileOtpPurpose;
  ipAddress?: string;
}

export interface SendOtpResponse {
  success: boolean;
  provider: OtpProviderName;
  providerRequestId?: string;
  providerCost?: number;
  message: string;
  rawError?: string;
  cooldownSeconds: number;
  simulated?: boolean;
}

export interface OtpProvider {
  readonly name: OtpProviderName;
  sendOtp(params: SendOtpParams): Promise<SendOtpResponse>;
}

export interface MobileOtpSession {
  id: string;
  phone: string; // Clean 10-digit format
  sessionId: string;
  purpose: MobileOtpPurpose;
  otpHash: string; // HMAC-SHA256 hash with server pepper and per-session salt
  salt: string;
  attempts: number;
  maxAttempts: number;
  status: OtpStatus;
  verified: boolean;
  provider: OtpProviderName;
  providerRequestId?: string;
  providerCost?: number;
  mockOtp?: string; // Only retained in mock/development mode
  expiresAt: Date;
  createdAt: Date;
  verifiedAt?: Date;
}
