-- Migration 015: Welcome codes invite-only registration system
CREATE TABLE IF NOT EXISTS welcome_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(16) UNIQUE NOT NULL,
  note TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  used_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  used_by_email VARCHAR(255),
  used_by_name VARCHAR(255),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_welcome_codes_code ON welcome_codes(code);
CREATE INDEX IF NOT EXISTS idx_welcome_codes_used ON welcome_codes(used);
CREATE INDEX IF NOT EXISTS idx_welcome_codes_created_at ON welcome_codes(created_at DESC);
