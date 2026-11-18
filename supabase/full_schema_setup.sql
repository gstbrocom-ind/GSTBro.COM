-- ============================================================================
-- GST BRO COMPLETE DATABASE SETUP SCRIPT FOR NEW SUPABASE PROJECT
-- Auto-generated from sequential migrations 001 to 020
-- ============================================================================


-- >>> START MIGRATION: 001_initial_schema.sql >>>

-- GST Services Platform Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('CLIENT', 'TEAM', 'ADMIN');
CREATE TYPE lead_status AS ENUM ('NEW', 'CONTACTED', 'CONVERTED', 'CLOSED');
CREATE TYPE case_status AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'ACTION_REQUIRED', 'COMPLETED', 'CANCELLED');
CREATE TYPE drive_owner_type AS ENUM ('CLIENT', 'TEAM');
CREATE TYPE service_type AS ENUM ('REGISTRATION', 'RETURNS', 'CANCELLATION', 'GENERAL');

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'CLIENT',
  business_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- OTP codes
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_codes_email ON otp_codes(email);
CREATE INDEX idx_otp_codes_expires ON otp_codes(expires_at);

-- Leads
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  service_type service_type,
  message TEXT,
  status lead_status NOT NULL DEFAULT 'NEW',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_email ON leads(email);

-- Cases
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_type service_type NOT NULL,
  status case_status NOT NULL DEFAULT 'DRAFT',
  assigned_team_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cases_user_id ON cases(user_id);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_assigned_team ON cases(assigned_team_id);

-- Case events (timeline / audit)
CREATE TABLE case_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  status case_status,
  note TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_case_events_case_id ON case_events(case_id);

-- Google Drive folder tracking
CREATE TABLE drive_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_type drive_owner_type NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  drive_folder_id TEXT NOT NULL,
  drive_folder_url TEXT NOT NULL,
  parent_folder_id UUID REFERENCES drive_folders(id) ON DELETE SET NULL,
  is_shortcut BOOLEAN NOT NULL DEFAULT FALSE,
  target_folder_id UUID REFERENCES drive_folders(id) ON DELETE SET NULL,
  shortcut_drive_id TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drive_folders_owner ON drive_folders(owner_type, owner_id);
CREATE INDEX idx_drive_folders_drive_id ON drive_folders(drive_folder_id);

-- Team assignments
CREATE TABLE team_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(team_user_id, client_user_id)
);

CREATE INDEX idx_team_assignments_team ON team_assignments(team_user_id);
CREATE INDEX idx_team_assignments_client ON team_assignments(client_user_id);

-- Documents (metadata only — files live in Google Drive)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  type TEXT,
  file_name TEXT NOT NULL,
  drive_file_id TEXT NOT NULL,
  drive_web_view_link TEXT,
  drive_download_link TEXT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_case_id ON documents(case_id);

-- Site settings (key-value)
CREATE TABLE site_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Per-page SEO overrides
CREATE TABLE page_seo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_path TEXT NOT NULL UNIQUE,
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT,
  og_title TEXT,
  og_description TEXT,
  og_image_url TEXT,
  canonical_url TEXT,
  robots TEXT DEFAULT 'index,follow',
  json_ld_extra JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Media assets (Cloudinary)
CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  cloudinary_public_id TEXT NOT NULL,
  url TEXT NOT NULL,
  alt_text TEXT,
  page TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default site settings
INSERT INTO site_settings (key, value) VALUES
  ('site_name', 'GSTBro'),
  ('favicon_url', ''),
  ('logo_url', ''),
  ('contact_phone', ''),
  ('contact_email', 'hello@gstbro.com'),
  ('social_whatsapp_url', ''),
  ('social_whatsapp_enabled', 'false'),
  ('social_instagram_url', ''),
  ('social_instagram_enabled', 'false'),
  ('social_x_url', ''),
  ('social_x_enabled', 'false'),
  ('social_facebook_url', ''),
  ('social_facebook_enabled', 'false'),
  ('social_whatsapp_icon', ''),
  ('social_instagram_icon', ''),
  ('social_x_icon', ''),
  ('social_facebook_icon', ''),
  ('drive_root_id', '');

-- Seed default page SEO entries
INSERT INTO page_seo (route_path, meta_title, meta_description, robots) VALUES
  ('/', 'GST Services End to End | GSTBro', 'Complete GST registration, return filing, and cancellation services across India. Expert support from GSTBro.', 'index,follow'),
  ('/services', 'GST Services | GSTBro', 'Explore GST registration, return filing, and cancellation services from GSTBro.', 'index,follow'),
  ('/services/gst-registration', 'GST Registration Services | GSTBro', 'Professional GST registration services for businesses across India. Fast, compliant, end-to-end support.', 'index,follow'),
  ('/services/gst-returns', 'GST Return Filing Services | GSTBro', 'Timely and accurate GST return filing — GSTR-1, GSTR-3B, and annual returns handled by experts.', 'index,follow'),
  ('/services/gst-cancellation', 'GST Cancellation Services | GSTBro', 'Hassle-free GST cancellation and surrender services with full compliance support.', 'index,follow'),
  ('/pricing', 'Pricing | GSTBro', 'Transparent pricing for GST registration, returns, and cancellation services.', 'index,follow'),
  ('/how-it-works', 'How It Works | GSTBro', 'Simple 4-step process for GST services — from signup to completion.', 'index,follow'),
  ('/resources', 'GST Resources & FAQs | GSTBro', 'Guides, FAQs, and resources for GST registration, returns, and compliance.', 'index,follow'),
  ('/contact', 'Contact GSTBro', 'Get in touch with GSTBro for GST registration, returns, and cancellation services.', 'index,follow'),
  ('/login', 'Login | GSTBro Client Portal', 'Login to your GSTBro client portal to track cases and upload documents.', 'index,follow'),
  ('/signup', 'Sign Up | GSTBro', 'Create your GSTBro account to access GST services and client portal.', 'index,follow'),
  ('/privacy', 'Privacy Policy | GSTBro', 'GSTBro privacy policy — how we handle your data.', 'index,follow'),
  ('/terms', 'Terms of Service | GSTBro', 'GSTBro terms of service.', 'index,follow');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER cases_updated_at BEFORE UPDATE ON cases FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER site_settings_updated_at BEFORE UPDATE ON site_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER page_seo_updated_at BEFORE UPDATE ON page_seo FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- <<< END MIGRATION: 001_initial_schema.sql <<<


-- >>> START MIGRATION: 002_password_auth.sql >>>

-- Password auth + extended client profile fields

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS gstin TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_gstin ON users(gstin) WHERE gstin IS NOT NULL;

-- OTP purpose: SIGNUP | RESET_PASSWORD
ALTER TABLE otp_codes
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'SIGNUP';

CREATE INDEX IF NOT EXISTS idx_otp_codes_purpose ON otp_codes(email, purpose);


-- <<< END MIGRATION: 002_password_auth.sql <<<


-- >>> START MIGRATION: 002_service_seo.sql >>>

