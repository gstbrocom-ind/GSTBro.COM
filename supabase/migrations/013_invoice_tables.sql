-- ============================================================================
-- 013_invoice_tables.sql
-- GSTBro Invoice Module: Core tables for items, customers, series, invoices,
-- line items, credit notes, and fully customizable invoice templates.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. INVOICE ITEMS (per-vendor product/service catalog)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hsn_sac TEXT NOT NULL,                       -- 4-8 digit HSN or SAC code
  gst_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 18,  -- 0, 5, 12, 18, or 28
  unit TEXT NOT NULL DEFAULT 'NOS',            -- NOS, KGS, PCS, MTR, LTR, etc.
  min_price NUMERIC(12,2) NOT NULL DEFAULT 1,  -- minimum unit price (> 0)
  max_price NUMERIC(12,2) NOT NULL DEFAULT 1,  -- maximum unit price (>= min_price)
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_invoice_items_price CHECK (min_price > 0 AND max_price >= min_price),
  CONSTRAINT chk_invoice_items_gst CHECK (gst_rate_percent IN (0, 5, 12, 18, 28))
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_vendor ON invoice_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_active ON invoice_items(vendor_id, active);
CREATE INDEX IF NOT EXISTS idx_invoice_items_hsn ON invoice_items(hsn_sac);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. INVOICE CUSTOMERS (per-vendor buyer directory)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  gstin TEXT,                                  -- nullable: B2C customers don't have GSTIN
  state TEXT NOT NULL,
  state_code CHAR(2) NOT NULL,                 -- 2-digit GST state code (01-38)
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

-- ────────────────────────────────────────────────────────────────────────────
-- 3. INVOICE SERIES (per-vendor, per-financial-year numbering)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  financial_year TEXT NOT NULL,                 -- e.g. '2026-27'
  prefix TEXT NOT NULL DEFAULT 'INV/',          -- e.g. 'INV/', 'GST/', 'BILL-'
  start_number INT NOT NULL DEFAULT 1,
  current_number INT NOT NULL DEFAULT 0,       -- last issued number (0 = none issued yet)
  padding INT NOT NULL DEFAULT 4,              -- zero-pad width: 4 → '0001'
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One active series per vendor per financial year
  CONSTRAINT uq_invoice_series_vendor_fy UNIQUE (vendor_id, financial_year)
);

