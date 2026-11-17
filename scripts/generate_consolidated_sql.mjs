import fs from 'fs';
import path from 'path';

const MIGRATIONS_DIR = path.resolve('supabase', 'migrations');
const OUTPUT_FILE = path.resolve('supabase', 'full_schema_setup.sql');

const ORDERED_FILES = [
  '001_initial_schema.sql',
  '002_password_auth.sql',
  '002_service_seo.sql',
  '003_team_client_workflows.sql',
  '004_messages.sql',
  '005_fees.sql',
  '006_auth_storage.sql',
  '007_twofactor_auth.sql',
  '008_enable_rls.sql',
  '009_rls_deny_anon_security_tables.sql',
  '010_activity_logs.sql',
  '011_revoked_tokens.sql',
  '012_to_014_combined_invoice_migration.sql',
  '015_welcome_codes.sql',
  '016_dpdp_consent.sql',
  '017_dpdp_privacy_requests.sql',
  '018_dpdp_incidents.sql',
  '019_retention_schedules.sql',
  '020_multi_tenant_saas.sql'
];

let fullSql = `-- ============================================================================
-- GST BRO COMPLETE DATABASE SETUP SCRIPT FOR NEW SUPABASE PROJECT
-- Auto-generated from sequential migrations 001 to 020
-- ============================================================================

`;

for (const file of ORDERED_FILES) {
  const filePath = path.join(MIGRATIONS_DIR, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    fullSql += `\n-- >>> START MIGRATION: ${file} >>>\n\n` + content + `\n\n-- <<< END MIGRATION: ${file} <<<\n\n`;
  }
}

fs.writeFileSync(OUTPUT_FILE, fullSql, 'utf-8');
console.log(`Generated ${OUTPUT_FILE} (${fullSql.length} characters)`);
