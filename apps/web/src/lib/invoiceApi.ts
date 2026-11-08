import { apiFetch } from './api';

// ============================================================================
// DATA MODELS & INTERFACES
// ============================================================================
export interface InvoiceItem {
  id: string;
  vendor_id: string;
  name: string;
  hsn_sac: string;
  gst_rate_percent: number;
  unit: string;
  min_price: number;
  max_price: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceCustomer {
  id: string;
  vendor_id: string;
  name: string;
  gstin?: string | null;
  state: string;
  state_code: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  active: boolean;
  created_at?: string;
}

export interface InvoiceSeries {
  id: string;
  vendor_id: string;
  financial_year: string;
  prefix: string;
  start_number: number;
  current_number: number;
  padding: number;
  active: boolean;
  created_at?: string;
}

export interface InvoiceTemplate {
  id: string;
  vendor_id: string;
  name: string;
  page_size: 'A4' | 'A5' | 'THERMAL';
  orientation: 'portrait' | 'landscape';
  accent_color: string;
  secondary_color: string;
  font_family: string;
  logo_position: 'top-left' | 'top-center' | 'top-right';
  logo_width: number;
  logo_height: number;
  custom_title: string;
  title_font_size: number;
  title_alignment: 'left' | 'center' | 'right';
  header_font_size: number;
  table_header_font_size: number;
  table_body_font_size: number;
  footer_font_size: number;
  summary_font_size: number;
  custom_labels: Record<string, string>;
  field_visibility: Record<string, boolean>;
  column_widths: Record<string, number>;
  custom_fields: Array<Record<string, any>>;
  text_styles: Record<string, any>;
  footer_text?: string | null;
  watermark_text?: string | null;
  show_table_borders: boolean;
  border_color: string;
  header_bg_color: string;
  alternate_row_color?: string | null;
  is_default: boolean;
}

export interface BankDetails {
  account_number?: string;
  ifsc?: string;
  bank_name?: string;
  branch?: string;
}

export interface VendorInvoiceProfile {
  id: string;
  name: string;
  email: string;
  business_name?: string | null;
  gstin?: string | null;
  pan?: string | null;
  state?: string | null;
  state_code?: string | null;
  address?: string | null;
  phone?: string | null;
  logo_url?: string | null;
  signature_url?: string | null;
  bank_details?: BankDetails | null;
  upi_id?: string | null;
  invoice_terms?: string | null;
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  item_id?: string | null;
  item_name: string;
  hsn_sac: string;
  unit: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  taxable_value: number;
  gst_rate_percent: number;
  cgst: number;
  sgst: number;
  igst: number;
  line_total: number;
  sort_order: number;
}

export interface Invoice {
  id: string;
  vendor_id: string;
  customer_id?: string | null;
  series_id: string;
  template_id?: string | null;
  invoice_number: string;
  financial_year: string;
  invoice_date: string;
  buyer_name: string;
  buyer_gstin?: string | null;
  buyer_address?: string | null;
  buyer_state: string;
  buyer_state_code: string;
  buyer_phone?: string | null;
  place_of_supply: string;
  place_of_supply_code: string;
  is_igst: boolean;
  taxable_total: number;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
  grand_total: number;
  status: 'ACTIVE' | 'CANCELLED';
  template_snapshot?: InvoiceTemplate | null;
  generation_batch_id?: string | null;
  created_by?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  invoice_line_items?: InvoiceLineItem[];
}

export interface GenerateInvoiceParams {
  seriesId: string;
  customerId?: string | null;
  buyerName?: string;
  buyerGstin?: string | null;
  buyerAddress?: string | null;
  buyerState?: string;
  buyerStateCode?: string;
  buyerPhone?: string | null;
  invoiceDate?: string;
  fromDate?: string;
  toDate?: string;
  excludeSaturdays?: boolean;
  excludeSundays?: boolean;
  itemIds?: string[];
  amountBasis?: 'GRAND_TOTAL' | 'TAXABLE_VALUE';
  totalBatchTarget?: number;
  count: number;
  targetTotal?: number;
  minTotal?: number;
  maxTotal?: number;
  templateId?: string | null;
  confirmed: boolean;
}

export interface SingleInvoiceLineInput {
  itemId?: string | null;
  itemName: string;
  hsnSac?: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  gstRatePercent: number;
}

export interface CreateSingleInvoiceParams {
  seriesId: string;
  customerId?: string | null;
  buyerName?: string;
  buyerGstin?: string | null;
  buyerAddress?: string | null;
  buyerState?: string;
  buyerStateCode?: string;
  buyerPhone?: string | null;
  invoiceDate: string;
  templateId?: string | null;
  lines: SingleInvoiceLineInput[];
}

// ============================================================================
// API CLIENT METHODS
// ============================================================================

// 1. Items Master
export async function fetchInvoiceItems(vendorId: string): Promise<{
  items: InvoiceItem[];
  activeCount: number;
  hasMinItems: boolean;
}> {
  return apiFetch(`/api/invoice-items/${vendorId}`);
}

export async function createInvoiceItem(
  vendorId: string,
  item: Omit<InvoiceItem, 'id' | 'vendor_id' | 'created_at' | 'updated_at'>
): Promise<{ item: InvoiceItem }> {
  return apiFetch(`/api/invoice-items/${vendorId}`, {
    method: 'POST',
    body: JSON.stringify(item),
  });
}

export async function updateInvoiceItem(
  vendorId: string,
  id: string,
  item: Partial<InvoiceItem>
): Promise<{ item: InvoiceItem }> {
  return apiFetch(`/api/invoice-items/${vendorId}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(item),
  });
}

export async function deleteInvoiceItem(vendorId: string, id: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/invoice-items/${vendorId}/${id}`, { method: 'DELETE' });
}

// 2. Customers Directory
export async function fetchInvoiceCustomers(vendorId: string): Promise<{ customers: InvoiceCustomer[] }> {
  return apiFetch(`/api/invoice-customers/${vendorId}`);
}

export async function createInvoiceCustomer(
  vendorId: string,
  customer: Partial<Omit<InvoiceCustomer, 'id' | 'vendor_id' | 'active' | 'created_at'>>
): Promise<{ customer: InvoiceCustomer }> {
  return apiFetch(`/api/invoice-customers/${vendorId}`, {
    method: 'POST',
    body: JSON.stringify(customer),
  });
}

export async function updateInvoiceCustomer(
  vendorId: string,
  id: string,
  customer: Partial<InvoiceCustomer>
): Promise<{ customer: InvoiceCustomer }> {
  return apiFetch(`/api/invoice-customers/${vendorId}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(customer),
  });
}

// 3. Invoice Series (Multi-FY)
export async function fetchInvoiceSeries(vendorId: string): Promise<{ series: InvoiceSeries[] }> {
  return apiFetch(`/api/invoice-series/${vendorId}`);
}

export async function createInvoiceSeries(
  vendorId: string,
  series: { financial_year: string; prefix: string; start_number: number; padding: number; active?: boolean }
): Promise<{ series: InvoiceSeries }> {
  return apiFetch(`/api/invoice-series/${vendorId}`, {
    method: 'POST',
    body: JSON.stringify(series),
  });
}

export async function updateInvoiceSeries(
  vendorId: string,
  id: string,
  series: Partial<InvoiceSeries>
): Promise<{ series: InvoiceSeries }> {
  return apiFetch(`/api/invoice-series/${vendorId}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(series),
  });
}