CREATE INDEX IF NOT EXISTS idx_invoice_series_vendor ON invoice_series(vendor_id);
CREATE INDEX IF NOT EXISTS idx_invoice_series_fy ON invoice_series(financial_year);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. INVOICE TEMPLATES (rich customization engine)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default Template',

  -- Page & layout
  page_size TEXT NOT NULL DEFAULT 'A4',         -- A4, A5, THERMAL
  orientation TEXT NOT NULL DEFAULT 'portrait', -- portrait, landscape
  margins JSONB NOT NULL DEFAULT '{"top":20,"right":15,"bottom":20,"left":15}'::jsonb,

  -- Branding
  accent_color TEXT NOT NULL DEFAULT '#1d4ed8',  -- hex color for headers, borders
  secondary_color TEXT NOT NULL DEFAULT '#64748b', -- secondary text/accent
  font_family TEXT NOT NULL DEFAULT 'Helvetica', -- Helvetica, Times-Roman, Courier
  logo_position TEXT NOT NULL DEFAULT 'top-left', -- top-left, top-center, top-right
  logo_width INT NOT NULL DEFAULT 80,            -- logo width in px
  logo_height INT NOT NULL DEFAULT 80,           -- logo height in px

  -- Custom title & heading text (user can type ANY word)
  custom_title TEXT NOT NULL DEFAULT 'TAX INVOICE', -- e.g. 'TAX INVOICE', 'BILL OF SUPPLY', 'PROFORMA', any text
  title_font_size INT NOT NULL DEFAULT 18,
  title_alignment TEXT NOT NULL DEFAULT 'center', -- left, center, right

  -- Section-level font sizing (stretch/shrink text)
  header_font_size INT NOT NULL DEFAULT 10,      -- seller/buyer info section
  table_header_font_size INT NOT NULL DEFAULT 9, -- line items table header
  table_body_font_size INT NOT NULL DEFAULT 9,   -- line items table body
  footer_font_size INT NOT NULL DEFAULT 8,       -- footer/terms section
  summary_font_size INT NOT NULL DEFAULT 10,     -- tax summary section

  -- Custom labels — rename ANY standard field
  -- Schema: { "invoice_number": "Bill No.", "invoice_date": "Bill Date", "buyer": "Ship To", ... }
  custom_labels JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Field visibility — show/hide specific sections
  -- Schema: { "hsn_column": true, "unit_column": true, "qty_column": true, ... }
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

  -- Column widths for the line items table (relative proportions)
  -- Schema: { "sno": 5, "description": 30, "hsn": 10, "qty": 8, "unit": 7, "rate": 12, "taxable": 13, "tax": 8, "total": 12 }
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

  -- Additional custom text fields that appear on the invoice
  -- Schema: [{ "label": "Transport", "value": "By Road", "position": "below_buyer" }, ...]
  custom_fields JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Text styling per section
  -- Schema: { "title": { "bold": true, "italic": false, "uppercase": true }, "header": {...}, ... }
  text_styles JSONB NOT NULL DEFAULT '{
    "title": { "bold": true, "italic": false, "uppercase": true, "letterSpacing": 2 },
    "header": { "bold": false, "italic": false, "uppercase": false, "letterSpacing": 0 },
    "table_header": { "bold": true, "italic": false, "uppercase": true, "letterSpacing": 1 },
    "footer": { "bold": false, "italic": true, "uppercase": false, "letterSpacing": 0 }
  }'::jsonb,

  -- Footer content
  footer_text TEXT DEFAULT 'Thank you for your business!',
  show_page_number BOOLEAN NOT NULL DEFAULT FALSE,
  watermark_text TEXT,                           -- e.g. 'DRAFT', 'ORIGINAL', 'DUPLICATE', any word

  -- Borders & lines
  show_table_borders BOOLEAN NOT NULL DEFAULT TRUE,
  border_color TEXT NOT NULL DEFAULT '#e2e8f0',
  header_bg_color TEXT NOT NULL DEFAULT '#f8fafc', -- table header row background
  alternate_row_color TEXT,                        -- null = no alternating, or hex like '#f9fafb'

  -- Is this the default template for this vendor?
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_templates_vendor ON invoice_templates(vendor_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 5. INVOICES (immutable once created — no edit, no delete)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES invoice_customers(id) ON DELETE SET NULL,
  series_id UUID NOT NULL REFERENCES invoice_series(id) ON DELETE RESTRICT,
  template_id UUID REFERENCES invoice_templates(id) ON DELETE SET NULL,

  -- Invoice identification
  invoice_number TEXT NOT NULL,
  financial_year TEXT NOT NULL,
  invoice_date DATE NOT NULL,

  -- Buyer snapshot (denormalized at creation — immutable legal record)
  buyer_name TEXT NOT NULL,
  buyer_gstin TEXT,
  buyer_address TEXT,
  buyer_state TEXT NOT NULL,
  buyer_state_code CHAR(2) NOT NULL,
  buyer_phone TEXT,

  -- Place of supply determines IGST vs CGST+SGST
  place_of_supply TEXT NOT NULL,
  place_of_supply_code CHAR(2) NOT NULL,
  is_igst BOOLEAN NOT NULL DEFAULT FALSE,

  -- Totals (computed from line items and stored)
  taxable_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  cgst_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  sgst_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  igst_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(14,2) NOT NULL,

  -- Status: only ACTIVE → CANCELLED transition allowed
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELLED')),

  -- Template config snapshot (saved at generation time so invoice renders correctly even if template changes)
  template_snapshot JSONB,

  -- Batch tracking for bulk generation
  generation_batch_id UUID,

  -- Who created this invoice (could be CLIENT themselves, or TEAM/ADMIN on their behalf)
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique invoice number per vendor per financial year
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

-- ────────────────────────────────────────────────────────────────────────────
-- 6. INVOICE LINE ITEMS (detail rows within each invoice)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_id UUID REFERENCES invoice_items(id) ON DELETE SET NULL, -- reference to catalog (nullable)

  -- Snapshot of item data at time of invoice creation
  item_name TEXT NOT NULL,
  hsn_sac TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'NOS',

  -- Amounts
  quantity NUMERIC(10,4) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price > 0),
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  taxable_value NUMERIC(14,2) NOT NULL,        -- qty * unit_price * (1 - discount/100)
  gst_rate_percent NUMERIC(5,2) NOT NULL,

  -- Tax split
  cgst NUMERIC(12,2) NOT NULL DEFAULT 0,
  sgst NUMERIC(12,2) NOT NULL DEFAULT 0,
  igst NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(14,2) NOT NULL,           -- taxable_value + cgst + sgst + igst

  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_item ON invoice_line_items(item_id) WHERE item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_hsn ON invoice_line_items(hsn_sac);

-- ────────────────────────────────────────────────────────────────────────────
-- 7. CREDIT NOTES (linked to original invoice)
-- ────────────────────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────────────────────
-- 8. ENABLE ROW LEVEL SECURITY ON ALL NEW TABLES
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;

-- Service role (Fastify backend) has full access; all authorization
-- is enforced in the application layer via canAccessClient().
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

-- Block all anon / direct authenticated access (backend-only)
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

-- ────────────────────────────────────────────────────────────────────────────
-- 9. UPDATED_AT TRIGGERS (reusing existing update_updated_at function)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TRIGGER invoice_items_updated_at
  BEFORE UPDATE ON invoice_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER invoice_customers_updated_at
  BEFORE UPDATE ON invoice_customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER invoice_series_updated_at
  BEFORE UPDATE ON invoice_series FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER invoice_templates_updated_at
  BEFORE UPDATE ON invoice_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
