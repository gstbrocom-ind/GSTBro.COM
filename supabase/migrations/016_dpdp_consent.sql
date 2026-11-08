-- ============================================================================
-- 016_dpdp_consent.sql
-- GSTBro DPDP Act Readiness: Consent Records
-- Records every consent grant, withdrawal, and update with full audit trail.
-- Append-only: no DELETE or UPDATE permitted via RLS.
-- ============================================================================

CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- null for pre-signup leads/enquiries
  email TEXT,                                             -- for pre-signup lead consent records
  notice_version TEXT NOT NULL,                          -- semver of privacy notice shown, e.g. '1.0.0'
  purpose TEXT NOT NULL CHECK (purpose IN (
    'service_delivery',        -- core GST service processing
    'support_communications',  -- case messages, support tickets
    'service_notifications',   -- transactional emails/SMS about cases and invoices
    'marketing_email',         -- optional marketing emails
    'analytics'                -- optional product analytics
  )),
  data_categories TEXT[] NOT NULL,                       -- e.g. ARRAY['name','email','phone']
  action TEXT NOT NULL CHECK (action IN ('GRANTED', 'WITHDRAWN', 'UPDATED')),
  channel TEXT NOT NULL CHECK (channel IN (
    'SIGNUP_FORM',
    'LEAD_FORM',
    'PRIVACY_SETTINGS',
    'ACCOUNT_CLOSURE',
    'ADMIN_RECORDED',
    'SYSTEM'
  )),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consent_records_user_id ON consent_records(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consent_records_email ON consent_records(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consent_records_purpose ON consent_records(purpose, action);
CREATE INDEX IF NOT EXISTS idx_consent_records_created_at ON consent_records(created_at DESC);

-- RLS
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access consent_records" ON consent_records
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Deny anon consent_records" ON consent_records
  FOR ALL TO anon USING (false) WITH CHECK (false);

-- Prevent direct mutations by authenticated (non-service) sessions
CREATE POLICY "Deny direct authenticated delete on consent_records" ON consent_records
  FOR DELETE TO authenticated USING (false);

CREATE POLICY "Deny direct authenticated update on consent_records" ON consent_records
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