INSERT INTO page_seo (route_path, meta_title, meta_description, robots)
VALUES
  ('/services/gst-compliance', 'GST Compliance Services | GSTBro', 'Complete GST compliance management for businesses across India. Stay compliant, avoid penalties, and keep your GST records accurate with GSTBro experts.', 'index,follow'),
  ('/services/gst-refund', 'GST Refund Services | GSTBro', 'Fast and hassle-free GST refund assistance for exporters, businesses, and eligible taxpayers. GSTBro handles documentation, filing, and follow-up.', 'index,follow'),
  ('/services/gst-audit', 'GST Audit and Assessment Services | GSTBro', 'Professional GST audit and assessment support including notice handling, reconciliation, departmental representation, and litigation assistance.', 'index,follow'),
  ('/services/gst-advisory', 'GST Advisory Services | GSTBro', 'Expert GST advisory and planning to optimize tax liability, reduce compliance risk, improve efficiency, and support better business decisions.', 'index,follow')
ON CONFLICT (route_path) DO UPDATE SET
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description,
  robots = EXCLUDED.robots;


-- <<< END MIGRATION: 002_service_seo.sql <<<


-- >>> START MIGRATION: 003_team_client_workflows.sql >>>

-- Team/client workflow additions

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS due_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  category TEXT NOT NULL DEFAULT 'GST',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_due_dates_due_date ON due_dates(due_date);
CREATE INDEX IF NOT EXISTS idx_due_dates_active ON due_dates(active);

CREATE TABLE IF NOT EXISTS client_gst_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  itc JSONB NOT NULL DEFAULT '{}',
  sales JSONB NOT NULL DEFAULT '{}',
  purchases JSONB NOT NULL DEFAULT '{}',
  gstr1 JSONB NOT NULL DEFAULT '{}',
  gstr3b JSONB NOT NULL DEFAULT '{}',
  entered_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_user_id, period)
);

CREATE INDEX IF NOT EXISTS idx_client_gst_data_client ON client_gst_data(client_user_id);
CREATE INDEX IF NOT EXISTS idx_client_gst_data_period ON client_gst_data(period);

