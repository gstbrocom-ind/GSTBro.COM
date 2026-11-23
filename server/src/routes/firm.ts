import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { authenticate, requireFirm, requireFirmAdmin } from '../middleware/auth.js';
import { hashPassword } from '../services/passwordService.js';
import { canAccessClient } from '../lib/authorization.js';
import { createWelcomeCodes, revokeWelcomeCode, getWelcomeCodesSummary } from '../services/welcomeCodeService.js';
import { parseRawClientNotes } from '../services/aiIntakeService.js';
import { generateCaOnboardingDocKit } from '../services/caDocumentTemplates.js';
import { getDriveService } from '../services/googleDrive.js';

export const firmRoutes: FastifyPluginAsync = async (app) => {
  app.register(async (firmScope) => {
    firmScope.addHook('preHandler', authenticate);
    firmScope.addHook('preHandler', requireFirm());

    // 1. Get Firm Profile (For CA and team members)
    firmScope.get('/api/firm/profile', async (request, reply) => {
      const firmId = request.user.firm_id!;
      const { data: firm, error } = await supabase
        .from('firms')
        .select(`
          id, name, slug, email, phone, gstin, address, branding, status, 
          logo_url, frn_number, membership_number, stamp_signature_url, letterhead_url, brand_color, created_at
        `)
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
        logo_url: z.string().nullable().optional(),
        frn_number: z.string().nullable().optional(),
        membership_number: z.string().nullable().optional(),
        stamp_signature_url: z.string().nullable().optional(),
        letterhead_url: z.string().nullable().optional(),
        brand_color: z.string().optional(),
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
        .select(`
          id, name, slug, email, phone, gstin, address, branding, status,
          logo_url, frn_number, membership_number, stamp_signature_url, letterhead_url, brand_color
        `)
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }
      return reply.send({ success: true, firm: data });
    });

    // ==========================================
    // TASKS & TO-DO SYSTEM WITH AUDIT TIMESTAMPS
    // ==========================================

    // 3. Get Firm Tasks (Filtered by status, client, or assigned staff)
    firmScope.get('/api/firm/tasks', async (request, reply) => {
      const firmId = request.user.firm_id!;
      const isStaff = request.user.role === 'FIRM_STAFF' || request.user.firm_role === 'FIRM_STAFF';
      const query = request.query as {
        status?: string;
        assigned_to?: string;
        client_id?: string;
      };

      let dbQuery = supabase
        .from('firm_tasks')
        .select(`
          *,
          client:client_id(id, name, business_name, gstin),
          assigned_user:assigned_to(id, name, email),
          creator:created_by(id, name),
          completer:completed_by(id, name)
        `)
        .eq('firm_id', firmId)
        .order('created_at', { ascending: false });

      // Strict Intra-Firm Segmentation: Article Clerk sees ONLY tasks assigned to them or created by them!
      if (isStaff) {
        dbQuery = dbQuery.or(`assigned_to.eq.${request.user.id},created_by.eq.${request.user.id}`);
      } else {
        if (query.assigned_to) {
          dbQuery = dbQuery.eq('assigned_to', query.assigned_to);
        }
      }

      if (query.status && query.status !== 'ALL') {
        dbQuery = dbQuery.eq('status', query.status);
      }
      if (query.client_id) {
        dbQuery = dbQuery.eq('client_id', query.client_id);
      }

      const { data, error } = await dbQuery;
      if (error) {
        return reply.status(500).send({ error: error.message });
      }
      return reply.send({ tasks: data || [] });
    });

    // 4. Create Task (Records created_by audit timestamp)
    firmScope.post('/api/firm/tasks', async (request, reply) => {
      const firmId = request.user.firm_id!;
      const userId = request.user.id;

      const bodySchema = z.object({
        title: z.string().min(2),
        description: z.string().optional().nullable(),
        category: z.enum(['GST', 'INCOME_TAX', 'AUDIT', 'ROC', 'ACCOUNTING', 'OFFICE']).default('GST'),
        priority: z.enum(['URGENT', 'HIGH', 'NORMAL', 'LOW']).default('NORMAL'),
        status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'ARCHIVED']).default('TODO'),
        due_date: z.string().optional().nullable(),
        assigned_to: z.string().uuid().optional().nullable(),
        client_id: z.string().uuid().optional().nullable(),
      });

      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      const isCompleted = parsed.data.status === 'COMPLETED';

      const { data, error } = await supabase
        .from('firm_tasks')
        .insert({
          firm_id: firmId,
          title: parsed.data.title,
          description: parsed.data.description || null,
          category: parsed.data.category,
          priority: parsed.data.priority,
          status: parsed.data.status,
          due_date: parsed.data.due_date || null,
          assigned_to: parsed.data.assigned_to || null,
          client_id: parsed.data.client_id || null,
          created_by: userId,
          completed_by: isCompleted ? userId : null,
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .select(`
          *,
          client:client_id(id, name, business_name, gstin),
          assigned_user:assigned_to(id, name, email),
          creator:created_by(id, name),
          completer:completed_by(id, name)
        `)
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }
      return reply.send({ success: true, task: data });
    });

    // 5. Update Task (Captures completion timestamp and completing user)
    firmScope.patch('/api/firm/tasks/:id', async (request, reply) => {
      const firmId = request.user.firm_id!;
      const userId = request.user.id;
      const { id } = request.params as { id: string };

      const bodySchema = z.object({
        title: z.string().min(2).optional(),
        description: z.string().nullable().optional(),
        category: z.enum(['GST', 'INCOME_TAX', 'AUDIT', 'ROC', 'ACCOUNTING', 'OFFICE']).optional(),
        priority: z.enum(['URGENT', 'HIGH', 'NORMAL', 'LOW']).optional(),
        status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'ARCHIVED']).optional(),
        due_date: z.string().nullable().optional(),
        assigned_to: z.string().uuid().nullable().optional(),
        client_id: z.string().uuid().nullable().optional(),
      });

      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      const updatePayload: Record<string, any> = {
        ...parsed.data,
        updated_at: new Date().toISOString(),
      };

      if (parsed.data.status === 'COMPLETED') {
        updatePayload.completed_at = new Date().toISOString();
        updatePayload.completed_by = userId;
      } else if (parsed.data.status) {
        updatePayload.completed_at = null;
        updatePayload.completed_by = null;
      }

      const { data, error } = await supabase
        .from('firm_tasks')
        .update(updatePayload)
        .eq('id', id)
        .eq('firm_id', firmId)
        .select(`
          *,
          client:client_id(id, name, business_name, gstin),
          assigned_user:assigned_to(id, name, email),
          creator:created_by(id, name),
          completer:completed_by(id, name)
        `)
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }
      return reply.send({ success: true, task: data });
    });

    // 6. Delete Task
    firmScope.delete('/api/firm/tasks/:id', async (request, reply) => {
      const firmId = request.user.firm_id!;
      const { id } = request.params as { id: string };

      const { error } = await supabase
        .from('firm_tasks')
        .delete()
        .eq('id', id)
        .eq('firm_id', firmId);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }
      return reply.send({ success: true });
    });

    // 7. Recurring Task Rules
    firmScope.get('/api/firm/tasks/recurring-rules', async (request, reply) => {
      const firmId = request.user.firm_id!;
      const { data, error } = await supabase
        .from('firm_task_recurring_rules')
        .select('*')
        .eq('firm_id', firmId)
        .order('created_at', { ascending: false });

      if (error) {
        return reply.status(500).send({ error: error.message });
      }
      return reply.send({ rules: data || [] });
    });

    firmScope.post('/api/firm/tasks/recurring-rules', { preHandler: [requireFirmAdmin()] }, async (request, reply) => {
      const firmId = request.user.firm_id!;
      const bodySchema = z.object({
        rule_name: z.string().min(2),
        task_template_title: z.string().min(2),
        category: z.string().default('GST'),
        priority: z.enum(['URGENT', 'HIGH', 'NORMAL', 'LOW']).default('NORMAL'),
        days_before_due_date: z.number().int().min(1).max(30).default(5),
        target_due_date_category: z.string().default('GSTR-1'),
        auto_assign_to_client_staff: z.boolean().default(true),
      });

      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      const { data, error } = await supabase
        .from('firm_task_recurring_rules')
        .insert({
          firm_id: firmId,
          ...parsed.data,
          is_active: true,
        })
        .select('*')
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }
      return reply.send({ success: true, rule: data });
    });

    firmScope.delete('/api/firm/tasks/recurring-rules/:id', { preHandler: [requireFirmAdmin()] }, async (request, reply) => {
      const firmId = request.user.firm_id!;
      const { id } = request.params as { id: string };

      const { error } = await supabase
        .from('firm_task_recurring_rules')
        .delete()
        .eq('id', id)
        .eq('firm_id', firmId);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }
      return reply.send({ success: true });
    });

    // 8. Auto-Generate Monthly Recurring Tasks for All Clients
    firmScope.post('/api/firm/tasks/generate-recurring', async (request, reply) => {
      const firmId = request.user.firm_id!;
      const userId = request.user.id;
      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Get active rules
      const { data: rules } = await supabase
        .from('firm_task_recurring_rules')
        .select('*')
        .eq('firm_id', firmId)
        .eq('is_active', true);

      if (!rules || rules.length === 0) {
        return reply.send({ generatedCount: 0, message: 'No active recurring task rules configured' });
      }

      // Get clients of this firm
      const { data: clients } = await supabase
        .from('users')
        .select('id, name, business_name, assigned_staff_id')
        .eq('firm_id', firmId)
        .eq('role', 'CLIENT');

      if (!clients || clients.length === 0) {
        return reply.send({ generatedCount: 0, message: 'No clients onboarded under this firm' });
      }

      let generated = 0;
      for (const rule of rules) {
        for (const client of clients) {
          const title = `${rule.task_template_title} - ${client.business_name || client.name} (${currentPeriod})`;
          
          // Check if already created for this client & period
          const { data: existing } = await supabase
            .from('firm_tasks')
            .select('id')
            .eq('firm_id', firmId)
            .eq('client_id', client.id)
            .ilike('title', `%${client.business_name || client.name}%${currentPeriod}%`)
            .maybeSingle();

          if (!existing) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + (rule.days_before_due_date || 5));

            await supabase.from('firm_tasks').insert({
              firm_id: firmId,
              client_id: client.id,
              title,
              description: `Auto-generated monthly task for ${currentPeriod} as per rule "${rule.rule_name}".`,
              category: rule.category || 'GST',
              priority: rule.priority || 'NORMAL',
              status: 'TODO',
              due_date: dueDate.toISOString(),
              assigned_to: rule.auto_assign_to_client_staff ? client.assigned_staff_id : null,
              created_by: userId,
            });
            generated++;
          }
        }

        await supabase
          .from('firm_task_recurring_rules')
          .update({ last_generated_period: currentPeriod })
          .eq('id', rule.id);
      }

      return reply.send({ success: true, generatedCount: generated });
    });

    // ==========================================
    // STATUTORY DUE DATES & FIRM OVERRIDES
    // ==========================================

    // 9. Get Merged Statutory & Firm Overridden Due Dates
    firmScope.get('/api/firm/due-dates', async (request, reply) => {
      const firmId = request.user.firm_id!;

      const [statutoryRes, overridesRes] = await Promise.all([
        supabase.from('due_dates').select('*').order('due_date', { ascending: true }),
        supabase.from('firm_due_date_overrides').select('*').eq('firm_id', firmId),
      ]);

      const statutoryList = statutoryRes.data || [];
      const overridesMap = new Map((overridesRes.data || []).map((o) => [o.deadline_key, o]));

      const merged = statutoryList.map((item) => {
        const key = item.deadline_key || item.category;
        const override = overridesMap.get(key);
        if (override) {
          return {
            ...item,
            statutory_due_date: item.due_date,
            due_date: override.custom_due_date,
            is_overridden: true,
            override_reason: override.reason,
            override_id: override.id,
          };
        }
        return {
          ...item,
          is_overridden: false,
        };
      });

      return reply.send({ dueDates: merged });
    });

    // 10. Override Statutory Due Date for this Firm
    firmScope.post('/api/firm/due-dates/override', { preHandler: [requireFirmAdmin()] }, async (request, reply) => {
      const firmId = request.user.firm_id!;
      const userId = request.user.id;

      const bodySchema = z.object({
        statutory_due_date_id: z.string().uuid().optional(),
        deadline_key: z.string().min(1),
        title: z.string().optional(),
        category: z.string().optional(),
        custom_due_date: z.string().min(10), // 'YYYY-MM-DD'
        reason: z.string().optional(),
      });

      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      const { data, error } = await supabase
        .from('firm_due_date_overrides')
        .upsert(
          {
            firm_id: firmId,
            statutory_due_date_id: parsed.data.statutory_due_date_id || null,
            deadline_key: parsed.data.deadline_key,
            title: parsed.data.title || null,
            category: parsed.data.category || 'GST',
            custom_due_date: parsed.data.custom_due_date,
            reason: parsed.data.reason || null,
            created_by: userId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'firm_id,deadline_key' }
        )
        .select('*')
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }
      return reply.send({ success: true, override: data });
    });

    // 11. Reset Due Date back to statutory default
    firmScope.delete('/api/firm/due-dates/override/:deadlineKey', { preHandler: [requireFirmAdmin()] }, async (request, reply) => {
      const firmId = request.user.firm_id!;
      const { deadlineKey } = request.params as { deadlineKey: string };

      const { error } = await supabase
        .from('firm_due_date_overrides')
        .delete()
        .eq('firm_id', firmId)
        .eq('deadline_key', deadlineKey);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }
      return reply.send({ success: true });
    });

    // ==========================================
    // CLIENT PIPELINE & COMPLIANCE BOARD
    // ==========================================

    // 12. List Firm Clients with filing stage and assigned staff
    firmScope.get('/api/firm/clients', async (request, reply) => {
      const firmId = request.user.firm_id!;
      const isStaff = request.user.role === 'FIRM_STAFF' || request.user.firm_role === 'FIRM_STAFF';

      let query = supabase
        .from('users')
        .select(`
          id, name, email, phone, business_name, gstin, state, address,
          filing_stage, assigned_staff_id, team_group, created_at,
          assigned_staff:assigned_staff_id(id, name, email)
        `)
        .eq('firm_id', firmId)
        .eq('role', 'CLIENT');

      // Strict Intra-Firm Segmentation: Article Clerks can ONLY see clients assigned to them!
      if (isStaff) {
        query = query.eq('assigned_staff_id', request.user.id);
      } else {
        query = query.order('name', { ascending: true });
      }

      const { data, error } = await query;
      if (error) {
        return reply.status(500).send({ error: error.message });
      }
      return reply.send({ clients: data || [] });
    });

    // 13. Onboard New Client into Firm
    firmScope.post('/api/firm/clients', async (request, reply) => {
      const firmId = request.user.firm_id!;
      const bodySchema = z.object({
        name: z.string().min(2),
        business_name: z.string().optional(),
        email: z.string().email(),
        phone: z.string().optional(),
        gstin: z.string().optional(),
        state: z.string().optional(),
        address: z.string().optional(),
        assigned_staff_id: z.string().uuid().optional().nullable(),
      });

      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, firm_id')
        .eq('email', parsed.data.email.toLowerCase().trim())
        .maybeSingle();

      if (existingUser) {
        if (existingUser.firm_id && existingUser.firm_id !== firmId) {
          return reply.status(400).send({ error: 'A client with this email is already registered with another firm' });
        }
        // Associate with this firm
        const { data: updated, error: updateErr } = await supabase
          .from('users')
          .update({
            firm_id: firmId,
            name: parsed.data.name,
            business_name: parsed.data.business_name || null,
            phone: parsed.data.phone || null,
            gstin: parsed.data.gstin || null,
            state: parsed.data.state || null,
            address: parsed.data.address || null,
            assigned_staff_id: parsed.data.assigned_staff_id || null,
          })
          .eq('id', existingUser.id)
          .select('id, name, email, phone, business_name, gstin, filing_stage, assigned_staff_id')
          .single();

        if (updateErr) return reply.status(500).send({ error: updateErr.message });
        return reply.send({ success: true, client: updated });
      }

      // Create new client record
      const defaultPasswordHash = await hashPassword('Client@123456');
      const { data: newClient, error: insertErr } = await supabase
        .from('users')
        .insert({
          firm_id: firmId,
          email: parsed.data.email.toLowerCase().trim(),
          name: parsed.data.name,
          business_name: parsed.data.business_name || null,
          phone: parsed.data.phone || null,
          gstin: parsed.data.gstin || null,
          state: parsed.data.state || null,
          address: parsed.data.address || null,
          role: 'CLIENT',
          password_hash: defaultPasswordHash,
          email_verified: true,
          filing_stage: 'DATA_COLLECTION',
          assigned_staff_id: parsed.data.assigned_staff_id || null,
        })
        .select('id, name, email, phone, business_name, gstin, filing_stage, assigned_staff_id')
        .single();

      if (insertErr) {
        return reply.status(500).send({ error: insertErr.message });
      }
      return reply.send({ success: true, client: newClient });
    });

    // 14. Update Client Filing Stage or Assigned Staff
    firmScope.patch('/api/firm/clients/:id', async (request, reply) => {
      const firmId = request.user.firm_id!;
      const { id } = request.params as { id: string };

      const bodySchema = z.object({
        filing_stage: z.enum(['DATA_COLLECTION', 'RECON_IN_PROGRESS', 'CA_REVIEW', 'FILED']).optional(),
        assigned_staff_id: z.string().uuid().nullable().optional(),
        business_name: z.string().optional(),
        gstin: z.string().optional(),
        phone: z.string().optional(),
      });

      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      const { data, error } = await supabase
        .from('users')
        .update({
          ...parsed.data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('firm_id', firmId)
        .select(`
          id, name, email, phone, business_name, gstin, state,
          filing_stage, assigned_staff_id,
          assigned_staff:assigned_staff_id(id, name, email)
        `)
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }
      return reply.send({ success: true, client: data });
    });

    // 14b. Delete Client from Firm (Partner/Manager Only)
    firmScope.delete('/api/firm/clients/:id', { preHandler: [requireFirmAdmin()] }, async (request, reply) => {
      const firmId = request.user.firm_id!;
      const { id } = request.params as { id: string };

      // 1. Fetch client to ensure belongs to this firm
      const { data: client, error: clientErr } = await supabase
        .from('users')
        .select('id, name, email, business_name')
        .eq('id', id)
        .eq('firm_id', firmId)
        .maybeSingle();

      if (clientErr || !client) {
        return reply.status(404).send({ error: 'Client not found in your firm' });
      }

      // 2. Cascade delete client data for this firm
      await supabase.from('firm_client_access_logs').delete().eq('client_id', id);
      await supabase.from('client_documents').delete().eq('user_id', id).eq('firm_id', firmId);
      await supabase.from('firm_tasks').delete().eq('client_id', id).eq('firm_id', firmId);
      await supabase.from('firm_task_recurring_rules').delete().eq('client_id', id).eq('firm_id', firmId);
      await supabase.from('client_gst_data').delete().eq('user_id', id).eq('firm_id', firmId);
      await supabase.from('cases').delete().eq('user_id', id).eq('firm_id', firmId);
      await supabase.from('client_messages').delete().eq('client_id', id).eq('firm_id', firmId);

      // 3. Delete user account
      const { error: delErr } = await supabase
        .from('users')
        .delete()
        .eq('id', id)
        .eq('firm_id', firmId);

      if (delErr) {
        return reply.status(500).send({ error: delErr.message });
      }

      return reply.send({ success: true, message: `Client "${client.business_name || client.name}" removed successfully.` });
    });

    // ==========================================
    // TEAM & ARTICLE WORKLOAD MANAGEMENT
    // ==========================================

    // 15. Get Team Members with assigned client count
    firmScope.get('/api/firm/team', async (request, reply) => {
      const firmId = request.user.firm_id!;
      const isStaff = request.user.role === 'FIRM_STAFF' || request.user.firm_role === 'FIRM_STAFF';

      let teamQuery = supabase
        .from('users')
        .select('id, name, email, phone, role, firm_role, team_group, icai_membership_no, icai_membership_type, cop_number, partner_designation, created_at')
        .eq('firm_id', firmId)
        .in('role', ['TEAM', 'FIRM_STAFF', 'FIRM_PARTNER', 'FIRM_OWNER', 'ADMIN']);

      // If Article Clerk, they only see themselves and Practice Partners/Managers (for escalation/contact)
      if (isStaff) {
        teamQuery = teamQuery.or(`id.eq.${request.user.id},firm_role.eq.FIRM_OWNER,firm_role.eq.FIRM_PARTNER,firm_role.eq.FIRM_MANAGER,role.eq.FIRM_OWNER,role.eq.FIRM_PARTNER`);
      }

      const [teamRes, clientsRes] = await Promise.all([
        teamQuery.order('name', { ascending: true }),
        supabase
          .from('users')
          .select('id, assigned_staff_id')
          .eq('firm_id', firmId)
          .eq('role', 'CLIENT'),
      ]);

      if (teamRes.error) {
        return reply.status(500).send({ error: teamRes.error.message });
      }

      const clientCounts: Record<string, number> = {};
      (clientsRes.data || []).forEach((c) => {
        if (c.assigned_staff_id) {
          clientCounts[c.assigned_staff_id] = (clientCounts[c.assigned_staff_id] || 0) + 1;
        }
      });

      const team = (teamRes.data || []).map((m) => ({
        ...m,
        assignedClientsCount: clientCounts[m.id] || 0,
      }));

      return reply.send({ team });
    });

    // 16. Invite / Add Team Member (Partner / Article / Manager)
    firmScope.post('/api/firm/team/invite', { preHandler: [requireFirmAdmin()] }, async (request, reply) => {
      const firmId = request.user.firm_id!;
      const bodySchema = z.object({
        name: z.string().min(2),
        email: z.string().email(),
        phone: z.string().optional().nullable(),
        firm_role: z.enum(['FIRM_PARTNER', 'FIRM_MANAGER', 'FIRM_STAFF']).default('FIRM_STAFF'),
        team_group: z.string().default('General'),
        password: z.string().min(8).optional(),
        icai_membership_no: z.string().optional().nullable(),
        icai_membership_type: z.enum(['FCA', 'ACA']).optional().nullable(),
        cop_number: z.string().optional().nullable(),
        partner_designation: z.string().optional().nullable(),
      });

      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      const isPartner = parsed.data.firm_role === 'FIRM_PARTNER';
      const role = isPartner ? 'FIRM_PARTNER' : 'FIRM_STAFF';
      const defaultPassword = parsed.data.password || (isPartner ? 'Partner@123456' : 'Staff@123456');
      const passwordHash = await hashPassword(defaultPassword);

      const { data, error } = await supabase
        .from('users')
        .insert({
          firm_id: firmId,
          name: parsed.data.name,
          email: parsed.data.email.toLowerCase().trim(),
          phone: parsed.data.phone || null,
          role: role,
          firm_role: parsed.data.firm_role,
          team_group: isPartner ? 'Executive Partners' : parsed.data.team_group,
          icai_membership_no: parsed.data.icai_membership_no || null,
          icai_membership_type: parsed.data.icai_membership_type || null,
          cop_number: parsed.data.cop_number || null,
          partner_designation: parsed.data.partner_designation || null,
          password_hash: passwordHash,
          email_verified: true,
          must_reset_password: true,
        })
        .select('id, name, email, phone, role, firm_role, team_group, icai_membership_no, icai_membership_type, cop_number, partner_designation, created_at')
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }
      return reply.send({ success: true, member: data });
    });

    // 16b. Handover Client Portfolio & Tasks between Staff Members (Partner/Admin Only)
    firmScope.post('/api/firm/team/handover', { preHandler: [requireFirmAdmin()] }, async (request, reply) => {
      const firmId = request.user.firm_id!;
      const bodySchema = z.object({
        fromStaffId: z.string().uuid(),
        toStaffId: z.string().uuid(),
        notes: z.string().optional(),
      });

      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      const { fromStaffId, toStaffId, notes } = parsed.data;
      if (fromStaffId === toStaffId) {
        return reply.status(400).send({ error: 'Cannot handover to the same staff member.' });
      }

      // Reassign clients
      const { data: updatedClients, error: clientErr } = await supabase
        .from('users')
        .update({ assigned_staff_id: toStaffId, updated_at: new Date().toISOString() })
        .eq('firm_id', firmId)
        .eq('assigned_staff_id', fromStaffId)
        .select('id');

      if (clientErr) return reply.status(500).send({ error: clientErr.message });

      // Reassign pending tasks
      const { data: updatedTasks, error: taskErr } = await supabase
        .from('firm_tasks')
        .update({ assigned_to: toStaffId, updated_at: new Date().toISOString() })
        .eq('firm_id', firmId)
        .eq('assigned_to', fromStaffId)
        .neq('status', 'COMPLETED')
        .select('id');

      if (taskErr) return reply.status(500).send({ error: taskErr.message });

      // Insert audit log
      await supabase.from('firm_client_access_logs').insert({
        firm_id: firmId,
        user_id: request.user.id,
        client_id: toStaffId,
        action: 'HANDOVER',
        notes: `Portfolio handover from ${fromStaffId} to ${toStaffId}. Transferred ${updatedClients?.length || 0} clients and ${updatedTasks?.length || 0} pending tasks. Note: ${notes || 'None'}`,
      });

      return reply.send({
        success: true,
        transferredClientsCount: updatedClients?.length || 0,
        transferredTasksCount: updatedTasks?.length || 0,
      });
    });

    // 16b2. Delete / Remove Team Member from Firm (Partner/Manager Only)
    firmScope.delete('/api/firm/team/:id', { preHandler: [requireFirmAdmin()] }, async (request, reply) => {
      const firmId = request.user.firm_id!;
      const { id } = request.params as { id: string };

      // Prevent self-deletion
      if (id === request.user.id) {
        return reply.status(400).send({ error: 'You cannot delete your own account from the firm.' });
      }

      // 1. Fetch member to ensure belongs to this firm
      const { data: member, error: memberErr } = await supabase
        .from('users')
        .select('id, name, email, role, firm_role')
        .eq('id', id)
        .eq('firm_id', firmId)
        .maybeSingle();

      if (memberErr || !member) {
        return reply.status(404).send({ error: 'Team member not found in your firm.' });
      }

      // Prevent non-partners from deleting a firm owner or partner
      if (member.role === 'FIRM_OWNER' || member.firm_role === 'FIRM_OWNER' || member.role === 'FIRM_PARTNER' || member.firm_role === 'FIRM_PARTNER') {
        const callerIsOwnerOrPartner = 
          request.user.role === 'FIRM_OWNER' || 
          request.user.firm_role === 'FIRM_OWNER' ||
          request.user.role === 'FIRM_PARTNER' || 
          request.user.firm_role === 'FIRM_PARTNER' ||
          request.user.role === 'ADMIN';

        if (!callerIsOwnerOrPartner) {
          return reply.status(403).send({ error: 'Only a Firm Partner or Owner can manage partner accounts.' });
        }
      }

      // 2. Unassign clients assigned to this member
      await supabase
        .from('users')
        .update({ assigned_staff_id: null, updated_at: new Date().toISOString() })
        .eq('firm_id', firmId)
        .eq('assigned_staff_id', id);

      // 3. Unassign tasks assigned to this member
      await supabase
        .from('firm_tasks')
        .update({ assigned_to: null, updated_at: new Date().toISOString() })
        .eq('firm_id', firmId)
        .eq('assigned_to', id);

      // 4. Remove from chat groups and to-dos
      await supabase.from('firm_chat_group_members').delete().eq('user_id', id);
      await supabase.from('firm_user_todos').delete().eq('user_id', id);

      // 5. Delete user record
      const { error: delErr } = await supabase
        .from('users')
        .delete()
        .eq('id', id)
        .eq('firm_id', firmId);

      if (delErr) {
        return reply.status(500).send({ error: delErr.message });
      }

      return reply.send({ success: true, message: `Team member "${member.name}" removed successfully.` });
    });

    // 16c. Client Data Access Audit Log
    firmScope.post('/api/firm/audit/log-access', async (request, reply) => {
      const firmId = request.user.firm_id!;
      const bodySchema = z.object({
        clientId: z.string().uuid(),
        action: z.string().min(2),
        resourceType: z.string().optional(),
        resourceId: z.string().optional(),
        notes: z.string().optional(),
      });

      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      await supabase.from('firm_client_access_logs').insert({
        firm_id: firmId,
        user_id: request.user.id,
        client_id: parsed.data.clientId,
        action: parsed.data.action,
        resource_type: parsed.data.resourceType || null,
        resource_id: parsed.data.resourceId || null,
        notes: parsed.data.notes || null,
        ip_address: request.ip,
      });

      return reply.send({ success: true });
    });

    // 16d. Get Access Audit Logs (Partner / Admin Only)
    firmScope.get('/api/firm/audit/access-logs', { preHandler: [requireFirmAdmin()] }, async (request, reply) => {
      const firmId = request.user.firm_id!;
      const { data, error } = await supabase
        .from('firm_client_access_logs')
        .select(`
          id, action, resource_type, resource_id, notes, ip_address, created_at,
          user:user_id(id, name, email, firm_role),
          client:client_id(id, name, business_name)
        `)
        .eq('firm_id', firmId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }
      return reply.send({ logs: data || [] });
    });

    // ==========================================
    // DIGITAL SIGNATURE (DSC) TRACKER
    // ==========================================

    // 17. Get DSC Tokens
    firmScope.get('/api/firm/dsc-tokens', async (request, reply) => {
      const firmId = request.user.firm_id!;
      const { data, error } = await supabase
        .from('firm_dsc_tokens')
        .select(`
          *,
          client:client_id(id, name, business_name)
        `)
        .eq('firm_id', firmId)
        .order('expiry_date', { ascending: true });

      if (error) {
        return reply.status(500).send({ error: error.message });
      }
      return reply.send({ tokens: data || [] });
    });

    // 18. Add DSC Token
    firmScope.post('/api/firm/dsc-tokens', async (request, reply) => {
      const firmId = request.user.firm_id!;
      const bodySchema = z.object({
        holder_name: z.string().min(2),
        designation: z.string().optional(),
        pan_or_din: z.string().optional(),
        expiry_date: z.string().min(10), // 'YYYY-MM-DD'
        token_type: z.string().default('CLASS_3'),
        storage_location: z.string().optional(),
        notes: z.string().optional(),
        client_id: z.string().uuid().nullable().optional(),
      });

      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      const { data, error } = await supabase
        .from('firm_dsc_tokens')
        .insert({
          firm_id: firmId,
          ...parsed.data,
        })
        .select(`
          *,
          client:client_id(id, name, business_name)
        `)
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }
      return reply.send({ success: true, token: data });
    });

    // 19. Delete DSC Token
    firmScope.delete('/api/firm/dsc-tokens/:id', async (request, reply) => {
      const firmId = request.user.firm_id!;
      const { id } = request.params as { id: string };

      const { error } = await supabase
        .from('firm_dsc_tokens')
        .delete()
        .eq('id', id)
        .eq('firm_id', firmId);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }
      return reply.send({ success: true });
    });

    // ==========================================
    // GOOGLE DRIVE BYOD & DOCUMENT ROUTING
    // ==========================================

    // 20. Get Google Drive BYOD Config
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

    // 21. Configure / Connect Google Drive BYOD
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

    // 22. Get Document Routing Rules
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

    // 23. Create Document Routing Rule
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

    // 24. Delete Document Routing Rule
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

    // ==========================================
    // ROLE PERMISSIONS MANAGER (5-LEVEL HIERARCHY)
    // ==========================================

    // 25. Get Firm Role Permissions Matrix
    firmScope.get('/api/firm/permissions', async (request, reply) => {
      const firmId = request.user.firm_id!;
      const { data: firm, error } = await supabase
        .from('firms')
        .select('permissions')
        .eq('id', firmId)
        .single();

      if (error || !firm) {
        return reply.status(500).send({ error: 'Failed to load permissions' });
      }

      return reply.send({ permissions: firm.permissions || {} });
    });

    // 26. Update Firm Role Permissions (Partner / Admin Only)
    firmScope.put('/api/firm/permissions', { preHandler: [requireFirmAdmin()] }, async (request, reply) => {
      const firmId = request.user.firm_id!;
      const bodySchema = z.object({
        permissions: z.record(z.record(z.boolean())),
      });

      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      const { data, error } = await supabase
        .from('firms')
        .update({
          permissions: parsed.data.permissions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', firmId)
        .select('permissions')
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }
      return reply.send({ success: true, permissions: data.permissions });
    });

    // ==========================================
    // IN-WEBSITE MESSAGING & QUERY SUITE (REPLACING WHATSAPP)
    // ==========================================

    // 27. Get Client Conversation Messages / Internal Notes
    firmScope.get('/api/firm/messages', async (request, reply) => {
      const firmId = request.user.firm_id!;
      const query = request.query as {
        clientId: string;
        threadType?: 'CLIENT_EXTERNAL' | 'INTERNAL_TEAM_NOTE';
        category?: string;
        status?: string;
      };

      if (!query.clientId) {
        return reply.status(400).send({ error: 'clientId query parameter is required' });
      }

      const isClient = request.user.role === 'CLIENT';
      if (isClient) {
        // Clients can ONLY access their own external messages
        if (query.clientId !== request.user.id || query.threadType === 'INTERNAL_TEAM_NOTE') {
          return reply.status(403).send({ error: 'Forbidden' });
        }
      } else {
        // Staff/Article access check
        const hasAccess = await canAccessClient(request.user, query.clientId);
        if (!hasAccess) {
          return reply.status(403).send({ error: 'Forbidden: You do not have access to this client.' });
        }
      }

      let dbQuery = supabase
        .from('client_messages')
        .select(`
          id, client_user_id, sender_user_id, message, created_at, read_at,
          thread_type, category, attachment_url, attachment_name, attachment_type,
          status, resolved_by, resolved_at,
          sender:sender_user_id(id, name, email, role, firm_role)
        `)
        .eq('client_user_id', query.clientId)
        .order('created_at', { ascending: true });

      // If client requests, force thread_type = CLIENT_EXTERNAL
      if (isClient) {
        dbQuery = dbQuery.eq('thread_type', 'CLIENT_EXTERNAL');
      } else if (query.threadType) {
        dbQuery = dbQuery.eq('thread_type', query.threadType);
      }

      if (query.category) {
        dbQuery = dbQuery.eq('category', query.category);
      }
      if (query.status) {
        dbQuery = dbQuery.eq('status', query.status);
      }

      const { data, error } = await dbQuery;
      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return reply.send({ messages: data || [] });
    });

    // 28. Post In-Website Message or Private Team Note
    firmScope.post('/api/firm/messages', async (request, reply) => {
      const firmId = request.user.firm_id!;
      const isClient = request.user.role === 'CLIENT';

      const bodySchema = z.object({
        clientId: z.string().uuid(),
        message: z.string().min(1),
        threadType: z.enum(['CLIENT_EXTERNAL', 'INTERNAL_TEAM_NOTE']).default('CLIENT_EXTERNAL'),
        category: z.enum(['GENERAL', 'MONTHLY_DOCS', 'ITC_RECON', 'NOTICE_REPLY', 'BILLING']).default('GENERAL'),
        attachmentUrl: z.string().optional().nullable(),
        attachmentName: z.string().optional().nullable(),
        attachmentType: z.string().optional().nullable(),
      });

      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      if (isClient) {
        if (parsed.data.clientId !== request.user.id || parsed.data.threadType === 'INTERNAL_TEAM_NOTE') {
          return reply.status(403).send({ error: 'Clients cannot post internal team notes.' });
        }
      } else {
        const hasAccess = await canAccessClient(request.user, parsed.data.clientId);
        if (!hasAccess) {
          return reply.status(403).send({ error: 'Forbidden: You do not have access to this client.' });
        }
      }

      const { data, error } = await supabase
        .from('client_messages')
        .insert({
          firm_id: firmId,
          client_user_id: parsed.data.clientId,
          sender_user_id: request.user.id,
          message: parsed.data.message,
          thread_type: parsed.data.threadType,
          category: parsed.data.category,
          attachment_url: parsed.data.attachmentUrl || null,
          attachment_name: parsed.data.attachmentName || null,
          attachment_type: parsed.data.attachmentType || null,
          status: 'OPEN',
        })
        .select(`
          id, client_user_id, sender_user_id, message, created_at, read_at,
          thread_type, category, attachment_url, attachment_name, attachment_type,
          status,
          sender:sender_user_id(id, name, email, role, firm_role)
        `)
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return reply.send({ success: true, message: data });
    });

    // 29. Resolve Client Query Thread
    firmScope.patch('/api/firm/messages/:id/resolve', async (request, reply) => {
      const { id } = request.params as { id: string };

      const { data, error } = await supabase
        .from('client_messages')
        .update({
          status: 'RESOLVED',
          resolved_by: request.user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id, status, resolved_at')
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }
      return reply.send({ success: true, message: data });
    });

    // ==========================================
    // PRE-FILING 5-POINT SIGN-OFF CHECKLIST
    // ==========================================

    // 30. Get Pre-Filing Checklist
    firmScope.get('/api/firm/checklists', async (request, reply) => {
      const firmId = request.user.firm_id!;
      const query = request.query as {
        clientId: string;
        period: string;
        returnType?: string;
      };

      if (!query.clientId || !query.period) {
        return reply.status(400).send({ error: 'clientId and period are required' });
      }

      const { data, error } = await supabase
        .from('pre_filing_checklists')
        .select(`
          *,
          approver:approved_by(id, name, email, role, firm_role)
        `)
        .eq('firm_id', firmId)
        .eq('client_id', query.clientId)
        .eq('period', query.period)
        .eq('return_type', query.returnType || 'GSTR-3B')
        .maybeSingle();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return reply.send({ checklist: data || null });
    });

    // 31. Update & Sign-off Pre-Filing Checklist
    firmScope.put('/api/firm/checklists', async (request, reply) => {
      const firmId = request.user.firm_id!;
      const bodySchema = z.object({
        clientId: z.string().uuid(),
        period: z.string().min(6), // 'YYYY-MM'
        returnType: z.enum(['GSTR-1', 'GSTR-3B', 'IFF', 'CMP-08', 'GSTR-9']).default('GSTR-3B'),
        itc2bReconciled: z.boolean().default(false),
        rcmChecked: z.boolean().default(false),
        outwardEwayMatched: z.boolean().default(false),
        cashLedgerVerified: z.boolean().default(false),
        clientDraftApproved: z.boolean().default(false),
        notes: z.string().optional().nullable(),
      });

      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      const allApproved =
        parsed.data.itc2bReconciled &&
        parsed.data.rcmChecked &&
        parsed.data.outwardEwayMatched &&
        parsed.data.cashLedgerVerified &&
        parsed.data.clientDraftApproved;

      const { data, error } = await supabase
        .from('pre_filing_checklists')
        .upsert(
          {
            firm_id: firmId,
            client_id: parsed.data.clientId,
            period: parsed.data.period,
            return_type: parsed.data.returnType,
            itc_2b_reconciled: parsed.data.itc2bReconciled,
            rcm_checked: parsed.data.rcmChecked,
            outward_eway_matched: parsed.data.outwardEwayMatched,
            cash_ledger_verified: parsed.data.cashLedgerVerified,
            client_draft_approved: parsed.data.clientDraftApproved,
            notes: parsed.data.notes || null,
            approved_by: allApproved ? request.user.id : null,
            approved_at: allApproved ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'client_id,period,return_type' }
        )
        .select(`
          *,
          approver:approved_by(id, name, email, role, firm_role)
        `)
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return reply.send({ success: true, checklist: data });
    });

    // ==========================================
    // FIRM USAGE & METERING ESTIMATE
    // ==========================================

    // 25. Get Firm Active Client Meter
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

    // ==========================================
    // 26. CLIENT MILESTONES CRM (BIRTHDAYS & INCORPORATION DAYS)
    // ==========================================

    // List milestones (with upcoming celebrations filter)
    firmScope.get('/api/firm/milestones', async (request, reply) => {
      const firmId = request.user.firm_id!;
      const isStaff = request.user.role === 'FIRM_STAFF' || request.user.firm_role === 'FIRM_STAFF';
      const { clientId } = request.query as { clientId?: string };

      let query = supabase
        .from('client_milestones')
        .select(`
          *,
          client:client_id(id, name, business_name, email, phone, assigned_staff_id)
        `)
        .eq('firm_id', firmId)
        .order('milestone_date', { ascending: true });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;
      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      let results = data || [];

      // If staff, segment to only milestones of clients assigned to this staff member
      if (isStaff) {
        results = results.filter((m: any) => m.client && m.client.assigned_staff_id === request.user.id);
      }

      return reply.send({ milestones: results });
    });

    // Create client milestone
    firmScope.post('/api/firm/milestones', async (request, reply) => {
      const firmId = request.user.firm_id!;
      const schema = z.object({
        clientId: z.string().uuid(),
        milestoneType: z.enum(['BIRTHDAY', 'INCORPORATION_DAY', 'GST_ANNIVERSARY', 'CUSTOM']),
        title: z.string().min(2),
        milestoneDate: z.string(),
        contactPerson: z.string().optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.string().optional(),
        notes: z.string().optional(),
      });

      const parsed = schema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
      }

      const hasAccess = await canAccessClient(request.user, parsed.data.clientId);
      if (!hasAccess) {
        return reply.status(403).send({ error: 'Forbidden: Access denied to this client' });
      }

      const { data, error } = await supabase
        .from('client_milestones')
        .insert({
          firm_id: firmId,
          client_id: parsed.data.clientId,
          milestone_type: parsed.data.milestoneType,
          title: parsed.data.title,
          milestone_date: parsed.data.milestoneDate,
          contact_person: parsed.data.contactPerson || null,
          contact_phone: parsed.data.contactPhone || null,
          contact_email: parsed.data.contactEmail || null,
          notes: parsed.data.notes || null,
        })
        .select()
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return reply.send({ success: true, milestone: data });
    });

    // Delete milestone
    firmScope.delete('/api/firm/milestones/:id', async (request, reply) => {
      const firmId = request.user.firm_id!;
      const { id } = request.params as { id: string };

      const { error } = await supabase
        .from('client_milestones')
        .delete()
        .eq('id', id)
        .eq('firm_id', firmId);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return reply.send({ success: true });
    });

    // Record greeting sent (audit trail)
    firmScope.post('/api/firm/milestones/:id/greet', async (request, reply) => {
      const firmId = request.user.firm_id!;
      const { id } = request.params as { id: string };
      const currentYear = new Date().getFullYear();

      const { data, error } = await supabase
        .from('client_milestones')
        .update({
          last_greeted_year: currentYear,
          last_greeted_at: new Date().toISOString(),
          last_greeted_by: request.user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('firm_id', firmId)
        .select()
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return reply.send({ success: true, milestone: data });
    });

    // ==========================================
    // 27. PERSONAL STICKY TO-DO SCRATCHPAD
    // ==========================================

    // Get personal to-dos for logged-in user
    firmScope.get('/api/firm/todos', async (request, reply) => {
      const userId = request.user.id;

      const { data, error } = await supabase
        .from('firm_user_todos')
        .select('*')
        .eq('user_id', userId)
        .order('is_completed', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return reply.send({ todos: data || [] });
    });

    // Create personal to-do
    firmScope.post('/api/firm/todos', async (request, reply) => {
      const userId = request.user.id;
      const firmId = request.user.firm_id || null;

      const schema = z.object({
        title: z.string().min(1),
        priority: z.enum(['URGENT', 'HIGH', 'NORMAL', 'LOW']).default('NORMAL'),
        dueDate: z.string().optional(),
      });

      const parsed = schema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
      }

      const { data, error } = await supabase
        .from('firm_user_todos')
        .insert({
          user_id: userId,
          firm_id: firmId,
          title: parsed.data.title,
          priority: parsed.data.priority,
          due_date: parsed.data.dueDate || null,
        })
        .select()
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return reply.send({ success: true, todo: data });
    });

    // Toggle completion status
    firmScope.patch('/api/firm/todos/:id/toggle', async (request, reply) => {
      const userId = request.user.id;
      const { id } = request.params as { id: string };

      const { data: existing, error: fetchErr } = await supabase
        .from('firm_user_todos')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (fetchErr || !existing) {
        return reply.status(404).send({ error: 'To-do item not found' });
      }

      const nextState = !existing.is_completed;
      const { data, error } = await supabase
        .from('firm_user_todos')
        .update({
          is_completed: nextState,
          completed_at: nextState ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return reply.send({ success: true, todo: data });
    });

    // Delete personal to-do
    firmScope.delete('/api/firm/todos/:id', async (request, reply) => {
      const userId = request.user.id;
      const { id } = request.params as { id: string };

      const { error } = await supabase
        .from('firm_user_todos')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return reply.send({ success: true });
    });

    // ==========================================
    // 28. PRACTICE CHAT GROUPS & TEAM DIRECT MESSAGING
    // ==========================================

    // Get chat groups for firm
    firmScope.get('/api/firm/groups', async (request, reply) => {
      const firmId = request.user.firm_id!;
      const userId = request.user.id;

      const { data: groups, error } = await supabase
        .from('firm_chat_groups')
        .select(`
          *,
          members:firm_chat_group_members(user_id, role, joined_at)
        `)
        .eq('firm_id', firmId)
        .order('created_at', { ascending: false });

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      // Filter groups: Broadcast/Internal groups are visible to all firm users; Custom groups require membership
      const accessibleGroups = (groups || []).filter((g: any) => {
        if (g.group_type === 'BROADCAST' || g.group_type === 'INTERNAL_TEAM') return true;
        return (g.members || []).some((m: any) => m.user_id === userId);
      });

      return reply.send({ groups: accessibleGroups });
    });

    // Create a new practice group
    firmScope.post('/api/firm/groups', async (request, reply) => {
      const firmId = request.user.firm_id!;
      const userId = request.user.id;

      const schema = z.object({
        name: z.string().min(2).max(100),
        description: z.string().optional(),
        groupType: z.enum(['INTERNAL_TEAM', 'CLIENT_GROUP', 'BROADCAST']).default('INTERNAL_TEAM'),
        memberUserIds: z.array(z.string().uuid()).optional(),
      });

      const parsed = schema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
      }

      const { data: group, error } = await supabase
        .from('firm_chat_groups')
        .insert({
          firm_id: firmId,
          name: parsed.data.name,
          description: parsed.data.description || null,
          group_type: parsed.data.groupType,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      // Add creator as ADMIN
      const membersToInsert = [{ group_id: group.id, user_id: userId, role: 'ADMIN' }];

      // Add selected members
      const extraMemberIds = (parsed.data.memberUserIds || []).filter((id) => id !== userId);
      for (const mId of extraMemberIds) {
        membersToInsert.push({ group_id: group.id, user_id: mId, role: 'MEMBER' });
      }

      await supabase.from('firm_chat_group_members').insert(membersToInsert);

      return reply.send({ success: true, group });
    });

    // Get group messages
    firmScope.get('/api/firm/groups/:id/messages', async (request, reply) => {
      const { id } = request.params as { id: string };

      const { data, error } = await supabase
        .from('client_messages')
        .select(`
          *,
          sender:sender_user_id(id, name, email, role, firm_role)
        `)
        .eq('group_id', id)
        .order('created_at', { ascending: true });

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return reply.send({ messages: data || [] });
    });

    // Post message to group
    firmScope.post('/api/firm/groups/:id/messages', async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user.id;
      const userRole = request.user.role;

      const schema = z.object({
        message: z.string().min(1),
        attachmentUrl: z.string().url().optional(),
        attachmentName: z.string().optional(),
        attachmentType: z.string().optional(),
      });

      const parsed = schema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
      }

      const { data, error } = await supabase
        .from('client_messages')
        .insert({
          group_id: id,
          sender_user_id: userId,
          sender_role: userRole,
          message: parsed.data.message,
          attachment_url: parsed.data.attachmentUrl || null,
          attachment_name: parsed.data.attachmentName || null,
          attachment_type: parsed.data.attachmentType || null,
          thread_type: 'INTERNAL_TEAM_NOTE',
        })
        .select(`
          *,
          sender:sender_user_id(id, name, email, role, firm_role)
        `)
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return reply.send({ success: true, message: data });
    });

    // 1-to-1 Direct Team Messages between two firm members
    firmScope.get('/api/firm/team/direct-messages/:targetUserId', async (request, reply) => {
      const userId = request.user.id;
      const { targetUserId } = request.params as { targetUserId: string };

      const { data, error } = await supabase
        .from('client_messages')
        .select(`
          *,
          sender:sender_user_id(id, name, email, role, firm_role)
        `)
        .or(`and(sender_user_id.eq.${userId},recipient_user_id.eq.${targetUserId}),and(sender_user_id.eq.${targetUserId},recipient_user_id.eq.${userId})`)
        .order('created_at', { ascending: true });

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return reply.send({ messages: data || [] });
    });

    // Send 1-to-1 Direct Team Message
    firmScope.post('/api/firm/team/direct-messages/:targetUserId', async (request, reply) => {
      const userId = request.user.id;
      const userRole = request.user.role;
      const { targetUserId } = request.params as { targetUserId: string };

      const schema = z.object({
        message: z.string().min(1),
        attachmentUrl: z.string().url().optional(),
        attachmentName: z.string().optional(),
        attachmentType: z.string().optional(),
      });

      const parsed = schema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Validation failed', details: parsed.error.issues });
      }

      const { data, error } = await supabase
        .from('client_messages')
        .insert({
          recipient_user_id: targetUserId,
          sender_user_id: userId,
          sender_role: userRole,
          message: parsed.data.message,
          attachment_url: parsed.data.attachmentUrl || null,
          attachment_name: parsed.data.attachmentName || null,
          attachment_type: parsed.data.attachmentType || null,
          thread_type: 'INTERNAL_TEAM_NOTE',
        })
        .select(`
          *,
          sender:sender_user_id(id, name, email, role, firm_role)
        `)
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return reply.send({ success: true, message: data });
    });

    // ==========================================
    // FIRM CLIENT WELCOME CODES (CA FIRM PRACTICE)
    // ==========================================

    // 29. List Client Welcome Codes for this Firm
    firmScope.get('/api/firm/welcome-codes', { preHandler: [requireFirmAdmin()] }, async (request, reply) => {
      const firmId = request.user.firm_id!;
      const summary = await getWelcomeCodesSummary({ firmId });
      return reply.send(summary);
    });

    // 30. Generate Client Welcome Codes for this Firm
    firmScope.post('/api/firm/welcome-codes/generate', { preHandler: [requireFirmAdmin()] }, async (request, reply) => {
      const firmId = request.user.firm_id!;
      const user = request.user;

      const body = z
        .object({
          count: z.number().int().min(1).max(50).optional().default(1),
          length: z.number().int().min(5).max(10).optional().default(6),
          charset: z
            .enum(['UPPERCASE_ONLY', 'ALPHANUMERIC', 'NUMBERS_ONLY', 'SPECIAL_CHARS', 'CUSTOM'])
            .optional()
            .default('UPPERCASE_ONLY'),
          customCode: z.string().trim().min(4).max(16).optional(),
          note: z.string().trim().max(250).optional(),
          expiresInDays: z.number().int().min(1).max(365).nullable().optional(),
        })
        .strict()
        .parse(request.body);

      // Fetch firm name for invite branding
      const { data: firm } = await supabase
        .from('firms')
        .select('name')
        .eq('id', firmId)
        .maybeSingle();

      try {
        const result = await createWelcomeCodes(user.id, {
          count: body.count,
          length: body.length,
          charset: body.charset,
          customCode: body.customCode,
          targetRole: 'CLIENT',
          firmId,
          firmName: firm?.name,
          note: body.note,
          expiresInDays: body.expiresInDays,
        });

        return reply.status(201).send({
          success: true,
          count: result.count,
          codes: result.created,
          message: `Successfully generated ${result.count} client invite code(s)`,
        });
      } catch (err: any) {
        return reply.status(400).send({
          error: err.message || 'Failed to generate client invite codes',
        });
      }
    });

    // 31. Revoke / Delete Client Welcome Code for this Firm
    firmScope.delete('/api/firm/welcome-codes/:id', { preHandler: [requireFirmAdmin()] }, async (request, reply) => {
      const firmId = request.user.firm_id!;
      const { id } = request.params as { id: string };

      // Ensure code belongs to caller's firm
      const { data: code } = await supabase
        .from('welcome_codes')
        .select('id, firm_id')
        .eq('id', id)
        .maybeSingle();

      if (!code || code.firm_id !== firmId) {
        return reply.status(404).send({ error: 'Invite code not found in your firm' });
      }

      await revokeWelcomeCode(id);
      return reply.send({ success: true, message: 'Client invite code revoked successfully' });
    });

    // ==========================================
    // DAY-ONE AI CLIENT ONBOARDING SUITE
    // ==========================================

    // 32. AI Parse Raw Chat/Notes into Structured Client Intake
    firmScope.post('/api/firm/ai-intake/parse', { preHandler: [requireFirmAdmin()] }, async (request, reply) => {
      const bodySchema = z.object({
        rawText: z.string().min(5, 'Please provide client notes or message text').max(15000),
      });

      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      const intakeData = parseRawClientNotes(parsed.data.rawText);
      return reply.send({
        success: true,
        data: intakeData,
      });
    });

    // 33. Execute 1-Click Day-One Onboarding (Create Client + Docs + Code + Drive + Tasks)
    firmScope.post('/api/firm/ai-intake/execute', { preHandler: [requireFirmAdmin()] }, async (request, reply) => {
      const firmId = request.user.firm_id!;
      const user = request.user;

      const bodySchema = z.object({
        tradeName: z.string().min(2),
        legalName: z.string().optional(),
        contactPerson: z.string().min(2),
        email: z.string().email(),
        phone: z.string().min(10),
        gstin: z.string().optional(),
        pan: z.string().optional(),
        state: z.string().optional(),
        stateCode: z.string().optional(),
        address: z.string().optional(),
        constitutionType: z.string().optional().default('PROPRIETORSHIP'),
        services: z.array(z.string()).default(['GSTR_1', 'GSTR_3B', 'RECONCILIATION_2B']),
        agreedMonthlyFee: z.number().min(0).default(3000),
        assignedStaffId: z.string().uuid().nullable().optional(),
        signingPartnerId: z.string().uuid().nullable().optional(),
        previousAuditor: z.string().optional(),
        customWelcomeCode: z.string().optional(),
        notes: z.string().optional(),
      });

      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      const d = parsed.data;

      // 1. Fetch practice details for document generation
      const { data: firm } = await supabase
        .from('firms')
        .select('*')
        .eq('id', firmId)
        .maybeSingle();

      const firmName = firm?.name || 'Chartered Accountants Practice';

      // 2. Check if client user already exists or provision a new one
      let clientUser: any = null;
      const cleanEmail = d.email.toLowerCase().trim();
      const cleanPhone = d.phone.replace(/[^0-9]/g, '').slice(-10);

      const { data: existingUser } = await supabase
        .from('users')
        .select('id, email, phone, name, business_name, firm_id')
        .or(`email.eq.${cleanEmail},phone.eq.${cleanPhone}`)
        .maybeSingle();

      if (existingUser) {
        // If already in this firm, update details
        await supabase
          .from('users')
          .update({
            firm_id: firmId,
            name: d.contactPerson,
            business_name: d.tradeName,
            gstin: d.gstin || null,
            state: d.state || null,
            state_code: d.stateCode || null,
            address: d.address || null,
            assigned_staff_id: d.assignedStaffId || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingUser.id);
        clientUser = { ...existingUser, business_name: d.tradeName, name: d.contactPerson };
      } else {
        // Generate random secure password for initial account creation
        const randomPin = Math.floor(100000 + Math.random() * 900000);
        const tempPassword = `Client@${randomPin}`;
        const passwordHash = await hashPassword(tempPassword);

        const { data: newUser, error: createErr } = await supabase
          .from('users')
          .insert({
            firm_id: firmId,
            name: d.contactPerson,
            email: cleanEmail,
            phone: cleanPhone,
            role: 'CLIENT',
            business_name: d.tradeName,
            gstin: d.gstin || null,
            state: d.state || null,
            state_code: d.stateCode || null,
            address: d.address || null,
            password_hash: passwordHash,
            email_verified: true,
            must_reset_password: true,
            assigned_staff_id: d.assignedStaffId || null,
          })
          .select('id, name, email, phone, business_name, role, firm_id')
          .single();

        if (createErr || !newUser) {
          return reply.status(500).send({ error: createErr?.message || 'Failed to create client record' });
        }
        clientUser = newUser;
      }

      // 3. Generate Firm-Scoped Practice Welcome / Invite Code
      let welcomeCode = d.customWelcomeCode?.trim().toUpperCase();
      try {
        const codeResult = await createWelcomeCodes(user.id, {
          count: 1,
          targetRole: 'CLIENT',
          firmId,
          firmName,
          customCode: welcomeCode || undefined,
          note: `Day-One Intake: ${d.tradeName} (${d.contactPerson})`,
          expiresInDays: 30,
        });
        if (codeResult.created && codeResult.created.length > 0) {
          welcomeCode = codeResult.created[0].code;
        }
      } catch (err: any) {
        request.log.warn({ err }, 'Welcome code auto-generation warning in day-one intake');
        if (!welcomeCode) {
          welcomeCode = `GST-${Math.floor(1000 + Math.random() * 9000)}`;
        }
      }

      // 4. Provision Google Drive Folder structure if Drive service is available
      let driveFolderUrl: string | undefined = undefined;
      try {
        const drive = getDriveService();
        if (drive) {
          const folderInfo = await drive.createClientFolder(
            clientUser.id,
            d.tradeName || clientUser.name,
            user.id
          );
          if (folderInfo && (folderInfo as any).webViewLink) {
            driveFolderUrl = (folderInfo as any).webViewLink;
          }
        }
      } catch (err) {
        request.log.warn({ err }, 'Drive folder creation skipped/failed during day-one intake');
      }

      // 5. Seed Initial Statutory Compliance Tasks (GSTR-1, GSTR-2B, GSTR-3B)
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const gstr1DueDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 11);
      const gstr2bDueDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 14);
      const gstr3bDueDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 20);

      const assignedToId = d.assignedStaffId || user.id;

      const initialTasks = [
        {
          firm_id: firmId,
          client_id: clientUser.id,
          title: `GSTR-1 Monthly Outward Filing — ${d.tradeName}`,
          description: `Collect sales register and e-way bills for ${d.tradeName}. Verify B2B invoices and file Form GSTR-1 by 11th.`,
          category: 'GST',
          priority: 'HIGH',
          status: 'TODO',
          due_date: gstr1DueDate.toISOString(),
          assigned_to: assignedToId,
          created_by: user.id,
        },
        {
          firm_id: firmId,
          client_id: clientUser.id,
          title: `GSTR-2B Automated ITC Reconciliation — ${d.tradeName}`,
          description: `Download GSTR-2B for the period and reconcile against purchase register to protect eligible Input Tax Credit.`,
          category: 'GST',
          priority: 'NORMAL',
          status: 'TODO',
          due_date: gstr2bDueDate.toISOString(),
          assigned_to: assignedToId,
          created_by: user.id,
        },
        {
          firm_id: firmId,
          client_id: clientUser.id,
          title: `GSTR-3B Summary Return & Tax Offset — ${d.tradeName}`,
          description: `Compute net cash tax liability, verify ITC ledger balance, and file Form GSTR-3B by 20th.`,
          category: 'GST',
          priority: 'HIGH',
          status: 'TODO',
          due_date: gstr3bDueDate.toISOString(),
          assigned_to: assignedToId,
          created_by: user.id,
        },
      ];

      try {
        await supabase.from('firm_tasks').insert(initialTasks);
      } catch (err) {
        request.log.warn({ err }, 'Initial tasks creation error during day-one intake');
      }

      // 6. Resolve Signing Partner for Statutory Documents
      let signingPartner: any = null;
      if (d.signingPartnerId) {
        const { data: pData } = await supabase
          .from('users')
          .select('id, name, icai_membership_no, icai_membership_type, cop_number, partner_designation')
          .eq('id', d.signingPartnerId)
          .eq('firm_id', firmId)
          .maybeSingle();
        if (pData) signingPartner = pData;
      }

      const partnerName = signingPartner?.name || (user as any).name || firmName || 'Managing Partner';
      const membershipNumber = signingPartner?.icai_membership_no || (user as any).icai_membership_no || firm?.membership_number;
      const membershipType = signingPartner?.icai_membership_type || (user as any).icai_membership_type;
      const copNumber = signingPartner?.cop_number || (user as any).cop_number;
      const partnerDesignation = signingPartner?.partner_designation || (user as any).partner_designation;

      // Generate Complete Statutory Document Kit
      const docKit = generateCaOnboardingDocKit({
        firmName,
        firmAddress: firm?.address,
        firmEmail: firm?.email,
        firmPhone: firm?.phone,
        partnerName,
        membershipNumber,
        membershipType,
        copNumber,
        partnerDesignation,
        clientTradeName: d.tradeName,
        clientLegalName: d.legalName || d.tradeName,
        clientContactPerson: d.contactPerson,
        clientGstin: d.gstin,
        clientPan: d.pan,
        clientPhone: cleanPhone,
        clientEmail: cleanEmail,
        clientAddress: d.address,
        state: d.state,
        constitutionType: d.constitutionType,
        services: d.services,
        monthlyRetainerFee: d.agreedMonthlyFee,
        welcomeCode,
        clientPortalUrl: 'https://gstbro.com/login',
        driveFolderUrl,
        previousAuditorName: d.previousAuditor,
      });

      // 7. Format WhatsApp direct click link
      const whatsappText = encodeURIComponent(docKit.whatsappWelcomeDraft);
      const whatsappUrl = `https://wa.me/91${cleanPhone}?text=${whatsappText}`;

      return reply.status(201).send({
        success: true,
        message: `Client "${d.tradeName}" onboarded successfully via Day-One AI Kit!`,
        client: clientUser,
        welcomeCode,
        whatsappUrl,
        driveFolderUrl,
        documentKit: docKit,
      });
    });
  });
};
