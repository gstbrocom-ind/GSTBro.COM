/**
 * TwoFactor / Unified Mobile OTP Service
 * Backward-compatible bridge delegating to provider-independent OTP Manager.
 */

export {
  normalizeIndianMobile,
  sendMobileOtp,
  verifyMobileOtp,
  getCooldownRemainingSeconds,
  getActiveOtpProvider,
} from './otp/otpManager.js';

export type {
  MobileOtpPurpose,
  MobileOtpSession,
  OtpProviderName,
  OtpProvider,
  OtpStatus,
} from './otp/types.js';
