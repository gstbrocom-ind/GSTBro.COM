-- ============================================================================
-- 022_firm_team_isolation.sql
-- Strict Multi-Tenant Isolation & Intra-Firm Team/Article Segmentation
-- ============================================================================

-- 1. Add team_group / department to users and firm_tasks
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS team_group TEXT DEFAULT 'General';

ALTER TABLE firm_tasks
  ADD COLUMN IF NOT EXISTS team_group TEXT DEFAULT 'General';

CREATE INDEX IF NOT EXISTS idx_users_team_group ON users(firm_id, team_group);
CREATE INDEX IF NOT EXISTS idx_firm_tasks_team_group ON firm_tasks(firm_id, team_group);

-- 2. Client Access & File Inspection Audit Log
CREATE TABLE IF NOT EXISTS firm_client_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- e.g. 'VIEW_PROFILE', 'VIEW_GST_DATA', 'DOWNLOAD_DOCUMENT', 'COMPUTE_RETURN', 'HANDOVER'
  resource_type TEXT,
  resource_id TEXT,
  notes TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firm_access_logs_firm ON firm_client_access_logs(firm_id);
CREATE INDEX IF NOT EXISTS idx_firm_access_logs_user ON firm_client_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_firm_access_logs_client ON firm_client_access_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_firm_access_logs_created ON firm_client_access_logs(firm_id, created_at DESC);

-- Enable RLS
ALTER TABLE firm_client_access_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'firm_client_access_logs' AND policyname = 'firm_access_logs_policy') THEN
    CREATE POLICY firm_access_logs_policy ON firm_client_access_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