CREATE TABLE IF NOT EXISTS client_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'CLIENT_DOCS',
  file_name TEXT NOT NULL,
  drive_file_id TEXT NOT NULL,
  drive_web_view_link TEXT,
  drive_download_link TEXT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_documents_client ON client_documents(client_user_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_category ON client_documents(category);

DROP TRIGGER IF EXISTS due_dates_updated_at ON due_dates;
CREATE TRIGGER due_dates_updated_at BEFORE UPDATE ON due_dates FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS client_gst_data_updated_at ON client_gst_data;
CREATE TRIGGER client_gst_data_updated_at BEFORE UPDATE ON client_gst_data FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- <<< END MIGRATION: 003_team_client_workflows.sql <<<


-- >>> START MIGRATION: 004_messages.sql >>>

CREATE TABLE IF NOT EXISTS client_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_client_messages_client ON client_messages(client_user_id, created_at DESC);


-- <<< END MIGRATION: 004_messages.sql <<<


-- >>> START MIGRATION: 005_fees.sql >>>

CREATE TABLE IF NOT EXISTS fee_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  gst_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (gst_amount >= 0),
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PARTIALLY_PAID','PAID','OVERDUE')),
  invoice_url TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fee_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES fee_invoices(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  receipt_url TEXT,
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_fee_invoices_client ON fee_invoices(client_user_id, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_fee_payments_invoice ON fee_payments(invoice_id, paid_at DESC);


-- <<< END MIGRATION: 005_fees.sql <<<


-- >>> START MIGRATION: 006_auth_storage.sql >>>

-- Ensure password reset storage exists in deployed Supabase projects.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE otp_codes
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'SIGNUP';

CREATE INDEX IF NOT EXISTS idx_otp_codes_email_purpose ON otp_codes(email, purpose);


-- <<< END MIGRATION: 006_auth_storage.sql <<<


-- >>> START MIGRATION: 007_twofactor_auth.sql >>>

-- 007_twofactor_auth.sql
-- TwoFactor.in Mobile Verification, Password Reset Authorizations & Security Audit Logging

-- Required for uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- 1. Extend users table for mobile verification tracking
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mobile_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mobile_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mobile_verification_method TEXT DEFAULT '2FACTOR';

CREATE INDEX IF NOT EXISTS idx_users_phone
  ON users(phone);

CREATE INDEX IF NOT EXISTS idx_users_phone_verified
  ON users(phone)
  WHERE mobile_verified = TRUE;


-- 2. Mobile OTP Sessions table
-- Tracks 2Factor session IDs, attempts, cooldowns
CREATE TABLE IF NOT EXISTS mobile_otp_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT NOT NULL,
  session_id TEXT NOT NULL,
  purpose TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mobile_otp_phone_purpose
  ON mobile_otp_sessions(phone, purpose);

CREATE INDEX IF NOT EXISTS idx_mobile_otp_session_id
  ON mobile_otp_sessions(session_id);

CREATE INDEX IF NOT EXISTS idx_mobile_otp_expires_at
  ON mobile_otp_sessions(expires_at);


-- 3. Password Reset Authorizations
-- Single-use, short-lived 10-15 minute reset tokens
CREATE TABLE IF NOT EXISTS password_reset_authorizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_hash TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verified_via TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'PASSWORD_RESET',
  used BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pwd_reset_auth_token_hash
  ON password_reset_authorizations(token_hash);

CREATE INDEX IF NOT EXISTS idx_pwd_reset_auth_user_id
  ON password_reset_authorizations(user_id);

CREATE INDEX IF NOT EXISTS idx_pwd_reset_auth_expires_at
  ON password_reset_authorizations(expires_at);


-- 4. Auth Security Audit Logs
CREATE TABLE IF NOT EXISTS auth_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  identifier TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type
  ON auth_audit_logs(event_type);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
  ON auth_audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON auth_audit_logs(created_at);

-- <<< END MIGRATION: 007_twofactor_auth.sql <<<


-- >>> START MIGRATION: 008_enable_rls.sql >>>

-- ============================================================================
-- 008_enable_rls.sql
-- GSTBro Database Layer Defense-in-Depth: Enable Row Level Security (RLS)
-- ============================================================================

-- 1. Enable RLS on all sensitive identity, auth, and credential tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_otp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Enable RLS on client data, cases, and workflows
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_gst_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;

-- 3. Enable RLS on public / marketing / administrative configuration
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE due_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_seo ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- NOTE: The Fastify backend connects via SUPABASE_SERVICE_ROLE_KEY, which
-- inherently bypasses RLS in Postgres. These policies guarantee that any
-- direct client requests via SUPABASE_ANON_KEY cannot access or mutate
-- confidential business and user records.
-- ============================================================================

-- Public read-only access for site configuration & SEO metadata
CREATE POLICY "Public read-only site_settings" ON site_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public read-only page_seo" ON page_seo
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public read-only media_assets" ON media_assets
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public read-only due_dates" ON due_dates
  FOR SELECT TO anon, authenticated USING (active = true);

-- Leads: Direct insertion allowed via public site, but NO reading or updating
CREATE POLICY "Public can insert leads" ON leads
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Explicitly deny all direct anon/authenticated queries to protected tables
-- All operational queries must flow through the authenticated Fastify backend API
CREATE POLICY "Service role full access users" ON users
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access cases" ON cases
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access documents" ON documents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access client_documents" ON client_documents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access client_gst_data" ON client_gst_data
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access client_messages" ON client_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access fee_invoices" ON fee_invoices
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access fee_payments" ON fee_payments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access team_assignments" ON team_assignments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access drive_folders" ON drive_folders
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- <<< END MIGRATION: 008_enable_rls.sql <<<


-- >>> START MIGRATION: 009_rls_deny_anon_security_tables.sql >>>

-- ============================================================================
-- 009_rls_deny_anon_security_tables.sql
-- GSTBro Database Security Hardening: Explicit deny-all RLS for security-
-- critical tables that currently have RLS enabled but no explicit anon/
-- authenticated access policies.
--
-- Context:
--   The Fastify backend uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS by
--   design (PostgreSQL grant-level bypass, not policy-based). This means the
--   existing service_role policies are only needed for documentation clarity.
--
--   However, otp_codes, mobile_otp_sessions, password_reset_authorizations,
--   auth_audit_logs, and case_events have RLS enabled (008_enable_rls.sql)
--   but NO explicit anon/authenticated policies. Without an explicit ALLOW
--   policy, Postgres denies all anon/authenticated access by default (implicit
--   deny). This migration makes those denials EXPLICIT for defense-in-depth,
--   prevents accidental access if RLS enforcement changes, and provides clear
--   auditable intent.
-- ============================================================================

-- ── Security credential tables: zero anon/authenticated access ────────────

-- No public or authenticated client should ever query raw OTP codes
CREATE POLICY "Deny all direct access otp_codes" ON otp_codes
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- No public or authenticated client should ever read mobile OTP sessions
CREATE POLICY "Deny all direct access mobile_otp_sessions" ON mobile_otp_sessions
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- No public or authenticated client should ever read reset authorization tokens
CREATE POLICY "Deny all direct access password_reset_authorizations" ON password_reset_authorizations
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Auth audit logs are backend-only
CREATE POLICY "Deny all direct access auth_audit_logs" ON auth_audit_logs
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Case events are backend-only (read through the API, never directly)
CREATE POLICY "Deny all direct access case_events" ON case_events
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Users: No direct anon/authenticated access — all user data flows through the API
CREATE POLICY "Deny all direct access users" ON users
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Cases: No direct client access — all case data flows through the API
CREATE POLICY "Deny all direct access cases" ON cases
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Protected business data tables: no anon/authenticated direct access
CREATE POLICY "Deny all direct access documents" ON documents
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny all direct access client_documents" ON client_documents
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny all direct access client_gst_data" ON client_gst_data
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny all direct access client_messages" ON client_messages
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny all direct access fee_invoices" ON fee_invoices
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny all direct access fee_payments" ON fee_payments
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny all direct access team_assignments" ON team_assignments
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny all direct access drive_folders" ON drive_folders
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- Leads: Anon INSERT allowed (public contact form), but no SELECT/UPDATE/DELETE
CREATE POLICY "Deny anon SELECT on leads" ON leads
  AS RESTRICTIVE FOR SELECT TO anon, authenticated USING (false);

CREATE POLICY "Deny anon UPDATE on leads" ON leads
  AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny anon DELETE on leads" ON leads
  AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);


-- <<< END MIGRATION: 009_rls_deny_anon_security_tables.sql <<<


-- >>> START MIGRATION: 010_activity_logs.sql >>>

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


-- <<< END MIGRATION: 010_activity_logs.sql <<<


-- >>> START MIGRATION: 011_revoked_tokens.sql >>>

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


-- <<< END MIGRATION: 011_revoked_tokens.sql <<<


-- >>> START MIGRATION: 012_to_014_combined_invoice_migration.sql >>>

-- ============================================================================
-- 012_to_014_combined_invoice_migration.sql
-- Combined migration script for GST Invoice Generator module.
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query -> Run)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PART 1: EXTEND USERS TABLE (012_invoice_vendor_profile.sql)
-- ----------------------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS pan TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS signature_url TEXT,
  ADD COLUMN IF NOT EXISTS bank_details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS upi_id TEXT,
  ADD COLUMN IF NOT EXISTS invoice_terms TEXT DEFAULT 'Goods once sold will not be taken back. Subject to local jurisdiction.',
  ADD COLUMN IF NOT EXISTS state_code CHAR(2);

CREATE INDEX IF NOT EXISTS idx_users_pan ON users(pan) WHERE pan IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_state_code ON users(state_code) WHERE state_code IS NOT NULL;

-- ----------------------------------------------------------------------------
-- PART 2: CORE INVOICE TABLES (013_invoice_tables.sql)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hsn_sac TEXT NOT NULL,
  gst_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 18,
  unit TEXT NOT NULL DEFAULT 'NOS',
  min_price NUMERIC(12,2) NOT NULL DEFAULT 1,
  max_price NUMERIC(12,2) NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_invoice_items_price CHECK (min_price > 0 AND max_price >= min_price),
  CONSTRAINT chk_invoice_items_gst CHECK (gst_rate_percent IN (0, 5, 12, 18, 28))
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_vendor ON invoice_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_active ON invoice_items(vendor_id, active);
CREATE INDEX IF NOT EXISTS idx_invoice_items_hsn ON invoice_items(hsn_sac);

CREATE TABLE IF NOT EXISTS invoice_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  gstin TEXT,
  state TEXT NOT NULL,
  state_code CHAR(2) NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_customers_vendor ON invoice_customers(vendor_id);
CREATE INDEX IF NOT EXISTS idx_invoice_customers_gstin ON invoice_customers(gstin) WHERE gstin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_customers_active ON invoice_customers(vendor_id, active);

CREATE TABLE IF NOT EXISTS invoice_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  financial_year TEXT NOT NULL,
  prefix TEXT NOT NULL DEFAULT 'INV/',
  start_number INT NOT NULL DEFAULT 1,
  current_number INT NOT NULL DEFAULT 0,
  padding INT NOT NULL DEFAULT 4,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_invoice_series_vendor_fy UNIQUE (vendor_id, financial_year)
);

CREATE INDEX IF NOT EXISTS idx_invoice_series_vendor ON invoice_series(vendor_id);
CREATE INDEX IF NOT EXISTS idx_invoice_series_fy ON invoice_series(financial_year);

