import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { canAccessClient, SAFE_USER_SELECT, sanitizeUser } from '../lib/authorization.js';
import { generateInvoiceBatch, createSingleManualInvoice } from '../services/invoiceGenerator.js';
import { logActivity } from '../services/activityLogger.js';

// ----------------------------------------------------------------------------
// ZOD VALIDATION SCHEMAS
// ----------------------------------------------------------------------------
const generateInvoicesSchema = z.object({
  seriesId: z.string().uuid('Valid series ID required'),
  customerId: z.string().uuid().nullable().optional(),
  buyerName: z.string().min(1).max(200).optional(),
  buyerGstin: z.string().max(15).nullable().optional(),
  buyerAddress: z.string().max(500).nullable().optional(),
  buyerState: z.string().min(1).optional(),
  buyerStateCode: z.string().length(2).optional(),
  buyerPhone: z.string().max(20).nullable().optional(),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invoice date must be YYYY-MM-DD').optional(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  excludeSaturdays: z.boolean().optional().default(false),
  excludeSundays: z.boolean().optional().default(false),
  itemIds: z.array(z.string().uuid()).optional(),
  amountBasis: z.enum(['GRAND_TOTAL', 'TAXABLE_VALUE']).optional().default('GRAND_TOTAL'),
  totalBatchTarget: z.number().positive().optional(),
  count: z.number().int().min(1, 'Minimum 1 invoice').max(200, 'Maximum 200 invoices per batch'),
  targetTotal: z.number().positive().optional(),
  minTotal: z.number().positive().optional(),
  maxTotal: z.number().positive().optional(),
  templateId: z.string().uuid().nullable().optional(),
  confirmed: z.boolean().refine((val) => val === true, {
    message: 'You must check the confirmation checkbox before generating invoices',
  }),
}).refine(
  (data) =>
    (data.targetTotal && data.targetTotal > 0) ||
    (data.minTotal && data.maxTotal && data.maxTotal >= data.minTotal) ||
    (data.totalBatchTarget && data.totalBatchTarget > 0),
  {
    message: 'Must specify a valid amount target (targetTotal, minTotal/maxTotal, or totalBatchTarget)',
    path: ['targetTotal'],
  }
);

const manualLineItemSchema = z.object({
  itemId: z.string().uuid().nullable().optional(),
  itemName: z.string().min(1, 'Item name is required').max(200),
  hsnSac: z.string().max(20).optional().default(''),
  unit: z.string().max(20).optional().default('PCS'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
  discountPercent: z.number().min(0).max(100).optional().default(0),
  gstRatePercent: z.number().min(0).max(100),
});

const createSingleInvoiceSchema = z.object({
  seriesId: z.string().uuid('Valid series ID required'),
  customerId: z.string().uuid().nullable().optional(),
  buyerName: z.string().min(1).max(200).optional(),
  buyerGstin: z.string().max(15).nullable().optional(),
  buyerAddress: z.string().max(500).nullable().optional(),
  buyerState: z.string().min(1).optional(),
  buyerStateCode: z.string().length(2).optional(),
  buyerPhone: z.string().max(20).nullable().optional(),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invoice date must be YYYY-MM-DD'),
  templateId: z.string().uuid().nullable().optional(),
  lines: z.array(manualLineItemSchema).min(1, 'At least one line item is required'),
});

const cancelInvoiceSchema = z.object({
  reason: z.string().min(3, 'Cancellation reason is required (min 3 chars)').max(500),
});

const creditNoteSchema = z.object({
  amount: z.number().positive('Credit note amount must be positive'),
  reason: z.string().min(3).max(500),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => new Date().toISOString().split('T')[0]),
});

