-- ============================================================================
-- 019_retention_schedules.sql
-- GSTBro DPDP Act Readiness: Retention Schedules & Erasure Staging
-- Adds deletion staging columns to users and leads.
-- Creates a retention_policies registry for internal governance.
-- Adds cleanup support for short-lived auth tables.
-- ============================================================================

-- 1. Retention Policy Registry (internal governance document, not user-facing)
CREATE TABLE IF NOT EXISTS retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  retention_days INT,                -- NULL = indefinite / legal hold
  legal_basis TEXT,                  -- e.g. 'GST_ACT_S_36', 'FRAUD_PREVENTION', 'SECURITY_AUDIT', 'CONSENT', 'CONTRACT'
  legal_reference TEXT,              -- e.g. 'CGST Act 2017, Section 36 — 6 years'
  auto_purge_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  review_date DATE,
  approved_by TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial retention policy register
-- IMPORTANT: retention_days values marked 0 are PLACEHOLDERS pending legal review.
-- Do not use 0-day values to trigger actual deletion until legal counsel confirms the period.
INSERT INTO retention_policies (table_name, description, retention_days, legal_basis, legal_reference, auto_purge_enabled, note) VALUES
  ('users', 'Registered user account records', NULL, 'CONTRACT', 'Retained while account is active; staged deletion on erasure request', FALSE, 'LEGAL REVIEW REQUIRED for post-closure period'),
  ('leads', 'Pre-signup enquiry records', NULL, 'CONSENT', 'Pending legal review of appropriate retention for unconverted leads', FALSE, 'LEGAL REVIEW REQUIRED'),
  ('client_gst_data', 'GST return financial data', NULL, 'GST_ACT', 'CGST Act 2017 Section 36 — books of account 6 years; confirm with counsel', FALSE, 'LEGAL REVIEW REQUIRED'),
  ('invoices', 'Tax invoices (immutable legal records)', NULL, 'GST_ACT', 'CGST Act 2017 Section 36 — 6 years from filing of annual return; confirm with counsel', FALSE, 'LEGAL REVIEW REQUIRED'),
  ('documents', 'Case-linked document metadata (files in Google Drive)', NULL, 'GST_ACT', 'Mirrors client_gst_data retention; confirm with counsel', FALSE, 'LEGAL REVIEW REQUIRED'),
  ('client_documents', 'Client workspace document metadata', NULL, 'CONTRACT', 'Retained during active service; review on account closure', FALSE, 'LEGAL REVIEW REQUIRED'),
  ('client_messages', 'Client-team support messages', 365, 'CONTRACT', '12 months post last message or account closure, whichever is later — PENDING LEGAL REVIEW', FALSE, 'LEGAL REVIEW REQUIRED'),
  ('otp_codes', 'Email OTP codes (hashed)', 7, 'SECURITY', 'Used/expired OTPs have no operational purpose after 7 days', TRUE, 'Safe to auto-purge used/expired records'),
  ('mobile_otp_sessions', 'Mobile OTP sessions', 7, 'SECURITY', 'Expired sessions have no operational purpose after 7 days', TRUE, 'Safe to auto-purge expired records'),
  ('password_reset_authorizations', 'Single-use password reset tokens (hashed)', 30, 'SECURITY', 'Used/expired tokens have no operational purpose after 30 days', TRUE, 'Safe to auto-purge used/expired records'),
  ('revoked_tokens', 'Revoked JWT tokens (hashed)', 30, 'SECURITY', 'Tokens beyond JWT expiry window are effectively invalid', TRUE, 'LEGAL REVIEW on appropriate window'),
  ('auth_audit_logs', 'Security and authentication audit events', NULL, 'SECURITY_AUDIT', '2 years recommended for security investigations — PENDING LEGAL REVIEW', FALSE, 'LEGAL REVIEW REQUIRED'),
  ('activity_logs', 'Admin/team action audit trail', NULL, 'SECURITY_AUDIT', '2 years recommended — PENDING LEGAL REVIEW', FALSE, 'LEGAL REVIEW REQUIRED'),
  ('consent_records', 'DPDP consent audit trail', NULL, 'LEGAL_OBLIGATION', 'Must be retained to demonstrate lawful processing; PENDING LEGAL REVIEW on period', FALSE, 'LEGAL REVIEW REQUIRED'),
  ('privacy_requests', 'DPDP rights request records', NULL, 'LEGAL_OBLIGATION', 'Must be retained to demonstrate compliance; PENDING LEGAL REVIEW on period', FALSE, 'LEGAL REVIEW REQUIRED'),
  ('breach_incidents', 'Personal data breach incident records', NULL, 'LEGAL_OBLIGATION', 'Must be retained for regulatory accountability; PENDING LEGAL REVIEW on period', FALSE, 'LEGAL REVIEW REQUIRED')
ON CONFLICT (table_name) DO NOTHING;

-- 2. Erasure staging columns on users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletion_hold_reason TEXT,   -- why deletion is held (e.g. 'ACTIVE_CASES', 'LEGAL_RETENTION')
  ADD COLUMN IF NOT EXISTS is_anonymized BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Soft-delete / erasure flag for leads
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS erased_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS erased_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 4. Add privacy_notice_version to site_settings seed (if not already present)
INSERT INTO site_settings (key, value) VALUES
  ('privacy_notice_version', '1.0.0'),
  ('privacy_notice_effective_date', '2027-01-01'),
  ('privacy_grievance_email', 'privacy@gstbro.in'),
  ('privacy_officer_name', ''),
  ('privacy_officer_email', 'privacy@gstbro.in'),
  ('children_age_policy', 'adults_only_18_plus'),
  ('analytics_enabled', 'false'),
  ('dpdp_operational_date', '2027-05-13')
ON CONFLICT (key) DO NOTHING;

-- 5. Indexes for erasure staging
CREATE INDEX IF NOT EXISTS idx_users_deletion_scheduled_at ON users(deletion_scheduled_at) WHERE deletion_scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_is_anonymized ON users(is_anonymized) WHERE is_anonymized = TRUE;
CREATE INDEX IF NOT EXISTS idx_leads_erased_at ON leads(erased_at) WHERE erased_at IS NOT NULL;

-- 6. Trigger
CREATE TRIGGER retention_policies_updated_at
  BEFORE UPDATE ON retention_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE retention_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access retention_policies" ON retention_policies
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Deny anon retention_policies" ON retention_policies
  FOR ALL TO anon USING (false) WITH CHECK (false);
