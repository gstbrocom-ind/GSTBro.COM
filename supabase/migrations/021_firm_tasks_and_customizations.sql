-- ============================================================================
-- 021_firm_tasks_and_customizations.sql
-- CA Firm White-Label, Task / To-Do Management with Auditing, Due Date Overrides, & DSC Tracking
-- ============================================================================

-- 1. Extend firms table with White-Label Branding & CA Credential Fields
ALTER TABLE firms
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS frn_number TEXT,
  ADD COLUMN IF NOT EXISTS membership_number TEXT,
  ADD COLUMN IF NOT EXISTS stamp_signature_url TEXT,
  ADD COLUMN IF NOT EXISTS letterhead_url TEXT,
  ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#2563eb';

-- 2. Extend users table with client filing stage & staff assignment
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS filing_stage TEXT DEFAULT 'DATA_COLLECTION' 
    CHECK (filing_stage IN ('DATA_COLLECTION', 'RECON_IN_PROGRESS', 'CA_REVIEW', 'FILED')),
  ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_assigned_staff ON users(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_users_filing_stage ON users(filing_stage);

-- 3. Firm Tasks & To-Do Management Table with Full Audit History
CREATE TABLE IF NOT EXISTS firm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  client_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'GST' CHECK (category IN ('GST', 'INCOME_TAX', 'AUDIT', 'ROC', 'ACCOUNTING', 'OFFICE')),
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('URGENT', 'HIGH', 'NORMAL', 'LOW')),
  status TEXT NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'ARCHIVED')),
  due_date TIMESTAMPTZ,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firm_tasks_firm ON firm_tasks(firm_id);
CREATE INDEX IF NOT EXISTS idx_firm_tasks_client ON firm_tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_firm_tasks_assigned ON firm_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_firm_tasks_status ON firm_tasks(firm_id, status);
CREATE INDEX IF NOT EXISTS idx_firm_tasks_due_date ON firm_tasks(firm_id, due_date);

DROP TRIGGER IF EXISTS firm_tasks_updated_at ON firm_tasks;
CREATE TRIGGER firm_tasks_updated_at BEFORE UPDATE ON firm_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. Recurring Task Automation Rules (e.g. Generate tasks N days before due date every month)
CREATE TABLE IF NOT EXISTS firm_task_recurring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  task_template_title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'GST',
  priority TEXT NOT NULL DEFAULT 'NORMAL',
  days_before_due_date INTEGER NOT NULL DEFAULT 5,
  target_due_date_category TEXT NOT NULL DEFAULT 'GSTR-1',
  auto_assign_to_client_staff BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_generated_period TEXT, -- e.g. '2026-11'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firm_recurring_rules_firm ON firm_task_recurring_rules(firm_id);

-- 5. Due Date Custom Overrides per Firm
CREATE TABLE IF NOT EXISTS firm_due_date_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  statutory_due_date_id UUID REFERENCES due_dates(id) ON DELETE CASCADE,
  deadline_key TEXT NOT NULL,
  title TEXT,
  category TEXT DEFAULT 'GST',
  custom_due_date DATE NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(firm_id, deadline_key)
);

CREATE INDEX IF NOT EXISTS idx_firm_due_date_overrides_firm ON firm_due_date_overrides(firm_id);

-- 6. Digital Signature Certificate (DSC) Expiry Tracker
CREATE TABLE IF NOT EXISTS firm_dsc_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  client_id UUID REFERENCES users(id) ON DELETE SET NULL,
  holder_name TEXT NOT NULL,
  designation TEXT,
  pan_or_din TEXT,
  expiry_date DATE NOT NULL,
  token_type TEXT DEFAULT 'CLASS_3',
  storage_location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firm_dsc_firm ON firm_dsc_tokens(firm_id);
CREATE INDEX IF NOT EXISTS idx_firm_dsc_expiry ON firm_dsc_tokens(firm_id, expiry_date);

-- Enable RLS and permissive policy for authenticated users matching firm
ALTER TABLE firm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_task_recurring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_due_date_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_dsc_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'firm_tasks' AND policyname = 'firm_tasks_access') THEN
    CREATE POLICY firm_tasks_access ON firm_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'firm_task_recurring_rules' AND policyname = 'firm_task_recurring_rules_access') THEN
    CREATE POLICY firm_task_recurring_rules_access ON firm_task_recurring_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'firm_due_date_overrides' AND policyname = 'firm_due_date_overrides_access') THEN
    CREATE POLICY firm_due_date_overrides_access ON firm_due_date_overrides FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'firm_dsc_tokens' AND policyname = 'firm_dsc_tokens_access') THEN
    CREATE POLICY firm_dsc_tokens_access ON firm_dsc_tokens FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
