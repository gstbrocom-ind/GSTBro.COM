import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { authenticate, requireFirm, requireFirmAdmin } from '../middleware/auth.js';
import { hashPassword } from '../services/passwordService.js';
import { canAccessClient } from '../lib/authorization.js';

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

    // ==========================================
    // TEAM & ARTICLE WORKLOAD MANAGEMENT
    // ==========================================

    // 15. Get Team Members with assigned client count
    firmScope.get('/api/firm/team', async (request, reply) => {
      const firmId = request.user.firm_id!;
      const isStaff = request.user.role === 'FIRM_STAFF' || request.user.firm_role === 'FIRM_STAFF';

      let teamQuery = supabase
        .from('users')
        .select('id, name, email, phone, role, firm_role, team_group, created_at')
        .eq('firm_id', firmId)
        .in('role', ['TEAM', 'FIRM_STAFF', 'FIRM_OWNER', 'ADMIN']);

      // If Article Clerk, they only see themselves and Practice Partners/Managers (for escalation/contact)
      if (isStaff) {
        teamQuery = teamQuery.or(`id.eq.${request.user.id},firm_role.eq.FIRM_OWNER,firm_role.eq.FIRM_MANAGER,role.eq.FIRM_OWNER`);
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

    // 16. Invite / Add Team Member (Article / Manager)
    firmScope.post('/api/firm/team/invite', { preHandler: [requireFirmAdmin()] }, async (request, reply) => {
      const firmId = request.user.firm_id!;
      const bodySchema = z.object({
        name: z.string().min(2),
        email: z.string().email(),
        phone: z.string().optional(),
        firm_role: z.enum(['FIRM_MANAGER', 'FIRM_STAFF']).default('FIRM_STAFF'),
        team_group: z.string().default('General'),
        password: z.string().min(8).default('Staff@123456'),
      });

      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      const passwordHash = await hashPassword(parsed.data.password);

      const { data, error } = await supabase
        .from('users')
        .insert({
          firm_id: firmId,
          name: parsed.data.name,
          email: parsed.data.email.toLowerCase().trim(),
          phone: parsed.data.phone || null,
          role: 'FIRM_STAFF',
          firm_role: parsed.data.firm_role,
          team_group: parsed.data.team_group,
          password_hash: passwordHash,
          email_verified: true,
          must_reset_password: true,
        })
        .select('id, name, email, phone, role, firm_role, team_group, created_at')
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
  });
};
