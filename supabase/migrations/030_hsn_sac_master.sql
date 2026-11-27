-- Migration: 030_hsn_sac_master.sql
-- Description: Full GST Portal HSN & SAC master catalog with fast trigram/prefix search and admin Excel upload support

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS hsn_sac_codes (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('HSN', 'SAC')),
  description TEXT NOT NULL,
  category TEXT,
  gst_rate NUMERIC(5, 2),
  keywords TEXT[] NOT NULL DEFAULT '{}',
  note TEXT,
  source TEXT NOT NULL DEFAULT 'portal_upload' CHECK (source IN ('portal_upload', 'curated', 'admin_override')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (type, code)
);

CREATE INDEX IF NOT EXISTS idx_hsn_sac_codes_code_prefix ON hsn_sac_codes (code text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_hsn_sac_codes_type_rate ON hsn_sac_codes (type, gst_rate) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_hsn_sac_codes_description_trgm ON hsn_sac_codes USING GIN (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_hsn_sac_codes_keywords_gin ON hsn_sac_codes USING GIN (keywords);

ALTER TABLE hsn_sac_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active hsn_sac_codes" ON hsn_sac_codes;
CREATE POLICY "Public read active hsn_sac_codes"
  ON hsn_sac_codes FOR SELECT
  USING (is_active = true);

INSERT INTO site_settings (key, value)
VALUES
  ('hsn_sac_last_upload_file', ''),
  ('hsn_sac_last_upload_at', '')
ON CONFLICT (key) DO NOTHING;
