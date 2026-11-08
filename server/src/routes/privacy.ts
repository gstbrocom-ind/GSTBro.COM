import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { uuidParamSchema, sanitizeText } from '../lib/security.js';
import { logAuthAudit } from '../services/auditLogger.js';

// Rate limits: privacy requests are infrequent — 5 per hour per user
const PRIVACY_REQUEST_RATE_LIMIT = {
  max: 5,
  timeWindow: '1 hour',
};

const PRIVACY_REQUEST_READ_RATE_LIMIT = {
  max: 30,
  timeWindow: '10 minutes',
};

export async function privacyRoutes(app: FastifyInstance) {
  // ----------------------------------------------------------------
  // GET /api/privacy/notice-version
  // Public: returns current privacy notice version and effective date
  // ----------------------------------------------------------------
  app.get('/api/privacy/notice-version', async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', [
        'privacy_notice_version',
        'privacy_notice_effective_date',
        'privacy_grievance_email',
        'privacy_officer_name',
        'dpdp_operational_date',
      ]);

    const settings = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
    return {
      version: settings.privacy_notice_version ?? '1.0.0',
      effectiveDate: settings.privacy_notice_effective_date ?? '2027-01-01',
      grievanceEmail: settings.privacy_grievance_email ?? 'privacy@gstbro.in',
      privacyOfficerName: settings.privacy_officer_name ?? '',
      dpdpOperationalDate: settings.dpdp_operational_date ?? '2027-05-13',
    };
  });

  // ----------------------------------------------------------------
  // POST /api/privacy/consent
  // Record a consent action (grant or withdrawal)
  // Called internally after signup or from privacy settings page
  // ----------------------------------------------------------------
  app.post(
    '/api/privacy/consent',
    { preHandler: authenticate, config: { rateLimit: PRIVACY_REQUEST_RATE_LIMIT } },
    async (request, reply) => {
      const body = z
        .object({
          purpose: z.enum([
            'service_delivery',
            'support_communications',
            'service_notifications',
            'marketing_email',
            'analytics',
          ]),
          action: z.enum(['GRANTED', 'WITHDRAWN']),
          noticeVersion: z.string().trim().min(1).max(20),
          dataCategories: z.array(z.string().trim().min(1).max(50)).min(1).max(20),
          channel: z.enum([
            'SIGNUP_FORM',
            'LEAD_FORM',
            'PRIVACY_SETTINGS',
            'ACCOUNT_CLOSURE',
            'ADMIN_RECORDED',
            'SYSTEM',
          ]),
        })
        .strict()
        .parse(request.body);

      // Prevent withdrawing service_delivery consent without account closure
      if (body.purpose === 'service_delivery' && body.action === 'WITHDRAWN') {
        return reply.status(400).send({
          error:
            'Service delivery consent cannot be withdrawn while your account is active. To stop this processing, please close your account via the erasure request form.',
        });
      }

      const { error } = await supabase.from('consent_records').insert({
        user_id: request.user.id,
        notice_version: body.noticeVersion,
        purpose: body.purpose,
        data_categories: body.dataCategories,
        action: body.action,
        channel: body.channel,
        ip_address: request.ip,
        user_agent: request.headers['user-agent'] ?? null,
      });

      if (error) {
        request.log.error({ error, userId: request.user.id }, 'Failed to record consent');
        return reply.status(500).send({ error: 'Failed to record consent. Please try again.' });
      }

      await logAuthAudit({
        eventType: 'LOGIN_SUCCESS', // reuse closest available type; we'll extend this later
        userId: request.user.id,
        identifier: request.user.email,
        ipAddress: request.ip,
        metadata: { action: 'CONSENT_RECORDED', purpose: body.purpose, consentAction: body.action },
      });

      return { success: true, message: `Consent ${body.action.toLowerCase()} for ${body.purpose}.` };
    }
  );

  // ----------------------------------------------------------------
  // GET /api/privacy/consent
  // Authenticated: get current user's consent history
  // ----------------------------------------------------------------
  app.get(
    '/api/privacy/consent',
    { preHandler: authenticate, config: { rateLimit: PRIVACY_REQUEST_READ_RATE_LIMIT } },
    async (request) => {
      const { data } = await supabase
        .from('consent_records')
        .select('id, purpose, action, notice_version, data_categories, channel, created_at')
        .eq('user_id', request.user.id)
        .order('created_at', { ascending: false });

      // Derive current consent state per purpose (latest action wins)
      const purposes = [
        'service_delivery',
        'support_communications',
        'service_notifications',
        'marketing_email',
        'analytics',
      ] as const;

      const currentState: Record<string, { granted: boolean; since: string | null; noticeVersion: string | null }> = {};
      for (const purpose of purposes) {
        const latest = (data ?? []).find((r) => r.purpose === purpose);
        currentState[purpose] = {
          granted: latest?.action === 'GRANTED',
          since: latest?.created_at ?? null,
          noticeVersion: latest?.notice_version ?? null,
        };
      }

      return {
        currentState,
        history: data ?? [],
      };
    }
  );

  // ----------------------------------------------------------------
  // POST /api/privacy/requests
  // Authenticated: submit a privacy rights request
  // ----------------------------------------------------------------
  app.post(
    '/api/privacy/requests',
    { preHandler: authenticate, config: { rateLimit: PRIVACY_REQUEST_RATE_LIMIT } },
    async (request, reply) => {
      const body = z
        .object({
          requestType: z.enum([
            'ACCESS',
            'CORRECTION',
            'ERASURE',
            'CONSENT_WITHDRAWAL',
            'GRIEVANCE',
            'NOMINATION',
          ]),
          description: z
            .string()
            .trim()
            .max(2000, 'Description cannot exceed 2000 characters')
            .optional(),
          // For NOMINATION requests
          nomineeName: z.string().trim().max(100).optional(),
          nomineeEmail: z.string().trim().email().max(255).optional(),
          nomineeRelationship: z.string().trim().max(100).optional(),
          // For ERASURE: explicit acknowledgment required
          erasureAcknowledged: z.boolean().optional(),
        })
        .strict()
        .refine(
          (d) =>
            d.requestType !== 'NOMINATION' ||
            (d.nomineeName && d.nomineeEmail && d.nomineeRelationship),
          { message: 'Nominee name, email, and relationship are required for nomination requests.' }
        )
        .refine(
          (d) => d.requestType !== 'ERASURE' || d.erasureAcknowledged === true,
          {
            message:
              'You must acknowledge the erasure request to proceed. Please confirm that you understand what will be deleted and what may be retained.',
          }
        )
        .parse(request.body);

      // Fetch user email for the record
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('id', request.user.id)
        .single();

      const safeDescription = body.description
        ? sanitizeText(body.description, 2000, true)
        : null;

      const { data: privacyRequest, error } = await supabase
        .from('privacy_requests')
        .insert({
          user_id: request.user.id,
          email: userData?.email ?? request.user.email ?? '',
          request_type: body.requestType,
          description: safeDescription,
          status: 'PENDING',
          nominee_name: body.nomineeName ?? null,
          nominee_email: body.nomineeEmail ?? null,
          nominee_relationship: body.nomineeRelationship ?? null,
        })
        .select('id, request_type, status, created_at')
        .single();

      if (error || !privacyRequest) {
        request.log.error({ error, userId: request.user.id }, 'Failed to create privacy request');
        return reply.status(500).send({ error: 'Failed to submit request. Please try again.' });
      }

      // Record the SUBMITTED event
      await supabase.from('privacy_request_events').insert({
        request_id: privacyRequest.id,
        actor_user_id: request.user.id,
        actor_label: 'USER',
        event_type: 'SUBMITTED',
        note: `${body.requestType} request submitted by user.`,
        metadata: { channel: 'USER_PORTAL', ip: request.ip },
      });

      await logAuthAudit({
        eventType: 'LOGIN_SUCCESS',
        userId: request.user.id,
        identifier: request.user.email,
        ipAddress: request.ip,
        metadata: {
          action: 'PRIVACY_REQUEST_SUBMITTED',
          requestType: body.requestType,
          requestId: privacyRequest.id,
        },
      });

      return {
        success: true,
        request: privacyRequest,
        message:
          'Your request has been received. GSTBro will respond within the timelines required by applicable law. You can track your request status below.',
      };
    }
  );

  // ----------------------------------------------------------------
  // GET /api/privacy/requests
  // Authenticated: list own privacy requests with event timeline
  // ----------------------------------------------------------------
  app.get(
    '/api/privacy/requests',
    { preHandler: authenticate, config: { rateLimit: PRIVACY_REQUEST_READ_RATE_LIMIT } },
    async (request) => {
      const { data: requests } = await supabase
        .from('privacy_requests')
        .select('id, request_type, status, description, resolution_note, resolved_at, created_at, updated_at')
        .eq('user_id', request.user.id)
        .order('created_at', { ascending: false });

      return { requests: requests ?? [] };
    }
  );

  // ----------------------------------------------------------------
  // GET /api/privacy/requests/:id
  // Authenticated: get a single request with full event timeline
  // ----------------------------------------------------------------
  app.get(
    '/api/privacy/requests/:id',
    { preHandler: authenticate, config: { rateLimit: PRIVACY_REQUEST_READ_RATE_LIMIT } },
    async (request, reply) => {
      const { id } = z.object({ id: uuidParamSchema }).parse(request.params);

      const { data: privacyRequest } = await supabase
        .from('privacy_requests')
        .select('*')
        .eq('id', id)
        .eq('user_id', request.user.id)
        .single();

      if (!privacyRequest) {
        return reply.status(404).send({ error: 'Request not found.' });
      }

      const { data: events } = await supabase
        .from('privacy_request_events')
        .select('id, actor_label, event_type, note, created_at')
        .eq('request_id', id)
        .order('created_at', { ascending: true });

      return {
        request: privacyRequest,
        events: events ?? [],
      };
    }
  );

  // ----------------------------------------------------------------
  // POST /api/privacy/consent/lead
  // Public: record consent from the lead/contact form (no auth)
  // ----------------------------------------------------------------
  app.post(
    '/api/privacy/consent/lead',
    { config: { rateLimit: PRIVACY_REQUEST_RATE_LIMIT } },
    async (request, reply) => {
      const body = z
        .object({
          email: z.string().trim().email().max(255),
          noticeVersion: z.string().trim().min(1).max(20),
          dataCategories: z.array(z.string().trim().min(1).max(50)).min(1).max(10),
          action: z.enum(['GRANTED']),
        })
        .strict()
        .parse(request.body);

      const { error } = await supabase.from('consent_records').insert({
        user_id: null,
        email: body.email.toLowerCase(),
        notice_version: body.noticeVersion,
        purpose: 'service_delivery',
        data_categories: body.dataCategories,
        action: body.action,
        channel: 'LEAD_FORM',
        ip_address: request.ip,
        user_agent: request.headers['user-agent'] ?? null,
      });

      if (error) {
        request.log.error({ error }, 'Failed to record lead consent');
        return reply.status(500).send({ error: 'Failed to record consent.' });
      }

      return { success: true };
    }
  );
}
