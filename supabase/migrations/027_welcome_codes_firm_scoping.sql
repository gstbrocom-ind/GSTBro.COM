-- Migration 027: Welcome Codes Firm Scoping & Target Role
-- Enables CA Firms to generate client welcome codes scoped to their practice,
-- while Super Admin generates welcome codes exclusively for onboarding new CA Firms.

ALTER TABLE welcome_codes
  ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS target_role VARCHAR(20) DEFAULT 'CLIENT';

CREATE INDEX IF NOT EXISTS idx_welcome_codes_firm_id ON welcome_codes(firm_id);
CREATE INDEX IF NOT EXISTS idx_welcome_codes_target_role ON welcome_codes(target_role);
