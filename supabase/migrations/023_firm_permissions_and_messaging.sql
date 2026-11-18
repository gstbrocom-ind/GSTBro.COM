-- ============================================================================
-- 023_firm_permissions_and_messaging.sql
-- 5-Level Hierarchy Permissions, In-Website Communications & Pre-Filing Checklist
-- ============================================================================

-- 1. Extend firms table with granular dynamic role permissions
ALTER TABLE firms
  ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{
    "FIRM_MANAGER": {
      "change_due_dates": true,
      "client_access_all": true,
      "allocate_clients": true,
      "manage_tasks": true,
      "view_pending_dashboard": true,
      "approve_returns": true,
      "view_invoicing_fees": true,
      "byod_drive_setup": false,
      "client_messaging": true,
      "internal_notes": true
    },
    "FIRM_STAFF": {
      "change_due_dates": false,
      "client_access_all": false,
      "allocate_clients": false,
      "manage_tasks": false,
      "view_pending_dashboard": false,
      "approve_returns": false,
      "view_invoicing_fees": false,
      "byod_drive_setup": false,
      "client_messaging": true,
      "internal_notes": true
    }
  }';

-- 2. Extend client_messages table for In-Website Messaging Suite (replacing WhatsApp)
ALTER TABLE client_messages
  ADD COLUMN IF NOT EXISTS thread_type TEXT NOT NULL DEFAULT 'CLIENT_EXTERNAL'
    CHECK (thread_type IN ('CLIENT_EXTERNAL', 'INTERNAL_TEAM_NOTE')),
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'GENERAL'
    CHECK (category IN ('GENERAL', 'MONTHLY_DOCS', 'ITC_RECON', 'NOTICE_REPLY', 'BILLING')),
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'IN_REVIEW', 'RESOLVED')),
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_client_messages_thread_type ON client_messages(client_user_id, thread_type);
CREATE INDEX IF NOT EXISTS idx_client_messages_status ON client_messages(client_user_id, status);
CREATE INDEX IF NOT EXISTS idx_client_messages_category ON client_messages(category);

-- 3. Pre-Filing 5-Point Verification & Sign-Off Checklist
CREATE TABLE IF NOT EXISTS pre_filing_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period TEXT NOT NULL, -- Format: 'YYYY-MM', e.g. '2026-11'
  return_type TEXT NOT NULL DEFAULT 'GSTR-3B' CHECK (return_type IN ('GSTR-1', 'GSTR-3B', 'IFF', 'CMP-08', 'GSTR-9')),
  itc_2b_reconciled BOOLEAN NOT NULL DEFAULT FALSE,
  rcm_checked BOOLEAN NOT NULL DEFAULT FALSE,
  outward_eway_matched BOOLEAN NOT NULL DEFAULT FALSE,
  cash_ledger_verified BOOLEAN NOT NULL DEFAULT FALSE,
  client_draft_approved BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, period, return_type)
);

CREATE INDEX IF NOT EXISTS idx_pre_filing_firm ON pre_filing_checklists(firm_id);
CREATE INDEX IF NOT EXISTS idx_pre_filing_client_period ON pre_filing_checklists(client_id, period);

ALTER TABLE pre_filing_checklists ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pre_filing_checklists' AND policyname = 'pre_filing_checklists_policy') THEN
    CREATE POLICY pre_filing_checklists_policy ON pre_filing_checklists FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
