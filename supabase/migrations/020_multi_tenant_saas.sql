-- ============================================================================
-- 020_multi_tenant_saas.sql
-- Multi-Tenant B2B Architecture for CA / Tax Consultants & Super Admin Platform
-- ============================================================================

-- 1. Extend user_role enum if values are missing
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'FIRM_OWNER';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'FIRM_STAFF';

-- 2. CA Firms / Agencies (Tenants)
CREATE TABLE IF NOT EXISTS firms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_user_id UUID,
  email TEXT NOT NULL,
  phone TEXT,
  gstin TEXT,
  address TEXT,
  branding JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED')),
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firms_slug ON firms(slug);
CREATE INDEX IF NOT EXISTS idx_firms_status ON firms(status);
CREATE INDEX IF NOT EXISTS idx_firms_owner ON firms(owner_user_id);

DROP TRIGGER IF EXISTS firms_updated_at ON firms;
CREATE TRIGGER firms_updated_at BEFORE UPDATE ON firms FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3. Bring-Your-Own Google Drive Configuration for CA Firms
CREATE TABLE IF NOT EXISTS firm_drive_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE UNIQUE,
  auth_type TEXT NOT NULL DEFAULT 'OAUTH' CHECK (auth_type IN ('OAUTH', 'SERVICE_ACCOUNT')),
  refresh_token_encrypted TEXT,
  access_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  service_account_json_encrypted TEXT,
  root_folder_id TEXT,
  root_folder_name TEXT,
  is_connected BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firm_drive_configs_firm ON firm_drive_configs(firm_id);

DROP TRIGGER IF EXISTS firm_drive_configs_updated_at ON firm_drive_configs;
CREATE TRIGGER firm_drive_configs_updated_at BEFORE UPDATE ON firm_drive_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. Document Routing Direction Rules (e.g. Sales -> Folder X, Purchases -> Folder Y)
CREATE TABLE IF NOT EXISTS firm_document_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('SALES', 'PURCHASES', 'BANK', 'FILED_RETURNS', 'NOTICES', 'CLIENT_DOCS', 'CUSTOM')),
  rule_name TEXT NOT NULL,
  custom_folder_name TEXT,
  target_path_template TEXT NOT NULL DEFAULT '{Client_Name}/{Category}/{Year}_{Month}',
  google_folder_id TEXT,
  auto_create_subfolders BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firm_routing_rules_firm ON firm_document_routing_rules(firm_id);
CREATE INDEX IF NOT EXISTS idx_firm_routing_rules_category ON firm_document_routing_rules(firm_id, category);

DROP TRIGGER IF EXISTS firm_routing_rules_updated_at ON firm_document_routing_rules;
CREATE TRIGGER firm_routing_rules_updated_at BEFORE UPDATE ON firm_document_routing_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. Monthly Usage Metering & Active-Client Billing Table
CREATE TABLE IF NOT EXISTS firm_monthly_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  billing_period TEXT NOT NULL,              -- Format: 'YYYY-MM', e.g. '2026-11'
  total_clients_count INTEGER NOT NULL DEFAULT 0,
  active_clients_count INTEGER NOT NULL DEFAULT 0,
  team_members_count INTEGER NOT NULL DEFAULT 0,
  rate_per_active_client NUMERIC(10, 2) NOT NULL DEFAULT 149.00,
  base_platform_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  subtotal_inr NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  gst_inr NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_inr NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  invoice_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (invoice_status IN ('PENDING', 'PAID', 'OVERDUE', 'WAIVED')),
  paid_at TIMESTAMPTZ,
  invoice_url TEXT,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(firm_id, billing_period)
);

CREATE INDEX IF NOT EXISTS idx_firm_monthly_usage_period ON firm_monthly_usage(billing_period);
CREATE INDEX IF NOT EXISTS idx_firm_monthly_usage_firm ON firm_monthly_usage(firm_id);

