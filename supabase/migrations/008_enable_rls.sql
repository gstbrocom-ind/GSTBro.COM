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
