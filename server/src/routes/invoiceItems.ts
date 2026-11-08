import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { canAccessClient, sanitizeUser, SAFE_USER_SELECT } from '../lib/authorization.js';
import { logActivity } from '../services/activityLogger.js';
import { uploadToCloudinary } from '../services/cloudinaryService.js';

// ----------------------------------------------------------------------------
// ZOD VALIDATION SCHEMAS
// ----------------------------------------------------------------------------
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

const invoiceItemSchema = z.object({
  name: z.string().min(1, 'Item name is required').max(200),
  hsn_sac: z.string().min(2, 'HSN/SAC code required').max(10).trim(),
  gst_rate_percent: z.number().refine((val) => [0, 5, 12, 18, 28].includes(val), {
    message: 'GST rate must be 0, 5, 12, 18, or 28%',
  }),
  unit: z.string().min(1).max(20).default('NOS'),
  min_price: z.number().positive('Min price must be greater than zero'),
  max_price: z.number().positive('Max price must be greater than zero'),
  active: z.boolean().default(true),
}).refine((data) => data.max_price >= data.min_price, {
  message: 'Max price must be greater than or equal to min price',
  path: ['max_price'],
});

const invoiceCustomerSchema = z.object({
  name: z.string().max(200).optional().default('Customer').transform((v) => (v && v.trim() ? v.trim() : 'Customer')),
  gstin: z.string().trim().toUpperCase().nullable().optional().transform((v) => (v && v.trim() ? v.trim() : null)),
  state: z.string().optional().default('Maharashtra').transform((v) => (v && v.trim() ? v.trim() : 'Maharashtra')),
  state_code: z.string().optional().default('27').transform((v) => (v && v.trim() ? v.trim() : '27')),
  address: z.string().max(500).nullable().optional().transform((v) => (v && v.trim() ? v.trim() : null)),
  phone: z.string().max(50).nullable().optional().transform((v) => (v && v.trim() ? v.trim() : null)),
  email: z.string().nullable().optional().transform((v) => (v && v.trim() ? v.trim() : null)),
});

const invoiceSeriesSchema = z.object({
  financial_year: z.string().regex(/^\d{4}-\d{2}$/, 'Financial year format must be YYYY-YY (e.g. 2026-27)'),
  prefix: z.string().min(1).max(8).regex(/^[A-Z0-9/\-]+$/, 'Prefix may only contain A-Z, 0-9, / and -'),
  start_number: z.number().int().min(1).default(1),
  padding: z.number().int().min(2).max(8).default(4),
  active: z.boolean().default(true),
});

const invoiceTemplateSchema = z.object({
  name: z.string().min(1).max(100).default('Standard Template'),
  page_size: z.enum(['A4', 'A5', 'THERMAL']).default('A4'),
  orientation: z.enum(['portrait', 'landscape']).default('portrait'),
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#1d4ed8'),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#64748b'),
  font_family: z.string().default('Helvetica'),
  logo_position: z.enum(['top-left', 'top-center', 'top-right']).default('top-left'),
  logo_width: z.number().int().min(20).max(300).default(80),
  logo_height: z.number().int().min(20).max(300).default(80),
  custom_title: z.string().min(1).max(100).default('TAX INVOICE'),
  title_font_size: z.number().int().min(10).max(36).default(18),
  title_alignment: z.enum(['left', 'center', 'right']).default('center'),
  header_font_size: z.number().int().min(7).max(16).default(10),
  table_header_font_size: z.number().int().min(6).max(14).default(9),
  table_body_font_size: z.number().int().min(6).max(14).default(9),
  footer_font_size: z.number().int().min(6).max(12).default(8),
  summary_font_size: z.number().int().min(7).max(16).default(10),
  custom_labels: z.record(z.string()).default({}),
  field_visibility: z.record(z.boolean()).default({}),
  column_widths: z.record(z.number()).default({}),
  custom_fields: z.array(z.record(z.any())).default([]),
  text_styles: z.record(z.record(z.any())).default({}),
  footer_text: z.string().max(500).nullable().optional(),
  watermark_text: z.string().max(50).nullable().optional(),
  show_table_borders: z.boolean().default(true),
  border_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#e2e8f0'),
  header_bg_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#f8fafc'),
  alternate_row_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  is_default: z.boolean().default(false),
});

