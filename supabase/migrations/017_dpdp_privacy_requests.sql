-- ============================================================================
-- 017_dpdp_privacy_requests.sql
-- GSTBro DPDP Act Readiness: Privacy Rights Request Centre
-- Tracks user-submitted data access, correction, erasure, and grievance requests.
-- ============================================================================

CREATE TYPE IF NOT EXISTS privacy_request_type AS ENUM (
  'ACCESS',              -- request a summary of personal data held
  'CORRECTION',          -- request correction of inaccurate data
  'ERASURE',             -- request deletion / account closure
  'CONSENT_WITHDRAWAL',  -- withdraw a specific consent
  'GRIEVANCE',           -- file a complaint about data handling
  'NOMINATION'           -- nominate another person to exercise rights
);

CREATE TYPE IF NOT EXISTS privacy_request_status AS ENUM (
  'PENDING',
  'IDENTITY_VERIFIED',
  'IN_REVIEW',
  'COMPLETED',
  'REJECTED',
  'PARTIALLY_COMPLETED'
);

CREATE TABLE IF NOT EXISTS privacy_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  request_type privacy_request_type NOT NULL,
  description TEXT,
  status privacy_request_status NOT NULL DEFAULT 'PENDING',
  identity_verified_at TIMESTAMPTZ,
  identity_verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_note TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  -- For NOMINATION requests
  nominee_name TEXT,
  nominee_email TEXT,
  nominee_relationship TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS privacy_request_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES privacy_requests(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_label TEXT NOT NULL CHECK (actor_label IN ('USER', 'ADMIN', 'SYSTEM')),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'SUBMITTED',
    'IDENTITY_CHECKED',
    'ASSIGNED',
    'NOTE_ADDED',
    'STATUS_CHANGED',
    'DATA_EXPORTED',
    'DELETION_TRIGGERED',
    'PROCESSOR_NOTIFIED',
    'COMPLETED',
    'REJECTED'
  )),
  note TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_privacy_requests_user_id ON privacy_requests(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_privacy_requests_email ON privacy_requests(email);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_status ON privacy_requests(status);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_type ON privacy_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_created_at ON privacy_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_privacy_request_events_request_id ON privacy_request_events(request_id, created_at DESC);

-- Triggers
CREATE TRIGGER privacy_requests_updated_at
  BEFORE UPDATE ON privacy_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE privacy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_request_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access privacy_requests" ON privacy_requests
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access privacy_request_events" ON privacy_request_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Deny anon privacy_requests" ON privacy_requests
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "Deny anon privacy_request_events" ON privacy_request_events
  FOR ALL TO anon USING (false) WITH CHECK (false);
