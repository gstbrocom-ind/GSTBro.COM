-- 007_twofactor_auth.sql
-- TwoFactor.in Mobile Verification, Password Reset Authorizations & Security Audit Logging

-- Required for uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- 1. Extend users table for mobile verification tracking
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mobile_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mobile_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mobile_verification_method TEXT DEFAULT '2FACTOR';

CREATE INDEX IF NOT EXISTS idx_users_phone
  ON users(phone);

CREATE INDEX IF NOT EXISTS idx_users_phone_verified
  ON users(phone)
  WHERE mobile_verified = TRUE;


-- 2. Mobile OTP Sessions table
-- Tracks 2Factor session IDs, attempts, cooldowns
CREATE TABLE IF NOT EXISTS mobile_otp_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT NOT NULL,
  session_id TEXT NOT NULL,
  purpose TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mobile_otp_phone_purpose
  ON mobile_otp_sessions(phone, purpose);

CREATE INDEX IF NOT EXISTS idx_mobile_otp_session_id
  ON mobile_otp_sessions(session_id);

CREATE INDEX IF NOT EXISTS idx_mobile_otp_expires_at
  ON mobile_otp_sessions(expires_at);


-- 3. Password Reset Authorizations
-- Single-use, short-lived 10-15 minute reset tokens
CREATE TABLE IF NOT EXISTS password_reset_authorizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_hash TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verified_via TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'PASSWORD_RESET',
  used BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pwd_reset_auth_token_hash
  ON password_reset_authorizations(token_hash);

CREATE INDEX IF NOT EXISTS idx_pwd_reset_auth_user_id
  ON password_reset_authorizations(user_id);

CREATE INDEX IF NOT EXISTS idx_pwd_reset_auth_expires_at
  ON password_reset_authorizations(expires_at);


-- 4. Auth Security Audit Logs
CREATE TABLE IF NOT EXISTS auth_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  identifier TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type
  ON auth_audit_logs(event_type);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
  ON auth_audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON auth_audit_logs(created_at);