-- Migration 010: Immutable Activity Logs & Audit Trail for Admin and Team Actions
-- Tracks who looked at or changed client records, returns, documents, messages, compliance, and settings.
-- Strictly Append-Only: No DELETE or UPDATE allowed.

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('ADMIN', 'TEAM', 'CLIENT', 'SYSTEM')),
  action_type TEXT NOT NULL CHECK (action_type IN ('VIEW', 'UPDATE', 'CREATE', 'DELETE', 'MESSAGE', 'UPLOAD', 'ASSIGN', 'COMPLIANCE', 'LOGIN', 'SECURITY')),
  action_category TEXT NOT NULL CHECK (action_category IN ('LOOKED', 'CHANGED', 'SECURITY', 'COMMUNICATION')),
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  client_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  client_name TEXT,
  description TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optimize Query Performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_role ON activity_logs(actor_role);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_category ON activity_logs(action_category);
CREATE INDEX IF NOT EXISTS idx_activity_logs_client_user_id ON activity_logs(client_user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_user_id ON activity_logs(actor_user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Deny all direct client-side mutations (Append-only via trusted backend service role)
CREATE POLICY "Deny all direct anon activity_logs" ON activity_logs
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny direct user delete on activity_logs" ON activity_logs
  FOR DELETE
  TO authenticated
  USING (false);

CREATE POLICY "Deny direct user update on activity_logs" ON activity_logs
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);
