-- ============================================================================
-- Migration 028: CA Firm Partner Logins & ICAI Credentials Suite
-- Enables CA Firms to invite and manage Co-Executive Partners with full 
-- administrative authority and ICAI regulatory credentials (FCA/ACA, MRN, COP)
-- ============================================================================

-- 1. Extend user_role enum to include FIRM_PARTNER
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'FIRM_PARTNER';

-- 2. Update firm_role check constraint to include FIRM_PARTNER
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_firm_role_check'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_firm_role_check;
  END IF;
  
  ALTER TABLE users ADD CONSTRAINT users_firm_role_check 
    CHECK (firm_role IN ('FIRM_OWNER', 'FIRM_PARTNER', 'FIRM_MANAGER', 'FIRM_STAFF'));
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 3. Add ICAI credentials and partner designation to users
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS icai_membership_no TEXT,
  ADD COLUMN IF NOT EXISTS icai_membership_type TEXT CHECK (icai_membership_type IN ('FCA', 'ACA')),
  ADD COLUMN IF NOT EXISTS cop_number TEXT,
  ADD COLUMN IF NOT EXISTS partner_designation TEXT;

CREATE INDEX IF NOT EXISTS idx_users_icai_membership_no ON users(icai_membership_no);
