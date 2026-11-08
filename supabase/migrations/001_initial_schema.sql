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
