-- Password auth + extended client profile fields

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS gstin TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_gstin ON users(gstin) WHERE gstin IS NOT NULL;

-- OTP purpose: SIGNUP | RESET_PASSWORD
ALTER TABLE otp_codes
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'SIGNUP';

CREATE INDEX IF NOT EXISTS idx_otp_codes_purpose ON otp_codes(email, purpose);
