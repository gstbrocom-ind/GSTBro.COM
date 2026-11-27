-- Migration: 031_security_hardening_rls.sql
-- Description: Ensure Row Level Security is enabled on every table (including welcome_codes)
-- so zero sensitive tables are accessible via Supabase anon/authenticated PostgREST keys.

ALTER TABLE IF EXISTS welcome_codes ENABLE ROW LEVEL SECURITY;

-- Explicitly drop any accidental permissive policies on welcome_codes if present
DROP POLICY IF EXISTS "Public read welcome_codes" ON welcome_codes;
DROP POLICY IF EXISTS "Enable read access for all users" ON welcome_codes;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