const invoiceProfileSchema = z.object({
  business_name: z.string().min(1).max(200).optional(),
  gstin: z.string().trim().toUpperCase().refine((val) => !val || GSTIN_REGEX.test(val), {
    message: 'Invalid 15-character GSTIN format',
  }).nullable().optional(),
  pan: z.string().trim().toUpperCase().refine((val) => !val || PAN_REGEX.test(val), {
    message: 'Invalid 10-character PAN format',
  }).nullable().optional(),
  state: z.string().min(1).optional(),
  state_code: z.string().length(2).optional(),
  address: z.string().max(500).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  logo_url: z.string().url().nullable().optional(),
  signature_url: z.string().url().nullable().optional(),
  bank_details: z.object({
    account_number: z.string().optional(),
    ifsc: z.string().optional(),
    bank_name: z.string().optional(),
    branch: z.string().optional(),
  }).optional(),
  upi_id: z.string().max(100).nullable().optional(),
  invoice_terms: z.string().max(1000).nullable().optional(),
});

export async function invoiceItemRoutes(app: FastifyInstance) {
  // Pre-handler: enforce authentication
  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await (request as any).jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Unauthorized: Authentication required' });
    }
  });

  // ==========================================================================
  // 1. INVOICE ITEMS (CATALOG)
  // ==========================================================================
  app.get('/api/invoice-items/:vendorId', async (request: FastifyRequest<{ Params: { vendorId: string } }>, reply) => {
    const { vendorId } = request.params;
    const user = (request as any).user;

    const allowed = await canAccessClient(user, vendorId);
    if (!allowed) {
      return reply.status(403).send({ error: 'Forbidden: Access denied to vendor items' });
    }

    const { data, error } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('name', { ascending: true });

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch items', message: error.message });
    }

    const activeCount = (data || []).filter((i) => i.active).length;
    return reply.send({ items: data || [], activeCount, hasMinItems: activeCount >= 5 });
  });

  app.post('/api/invoice-items/:vendorId', async (request: FastifyRequest<{ Params: { vendorId: string } }>, reply) => {
    const { vendorId } = request.params;
    const user = (request as any).user;

    const allowed = await canAccessClient(user, vendorId);
    if (!allowed) {
      return reply.status(403).send({ error: 'Forbidden: Access denied' });
    }

    const body = invoiceItemSchema.parse(request.body);

    const { data, error } = await supabase
      .from('invoice_items')
      .insert({
        vendor_id: vendorId,
        ...body,
      })
      .select('*')
      .single();

    if (error) {
      return reply.status(500).send({ error: 'Failed to add item', message: error.message });
    }

    await logActivity(request, {
      actionType: 'CREATE',
      resourceType: 'INVOICE_ITEM',
      resourceId: data.id,
      clientUserId: vendorId,
      description: `Added invoice catalog item: "${data.name}" (HSN: ${data.hsn_sac}, GST: ${data.gst_rate_percent}%)`,
    });

    return reply.status(201).send({ item: data });
  });

  app.put('/api/invoice-items/:vendorId/:id', async (request: FastifyRequest<{ Params: { vendorId: string; id: string } }>, reply) => {
    const { vendorId, id } = request.params;
    const user = (request as any).user;

    const allowed = await canAccessClient(user, vendorId);
    if (!allowed) {
      return reply.status(403).send({ error: 'Forbidden: Access denied' });
    }

    const body = invoiceItemSchema.parse(request.body);

    const { data, error } = await supabase
      .from('invoice_items')
      .update(body)
      .eq('id', id)
      .eq('vendor_id', vendorId)
      .select('*')
      .single();

    if (error) {
      return reply.status(500).send({ error: 'Failed to update item', message: error.message });
    }

    return reply.send({ item: data });
  });

  app.delete('/api/invoice-items/:vendorId/:id', async (request: FastifyRequest<{ Params: { vendorId: string; id: string } }>, reply) => {
    const { vendorId, id } = request.params;
    const user = (request as any).user;

    const allowed = await canAccessClient(user, vendorId);
    if (!allowed) {
      return reply.status(403).send({ error: 'Forbidden: Access denied' });
    }

    // Soft delete to protect existing invoice references
    const { error } = await supabase
      .from('invoice_items')
      .update({ active: false })
      .eq('id', id)
      .eq('vendor_id', vendorId);

    if (error) {
      return reply.status(500).send({ error: 'Failed to delete item', message: error.message });
    }

    await logActivity(request, {
      actionType: 'DELETE',
      resourceType: 'INVOICE_ITEM',
      resourceId: id,
      clientUserId: vendorId,
      description: `Deactivated invoice catalog item ${id}`,
    });

    return reply.send({ success: true, message: 'Item deactivated successfully' });
  });

  // ==========================================================================
  // 2. INVOICE CUSTOMERS
  // ==========================================================================
  app.get('/api/invoice-customers/:vendorId', async (request: FastifyRequest<{ Params: { vendorId: string } }>, reply) => {
    const { vendorId } = request.params;
    const user = (request as any).user;

    const allowed = await canAccessClient(user, vendorId);
    if (!allowed) {
      return reply.status(403).send({ error: 'Forbidden: Access denied' });
    }

    const { data, error } = await supabase
      .from('invoice_customers')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('active', true)
      .order('name', { ascending: true });

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch customers', message: error.message });
    }

    return reply.send({ customers: data || [] });
  });

  app.post('/api/invoice-customers/:vendorId', async (request: FastifyRequest<{ Params: { vendorId: string } }>, reply) => {
    const { vendorId } = request.params;
    const user = (request as any).user;

    const allowed = await canAccessClient(user, vendorId);
    if (!allowed) {
      return reply.status(403).send({ error: 'Forbidden: Access denied' });
    }

    const body = invoiceCustomerSchema.parse(request.body);

    const { data, error } = await supabase
      .from('invoice_customers')
      .insert({
        vendor_id: vendorId,
        ...body,
      })
      .select('*')
      .single();

    if (error) {
      return reply.status(500).send({ error: 'Failed to add customer', message: error.message });
    }

    await logActivity(request, {
      actionType: 'CREATE',
      resourceType: 'INVOICE_CUSTOMER',
      resourceId: data.id,
      clientUserId: vendorId,
      description: `Added invoice customer: "${data.name}" (${data.gstin || 'B2C'})`,
    });

    return reply.status(201).send({ customer: data });
  });

  app.put('/api/invoice-customers/:vendorId/:id', async (request: FastifyRequest<{ Params: { vendorId: string; id: string } }>, reply) => {
    const { vendorId, id } = request.params;
    const user = (request as any).user;

    const allowed = await canAccessClient(user, vendorId);
    if (!allowed) {
      return reply.status(403).send({ error: 'Forbidden: Access denied' });
    }

    const body = invoiceCustomerSchema.parse(request.body);

    const { data, error } = await supabase
      .from('invoice_customers')
      .update(body)
      .eq('id', id)
      .eq('vendor_id', vendorId)
      .select('*')
      .single();

    if (error) {
      return reply.status(500).send({ error: 'Failed to update customer', message: error.message });
    }

    return reply.send({ customer: data });
  });

  // ==========================================================================
  // 3. INVOICE SERIES (MULTI-FY)
  // ==========================================================================
  app.get('/api/invoice-series/:vendorId', async (request: FastifyRequest<{ Params: { vendorId: string } }>, reply) => {
    const { vendorId } = request.params;
    const user = (request as any).user;

    const allowed = await canAccessClient(user, vendorId);
    if (!allowed) {
      return reply.status(403).send({ error: 'Forbidden: Access denied' });
    }

    const { data, error } = await supabase
      .from('invoice_series')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('financial_year', { ascending: false });

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch series', message: error.message });
    }

    return reply.send({ series: data || [] });
  });

  app.post('/api/invoice-series/:vendorId', async (request: FastifyRequest<{ Params: { vendorId: string } }>, reply) => {
    const { vendorId } = request.params;
    const user = (request as any).user;

    const allowed = await canAccessClient(user, vendorId);
    if (!allowed) {
      return reply.status(403).send({ error: 'Forbidden: Access denied' });
    }

    const body = invoiceSeriesSchema.parse(request.body);

    const { data, error } = await supabase
      .from('invoice_series')
      .insert({
        vendor_id: vendorId,
        ...body,
      })
      .select('*')
      .single();

    if (error) {
      return reply.status(500).send({ error: 'Failed to create series', message: error.message });
    }

    await logActivity(request, {
      actionType: 'CREATE',
      resourceType: 'INVOICE_SERIES',
      resourceId: data.id,
      clientUserId: vendorId,
      description: `Configured invoice series: FY ${data.financial_year}, Prefix "${data.prefix}"`,
    });

    return reply.status(201).send({ series: data });
  });

  app.put('/api/invoice-series/:vendorId/:id', async (request: FastifyRequest<{ Params: { vendorId: string; id: string } }>, reply) => {
    const { vendorId, id } = request.params;
    const user = (request as any).user;

    const allowed = await canAccessClient(user, vendorId);
    if (!allowed) {
      return reply.status(403).send({ error: 'Forbidden: Access denied' });
    }

    const body = invoiceSeriesSchema.partial().parse(request.body);

    const { data, error } = await supabase
      .from('invoice_series')
      .update(body)
      .eq('id', id)
      .eq('vendor_id', vendorId)
      .select('*')
      .single();

    if (error) {
      return reply.status(500).send({ error: 'Failed to update series', message: error.message });
    }

    return reply.send({ series: data });
  });

  // ==========================================================================
  // 4. INVOICE TEMPLATES (CUSTOM WORDS, RESIZING, STYLING)
  // ==========================================================================
  app.get('/api/invoice-templates/:vendorId', async (request: FastifyRequest<{ Params: { vendorId: string } }>, reply) => {
    const { vendorId } = request.params;
    const user = (request as any).user;

    const allowed = await canAccessClient(user, vendorId);
    if (!allowed) {
      return reply.status(403).send({ error: 'Forbidden: Access denied' });
    }

    const { data, error } = await supabase
      .from('invoice_templates')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('is_default', { ascending: false });

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch templates', message: error.message });
    }

    return reply.send({ templates: data || [] });
  });

  app.post('/api/invoice-templates/:vendorId', async (request: FastifyRequest<{ Params: { vendorId: string } }>, reply) => {
    const { vendorId } = request.params;
    const user = (request as any).user;

    const allowed = await canAccessClient(user, vendorId);
    if (!allowed) {
      return reply.status(403).send({ error: 'Forbidden: Access denied' });
    }

    const body = invoiceTemplateSchema.parse(request.body);

    // If marked default, unset other defaults for this vendor
    if (body.is_default) {
      await supabase
        .from('invoice_templates')
        .update({ is_default: false })
        .eq('vendor_id', vendorId);
    }

    const { data, error } = await supabase
      .from('invoice_templates')
      .insert({
        vendor_id: vendorId,
        ...body,
      })
      .select('*')
      .single();

    if (error) {
      return reply.status(500).send({ error: 'Failed to create template', message: error.message });
    }

    await logActivity(request, {
      actionType: 'CREATE',
      resourceType: 'INVOICE_TEMPLATE',
      resourceId: data.id,
      clientUserId: vendorId,
      description: `Created invoice template "${data.name}" (Title: "${data.custom_title}")`,
    });

    return reply.status(201).send({ template: data });
  });

  app.put('/api/invoice-templates/:vendorId/:id', async (request: FastifyRequest<{ Params: { vendorId: string; id: string } }>, reply) => {
    const { vendorId, id } = request.params;
    const user = (request as any).user;

    const allowed = await canAccessClient(user, vendorId);
    if (!allowed) {
      return reply.status(403).send({ error: 'Forbidden: Access denied' });
    }

    const body = invoiceTemplateSchema.partial().parse(request.body);

    if (body.is_default) {
      await supabase
        .from('invoice_templates')
        .update({ is_default: false })
        .eq('vendor_id', vendorId);
    }

    const { data, error } = await supabase
      .from('invoice_templates')
      .update(body)
      .eq('id', id)
      .eq('vendor_id', vendorId)
      .select('*')
      .single();

    if (error) {
      return reply.status(500).send({ error: 'Failed to update template', message: error.message });
    }

    return reply.send({ template: data });
  });

  // ==========================================================================
  // 5. VENDOR INVOICE PROFILE (LOGO, SIGNATURE, BANK, UPI, TERMS)
  // ==========================================================================
  app.get('/api/users/:id/invoice-profile', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { id } = request.params;
    const user = (request as any).user;

    const allowed = await canAccessClient(user, id);
    if (!allowed) {
      return reply.status(403).send({ error: 'Forbidden: Access denied' });
    }

    const { data, error } = await supabase
      .from('users')
      .select(SAFE_USER_SELECT)
      .eq('id', id)
      .single();

    if (error || !data) {
      return reply.status(404).send({ error: 'User profile not found' });
    }

    return reply.send({ profile: sanitizeUser(data) });
  });

  app.put('/api/users/:id/invoice-profile', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { id } = request.params;
    const user = (request as any).user;

    const allowed = await canAccessClient(user, id);
    if (!allowed) {
      return reply.status(403).send({ error: 'Forbidden: Access denied' });
    }

    const body = invoiceProfileSchema.parse(request.body);

    // If GSTIN provided but PAN omitted, auto-extract PAN from GSTIN chars 3-12
    if (body.gstin && !body.pan && body.gstin.length === 15) {
      body.pan = body.gstin.substring(2, 12);
    }

    // Auto-extract state_code from GSTIN if not supplied
    if (body.gstin && !body.state_code && body.gstin.length === 15) {
      body.state_code = body.gstin.substring(0, 2);
    }

    const { data, error } = await supabase
      .from('users')
      .update(body)
      .eq('id', id)
      .select(SAFE_USER_SELECT)
      .single();

    if (error) {
      return reply.status(500).send({ error: 'Failed to update invoice profile', message: error.message });
    }

    await logActivity(request, {
      actionType: 'UPDATE',
      resourceType: 'VENDOR_PROFILE',
      resourceId: id,
      clientUserId: id,
      description: `Updated invoice vendor profile (${body.business_name || data.business_name})`,
    });

    return reply.send({ profile: sanitizeUser(data) });
  });

  // ==========================================================================
  // 6. BRANDING ASSET UPLOAD (LOGO, SIGNATURE)
  // ==========================================================================
  app.post('/api/invoices/upload-asset/:vendorId', async (request: FastifyRequest<{ Params: { vendorId: string } }>, reply) => {
    const { vendorId } = request.params;
    const user = (request as any).user;

    const allowed = await canAccessClient(user, vendorId);
    if (!allowed) {
      return reply.status(403).send({ error: 'Forbidden: Access denied' });
    }

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    const buffer = await data.toBuffer();
    try {
      const { url } = await uploadToCloudinary(buffer, {
        folder: `gstbro/invoices/${vendorId}`,
      });
      return reply.send({ url });
    } catch (err: any) {
      // Fallback: return as inline data URI if Cloudinary is offline or error occurs
      const mime = data.mimetype || 'image/png';
      const base64 = `data:${mime};base64,${buffer.toString('base64')}`;
      return reply.send({ url: base64, warning: 'Uploaded as inline data image' });
    }
  });
}
