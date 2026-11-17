import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { authenticate, requireFirm, requireFirmAdmin } from '../middleware/auth.js';

export const firmRoutes: FastifyPluginAsync = async (app) => {
  app.register(async (firmScope) => {
    firmScope.addHook('preHandler', authenticate);
    firmScope.addHook('preHandler', requireFirm());

    // 1. Get Firm Profile (For CA and team members)
    firmScope.get('/api/firm/profile', async (request, reply) => {
      const firmId = request.user.firm_id!;
      const { data: firm, error } = await supabase
        .from('firms')
        .select('id, name, slug, email, phone, gstin, address, branding, status, created_at')
        .eq('id', firmId)
        .single();

      if (error || !firm) {
        return reply.status(404).send({ error: 'Firm profile not found' });
      }
      return reply.send({ firm });
    });

    // 2. Update Firm Profile (Firm Owner / Admin only)
    firmScope.put('/api/firm/profile', { preHandler: [requireFirmAdmin()] }, async (request, reply) => {
      const firmId = request.user.firm_id!;
      const bodySchema = z.object({
        name: z.string().min(2).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        gstin: z.string().optional(),
        address: z.string().optional(),
        branding: z.record(z.any()).optional(),
      });

      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      const { data, error } = await supabase
        .from('firms')
        .update({
          ...parsed.data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', firmId)
        .select('id, name, slug, email, phone, gstin, address, branding, status')
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }
      return reply.send({ success: true, firm: data });
    });

    // 3. Get Google Drive BYOD Config
    firmScope.get('/api/firm/drive', { preHandler: [requireFirmAdmin()] }, async (request, reply) => {
      const firmId = request.user.firm_id!;
      const { data, error } = await supabase
        .from('firm_drive_configs')
        .select('id, auth_type, root_folder_id, root_folder_name, is_connected, updated_at')
        .eq('firm_id', firmId)
        .maybeSingle();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }
      return reply.send({ driveConfig: data || { is_connected: false } });
    });

    // 4. Configure / Connect Google Drive BYOD
    firmScope.post('/api/firm/drive', { preHandler: [requireFirmAdmin()] }, async (request, reply) => {
      const firmId = request.user.firm_id!;
      const bodySchema = z.object({
        authType: z.enum(['OAUTH', 'SERVICE_ACCOUNT']),
        rootFolderId: z.string().min(1),
        rootFolderName: z.string().min(1),
        refreshToken: z.string().optional(),
        serviceAccountJson: z.string().optional(),
      });

      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      const { data, error } = await supabase
        .from('firm_drive_configs')
        .upsert(
          {
            firm_id: firmId,
            auth_type: parsed.data.authType,
            root_folder_id: parsed.data.rootFolderId,
            root_folder_name: parsed.data.rootFolderName,
            refresh_token_encrypted: parsed.data.refreshToken || null,
            service_account_json_encrypted: parsed.data.serviceAccountJson || null,
            is_connected: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'firm_id' }
        )
        .select('id, auth_type, root_folder_id, root_folder_name, is_connected, updated_at')
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }
      return reply.send({ success: true, driveConfig: data });
    });

    // 5. Get Document Routing Direction Rules
    firmScope.get('/api/firm/routing-rules', async (request, reply) => {
      const firmId = request.user.firm_id!;
      const { data, error } = await supabase
        .from('firm_document_routing_rules')
        .select('*')
        .eq('firm_id', firmId)
        .order('priority', { ascending: false });

      if (error) {
        return reply.status(500).send({ error: error.message });
      }
      return reply.send({ rules: data || [] });
    });

    // 6. Create Routing Direction Rule (e.g. Sales -> Folder X, Purchases -> Folder Y)
    firmScope.post('/api/firm/routing-rules', { preHandler: [requireFirmAdmin()] }, async (request, reply) => {
      const firmId = request.user.firm_id!;
      const bodySchema = z.object({
        category: z.enum(['SALES', 'PURCHASES', 'BANK', 'FILED_RETURNS', 'NOTICES', 'CLIENT_DOCS', 'CUSTOM']),
        ruleName: z.string().min(2),
        customFolderName: z.string().optional(),
        targetPathTemplate: z.string().min(1),
        googleFolderId: z.string().optional(),
        autoCreateSubfolders: z.boolean().default(true),
        priority: z.number().default(0),
      });

      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      const { data, error } = await supabase
        .from('firm_document_routing_rules')
        .insert({
          firm_id: firmId,
          category: parsed.data.category,
          rule_name: parsed.data.ruleName,
          custom_folder_name: parsed.data.customFolderName || null,
          target_path_template: parsed.data.targetPathTemplate,
          google_folder_id: parsed.data.googleFolderId || null,
          auto_create_subfolders: parsed.data.autoCreateSubfolders,
          priority: parsed.data.priority,
          is_active: true,
        })
        .select('*')
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }
      return reply.send({ success: true, rule: data });
    });

    // 7. Update Routing Rule
    firmScope.put('/api/firm/routing-rules/:id', { preHandler: [requireFirmAdmin()] }, async (request, reply) => {
      const firmId = request.user.firm_id!;
      const { id } = request.params as { id: string };
      const bodySchema = z.object({
        ruleName: z.string().min(2).optional(),
        customFolderName: z.string().optional(),
        targetPathTemplate: z.string().optional(),
        googleFolderId: z.string().optional(),
        isActive: z.boolean().optional(),
        priority: z.number().optional(),
      });

      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      const { data, error } = await supabase
        .from('firm_document_routing_rules')
        .update({
          ...(parsed.data.ruleName ? { rule_name: parsed.data.ruleName } : {}),
          ...(parsed.data.customFolderName !== undefined ? { custom_folder_name: parsed.data.customFolderName } : {}),
          ...(parsed.data.targetPathTemplate ? { target_path_template: parsed.data.targetPathTemplate } : {}),
          ...(parsed.data.googleFolderId !== undefined ? { google_folder_id: parsed.data.googleFolderId } : {}),
          ...(parsed.data.isActive !== undefined ? { is_active: parsed.data.isActive } : {}),
          ...(parsed.data.priority !== undefined ? { priority: parsed.data.priority } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('firm_id', firmId)
        .select('*')
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }
      return reply.send({ success: true, rule: data });
    });

    // 8. Delete Routing Rule
    firmScope.delete('/api/firm/routing-rules/:id', { preHandler: [requireFirmAdmin()] }, async (request, reply) => {
      const firmId = request.user.firm_id!;
      const { id } = request.params as { id: string };

      const { error } = await supabase
        .from('firm_document_routing_rules')
        .delete()
        .eq('id', id)
        .eq('firm_id', firmId);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }
      return reply.send({ success: true });
    });

    // 9. Get Firm's Current Active Client Usage & Billing Estimate
    firmScope.get('/api/firm/usage', { preHandler: [requireFirmAdmin()] }, async (request, reply) => {
      const firmId = request.user.firm_id!;
      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [clientsCountRes, activeClientsRes, usageRecord] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('firm_id', firmId).eq('role', 'CLIENT'),
        supabase.from('client_gst_data').select('client_user_id', { count: 'exact', head: false }).eq('firm_id', firmId).gte('updated_at', periodStart),
        supabase.from('firm_monthly_usage').select('*').eq('firm_id', firmId).eq('billing_period', currentPeriod).maybeSingle(),
      ]);

      const totalClients = clientsCountRes.count || 0;
      const activeClientIds = new Set((activeClientsRes.data || []).map((r) => r.client_user_id));
      const activeClientsCount = usageRecord.data?.active_clients_count || activeClientIds.size;
      const ratePerClient = Number(usageRecord.data?.rate_per_active_client || 149);
      const subtotal = activeClientsCount * ratePerClient;
      const gst = subtotal * 0.18;
      const total = subtotal + gst;

      return reply.send({
        billingPeriod: currentPeriod,
        totalClients,
        activeClientsCount,
        inactiveClientsCount: Math.max(0, totalClients - activeClientsCount),
        ratePerActiveClient: ratePerClient,
        subtotalInr: subtotal,
        gstInr: gst,
        totalInr: total,
        invoiceStatus: usageRecord.data?.invoice_status || 'PENDING',
      });
    });
  });
};