CREATE TABLE IF NOT EXISTS invoice_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default Template',
  page_size TEXT NOT NULL DEFAULT 'A4',
  orientation TEXT NOT NULL DEFAULT 'portrait',
  margins JSONB NOT NULL DEFAULT '{"top":20,"right":15,"bottom":20,"left":15}'::jsonb,
  accent_color TEXT NOT NULL DEFAULT '#1d4ed8',
  secondary_color TEXT NOT NULL DEFAULT '#64748b',
  font_family TEXT NOT NULL DEFAULT 'Helvetica',
  logo_position TEXT NOT NULL DEFAULT 'top-left',
  logo_width INT NOT NULL DEFAULT 80,
  logo_height INT NOT NULL DEFAULT 80,
  custom_title TEXT NOT NULL DEFAULT 'TAX INVOICE',
  title_font_size INT NOT NULL DEFAULT 18,
  title_alignment TEXT NOT NULL DEFAULT 'center',
  header_font_size INT NOT NULL DEFAULT 10,
  table_header_font_size INT NOT NULL DEFAULT 9,
  table_body_font_size INT NOT NULL DEFAULT 9,
  footer_font_size INT NOT NULL DEFAULT 8,
  summary_font_size INT NOT NULL DEFAULT 10,
  custom_labels JSONB NOT NULL DEFAULT '{}'::jsonb,
  field_visibility JSONB NOT NULL DEFAULT '{
    "hsn_column": true,
    "unit_column": true,
    "qty_column": true,
    "rate_column": true,
    "discount_column": false,
    "buyer_gstin": true,
    "buyer_address": true,
    "buyer_phone": false,
    "place_of_supply": true,
    "bank_details": true,
    "upi_qr": true,
    "signature": true,
    "terms": true,
    "amount_in_words": true,
    "watermark": false,
    "seller_phone": true,
    "seller_gstin": true
  }'::jsonb,
  column_widths JSONB NOT NULL DEFAULT '{
    "sno": 5,
    "description": 25,
    "hsn": 10,
    "qty": 8,
    "unit": 7,
    "rate": 12,
    "taxable": 13,
    "tax": 8,
    "total": 12
  }'::jsonb,
  custom_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  text_styles JSONB NOT NULL DEFAULT '{
    "title": { "bold": true, "italic": false, "uppercase": true, "letterSpacing": 2 },
    "header": { "bold": false, "italic": false, "uppercase": false, "letterSpacing": 0 },
    "table_header": { "bold": true, "italic": false, "uppercase": true, "letterSpacing": 1 },
    "footer": { "bold": false, "italic": true, "uppercase": false, "letterSpacing": 0 }
  }'::jsonb,
  footer_text TEXT DEFAULT 'Thank you for your business!',
  show_page_number BOOLEAN NOT NULL DEFAULT FALSE,
  watermark_text TEXT,
  show_table_borders BOOLEAN NOT NULL DEFAULT TRUE,
  border_color TEXT NOT NULL DEFAULT '#e2e8f0',
  header_bg_color TEXT NOT NULL DEFAULT '#f8fafc',
  alternate_row_color TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_templates_vendor ON invoice_templates(vendor_id);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES invoice_customers(id) ON DELETE SET NULL,
  series_id UUID NOT NULL REFERENCES invoice_series(id) ON DELETE RESTRICT,
  template_id UUID REFERENCES invoice_templates(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  financial_year TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_gstin TEXT,
  buyer_address TEXT,
  buyer_state TEXT NOT NULL,
  buyer_state_code CHAR(2) NOT NULL,
  buyer_phone TEXT,
  place_of_supply TEXT NOT NULL,
  place_of_supply_code CHAR(2) NOT NULL,
  is_igst BOOLEAN NOT NULL DEFAULT FALSE,
  taxable_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  cgst_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  sgst_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  igst_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(14,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELLED')),
  template_snapshot JSONB,
  generation_batch_id UUID,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_invoice_number UNIQUE (vendor_id, financial_year, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_vendor ON invoices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_vendor_date ON invoices(vendor_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_vendor_fy ON invoices(vendor_id, financial_year);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_batch ON invoices(generation_batch_id) WHERE generation_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices(created_by);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_id UUID REFERENCES invoice_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  hsn_sac TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'NOS',
  quantity NUMERIC(10,4) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price > 0),
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  taxable_value NUMERIC(14,2) NOT NULL,
  gst_rate_percent NUMERIC(5,2) NOT NULL,
  cgst NUMERIC(12,2) NOT NULL DEFAULT 0,
  sgst NUMERIC(12,2) NOT NULL DEFAULT 0,
  igst NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(14,2) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_item ON invoice_line_items(item_id) WHERE item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_hsn ON invoice_line_items(hsn_sac);

CREATE TABLE IF NOT EXISTS credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  credit_note_number TEXT NOT NULL,
  financial_year TEXT NOT NULL,
  issue_date DATE NOT NULL,
  reason TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  taxable_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  cgst NUMERIC(12,2) NOT NULL DEFAULT 0,
  sgst NUMERIC(12,2) NOT NULL DEFAULT 0,
  igst NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_credit_note_number UNIQUE (vendor_id, financial_year, credit_note_number)
);

CREATE INDEX IF NOT EXISTS idx_credit_notes_vendor ON credit_notes(vendor_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice ON credit_notes(original_invoice_id);

-- RLS setup
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access invoice_items" ON invoice_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access invoice_customers" ON invoice_customers
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access invoice_series" ON invoice_series
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access invoice_templates" ON invoice_templates
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access invoices" ON invoices
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access invoice_line_items" ON invoice_line_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access credit_notes" ON credit_notes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Deny anon invoice_items" ON invoice_items
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny anon invoice_customers" ON invoice_customers
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny anon invoice_series" ON invoice_series
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny anon invoice_templates" ON invoice_templates
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny anon invoices" ON invoices
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny anon invoice_line_items" ON invoice_line_items
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny anon credit_notes" ON credit_notes
  FOR ALL TO anon USING (false) WITH CHECK (false);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS invoice_items_updated_at ON invoice_items;
CREATE TRIGGER invoice_items_updated_at
  BEFORE UPDATE ON invoice_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS invoice_customers_updated_at ON invoice_customers;
CREATE TRIGGER invoice_customers_updated_at
  BEFORE UPDATE ON invoice_customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS invoice_series_updated_at ON invoice_series;
CREATE TRIGGER invoice_series_updated_at
  BEFORE UPDATE ON invoice_series FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS invoice_templates_updated_at ON invoice_templates;
CREATE TRIGGER invoice_templates_updated_at
  BEFORE UPDATE ON invoice_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------------------------------------------
-- PART 3: FUNCTIONS (014_invoice_functions.sql)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION issue_invoice_number(
  p_series_id UUID,
  p_vendor_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_prefix    TEXT;
  v_current   INT;
  v_padding   INT;
  v_fy        TEXT;
  v_number    TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_series_id::TEXT));

  SELECT prefix, current_number, padding, financial_year
    INTO v_prefix, v_current, v_padding, v_fy
    FROM invoice_series
   WHERE id = p_series_id
     AND vendor_id = p_vendor_id
     AND active = true
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice series not found, inactive, or does not belong to this vendor (series_id=%, vendor_id=%)', p_series_id, p_vendor_id;
  END IF;

  v_current := v_current + 1;
  v_number := v_prefix || LPAD(v_current::TEXT, v_padding, '0');

  IF LENGTH(v_number) > 16 THEN
    RAISE EXCEPTION 'Invoice number "%" exceeds the 16-character maximum. Shorten your prefix or reduce padding.', v_number;
  END IF;

  IF v_number !~ '^[A-Z0-9/\-]+$' THEN
    RAISE EXCEPTION 'Invoice number "%" contains invalid characters. Only A-Z, 0-9, / and - are allowed.', v_number;
  END IF;

  UPDATE invoice_series
     SET current_number = v_current
   WHERE id = p_series_id;

  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cancel_invoice(
  p_invoice_id UUID,
  p_vendor_id UUID,
  p_cancelled_by UUID,
  p_reason TEXT DEFAULT 'Cancelled by user'
) RETURNS VOID AS $$
BEGIN
  UPDATE invoices
     SET status = 'CANCELLED',
         cancelled_at = NOW(),
         cancelled_by = p_cancelled_by,
         cancellation_reason = p_reason
   WHERE id = p_invoice_id
     AND vendor_id = p_vendor_id
     AND status = 'ACTIVE';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found, does not belong to this vendor, or is already cancelled (invoice_id=%, vendor_id=%)', p_invoice_id, p_vendor_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_min_invoice_items(
  p_vendor_id UUID
) RETURNS BOOLEAN AS $$
  SELECT COUNT(*) >= 5
    FROM invoice_items
   WHERE vendor_id = p_vendor_id
     AND active = true;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_financial_year(
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS TEXT AS $$
DECLARE
  v_year INT;
BEGIN
  v_year := EXTRACT(YEAR FROM p_date);
  IF EXTRACT(MONTH FROM p_date) < 4 THEN
    v_year := v_year - 1;
  END IF;
  RETURN v_year::TEXT || '-' || RIGHT((v_year + 1)::TEXT, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_invoice_item_count(
  p_vendor_id UUID
) RETURNS INT AS $$
  SELECT COALESCE(COUNT(*)::INT, 0)
    FROM invoice_items
   WHERE vendor_id = p_vendor_id
     AND active = true;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_invoice_summary(
  p_vendor_id UUID,
  p_from_date DATE DEFAULT date_trunc('month', CURRENT_DATE)::DATE,
  p_to_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
  total_invoices BIGINT,
  active_invoices BIGINT,
  cancelled_invoices BIGINT,
  total_sales NUMERIC,
  total_taxable NUMERIC,
  total_cgst NUMERIC,
  total_sgst NUMERIC,
  total_igst NUMERIC,
  total_tax NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_invoices,
    COUNT(*) FILTER (WHERE i.status = 'ACTIVE')::BIGINT AS active_invoices,
    COUNT(*) FILTER (WHERE i.status = 'CANCELLED')::BIGINT AS cancelled_invoices,
    COALESCE(SUM(i.grand_total) FILTER (WHERE i.status = 'ACTIVE'), 0) AS total_sales,
    COALESCE(SUM(i.taxable_total) FILTER (WHERE i.status = 'ACTIVE'), 0) AS total_taxable,
    COALESCE(SUM(i.cgst_total) FILTER (WHERE i.status = 'ACTIVE'), 0) AS total_cgst,
    COALESCE(SUM(i.sgst_total) FILTER (WHERE i.status = 'ACTIVE'), 0) AS total_sgst,
    COALESCE(SUM(i.igst_total) FILTER (WHERE i.status = 'ACTIVE'), 0) AS total_igst,
    COALESCE(SUM(i.cgst_total + i.sgst_total + i.igst_total) FILTER (WHERE i.status = 'ACTIVE'), 0) AS total_tax
  FROM invoices i
  WHERE i.vendor_id = p_vendor_id
    AND i.invoice_date BETWEEN p_from_date AND p_to_date;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_daily_sales_report(
  p_vendor_id UUID,
  p_from_date DATE,
  p_to_date DATE
) RETURNS TABLE (
  sale_date DATE,
  invoice_count BIGINT,
  taxable_total NUMERIC,
  cgst_total NUMERIC,
  sgst_total NUMERIC,
  igst_total NUMERIC,
  grand_total NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.invoice_date AS sale_date,
    COUNT(*)::BIGINT AS invoice_count,
    COALESCE(SUM(i.taxable_total), 0) AS taxable_total,
    COALESCE(SUM(i.cgst_total), 0) AS cgst_total,
    COALESCE(SUM(i.sgst_total), 0) AS sgst_total,
    COALESCE(SUM(i.igst_total), 0) AS igst_total,
    COALESCE(SUM(i.grand_total), 0) AS grand_total
  FROM invoices i
  WHERE i.vendor_id = p_vendor_id
    AND i.status = 'ACTIVE'
    AND i.invoice_date BETWEEN p_from_date AND p_to_date
  GROUP BY i.invoice_date
  ORDER BY i.invoice_date DESC;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_tax_breakdown(
  p_vendor_id UUID,
  p_from_date DATE,
  p_to_date DATE
) RETURNS TABLE (
  gst_rate NUMERIC,
  invoice_count BIGINT,
  taxable_total NUMERIC,
  cgst_total NUMERIC,
  sgst_total NUMERIC,
  igst_total NUMERIC,
  tax_total NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    li.gst_rate_percent AS gst_rate,
    COUNT(DISTINCT li.invoice_id)::BIGINT AS invoice_count,
    COALESCE(SUM(li.taxable_value), 0) AS taxable_total,
    COALESCE(SUM(li.cgst), 0) AS cgst_total,
    COALESCE(SUM(li.sgst), 0) AS sgst_total,
    COALESCE(SUM(li.igst), 0) AS igst_total,
    COALESCE(SUM(li.cgst + li.sgst + li.igst), 0) AS tax_total
  FROM invoice_line_items li
  JOIN invoices i ON i.id = li.invoice_id
  WHERE i.vendor_id = p_vendor_id
    AND i.status = 'ACTIVE'
    AND i.invoice_date BETWEEN p_from_date AND p_to_date
  GROUP BY li.gst_rate_percent
  ORDER BY li.gst_rate_percent;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_hsn_summary(
  p_vendor_id UUID,
  p_from_date DATE,
  p_to_date DATE
) RETURNS TABLE (
  hsn_sac TEXT,
  description TEXT,
  uqc TEXT,
  total_qty NUMERIC,
  total_value NUMERIC,
  taxable_value NUMERIC,
  igst_amount NUMERIC,
  cgst_amount NUMERIC,
  sgst_amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    li.hsn_sac,
    MAX(li.item_name) AS description,
    MAX(li.unit) AS uqc,
    SUM(li.quantity) AS total_qty,
    SUM(li.line_total) AS total_value,
    SUM(li.taxable_value) AS taxable_value,
    SUM(li.igst) AS igst_amount,
    SUM(li.cgst) AS cgst_amount,
    SUM(li.sgst) AS sgst_amount
  FROM invoice_line_items li
  JOIN invoices i ON i.id = li.invoice_id
  WHERE i.vendor_id = p_vendor_id
    AND i.status = 'ACTIVE'
    AND i.invoice_date BETWEEN p_from_date AND p_to_date
  GROUP BY li.hsn_sac
  ORDER BY li.hsn_sac;
END;
$$ LANGUAGE plpgsql STABLE;


-- <<< END MIGRATION: 012_to_014_combined_invoice_migration.sql <<<


-- >>> START MIGRATION: 015_welcome_codes.sql >>>

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


-- <<< END MIGRATION: 015_welcome_codes.sql <<<


-- >>> START MIGRATION: 016_dpdp_consent.sql >>>

-- ============================================================================
-- 016_dpdp_consent.sql
-- GSTBro DPDP Act Readiness: Consent Records
-- Records every consent grant, withdrawal, and update with full audit trail.
-- Append-only: no DELETE or UPDATE permitted via RLS.
-- ============================================================================

CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- null for pre-signup leads/enquiries
  email TEXT,                                             -- for pre-signup lead consent records
  notice_version TEXT NOT NULL,                          -- semver of privacy notice shown, e.g. '1.0.0'
  purpose TEXT NOT NULL CHECK (purpose IN (
    'service_delivery',        -- core GST service processing
    'support_communications',  -- case messages, support tickets
    'service_notifications',   -- transactional emails/SMS about cases and invoices
    'marketing_email',         -- optional marketing emails
    'analytics'                -- optional product analytics
  )),
  data_categories TEXT[] NOT NULL,                       -- e.g. ARRAY['name','email','phone']
  action TEXT NOT NULL CHECK (action IN ('GRANTED', 'WITHDRAWN', 'UPDATED')),
  channel TEXT NOT NULL CHECK (channel IN (
    'SIGNUP_FORM',
    'LEAD_FORM',
    'PRIVACY_SETTINGS',
    'ACCOUNT_CLOSURE',
    'ADMIN_RECORDED',
    'SYSTEM'
  )),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consent_records_user_id ON consent_records(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consent_records_email ON consent_records(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consent_records_purpose ON consent_records(purpose, action);
CREATE INDEX IF NOT EXISTS idx_consent_records_created_at ON consent_records(created_at DESC);

-- RLS
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access consent_records" ON consent_records
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Deny anon consent_records" ON consent_records
  FOR ALL TO anon USING (false) WITH CHECK (false);

-- Prevent direct mutations by authenticated (non-service) sessions
CREATE POLICY "Deny direct authenticated delete on consent_records" ON consent_records
  FOR DELETE TO authenticated USING (false);

CREATE POLICY "Deny direct authenticated update on consent_records" ON consent_records
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);


-- <<< END MIGRATION: 016_dpdp_consent.sql <<<


-- >>> START MIGRATION: 017_dpdp_privacy_requests.sql >>>

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


-- <<< END MIGRATION: 017_dpdp_privacy_requests.sql <<<


-- >>> START MIGRATION: 018_dpdp_incidents.sql >>>

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


-- <<< END MIGRATION: 018_dpdp_incidents.sql <<<


-- >>> START MIGRATION: 019_retention_schedules.sql >>>

-- ============================================================================
-- 019_retention_schedules.sql
-- GSTBro DPDP Act Readiness: Retention Schedules & Erasure Staging
-- Adds deletion staging columns to users and leads.
-- Creates a retention_policies registry for internal governance.
-- Adds cleanup support for short-lived auth tables.
-- ============================================================================

-- 1. Retention Policy Registry (internal governance document, not user-facing)
CREATE TABLE IF NOT EXISTS retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  retention_days INT,                -- NULL = indefinite / legal hold
  legal_basis TEXT,                  -- e.g. 'GST_ACT_S_36', 'FRAUD_PREVENTION', 'SECURITY_AUDIT', 'CONSENT', 'CONTRACT'
  legal_reference TEXT,              -- e.g. 'CGST Act 2017, Section 36 — 6 years'
  auto_purge_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  review_date DATE,
  approved_by TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial retention policy register
-- IMPORTANT: retention_days values marked 0 are PLACEHOLDERS pending legal review.
-- Do not use 0-day values to trigger actual deletion until legal counsel confirms the period.
INSERT INTO retention_policies (table_name, description, retention_days, legal_basis, legal_reference, auto_purge_enabled, note) VALUES
  ('users', 'Registered user account records', NULL, 'CONTRACT', 'Retained while account is active; staged deletion on erasure request', FALSE, 'LEGAL REVIEW REQUIRED for post-closure period'),
  ('leads', 'Pre-signup enquiry records', NULL, 'CONSENT', 'Pending legal review of appropriate retention for unconverted leads', FALSE, 'LEGAL REVIEW REQUIRED'),
  ('client_gst_data', 'GST return financial data', NULL, 'GST_ACT', 'CGST Act 2017 Section 36 — books of account 6 years; confirm with counsel', FALSE, 'LEGAL REVIEW REQUIRED'),
  ('invoices', 'Tax invoices (immutable legal records)', NULL, 'GST_ACT', 'CGST Act 2017 Section 36 — 6 years from filing of annual return; confirm with counsel', FALSE, 'LEGAL REVIEW REQUIRED'),
  ('documents', 'Case-linked document metadata (files in Google Drive)', NULL, 'GST_ACT', 'Mirrors client_gst_data retention; confirm with counsel', FALSE, 'LEGAL REVIEW REQUIRED'),
  ('client_documents', 'Client workspace document metadata', NULL, 'CONTRACT', 'Retained during active service; review on account closure', FALSE, 'LEGAL REVIEW REQUIRED'),
  ('client_messages', 'Client-team support messages', 365, 'CONTRACT', '12 months post last message or account closure, whichever is later — PENDING LEGAL REVIEW', FALSE, 'LEGAL REVIEW REQUIRED'),
  ('otp_codes', 'Email OTP codes (hashed)', 7, 'SECURITY', 'Used/expired OTPs have no operational purpose after 7 days', TRUE, 'Safe to auto-purge used/expired records'),
  ('mobile_otp_sessions', 'Mobile OTP sessions', 7, 'SECURITY', 'Expired sessions have no operational purpose after 7 days', TRUE, 'Safe to auto-purge expired records'),
  ('password_reset_authorizations', 'Single-use password reset tokens (hashed)', 30, 'SECURITY', 'Used/expired tokens have no operational purpose after 30 days', TRUE, 'Safe to auto-purge used/expired records'),
  ('revoked_tokens', 'Revoked JWT tokens (hashed)', 30, 'SECURITY', 'Tokens beyond JWT expiry window are effectively invalid', TRUE, 'LEGAL REVIEW on appropriate window'),
  ('auth_audit_logs', 'Security and authentication audit events', NULL, 'SECURITY_AUDIT', '2 years recommended for security investigations — PENDING LEGAL REVIEW', FALSE, 'LEGAL REVIEW REQUIRED'),
  ('activity_logs', 'Admin/team action audit trail', NULL, 'SECURITY_AUDIT', '2 years recommended — PENDING LEGAL REVIEW', FALSE, 'LEGAL REVIEW REQUIRED'),
  ('consent_records', 'DPDP consent audit trail', NULL, 'LEGAL_OBLIGATION', 'Must be retained to demonstrate lawful processing; PENDING LEGAL REVIEW on period', FALSE, 'LEGAL REVIEW REQUIRED'),
  ('privacy_requests', 'DPDP rights request records', NULL, 'LEGAL_OBLIGATION', 'Must be retained to demonstrate compliance; PENDING LEGAL REVIEW on period', FALSE, 'LEGAL REVIEW REQUIRED'),
  ('breach_incidents', 'Personal data breach incident records', NULL, 'LEGAL_OBLIGATION', 'Must be retained for regulatory accountability; PENDING LEGAL REVIEW on period', FALSE, 'LEGAL REVIEW REQUIRED')
ON CONFLICT (table_name) DO NOTHING;

-- 2. Erasure staging columns on users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletion_hold_reason TEXT,   -- why deletion is held (e.g. 'ACTIVE_CASES', 'LEGAL_RETENTION')
  ADD COLUMN IF NOT EXISTS is_anonymized BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Soft-delete / erasure flag for leads
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS erased_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS erased_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 4. Add privacy_notice_version to site_settings seed (if not already present)
INSERT INTO site_settings (key, value) VALUES
  ('privacy_notice_version', '1.0.0'),
  ('privacy_notice_effective_date', '2027-01-01'),
  ('privacy_grievance_email', 'privacy@gstbro.com'),
  ('privacy_officer_name', ''),
  ('privacy_officer_email', 'privacy@gstbro.com'),
  ('children_age_policy', 'adults_only_18_plus'),
  ('analytics_enabled', 'false'),
  ('dpdp_operational_date', '2027-05-13')
ON CONFLICT (key) DO NOTHING;

-- 5. Indexes for erasure staging
CREATE INDEX IF NOT EXISTS idx_users_deletion_scheduled_at ON users(deletion_scheduled_at) WHERE deletion_scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_is_anonymized ON users(is_anonymized) WHERE is_anonymized = TRUE;
CREATE INDEX IF NOT EXISTS idx_leads_erased_at ON leads(erased_at) WHERE erased_at IS NOT NULL;

-- 6. Trigger
CREATE TRIGGER retention_policies_updated_at
  BEFORE UPDATE ON retention_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE retention_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access retention_policies" ON retention_policies
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Deny anon retention_policies" ON retention_policies
  FOR ALL TO anon USING (false) WITH CHECK (false);


-- <<< END MIGRATION: 019_retention_schedules.sql <<<


-- >>> START MIGRATION: 020_multi_tenant_saas.sql >>>

-- ============================================================================
-- 020_multi_tenant_saas.sql
-- Multi-Tenant B2B Architecture for CA / Tax Consultants & Super Admin Platform
-- ============================================================================

-- 1. Extend user_role enum if values are missing
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'FIRM_OWNER';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'FIRM_STAFF';

-- 2. CA Firms / Agencies (Tenants)
CREATE TABLE IF NOT EXISTS firms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_user_id UUID,
  email TEXT NOT NULL,
  phone TEXT,
  gstin TEXT,
  address TEXT,
  branding JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED')),
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firms_slug ON firms(slug);
CREATE INDEX IF NOT EXISTS idx_firms_status ON firms(status);
CREATE INDEX IF NOT EXISTS idx_firms_owner ON firms(owner_user_id);

DROP TRIGGER IF EXISTS firms_updated_at ON firms;
CREATE TRIGGER firms_updated_at BEFORE UPDATE ON firms FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3. Bring-Your-Own Google Drive Configuration for CA Firms
CREATE TABLE IF NOT EXISTS firm_drive_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE UNIQUE,
  auth_type TEXT NOT NULL DEFAULT 'OAUTH' CHECK (auth_type IN ('OAUTH', 'SERVICE_ACCOUNT')),
  refresh_token_encrypted TEXT,
  access_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  service_account_json_encrypted TEXT,
  root_folder_id TEXT,
  root_folder_name TEXT,
  is_connected BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firm_drive_configs_firm ON firm_drive_configs(firm_id);

DROP TRIGGER IF EXISTS firm_drive_configs_updated_at ON firm_drive_configs;
CREATE TRIGGER firm_drive_configs_updated_at BEFORE UPDATE ON firm_drive_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. Document Routing Direction Rules (e.g. Sales -> Folder X, Purchases -> Folder Y)
CREATE TABLE IF NOT EXISTS firm_document_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('SALES', 'PURCHASES', 'BANK', 'FILED_RETURNS', 'NOTICES', 'CLIENT_DOCS', 'CUSTOM')),
  rule_name TEXT NOT NULL,
  custom_folder_name TEXT,
  target_path_template TEXT NOT NULL DEFAULT '{Client_Name}/{Category}/{Year}_{Month}',
  google_folder_id TEXT,
  auto_create_subfolders BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firm_routing_rules_firm ON firm_document_routing_rules(firm_id);
CREATE INDEX IF NOT EXISTS idx_firm_routing_rules_category ON firm_document_routing_rules(firm_id, category);

DROP TRIGGER IF EXISTS firm_routing_rules_updated_at ON firm_document_routing_rules;
CREATE TRIGGER firm_routing_rules_updated_at BEFORE UPDATE ON firm_document_routing_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. Monthly Usage Metering & Active-Client Billing Table
CREATE TABLE IF NOT EXISTS firm_monthly_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  billing_period TEXT NOT NULL,              -- Format: 'YYYY-MM', e.g. '2026-11'
  total_clients_count INTEGER NOT NULL DEFAULT 0,
  active_clients_count INTEGER NOT NULL DEFAULT 0,
  team_members_count INTEGER NOT NULL DEFAULT 0,
  rate_per_active_client NUMERIC(10, 2) NOT NULL DEFAULT 149.00,
  base_platform_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  subtotal_inr NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  gst_inr NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_inr NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  invoice_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (invoice_status IN ('PENDING', 'PAID', 'OVERDUE', 'WAIVED')),
  paid_at TIMESTAMPTZ,
  invoice_url TEXT,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(firm_id, billing_period)
);

CREATE INDEX IF NOT EXISTS idx_firm_monthly_usage_period ON firm_monthly_usage(billing_period);
CREATE INDEX IF NOT EXISTS idx_firm_monthly_usage_firm ON firm_monthly_usage(firm_id);

-- 6. Website CMS Content Store (Super Admin controlled live website editor)
CREATE TABLE IF NOT EXISTS platform_site_content (
  key TEXT PRIMARY KEY,
  content JSONB NOT NULL DEFAULT '{}',
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Add firm_id & firm_role to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS firm_role TEXT DEFAULT 'FIRM_STAFF' 
    CHECK (firm_role IN ('FIRM_OWNER', 'FIRM_MANAGER', 'FIRM_STAFF'));

CREATE INDEX IF NOT EXISTS idx_users_firm_id ON users(firm_id);

-- 8. Add firm_id to all operational tables
ALTER TABLE cases ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cases_firm_id ON cases(firm_id);

ALTER TABLE client_gst_data ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_client_gst_data_firm_id ON client_gst_data(firm_id);

ALTER TABLE client_documents 
  ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS drive_folder_id TEXT,
  ADD COLUMN IF NOT EXISTS routed_by_rule_id UUID REFERENCES firm_document_routing_rules(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_client_documents_firm_id ON client_documents(firm_id);

ALTER TABLE due_dates ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_due_dates_firm_id ON due_dates(firm_id);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_leads_firm_id ON leads(firm_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_invoices_firm_id ON invoices(firm_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fee_invoices') THEN
    ALTER TABLE fee_invoices ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_fee_invoices_firm_id ON fee_invoices(firm_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_messages') THEN
    ALTER TABLE client_messages ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES firms(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_client_messages_firm_id ON client_messages(firm_id);
  END IF;
END $$;

-- 9. Backfill Default Firm for existing data so no legacy data is orphaned
DO $$
DECLARE
  default_firm_id UUID;
  first_admin_id UUID;
BEGIN
  -- Check if a default firm already exists
  SELECT id INTO default_firm_id FROM firms WHERE slug = 'primary-firm' LIMIT 1;
  
  IF default_firm_id IS NULL THEN
    -- Find first admin or user to be provisional owner (use text cast to avoid 55P04)
    SELECT id INTO first_admin_id FROM users WHERE role::text = 'ADMIN' ORDER BY created_at ASC LIMIT 1;
    
    INSERT INTO firms (id, name, slug, owner_user_id, email, phone, status)
    VALUES (
      gen_random_uuid(),
      'GST Bro Primary Practice',
      'primary-firm',
      first_admin_id,
      'admin@gstbro.in',
      '+91 99999 99999',
      'ACTIVE'
    )
    RETURNING id INTO default_firm_id;
  END IF;

  -- Backfill firm_id into existing records
  UPDATE users SET firm_id = default_firm_id WHERE firm_id IS NULL;
  UPDATE cases SET firm_id = default_firm_id WHERE firm_id IS NULL;
  UPDATE client_gst_data SET firm_id = default_firm_id WHERE firm_id IS NULL;
  UPDATE client_documents SET firm_id = default_firm_id WHERE firm_id IS NULL;
  UPDATE due_dates SET firm_id = default_firm_id WHERE firm_id IS NULL;
  UPDATE leads SET firm_id = default_firm_id WHERE firm_id IS NULL;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    EXECUTE 'UPDATE invoices SET firm_id = $1 WHERE firm_id IS NULL' USING default_firm_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fee_invoices') THEN
    EXECUTE 'UPDATE fee_invoices SET firm_id = $1 WHERE firm_id IS NULL' USING default_firm_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_messages') THEN
    EXECUTE 'UPDATE client_messages SET firm_id = $1 WHERE firm_id IS NULL' USING default_firm_id;
  END IF;
END $$;

-- 10. Enable Row Level Security on New Tables
ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_drive_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_document_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_monthly_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_site_content ENABLE ROW LEVEL SECURITY;

-- 11. Public read for site content
CREATE POLICY "Public read platform_site_content" ON platform_site_content
  FOR SELECT TO anon, authenticated USING (true);

-- 12. Service role full access on new tables
CREATE POLICY "Service role full access firms" ON firms
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access firm_drive_configs" ON firm_drive_configs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access firm_routing_rules" ON firm_document_routing_rules
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access firm_monthly_usage" ON firm_monthly_usage
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access platform_site_content" ON platform_site_content
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- <<< END MIGRATION: 020_multi_tenant_saas.sql <<<



-- >>> START MIGRATION: 021_firm_tasks_and_customizations.sql >>>

ALTER TABLE firms
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS frn_number TEXT,
  ADD COLUMN IF NOT EXISTS membership_number TEXT,
  ADD COLUMN IF NOT EXISTS stamp_signature_url TEXT,
  ADD COLUMN IF NOT EXISTS letterhead_url TEXT,
  ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#2563eb';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS filing_stage TEXT DEFAULT 'DATA_COLLECTION' 
    CHECK (filing_stage IN ('DATA_COLLECTION', 'RECON_IN_PROGRESS', 'CA_REVIEW', 'FILED')),
  ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_assigned_staff ON users(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_users_filing_stage ON users(filing_stage);

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
  last_generated_period TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firm_recurring_rules_firm ON firm_task_recurring_rules(firm_id);

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

-- <<< END MIGRATION: 021_firm_tasks_and_customizations.sql <<<


-- >>> START MIGRATION: 022_firm_team_isolation.sql >>>

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS team_group TEXT DEFAULT 'General';

ALTER TABLE firm_tasks
  ADD COLUMN IF NOT EXISTS team_group TEXT DEFAULT 'General';

CREATE INDEX IF NOT EXISTS idx_users_team_group ON users(firm_id, team_group);
CREATE INDEX IF NOT EXISTS idx_firm_tasks_team_group ON firm_tasks(firm_id, team_group);

CREATE TABLE IF NOT EXISTS firm_client_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
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

ALTER TABLE firm_client_access_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'firm_client_access_logs' AND policyname = 'firm_access_logs_policy') THEN
    CREATE POLICY firm_access_logs_policy ON firm_client_access_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- <<< END MIGRATION: 022_firm_team_isolation.sql <<<


-- >>> START MIGRATION: 023_firm_permissions_and_messaging.sql >>>

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

CREATE TABLE IF NOT EXISTS pre_filing_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
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

-- <<< END MIGRATION: 023_firm_permissions_and_messaging.sql <<<


-- >>> START MIGRATION: 024_firm_automations_milestones_messaging.sql >>>

CREATE TABLE IF NOT EXISTS client_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL CHECK (milestone_type IN ('BIRTHDAY', 'INCORPORATION_DAY', 'GST_ANNIVERSARY', 'CUSTOM')),
  title TEXT NOT NULL,
  milestone_date DATE NOT NULL,
  contact_person TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  last_greeted_year INTEGER,
  last_greeted_at TIMESTAMPTZ,
  last_greeted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_milestones_firm ON client_milestones(firm_id);
CREATE INDEX IF NOT EXISTS idx_client_milestones_client ON client_milestones(client_id);
CREATE INDEX IF NOT EXISTS idx_client_milestones_date ON client_milestones(milestone_date);

CREATE TABLE IF NOT EXISTS firm_user_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('URGENT', 'HIGH', 'NORMAL', 'LOW')),
  due_date DATE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firm_user_todos_user ON firm_user_todos(user_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_firm_user_todos_firm ON firm_user_todos(firm_id);

CREATE TABLE IF NOT EXISTS firm_chat_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  group_type TEXT NOT NULL DEFAULT 'INTERNAL_TEAM' CHECK (group_type IN ('INTERNAL_TEAM', 'CLIENT_GROUP', 'BROADCAST')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firm_chat_groups_firm ON firm_chat_groups(firm_id);

CREATE TABLE IF NOT EXISTS firm_chat_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES firm_chat_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'MEMBER')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_firm_chat_group_members_user ON firm_chat_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_firm_chat_group_members_group ON firm_chat_group_members(group_id);

ALTER TABLE client_messages
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES firm_chat_groups(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS recipient_user_id UUID REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE client_messages ALTER COLUMN client_user_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_messages_group ON client_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_client_messages_recipient ON client_messages(recipient_user_id, sender_user_id);

ALTER TABLE client_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_user_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_chat_group_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_milestones' AND policyname = 'client_milestones_policy') THEN
    CREATE POLICY client_milestones_policy ON client_milestones FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'firm_user_todos' AND policyname = 'firm_user_todos_policy') THEN
    CREATE POLICY firm_user_todos_policy ON firm_user_todos FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'firm_chat_groups' AND policyname = 'firm_chat_groups_policy') THEN
    CREATE POLICY firm_chat_groups_policy ON firm_chat_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'firm_chat_group_members' AND policyname = 'firm_chat_group_members_policy') THEN
    CREATE POLICY firm_chat_group_members_policy ON firm_chat_group_members FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- <<< END MIGRATION: 024_firm_automations_milestones_messaging.sql <<<


-- ============================================================================
-- Migration 025: Registration Constitution Types, Practice Fields & OTP Settings
-- ============================================================================

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS constitution_type VARCHAR(60) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS practice_type VARCHAR(60) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS membership_number VARCHAR(60) DEFAULT NULL;

ALTER TABLE firms 
ADD COLUMN IF NOT EXISTS constitution_type VARCHAR(60) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS practice_type VARCHAR(60) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS membership_number VARCHAR(60) DEFAULT NULL;

INSERT INTO site_settings (key, value, updated_at)
VALUES ('signup_phone_otp_enabled', 'false', NOW())
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- Migration 026: Welcome Code Support Phone Setting (GET Button Hotline)
-- ============================================================================

INSERT INTO site_settings (key, value, updated_at)
VALUES ('welcome_code_support_phone', '+91 98765 43210', NOW())
ON CONFLICT (key) DO NOTHING;
