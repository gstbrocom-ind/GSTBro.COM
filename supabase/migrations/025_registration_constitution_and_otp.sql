-- ============================================================================
-- Migration 025: Registration Constitution Types, Practice Fields & OTP Settings
-- ============================================================================

-- 1. Add constitution_type, practice_type, and membership_number to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS constitution_type VARCHAR(60) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS practice_type VARCHAR(60) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS membership_number VARCHAR(60) DEFAULT NULL;

-- 2. Add constitution_type, practice_type, and membership_number to firms table
ALTER TABLE firms 
ADD COLUMN IF NOT EXISTS constitution_type VARCHAR(60) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS practice_type VARCHAR(60) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS membership_number VARCHAR(60) DEFAULT NULL;

-- 3. Seed site_settings with signup_phone_otp_enabled = 'false'
-- By default, Phone SMS OTP is hidden on public signup since SMS gateway is inactive,
-- routing users directly and reliably through Email OTP verification.
-- Super Admin can toggle this to 'true' anytime from the Super Admin dashboard.
INSERT INTO site_settings (key, value, updated_at)
VALUES ('signup_phone_otp_enabled', 'false', NOW())
ON CONFLICT (key) DO NOTHING;