// 4. Templates Customization
export async function fetchInvoiceTemplates(vendorId: string): Promise<{ templates: InvoiceTemplate[] }> {
  return apiFetch(`/api/invoice-templates/${vendorId}`);
}

export async function createInvoiceTemplate(
  vendorId: string,
  template: Partial<InvoiceTemplate>
): Promise<{ template: InvoiceTemplate }> {
  return apiFetch(`/api/invoice-templates/${vendorId}`, {
    method: 'POST',
    body: JSON.stringify(template),
  });
}

export async function updateInvoiceTemplate(
  vendorId: string,
  id: string,
  template: Partial<InvoiceTemplate>
): Promise<{ template: InvoiceTemplate }> {
  return apiFetch(`/api/invoice-templates/${vendorId}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(template),
  });
}

// 5. Vendor Profile
export async function fetchVendorInvoiceProfile(vendorId: string): Promise<{ profile: VendorInvoiceProfile }> {
  return apiFetch(`/api/users/${vendorId}/invoice-profile`);
}

export async function updateVendorInvoiceProfile(
  vendorId: string,
  profile: Partial<VendorInvoiceProfile>
): Promise<{ profile: VendorInvoiceProfile }> {
  return apiFetch(`/api/users/${vendorId}/invoice-profile`, {
    method: 'PUT',
    body: JSON.stringify(profile),
  });
}

// 6. Invoices Operations
export async function generateInvoices(
  vendorId: string,
  params: GenerateInvoiceParams
): Promise<{
  success: boolean;
  batch: {
    batchId: string;
    count: number;
    totalAmount: number;
    invoices: Array<{ id: string; invoiceNumber: string; grandTotal: number }>;
  };
}> {
  return apiFetch(`/api/invoices/${vendorId}/generate`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function createSingleInvoice(
  vendorId: string,
  params: CreateSingleInvoiceParams
): Promise<{
  success: boolean;
  invoice: {
    id: string;
    invoiceNumber: string;
    grandTotal: number;
    taxableTotal: number;
    cgstTotal: number;
    sgstTotal: number;
    igstTotal: number;
  };
}> {
  return apiFetch(`/api/invoices/${vendorId}/single`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function fetchInvoices(
  vendorId: string,
  query: {
    page?: number;
    limit?: number;
    financialYear?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
  } = {}
): Promise<{
  invoices: Invoice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const q = new URLSearchParams();
  if (query.page) q.set('page', String(query.page));
  if (query.limit) q.set('limit', String(query.limit));
  if (query.financialYear) q.set('financialYear', query.financialYear);
  if (query.status) q.set('status', query.status);
  if (query.fromDate) q.set('fromDate', query.fromDate);
  if (query.toDate) q.set('toDate', query.toDate);
  if (query.search) q.set('search', query.search);

  return apiFetch(`/api/invoices/${vendorId}?${q.toString()}`);
}

export async function fetchInvoiceDetail(
  vendorId: string,
  id: string
): Promise<{
  invoice: Invoice;
  lines: InvoiceLineItem[];
  vendor: VendorInvoiceProfile | null;
  creditNotes: any[];
}> {
  return apiFetch(`/api/invoices/${vendorId}/${id}`);
}

export async function cancelInvoice(
  vendorId: string,
  id: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  return apiFetch(`/api/invoices/${vendorId}/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function issueCreditNote(
  vendorId: string,
  id: string,
  data: { amount: number; reason: string; issueDate?: string }
): Promise<{ creditNote: any }> {
  return apiFetch(`/api/invoices/${vendorId}/${id}/credit-note`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// 7. Reports
export async function fetchInvoiceSummary(
  vendorId: string,
  fromDate?: string,
  toDate?: string
): Promise<{ summary: any }> {
  const q = new URLSearchParams();
  if (fromDate) q.set('fromDate', fromDate);
  if (toDate) q.set('toDate', toDate);
  return apiFetch(`/api/invoices/${vendorId}/reports/summary?${q.toString()}`);
}

export async function fetchDailySalesReport(
  vendorId: string,
  fromDate?: string,
  toDate?: string
): Promise<{ daily: any[] }> {
  const q = new URLSearchParams();
  if (fromDate) q.set('fromDate', fromDate);
  if (toDate) q.set('toDate', toDate);
  return apiFetch(`/api/invoices/${vendorId}/reports/daily?${q.toString()}`);
}

export async function fetchTaxBreakdown(
  vendorId: string,
  fromDate?: string,
  toDate?: string
): Promise<{ breakdown: any[] }> {
  const q = new URLSearchParams();
  if (fromDate) q.set('fromDate', fromDate);
  if (toDate) q.set('toDate', toDate);
  return apiFetch(`/api/invoices/${vendorId}/reports/tax?${q.toString()}`);
}

export async function fetchHsnSummary(
  vendorId: string,
  fromDate?: string,
  toDate?: string
): Promise<{ hsnSummary: any[] }> {
  const q = new URLSearchParams();
  if (fromDate) q.set('fromDate', fromDate);
  if (toDate) q.set('toDate', toDate);
  return apiFetch(`/api/invoices/${vendorId}/reports/hsn?${q.toString()}`);
}

export async function fetchGstr1Report(
  vendorId: string,
  fromDate?: string,
  toDate?: string
): Promise<{
  b2b: any[];
  b2cs: any[];
  hsn: any[];
  docsIssued: any[];
  period: { fromDate: string; toDate: string };
}> {
  const q = new URLSearchParams();
  if (fromDate) q.set('fromDate', fromDate);
  if (toDate) q.set('toDate', toDate);
  return apiFetch(`/api/invoices/${vendorId}/reports/gstr1?${q.toString()}`);
}

// 7. Branding Asset Upload (Logo, Signature)
export async function uploadInvoiceAsset(
  vendorId: string,
  file: Blob | File,
  filename = 'asset.png'
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file, filename);

  return apiFetch<{ url: string }>(`/api/invoices/upload-asset/${vendorId}`, {
    method: 'POST',
    body: formData,
  });
}