export async function invoiceRoutes(app: FastifyInstance) {
  // Authentication pre-handler
  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await (request as any).jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Unauthorized: Authentication required' });
    }
  });

  // ==========================================================================
  // 1. GENERATE BULK INVOICES (THE ENGINE)
  // ==========================================================================
  app.post('/api/invoices/:vendorId/generate', async (request: FastifyRequest<{ Params: { vendorId: string } }>, reply) => {
    const { vendorId } = request.params;
    const user = (request as any).user;

    const allowed = await canAccessClient(user, vendorId);
    if (!allowed) {
      return reply.status(403).send({ error: 'Forbidden: Access denied to vendor invoices' });
    }

    const body = generateInvoicesSchema.parse(request.body);

    try {
      const result = await generateInvoiceBatch({
        vendorId,
        seriesId: body.seriesId,
        customerId: body.customerId,
        buyerName: body.buyerName,
        buyerGstin: body.buyerGstin,
        buyerAddress: body.buyerAddress,
        buyerState: body.buyerState,
        buyerStateCode: body.buyerStateCode,
        buyerPhone: body.buyerPhone,
        invoiceDate: body.invoiceDate,
        count: body.count,
        targetTotal: body.targetTotal,
        minTotal: body.minTotal,
        maxTotal: body.maxTotal,
        templateId: body.templateId,
        createdBy: user.id,
      });

      await logActivity(request, {
        actionType: 'CREATE',
        resourceType: 'INVOICE_BATCH',
        resourceId: result.batchId,
        clientUserId: vendorId,
        description: `Generated batch of ${result.count} invoice(s) totaling ₹${result.totalAmount.toLocaleString('en-IN')}`,
        details: {
          batchId: result.batchId,
          count: result.count,
          totalAmount: result.totalAmount,
          invoiceNumbers: result.invoices.map((i) => i.invoiceNumber),
        },
      });

      return reply.status(201).send({
        success: true,
        batch: result,
      });
    } catch (err: any) {
      return reply.status(400).send({
        error: 'Invoice generation failed',
        message: err.message || 'An error occurred during invoice generation',
      });
    }
  });

  // ==========================================================================
  // 1B. ISSUE SINGLE MANUAL INVOICE
  // ==========================================================================
  app.post('/api/invoices/:vendorId/single', async (
    request: FastifyRequest<{ Params: { vendorId: string } }>,
    reply
  ) => {
    const { vendorId } = request.params;
    const user = (request as any).user;

    const allowed = await canAccessClient(user, vendorId);
    if (!allowed) {
      return reply.status(403).send({ error: 'Forbidden: Access denied to vendor invoices' });
    }

    const body = createSingleInvoiceSchema.parse(request.body);

    try {
      const result = await createSingleManualInvoice({
        vendorId,
        seriesId: body.seriesId,
        customerId: body.customerId,
        buyerName: body.buyerName,
        buyerGstin: body.buyerGstin,
        buyerAddress: body.buyerAddress,
        buyerState: body.buyerState,
        buyerStateCode: body.buyerStateCode,
        buyerPhone: body.buyerPhone,
        invoiceDate: body.invoiceDate,
        templateId: body.templateId,
        lines: body.lines,
        createdBy: user.id,
      });

      await logActivity(request, {
        actionType: 'CREATE',
        resourceType: 'INVOICE',
        resourceId: result.id,
        clientUserId: vendorId,
        description: `Issued single tax invoice ${result.invoiceNumber} for ₹${result.grandTotal.toLocaleString('en-IN')}`,
        details: {
          invoiceId: result.id,
          invoiceNumber: result.invoiceNumber,
          grandTotal: result.grandTotal,
          taxableTotal: result.taxableTotal,
          linesCount: body.lines.length,
        },
      });

      return reply.status(201).send({
        success: true,
        invoice: result,
      });
    } catch (err: any) {
      return reply.status(400).send({
        error: 'Single invoice issuance failed',
        message: err.message || 'An error occurred while creating the invoice',
      });
    }
  });

  // ==========================================================================
  // 2. LIST INVOICES (PAGINATED, FILTERED)
  // ==========================================================================
  app.get('/api/invoices/:vendorId', async (
    request: FastifyRequest<{
      Params: { vendorId: string };
      Querystring: {
        page?: string;
        limit?: string;
        financialYear?: string;
        status?: string;
        fromDate?: string;
        toDate?: string;
        search?: string;
      };
    }>,
    reply
  ) => {
    const { vendorId } = request.params;
    const user = (request as any).user;

    const allowed = await canAccessClient(user, vendorId);
    if (!allowed) {
      return reply.status(403).send({ error: 'Forbidden: Access denied' });
    }

    const page = Math.max(1, parseInt(request.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(request.query.limit || '20', 10)));
    const offset = (page - 1) * limit;

    let query = supabase
      .from('invoices')
      .select('*', { count: 'exact' })
      .eq('vendor_id', vendorId)
      .order('invoice_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (request.query.financialYear) {
      query = query.eq('financial_year', request.query.financialYear);
    }

    if (request.query.status && request.query.status !== 'ALL') {
      query = query.eq('status', request.query.status);
    }

    if (request.query.fromDate) {
      query = query.gte('invoice_date', request.query.fromDate);
    }

    if (request.query.toDate) {
      query = query.lte('invoice_date', request.query.toDate);
    }

    if (request.query.search && request.query.search.trim()) {
      const s = request.query.search.trim();
      query = query.or(`invoice_number.ilike.%${s}%,buyer_name.ilike.%${s}%,buyer_gstin.ilike.%${s}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      return reply.status(500).send({ error: 'Failed to retrieve invoices', message: error.message });
    }

    return reply.send({
      invoices: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  });

  // ==========================================================================
  // 3. GET SINGLE INVOICE WITH LINE ITEMS & VENDOR PROFILE
  // ==========================================================================
  app.get('/api/invoices/:vendorId/:id', async (
    request: FastifyRequest<{ Params: { vendorId: string; id: string } }>,
    reply
  ) => {
    const { vendorId, id } = request.params;
    const user = (request as any).user;

    const allowed = await canAccessClient(user, vendorId);
    if (!allowed) {
      return reply.status(403).send({ error: 'Forbidden: Access denied' });
    }

    // 1. Fetch invoice header
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .eq('vendor_id', vendorId)
      .single();

    if (invErr || !invoice) {
      return reply.status(404).send({ error: 'Invoice not found' });
    }

    // 2. Fetch line items
    const { data: lines, error: linesErr } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', id)
      .order('sort_order', { ascending: true });

    if (linesErr) {
      return reply.status(500).send({ error: 'Failed to retrieve line items', message: linesErr.message });
    }

    // 3. Fetch vendor details for invoice rendering
    const { data: vendor } = await supabase
      .from('users')
      .select(SAFE_USER_SELECT)
      .eq('id', vendorId)
      .single();

    // 4. Fetch linked credit notes if any
    const { data: creditNotes } = await supabase
      .from('credit_notes')
      .select('*')
      .eq('original_invoice_id', id);

    return reply.send({
      invoice,
      lines: lines || [],
      vendor: vendor ? sanitizeUser(vendor) : null,
      creditNotes: creditNotes || [],
    });
  });

  // ==========================================================================
  // 4. CANCEL INVOICE (SAFE IMMUTABLE TRANSITION)
  // ==========================================================================
  app.post('/api/invoices/:vendorId/:id/cancel', async (
    request: FastifyRequest<{ Params: { vendorId: string; id: string } }>,
    reply
  ) => {
    const { vendorId, id } = request.params;
    const user = (request as any).user;

    const allowed = await canAccessClient(user, vendorId);
    if (!allowed) {
      return reply.status(403).send({ error: 'Forbidden: Access denied' });
    }

    const body = cancelInvoiceSchema.parse(request.body);

    const { error } = await supabase.rpc('cancel_invoice', {
      p_invoice_id: id,
      p_vendor_id: vendorId,
      p_cancelled_by: user.id,
      p_reason: body.reason,
    });

    if (error) {
      return reply.status(400).send({ error: 'Cancellation failed', message: error.message });
    }

    await logActivity(request, {
      actionType: 'UPDATE',
      resourceType: 'INVOICE',
      resourceId: id,
      clientUserId: vendorId,
      description: `Cancelled invoice ${id}. Reason: "${body.reason}"`,
    });

    return reply.send({ success: true, message: 'Invoice cancelled successfully' });
  });

  // ==========================================================================
  // 5. ISSUE CREDIT NOTE
  // ==========================================================================
  app.post('/api/invoices/:vendorId/:id/credit-note', async (
    request: FastifyRequest<{ Params: { vendorId: string; id: string } }>,
    reply
  ) => {
    const { vendorId, id } = request.params;
    const user = (request as any).user;

    const allowed = await canAccessClient(user, vendorId);
    if (!allowed) {
      return reply.status(403).send({ error: 'Forbidden: Access denied' });
    }

    const body = creditNoteSchema.parse(request.body);

    // Fetch original invoice to check constraints
    const { data: origInvoice, error: invErr } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .eq('vendor_id', vendorId)
      .single();

    if (invErr || !origInvoice) {
      return reply.status(404).send({ error: 'Original invoice not found' });
    }

    if (origInvoice.status !== 'ACTIVE') {
      return reply.status(400).send({ error: 'Cannot issue credit note against a cancelled invoice' });
    }

    if (body.amount > origInvoice.grand_total) {
      return reply.status(400).send({
        error: `Credit note amount (₹${body.amount}) cannot exceed original invoice total (₹${origInvoice.grand_total})`,
      });
    }

    // Generate credit note number
    const cnNumber = `CN-${origInvoice.financial_year}-${Date.now().toString().slice(-5)}`;

    // Proportional tax back-calculation
    const ratio = body.amount / origInvoice.grand_total;
    const taxableAmount = Math.round(origInvoice.taxable_total * ratio * 100) / 100;
    const cgst = Math.round(origInvoice.cgst_total * ratio * 100) / 100;
    const sgst = Math.round(origInvoice.sgst_total * ratio * 100) / 100;
    const igst = Math.round(origInvoice.igst_total * ratio * 100) / 100;

    const { data: insertedCn, error: cnErr } = await supabase
      .from('credit_notes')
      .insert({
        vendor_id: vendorId,
        original_invoice_id: id,
        credit_note_number: cnNumber,
        financial_year: origInvoice.financial_year,
        issue_date: body.issueDate,
        reason: body.reason,
        amount: body.amount,
        taxable_amount: taxableAmount,
        cgst,
        sgst,
        igst,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (cnErr) {
      return reply.status(500).send({ error: 'Failed to create credit note', message: cnErr.message });
    }

    await logActivity(request, {
      actionType: 'CREATE',
      resourceType: 'CREDIT_NOTE',
      resourceId: insertedCn.id,
      clientUserId: vendorId,
      description: `Issued credit note ${cnNumber} for ₹${body.amount} on invoice ${origInvoice.invoice_number}`,
    });

    return reply.status(201).send({ creditNote: insertedCn });
  });

  // ==========================================================================
  // 6. REPORTS & GSTR-1 EXPORT DATA
  // ==========================================================================
  app.get('/api/invoices/:vendorId/reports/summary', async (
    request: FastifyRequest<{
      Params: { vendorId: string };
      Querystring: { fromDate?: string; toDate?: string };
    }>,
    reply
  ) => {
    const { vendorId } = request.params;
    const user = (request as any).user;

    const allowed = await canAccessClient(user, vendorId);
    if (!allowed) {
      return reply.status(403).send({ error: 'Forbidden: Access denied' });
    }

    const fromDate = request.query.fromDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const toDate = request.query.toDate || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase.rpc('get_invoice_summary', {
      p_vendor_id: vendorId,
      p_from_date: fromDate,
      p_to_date: toDate,
    });

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch summary stats', message: error.message });
    }

    return reply.send({ summary: data?.[0] || null });
  });

  app.get('/api/invoices/:vendorId/reports/daily', async (
    request: FastifyRequest<{
      Params: { vendorId: string };
      Querystring: { fromDate?: string; toDate?: string };
    }>,
    reply
  ) => {
    const { vendorId } = request.params;
    const user = (request as any).user;

    const allowed = await canAccessClient(user, vendorId);
    if (!allowed) {
      return reply.status(403).send({ error: 'Forbidden: Access denied' });
    }

    const fromDate = request.query.fromDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const toDate = request.query.toDate || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase.rpc('get_daily_sales_report', {
      p_vendor_id: vendorId,
      p_from_date: fromDate,
      p_to_date: toDate,
    });

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch daily sales', message: error.message });
    }

    return reply.send({ daily: data || [] });
  });

  app.get('/api/invoices/:vendorId/reports/tax', async (
    request: FastifyRequest<{
      Params: { vendorId: string };
      Querystring: { fromDate?: string; toDate?: string };
    }>,
    reply
  ) => {
    const { vendorId } = request.params;
    const user = (request as any).user;

    const allowed = await canAccessClient(user, vendorId);
    if (!allowed) {
      return reply.status(403).send({ error: 'Forbidden: Access denied' });
    }

    const fromDate = request.query.fromDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const toDate = request.query.toDate || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase.rpc('get_tax_breakdown', {
      p_vendor_id: vendorId,
      p_from_date: fromDate,
      p_to_date: toDate,
    });

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch tax breakdown', message: error.message });
    }

    return reply.send({ breakdown: data || [] });
  });

  app.get('/api/invoices/:vendorId/reports/hsn', async (
    request: FastifyRequest<{
      Params: { vendorId: string };
      Querystring: { fromDate?: string; toDate?: string };
    }>,
    reply
  ) => {
    const { vendorId } = request.params;
    const user = (request as any).user;

    const allowed = await canAccessClient(user, vendorId);
    if (!allowed) {
      return reply.status(403).send({ error: 'Forbidden: Access denied' });
    }

    const fromDate = request.query.fromDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const toDate = request.query.toDate || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase.rpc('get_hsn_summary', {
      p_vendor_id: vendorId,
      p_from_date: fromDate,
      p_to_date: toDate,
    });

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch HSN summary', message: error.message });
    }

    return reply.send({ hsnSummary: data || [] });
  });

  app.get('/api/invoices/:vendorId/reports/gstr1', async (
    request: FastifyRequest<{
      Params: { vendorId: string };
      Querystring: { fromDate?: string; toDate?: string };
    }>,
    reply
  ) => {
    const { vendorId } = request.params;
    const user = (request as any).user;

    const allowed = await canAccessClient(user, vendorId);
    if (!allowed) {
      return reply.status(403).send({ error: 'Forbidden: Access denied' });
    }

    const fromDate = request.query.fromDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const toDate = request.query.toDate || new Date().toISOString().split('T')[0];

    // 1. Fetch all active invoices in period with lines
    const { data: invs, error: invErr } = await supabase
      .from('invoices')
      .select('*, invoice_line_items(*)')
      .eq('vendor_id', vendorId)
      .eq('status', 'ACTIVE')
      .gte('invoice_date', fromDate)
      .lte('invoice_date', toDate)
      .order('invoice_date', { ascending: true });

    if (invErr) {
      return reply.status(500).send({ error: 'Failed to fetch invoices for GSTR-1', message: invErr.message });
    }

    // 2. Fetch HSN summary
    const { data: hsnData } = await supabase.rpc('get_hsn_summary', {
      p_vendor_id: vendorId,
      p_from_date: fromDate,
      p_to_date: toDate,
    });

    // 3. Assemble B2B vs B2CS tables
    const b2bRows: any[] = [];
    const b2csMap: Record<string, { pos: string; rate: number; taxable: number; cess: number }> = {};

    for (const inv of invs || []) {
      const hasGstin = Boolean(inv.buyer_gstin && inv.buyer_gstin.trim().length === 15);
      const lines = (inv as any).invoice_line_items || [];

      for (const line of lines) {
        if (hasGstin) {
          // B2B: Table 4A
          b2bRows.push({
            gstin: inv.buyer_gstin,
            receiverName: inv.buyer_name,
            invoiceNumber: inv.invoice_number,
            invoiceDate: inv.invoice_date,
            invoiceValue: inv.grand_total,
            placeOfSupply: `${inv.place_of_supply_code}-${inv.place_of_supply}`,
            reverseCharge: 'N',
            applicablePercent: '',
            invoiceType: 'Regular',
            rate: line.gst_rate_percent,
            taxableValue: line.taxable_value,
            cessAmount: 0,
          });
        } else {
          // B2CS: Table 7
          const key = `${inv.place_of_supply_code}_${line.gst_rate_percent}`;
          if (!b2csMap[key]) {
            b2csMap[key] = {
              pos: `${inv.place_of_supply_code}-${inv.place_of_supply}`,
              rate: line.gst_rate_percent,
              taxable: 0,
              cess: 0,
            };
          }
          b2csMap[key].taxable = Math.round((b2csMap[key].taxable + line.taxable_value) * 100) / 100;
        }
      }
    }

    const b2csRows = Object.values(b2csMap).map((item) => ({
      type: 'OE',
      placeOfSupply: item.pos,
      rate: item.rate,
      taxableValue: item.taxable,
      cessAmount: item.cess,
      ecomGstin: '',
    }));

    // 4. Docs Issued: Table 13
    const numbers = (invs || []).map((i) => i.invoice_number).sort();
    const docsIssued = [
      {
        nature: 'Invoices for outward supply',
        fromNumber: numbers[0] || 'N/A',
        toNumber: numbers[numbers.length - 1] || 'N/A',
        totalNumber: numbers.length,
        cancelled: 0,
      },
    ];

    return reply.send({
      b2b: b2bRows,
      b2cs: b2csRows,
      hsn: hsnData || [],
      docsIssued,
      period: { fromDate, toDate },
    });
  });

  // ==========================================================================
  // 7. ADMIN PLATFORM-WIDE INVOICE OVERSIGHT
  // ==========================================================================
  app.get('/api/admin/invoices', async (
    request: FastifyRequest<{
      Querystring: {
        page?: string;
        limit?: string;
        search?: string;
        status?: string;
        vendorId?: string;
      };
    }>,
    reply
  ) => {
    const user = (request as any).user;
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Forbidden: Admin access required' });
    }

    const page = Math.max(1, parseInt(request.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(request.query.limit || '20', 10)));
    const offset = (page - 1) * limit;

    let query = supabase
      .from('invoices')
      .select('*, users(business_name, email, name)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (request.query.vendorId) {
      query = query.eq('vendor_id', request.query.vendorId);
    }

    if (request.query.status && request.query.status !== 'ALL') {
      query = query.eq('status', request.query.status);
    }

    if (request.query.search && request.query.search.trim()) {
      const s = request.query.search.trim();
      query = query.or(`invoice_number.ilike.%${s}%,buyer_name.ilike.%${s}%,buyer_gstin.ilike.%${s}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      return reply.status(500).send({ error: 'Failed to retrieve admin invoices', message: error.message });
    }

    return reply.send({
      invoices: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  });

  app.get('/api/admin/invoices/summary', async (request, reply) => {
    const user = (request as any).user;
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Forbidden: Admin access required' });
    }

    const [
      { count: totalInvoices },
      { count: activeInvoices },
      { count: cancelledInvoices },
    ] = await Promise.all([
      supabase.from('invoices').select('id', { count: 'exact', head: true }),
      supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
      supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('status', 'CANCELLED'),
    ]);

    // Aggregate grand total sales
    const { data: salesData } = await supabase
      .from('invoices')
      .select('grand_total, taxable_total, cgst_total, sgst_total, igst_total')
      .eq('status', 'ACTIVE');

    const totalSales = (salesData || []).reduce((acc, i) => acc + (Number(i.grand_total) || 0), 0);
    const totalTaxable = (salesData || []).reduce((acc, i) => acc + (Number(i.taxable_total) || 0), 0);
    const totalTax = (salesData || []).reduce(
      (acc, i) => acc + (Number(i.cgst_total) || 0) + (Number(i.sgst_total) || 0) + (Number(i.igst_total) || 0),
      0
    );

    return reply.send({
      metrics: {
        totalInvoices: totalInvoices || 0,
        activeInvoices: activeInvoices || 0,
        cancelledInvoices: cancelledInvoices || 0,
        totalSales: Math.round(totalSales * 100) / 100,
        totalTaxable: Math.round(totalTaxable * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
      },
    });
  });
}
