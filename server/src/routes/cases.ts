import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { uuidParamSchema, safeJsonRecordSchema, sanitizeText } from '../lib/security.js';
import { HEAVY_DATA_RATE_LIMIT } from '../lib/rateLimiter.js';
import { canAccessCase, SAFE_USER_SELECT } from '../lib/authorization.js';

export async function casesRoutes(app: FastifyInstance) {
  app.get('/api/cases', { preHandler: authenticate }, async (request) => {
    let query = supabase
      .from('cases')
      .select('*, users!cases_user_id_fkey(name, email, business_name)')
      .order('created_at', { ascending: false });

    if (request.user.role === 'CLIENT') {
      query = query.eq('user_id', request.user.id);
    } else if (request.user.role === 'TEAM') {
      query = query.eq('assigned_team_id', request.user.id);
    }

    const { data } = await query;
    return { cases: data ?? [] };
  });

  app.post(
    '/api/cases',
    { preHandler: authenticate, config: { rateLimit: HEAVY_DATA_RATE_LIMIT } },
    async (request, reply) => {
    const body = z
      .object({
        serviceType: z.enum(['REGISTRATION', 'RETURNS', 'CANCELLATION', 'GENERAL']),
        title: z.string().trim().max(200, 'Title cannot exceed 200 characters').optional(),
        metadata: safeJsonRecordSchema.optional(),
      })
      .strict()
      .parse(request.body);

    const safeTitle = body.title ? sanitizeText(body.title, 200) : null;

    const { data, error } = await supabase
      .from('cases')
      .insert({
        user_id: request.user.id,
        service_type: body.serviceType,
        title: safeTitle,
        metadata: body.metadata ?? {},
        status: 'DRAFT',
      })
      .select()
      .single();

    if (error) return reply.status(500).send({ error: 'Failed to create case' });

    await supabase.from('case_events').insert({
      case_id: data.id,
      status: 'DRAFT',
      note: 'Case created',
      created_by: request.user.id,
    });

    return { case: data };
  });

  app.get('/api/cases/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = z.object({ id: uuidParamSchema }).parse(request.params);
    const { data } = await supabase
      .from('cases')
      .select('*, users!cases_user_id_fkey(name, email, business_name)')
      .eq('id', id)
      .single();

    if (!data) return reply.status(404).send({ error: 'Case not found' });

    const authorized = await canAccessCase(request.user, data);
    if (!authorized) return reply.status(403).send({ error: 'Forbidden' });

    const { data: events } = await supabase
      .from('case_events')
      .select('*, users(name)')
      .eq('case_id', id)
      .order('created_at', { ascending: true });

    return { case: data, events: events ?? [] };
  });

  app.patch('/api/cases/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = z.object({ id: uuidParamSchema }).parse(request.params);
    const body = z
      .object({
        status: z
          .enum(['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'ACTION_REQUIRED', 'COMPLETED', 'CANCELLED'])
          .optional(),
        metadata: safeJsonRecordSchema.optional(),
        note: z.string().trim().max(1000, 'Note cannot exceed 1000 characters').optional(),
      })
      .strict()
      .parse(request.body);

    const { data: existing } = await supabase.from('cases').select('*').eq('id', id).single();
    if (!existing) return reply.status(404).send({ error: 'Case not found' });

    const authorized = await canAccessCase(request.user, existing);
    if (!authorized) return reply.status(403).send({ error: 'Forbidden' });

    // Enforce authorization on state transitions: CLIENT cannot mark cases as IN_REVIEW, ACTION_REQUIRED, or COMPLETED
    if (request.user.role === 'CLIENT' && body.status && ['IN_REVIEW', 'ACTION_REQUIRED', 'COMPLETED'].includes(body.status)) {
      return reply.status(403).send({
        error: 'Forbidden: Clients cannot directly mark cases as IN_REVIEW, ACTION_REQUIRED, or COMPLETED. This requires CA/Team review.',
      });
    }

    const updates: Record<string, unknown> = {};
    if (body.status) updates.status = body.status;
    if (body.metadata) updates.metadata = { ...existing.metadata, ...body.metadata };

    const { data } = await supabase.from('cases').update(updates).eq('id', id).select().single();

    if (body.status || body.note) {
      const safeNote = body.note ? sanitizeText(body.note, 1000) : `Status updated to ${body.status}`;
      await supabase.from('case_events').insert({
        case_id: id,
        status: body.status,
        note: safeNote,
        created_by: request.user.id,
      });
    }

    return { case: data };
  });

  app.get(
    '/api/admin/clients',
    { preHandler: [authenticate, requireRole('ADMIN', 'TEAM')] },
    async (request) => {
      let query = supabase
        .from('users')
        .select(SAFE_USER_SELECT)
        .eq('role', 'CLIENT')
        .order('created_at', { ascending: false });

      if (request.user.role === 'TEAM') {
        const { data: assignments } = await supabase
          .from('team_assignments')
          .select('client_user_id')
          .eq('team_user_id', request.user.id)
          .eq('active', true);
        const ids = (assignments ?? []).map((a) => a.client_user_id);
        query = query.in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
      }

      const { data } = await query;
      return { clients: data ?? [] };
    }
  );

  app.get(
    '/api/admin/team',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async () => {
      const { data } = await supabase
        .from('users')
        .select(SAFE_USER_SELECT)
        .in('role', ['TEAM', 'ADMIN'])
        .order('created_at', { ascending: false });
      return { team: data ?? [] };
    }
  );
}
