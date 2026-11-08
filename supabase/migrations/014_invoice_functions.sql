-- ============================================================================
-- 014_invoice_functions.sql
-- GSTBro Invoice Module: Postgres functions for atomic invoice number
-- issuance, invoice cancellation, and item count validation.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. ISSUE INVOICE NUMBER (atomic, race-safe)
--
-- Called from Fastify backend during invoice generation.
-- Uses advisory lock + FOR UPDATE to prevent concurrent races.
-- Returns the next sequential invoice number string.
-- ────────────────────────────────────────────────────────────────────────────
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
  -- Advisory lock on the series ID to prevent concurrent generation races
  -- hashtext() converts UUID to a 32-bit int for pg_advisory_xact_lock
  PERFORM pg_advisory_xact_lock(hashtext(p_series_id::TEXT));

  -- Lock the series row for update and read current state
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

  -- Increment the counter
  v_current := v_current + 1;

  -- Build the invoice number: PREFIX + zero-padded number
  v_number := v_prefix || LPAD(v_current::TEXT, v_padding, '0');

  -- Validate: maximum 16 characters as per GST requirements
  IF LENGTH(v_number) > 16 THEN
    RAISE EXCEPTION 'Invoice number "%" exceeds the 16-character maximum. Shorten your prefix or reduce padding.', v_number;
  END IF;

  -- Validate: only A-Z, 0-9, /, - allowed
  IF v_number !~ '^[A-Z0-9/\-]+$' THEN
    RAISE EXCEPTION 'Invoice number "%" contains invalid characters. Only A-Z, 0-9, / and - are allowed.', v_number;
  END IF;

  -- Persist the updated counter
  UPDATE invoice_series
     SET current_number = v_current
   WHERE id = p_series_id;

  RETURN v_number;
END;
$$ LANGUAGE plpgsql;


-- ────────────────────────────────────────────────────────────────────────────
-- 2. CANCEL INVOICE (status transition only)
--
-- Invoices are immutable — this only changes status from ACTIVE → CANCELLED.
-- Records who cancelled and when.
-- ────────────────────────────────────────────────────────────────────────────
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


-- ────────────────────────────────────────────────────────────────────────────
-- 3. CHECK MINIMUM ITEMS (enforce 5-item minimum before generation)
--
-- Returns TRUE if the vendor has at least 5 active items.
-- Called as a pre-flight check before invoice generation.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_min_invoice_items(
  p_vendor_id UUID
) RETURNS BOOLEAN AS $$
  SELECT COUNT(*) >= 5
    FROM invoice_items
   WHERE vendor_id = p_vendor_id
     AND active = true;
$$ LANGUAGE sql STABLE;


-- ────────────────────────────────────────────────────────────────────────────
-- 4. GET FINANCIAL YEAR (utility function)
--
-- Given a date, returns the Indian financial year string.
-- Indian FY: April 1 → March 31
-- e.g. 2026-10-16 → '2026-27', 2027-02-15 → '2026-27'
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_financial_year(
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS TEXT AS $$
DECLARE
  v_year INT;
BEGIN
  v_year := EXTRACT(YEAR FROM p_date);

  -- If month is Jan-Mar, the FY started the previous calendar year
  IF EXTRACT(MONTH FROM p_date) < 4 THEN
    v_year := v_year - 1;
  END IF;

  -- Return format: '2026-27'
  RETURN v_year::TEXT || '-' || RIGHT((v_year + 1)::TEXT, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ────────────────────────────────────────────────────────────────────────────
-- 5. GET ACTIVE ITEM COUNT (for UI display)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_invoice_item_count(
  p_vendor_id UUID
) RETURNS INT AS $$
  SELECT COALESCE(COUNT(*)::INT, 0)
    FROM invoice_items
   WHERE vendor_id = p_vendor_id
     AND active = true;
$$ LANGUAGE sql STABLE;


-- ────────────────────────────────────────────────────────────────────────────
-- 6. GET INVOICE SUMMARY STATS (dashboard KPIs)
--
-- Returns aggregate stats for a vendor within a date range.
-- ────────────────────────────────────────────────────────────────────────────
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


-- ────────────────────────────────────────────────────────────────────────────
-- 7. DAILY SALES REPORT (aggregated by date)
-- ────────────────────────────────────────────────────────────────────────────
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


-- ────────────────────────────────────────────────────────────────────────────
-- 8. TAX BREAKDOWN BY GST RATE (for tax summary report)
-- ────────────────────────────────────────────────────────────────────────────
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


-- ────────────────────────────────────────────────────────────────────────────
-- 9. HSN SUMMARY (for GSTR-1 Table 12 export)
-- ────────────────────────────────────────────────────────────────────────────
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
