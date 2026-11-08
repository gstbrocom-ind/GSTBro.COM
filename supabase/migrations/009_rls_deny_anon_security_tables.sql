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