-- 6. Website CMS Content Store (Super Admin controlled live website editor)
CREATE TABLE IF NOT EXISTS platform_site_content (
  key TEXT PRIMARY KEY,
  content JSONB NOT NULL DEFAULT '{}',
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Add firm_id & firm_role to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS firm_role TEXT DEFAULT 'FIRM_STAFF' 
    CHECK (firm_role IN ('FIRM_OWNER', 'FIRM_MANAGER', 'FIRM_STAFF'));

CREATE INDEX IF NOT EXISTS idx_users_firm_id ON users(firm_id);

-- 8. Add firm_id to all operational tables
ALTER TABLE cases ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cases_firm_id ON cases(firm_id);

ALTER TABLE client_gst_data ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_client_gst_data_firm_id ON client_gst_data(firm_id);

ALTER TABLE client_documents 
  ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS drive_folder_id TEXT,
  ADD COLUMN IF NOT EXISTS routed_by_rule_id UUID REFERENCES firm_document_routing_rules(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_client_documents_firm_id ON client_documents(firm_id);

ALTER TABLE due_dates ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_due_dates_firm_id ON due_dates(firm_id);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_leads_firm_id ON leads(firm_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_invoices_firm_id ON invoices(firm_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fee_invoices') THEN
    ALTER TABLE fee_invoices ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_fee_invoices_firm_id ON fee_invoices(firm_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_messages') THEN
    ALTER TABLE client_messages ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_client_messages_firm_id ON client_messages(firm_id);
  END IF;
END $$;

-- 9. Backfill Default Firm for existing data so no legacy data is orphaned
DO $$
DECLARE
  default_firm_id UUID;
  first_admin_id UUID;
BEGIN
  -- Check if a default firm already exists
  SELECT id INTO default_firm_id FROM firms WHERE slug = 'primary-firm' LIMIT 1;
  
  IF default_firm_id IS NULL THEN
    -- Find first admin or user to be provisional owner (use text cast to avoid 55P04)
    SELECT id INTO first_admin_id FROM users WHERE role::text = 'ADMIN' ORDER BY created_at ASC LIMIT 1;
    
    INSERT INTO firms (id, name, slug, owner_user_id, email, phone, status)
    VALUES (
      gen_random_uuid(),
      'GST Bro Primary Practice',
      'primary-firm',
      first_admin_id,
      'admin@gstbro.in',
      '+91 99999 99999',
      'ACTIVE'
    )
    RETURNING id INTO default_firm_id;
  END IF;

  -- Backfill firm_id into existing records
  UPDATE users SET firm_id = default_firm_id WHERE firm_id IS NULL;
  UPDATE cases SET firm_id = default_firm_id WHERE firm_id IS NULL;
  UPDATE client_gst_data SET firm_id = default_firm_id WHERE firm_id IS NULL;
  UPDATE client_documents SET firm_id = default_firm_id WHERE firm_id IS NULL;
  UPDATE due_dates SET firm_id = default_firm_id WHERE firm_id IS NULL;
  UPDATE leads SET firm_id = default_firm_id WHERE firm_id IS NULL;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    EXECUTE 'UPDATE invoices SET firm_id = $1 WHERE firm_id IS NULL' USING default_firm_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fee_invoices') THEN
    EXECUTE 'UPDATE fee_invoices SET firm_id = $1 WHERE firm_id IS NULL' USING default_firm_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_messages') THEN
    EXECUTE 'UPDATE client_messages SET firm_id = $1 WHERE firm_id IS NULL' USING default_firm_id;
  END IF;
END $$;

-- 10. Enable Row Level Security on New Tables
ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_drive_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_document_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_monthly_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_site_content ENABLE ROW LEVEL SECURITY;

-- 11. Public read for site content
CREATE POLICY "Public read platform_site_content" ON platform_site_content
  FOR SELECT TO anon, authenticated USING (true);

-- 12. Service role full access on new tables
CREATE POLICY "Service role full access firms" ON firms
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access firm_drive_configs" ON firm_drive_configs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access firm_routing_rules" ON firm_document_routing_rules
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access firm_monthly_usage" ON firm_monthly_usage
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access platform_site_content" ON platform_site_content
  FOR ALL TO service_role USING (true) WITH CHECK (true);
