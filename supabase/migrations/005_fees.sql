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
