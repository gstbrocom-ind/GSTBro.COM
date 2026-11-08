import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase } from '../../lib/supabase.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { uuidParamSchema, sanitizeText } from '../../lib/security.js';

const ADMIN_RATE_LIMIT = { max: 100, timeWindow: '1 minute' };

export async function privacyAdminRoutes(app: FastifyInstance) {
  // All routes require ADMIN role
  const adminGuard = [authenticate, requireRole('ADMIN')];

  // ----------------------------------------------------------------
  // GET /api/admin/privacy/requests
  // List all privacy requests with filters
  // ----------------------------------------------------------------
  app.get(
    '/api/admin/privacy/requests',
    { preHandler: adminGuard, config: { rateLimit: ADMIN_RATE_LIMIT } },
    async (request) => {
      const query = z
        .object({
          status: z.string().optional(),
          requestType: z.string().optional(),
          limit: z.coerce.number().min(1).max(100).default(50),
          offset: z.coerce.number().min(0).default(0),
        })
        .parse(request.query);

      let dbQuery = supabase
        .from('privacy_requests')
        .select('*, users(name, email)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(query.offset, query.offset + query.limit - 1);

      if (query.status) dbQuery = dbQuery.eq('status', query.status);
      if (query.requestType) dbQuery = dbQuery.eq('request_type', query.requestType);

      const { data, count } = await dbQuery;
      return { requests: data ?? [], total: count ?? 0 };
    }
  );

  // ----------------------------------------------------------------
  // PATCH /api/admin/privacy/requests/:id
  // Update status, assign, add resolution note
  // ----------------------------------------------------------------
  app.patch(
    '/api/admin/privacy/requests/:id',
    { preHandler: adminGuard, config: { rateLimit: ADMIN_RATE_LIMIT } },
    async (request, reply) => {
      const { id } = z.object({ id: uuidParamSchema }).parse(request.params);
      const body = z
        .object({
          status: z
            .enum(['PENDING', 'IDENTITY_VERIFIED', 'IN_REVIEW', 'COMPLETED', 'REJECTED', 'PARTIALLY_COMPLETED'])
            .optional(),
          assignedTo: z.string().uuid().optional(),
          resolutionNote: z.string().trim().max(5000).optional(),
          eventType: z.enum([
            'IDENTITY_CHECKED',
            'ASSIGNED',
            'NOTE_ADDED',
            'STATUS_CHANGED',
            'DATA_EXPORTED',
            'DELETION_TRIGGERED',
            'PROCESSOR_NOTIFIED',
            'COMPLETED',
            'REJECTED',
          ]),
          eventNote: z.string().trim().max(2000),
        })
        .strict()
        .parse(request.body);

      // Fetch existing request to verify it exists
      const { data: existing } = await supabase
        .from('privacy_requests')
        .select('id, status')
        .eq('id', id)
        .single();

      if (!existing) return reply.status(404).send({ error: 'Privacy request not found.' });

      // Build update payload
      const updatePayload: Record<string, unknown> = {};
      if (body.status) updatePayload.status = body.status;
      if (body.assignedTo) updatePayload.assigned_to = body.assignedTo;
      if (body.resolutionNote) updatePayload.resolution_note = sanitizeText(body.resolutionNote, 5000, true);
      if (body.status === 'COMPLETED' || body.status === 'REJECTED') {
        updatePayload.resolved_at = new Date().toISOString();
        updatePayload.resolved_by = request.user.id;
      }
      if (body.status === 'IDENTITY_VERIFIED') {
        updatePayload.identity_verified_at = new Date().toISOString();
        updatePayload.identity_verified_by = request.user.id;
      }

      if (Object.keys(updatePayload).length > 0) {
        await supabase.from('privacy_requests').update(updatePayload).eq('id', id);
      }

      // Record the event
      await supabase.from('privacy_request_events').insert({
        request_id: id,
        actor_user_id: request.user.id,
        actor_label: 'ADMIN',
        event_type: body.eventType,
        note: sanitizeText(body.eventNote, 2000, true),
        metadata: { adminId: request.user.id, previousStatus: existing.status, newStatus: body.status },
      });

      return { success: true };
    }
  );

  // ----------------------------------------------------------------
  // GET /api/admin/privacy/consent-search
  // Search consent records by user email
  // ----------------------------------------------------------------
  app.get(
    '/api/admin/privacy/consent-search',
    { preHandler: adminGuard, config: { rateLimit: ADMIN_RATE_LIMIT } },
    async (request) => {
      const { email } = z
        .object({ email: z.string().trim().email().max(255) })
        .parse(request.query);

      const { data: userRecord } = await supabase
        .from('users')
        .select('id, email, name')
        .ilike('email', email.toLowerCase())
        .maybeSingle();

      let consentQuery = supabase
        .from('consent_records')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (userRecord) {
        consentQuery = consentQuery.eq('user_id', userRecord.id);
      } else {
        consentQuery = consentQuery.ilike('email', email.toLowerCase());
      }

      const { data: consents } = await consentQuery;
      return { user: userRecord, consents: consents ?? [] };
    }
  );

  // ----------------------------------------------------------------
  // GET /api/admin/privacy/incidents
  // List breach incidents
  // ----------------------------------------------------------------
  app.get(
    '/api/admin/privacy/incidents',
    { preHandler: adminGuard, config: { rateLimit: ADMIN_RATE_LIMIT } },
    async () => {
      const { data } = await supabase
        .from('breach_incidents')
        .select('*')
        .order('created_at', { ascending: false });
      return { incidents: data ?? [] };
    }
  );

  // ----------------------------------------------------------------
  // POST /api/admin/privacy/incidents
  // Create a new breach incident
  // ----------------------------------------------------------------
  app.post(
    '/api/admin/privacy/incidents',
    { preHandler: adminGuard, config: { rateLimit: ADMIN_RATE_LIMIT } },
    async (request, reply) => {
      const body = z
        .object({
          title: z.string().trim().min(5).max(200),
          discoveredAt: z.string().datetime(),
          description: z.string().trim().min(10).max(5000),
          affectedSystems: z.array(z.string().trim().max(100)).max(20).default([]),
          affectedDataCategories: z.array(z.string().trim().max(100)).max(20).default([]),
          estimatedAffectedUsers: z.number().int().min(0).optional(),
          severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
        })
        .strict()
        .parse(request.body);

      // Get reporter details
      const { data: reporter } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', request.user.id)
        .single();

      const { data: incident, error } = await supabase
        .from('breach_incidents')
        .insert({
          title: sanitizeText(body.title, 200),
          discovered_at: body.discoveredAt,
          reported_by: request.user.id,
          reported_by_name: reporter?.name ?? 'Unknown',
          description: sanitizeText(body.description, 5000, true),
          affected_systems: body.affectedSystems,
          affected_data_categories: body.affectedDataCategories,
          estimated_affected_users: body.estimatedAffectedUsers ?? null,
          severity: body.severity,
          status: 'OPEN',
          assigned_to: request.user.id,
        })
        .select('id, title, status, severity, created_at')
        .single();

      if (error || !incident) {
        request.log.error({ error }, 'Failed to create breach incident');
        return reply.status(500).send({ error: 'Failed to create incident.' });
      }

      // Record discovery event
      await supabase.from('breach_incident_events').insert({
        incident_id: incident.id,
        actor_user_id: request.user.id,
        actor_label: reporter?.name ?? 'Admin',
        event_type: 'DISCOVERED',
        note: `Incident recorded by ${reporter?.name ?? 'Admin'} (${reporter?.email ?? ''}).`,
        metadata: { severity: body.severity, affectedSystems: body.affectedSystems },
      });

      return { success: true, incident };
    }
  );

  // ----------------------------------------------------------------
  // PATCH /api/admin/privacy/incidents/:id
  // Update an incident
  // ----------------------------------------------------------------
  app.patch(
    '/api/admin/privacy/incidents/:id',
    { preHandler: adminGuard, config: { rateLimit: ADMIN_RATE_LIMIT } },
    async (request, reply) => {
      const { id } = z.object({ id: uuidParamSchema }).parse(request.params);
      const body = z
        .object({
          status: z.enum(['OPEN', 'CONTAINED', 'REMEDIATED', 'CLOSED']).optional(),
          severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
          containmentSteps: z.string().trim().max(5000).optional(),
          remediationSteps: z.string().trim().max(5000).optional(),
          evidencePreserved: z.boolean().optional(),
          dpbNotificationRequired: z.boolean().optional(),
          dpbNotificationSentAt: z.string().datetime().optional(),
          dpbNotificationReference: z.string().trim().max(200).optional(),
          dpbNotificationContent: z.string().trim().max(10000).optional(),
          userNotificationRequired: z.boolean().optional(),
          userNotificationSentAt: z.string().datetime().optional(),
          userNotificationMethod: z.string().trim().max(50).optional(),
          userNotificationContent: z.string().trim().max(10000).optional(),
          userNotificationRecipientCount: z.number().int().min(0).optional(),
          eventType: z.enum([
            'ASSESSED', 'ESCALATED', 'CONTAINED', 'EVIDENCE_PRESERVED',
            'LEGAL_REVIEWED', 'DPB_NOTIFIED', 'USERS_NOTIFIED', 'REMEDIATED', 'CLOSED', 'NOTE_ADDED',
          ]),
          eventNote: z.string().trim().max(2000),
        })
        .strict()
        .parse(request.body);

      const { data: existing } = await supabase
        .from('breach_incidents')
        .select('id')
        .eq('id', id)
        .single();

      if (!existing) return reply.status(404).send({ error: 'Incident not found.' });

      const updatePayload: Record<string, unknown> = {};
      if (body.status) updatePayload.status = body.status;
      if (body.severity) updatePayload.severity = body.severity;
      if (body.containmentSteps) updatePayload.containment_steps = sanitizeText(body.containmentSteps, 5000, true);
      if (body.remediationSteps) updatePayload.remediation_steps = sanitizeText(body.remediationSteps, 5000, true);
      if (body.evidencePreserved !== undefined) updatePayload.evidence_preserved = body.evidencePreserved;
      if (body.dpbNotificationRequired !== undefined) updatePayload.dpb_notification_required = body.dpbNotificationRequired;
      if (body.dpbNotificationSentAt) updatePayload.dpb_notification_sent_at = body.dpbNotificationSentAt;
      if (body.dpbNotificationReference) updatePayload.dpb_notification_reference = body.dpbNotificationReference;
      if (body.dpbNotificationContent) updatePayload.dpb_notification_content = body.dpbNotificationContent;
      if (body.userNotificationRequired !== undefined) updatePayload.user_notification_required = body.userNotificationRequired;
      if (body.userNotificationSentAt) updatePayload.user_notification_sent_at = body.userNotificationSentAt;
      if (body.userNotificationMethod) updatePayload.user_notification_method = body.userNotificationMethod;
      if (body.userNotificationContent) updatePayload.user_notification_content = body.userNotificationContent;
      if (body.userNotificationRecipientCount !== undefined)
        updatePayload.user_notification_recipient_count = body.userNotificationRecipientCount;

      if (Object.keys(updatePayload).length > 0) {
        await supabase.from('breach_incidents').update(updatePayload).eq('id', id);
      }

      // Get actor info
      const { data: actor } = await supabase
        .from('users')
        .select('name')
        .eq('id', request.user.id)
        .single();

      await supabase.from('breach_incident_events').insert({
        incident_id: id,
        actor_user_id: request.user.id,
        actor_label: actor?.name ?? 'Admin',
        event_type: body.eventType,
        note: sanitizeText(body.eventNote, 2000, true),
        metadata: { adminId: request.user.id },
      });

      return { success: true };
    }
  );

  // ----------------------------------------------------------------
  // GET /api/admin/privacy/retention-policies
  // List the retention policy register
  // ----------------------------------------------------------------
  app.get(
    '/api/admin/privacy/retention-policies',
    { preHandler: adminGuard, config: { rateLimit: ADMIN_RATE_LIMIT } },
    async () => {
      const { data } = await supabase
        .from('retention_policies')
        .select('*')
        .order('table_name', { ascending: true });
      return { policies: data ?? [] };
    }
  );

  // ----------------------------------------------------------------
  // GET /api/admin/privacy/erasure-pending
  // List users with scheduled deletions past due
  // ----------------------------------------------------------------
  app.get(
    '/api/admin/privacy/erasure-pending',
    { preHandler: adminGuard, config: { rateLimit: ADMIN_RATE_LIMIT } },
    async () => {
      const { data } = await supabase
        .from('users')
        .select('id, email, name, deletion_requested_at, deletion_scheduled_at, deletion_hold_reason, is_anonymized')
        .not('deletion_scheduled_at', 'is', null)
        .order('deletion_scheduled_at', { ascending: true });
      return { pending: data ?? [] };
    }
  );

  // ----------------------------------------------------------------
  // POST /api/admin/privacy/retention-purge
  // Trigger automated retention purge for authorized tables
  // ----------------------------------------------------------------
  app.post(
    '/api/admin/privacy/retention-purge',
    { preHandler: adminGuard, config: { rateLimit: ADMIN_RATE_LIMIT } },
    async () => {
      const { runRetentionPurge } = await import('../../services/retentionCleanupService.js');
      const summary = await runRetentionPurge();
      return { success: true, ...summary };
    }
  );
}
