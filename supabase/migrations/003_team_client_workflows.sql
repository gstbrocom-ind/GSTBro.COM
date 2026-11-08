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
