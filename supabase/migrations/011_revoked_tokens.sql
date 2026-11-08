-- ============================================================================
-- 011_revoked_tokens.sql
-- GSTBro Session Revocation & Invalidation Store
-- ============================================================================

CREATE TABLE IF NOT EXISTS revoked_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_revoked_tokens_hash ON revoked_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires ON revoked_tokens(expires_at);

-- Enable Row Level Security
ALTER TABLE revoked_tokens ENABLE ROW LEVEL SECURITY;

-- Deny all direct client-side (anon / authenticated) queries
CREATE POLICY "Deny all direct access revoked_tokens" ON revoked_tokens
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Backend service role has full access
CREATE POLICY "Service role full access revoked_tokens" ON revoked_tokens
  FOR ALL TO service_role USING (true) WITH CHECK (true);
