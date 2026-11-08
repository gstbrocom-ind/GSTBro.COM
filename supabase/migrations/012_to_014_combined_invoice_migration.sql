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
