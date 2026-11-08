-- Ensure password reset storage exists in deployed Supabase projects.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE otp_codes
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'SIGNUP';

CREATE INDEX IF NOT EXISTS idx_otp_codes_email_purpose ON otp_codes(email, purpose);
