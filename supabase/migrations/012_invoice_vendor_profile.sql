-- ============================================================================
-- 012_invoice_vendor_profile.sql
-- GSTBro Invoice Module: Extend users table with vendor invoice profile fields
-- These are ADDITIVE columns only — no impact on existing functionality.
-- ============================================================================

-- PAN (extracted from GSTIN chars 3-12, but stored separately for display)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS pan TEXT;

-- Branding assets (stored via Cloudinary or direct URL)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- Banking details for invoice footer (JSONB for flexibility)
-- Schema: { "account_number": "", "ifsc": "", "bank_name": "", "branch": "" }
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS bank_details JSONB DEFAULT '{}'::jsonb;

-- UPI ID for QR code generation on invoices
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS upi_id TEXT;

-- Default terms & conditions printed on invoices
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS invoice_terms TEXT DEFAULT 'Goods once sold will not be taken back. Subject to local jurisdiction.';

-- State code (2-digit numeric code, e.g. '27' for Maharashtra)
-- The existing 'state' column stores the full name; this stores the GST state code
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS state_code CHAR(2);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_pan ON users(pan) WHERE pan IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_state_code ON users(state_code) WHERE state_code IS NOT NULL;
