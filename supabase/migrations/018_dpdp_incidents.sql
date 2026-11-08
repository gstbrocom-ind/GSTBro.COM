-- ============================================================================
-- 018_dpdp_incidents.sql
-- GSTBro DPDP Act Readiness: Personal Data Breach Incident Tracking
-- Internal workflow to record, escalate, contain, and close breach incidents.
-- Supports DPB notification tracking and user notification evidence.
-- ============================================================================

CREATE TABLE IF NOT EXISTS breach_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  discovered_at TIMESTAMPTZ NOT NULL,
  reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reported_by_name TEXT,
  description TEXT NOT NULL,
  affected_systems TEXT[] NOT NULL DEFAULT '{}',
  affected_data_categories TEXT[] NOT NULL DEFAULT '{}',
  estimated_affected_users INT,
  affected_user_ids UUID[] DEFAULT '{}',        -- populated during investigation
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN (
    'OPEN',        -- newly recorded, under initial assessment
    'CONTAINED',   -- breach stopped, investigation ongoing
    'REMEDIATED',  -- root cause fixed
    'CLOSED'       -- fully resolved and documented
  )),
  severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  containment_steps TEXT,
  remediation_steps TEXT,
  evidence_preserved BOOLEAN NOT NULL DEFAULT FALSE,
  -- DPB Notification (details filled after legal review at time of incident)
  dpb_notification_required BOOLEAN,            -- null = pending review, true/false after legal assessment
  dpb_notification_sent_at TIMESTAMPTZ,
  dpb_notification_reference TEXT,              -- DPB case/reference number
  dpb_notification_content TEXT,               -- copy of notification sent
  -- User Notification
  user_notification_required BOOLEAN,
  user_notification_sent_at TIMESTAMPTZ,
  user_notification_method TEXT,               -- 'EMAIL', 'SMS', 'IN_APP'
  user_notification_content TEXT,              -- copy of notification sent
  user_notification_recipient_count INT,
  -- Assigned owner
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS breach_incident_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES breach_incidents(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_label TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'DISCOVERED',
    'ASSESSED',
    'ESCALATED',
    'CONTAINED',
    'EVIDENCE_PRESERVED',
    'LEGAL_REVIEWED',
    'DPB_NOTIFIED',
    'USERS_NOTIFIED',
    'REMEDIATED',
    'CLOSED',
    'NOTE_ADDED'
  )),
  note TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_breach_incidents_status ON breach_incidents(status);
CREATE INDEX IF NOT EXISTS idx_breach_incidents_severity ON breach_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_breach_incidents_created_at ON breach_incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_breach_incident_events_incident_id ON breach_incident_events(incident_id, created_at DESC);

-- Triggers
CREATE TRIGGER breach_incidents_updated_at
  BEFORE UPDATE ON breach_incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE breach_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE breach_incident_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access breach_incidents" ON breach_incidents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access breach_incident_events" ON breach_incident_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Deny anon breach_incidents" ON breach_incidents
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "Deny anon breach_incident_events" ON breach_incident_events
  FOR ALL TO anon USING (false) WITH CHECK (false);
