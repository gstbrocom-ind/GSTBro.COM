import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { logAuthAudit } from '../services/auditLogger.js';

const ERASURE_RATE_LIMIT = { max: 3, timeWindow: '1 hour' };

export async function erasureRoutes(app: FastifyInstance) {
  // ----------------------------------------------------------------
  // POST /api/privacy/erasure/initiate
  // Authenticated user initiates account erasure / deletion
  // ----------------------------------------------------------------
  app.post(
    '/api/privacy/erasure/initiate',
    { preHandler: authenticate, config: { rateLimit: ERASURE_RATE_LIMIT } },
    async (request, reply) => {
      const body = z
        .object({
          acknowledged: z.literal(true, {
            errorMap: () => ({ message: 'You must acknowledge that you understand what will be deleted.' }),
          }),
          reason: z.string().trim().max(500).optional(),
        })
        .strict()
        .parse(request.body);

      const userId = request.user.id;

      // Check for retention holds
      const holds: string[] = [];

      // Active cases
      const { data: activeCases } = await supabase
        .from('cases')
        .select('id, status')
        .eq('user_id', userId)
        .in('status', ['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'ACTION_REQUIRED'])
        .limit(1);
      if (activeCases && activeCases.length > 0) {
        holds.push('You have active GST service cases in progress.');
      }

      // Outstanding fee invoices
      const { data: outstandingFees } = await supabase
        .from('fee_invoices')
        .select('id')
        .eq('client_user_id', userId)
        .in('status', ['PENDING', 'OVERDUE', 'PARTIALLY_PAID'])
        .limit(1);
      if (outstandingFees && outstandingFees.length > 0) {
        holds.push('You have outstanding fee invoices. Please resolve them before closing your account.');
      }

      // GST data (always retained for legal reasons)
      const { data: gstData } = await supabase
        .from('client_gst_data')
        .select('id')
        .eq('client_user_id', userId)
        .limit(1);
      const hasGstData = gstData && gstData.length > 0;

      // Invoices (always retained for legal reasons)
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id')
        .eq('vendor_id', userId)
        .limit(1);
      const hasInvoices = invoices && invoices.length > 0;

      if (holds.length > 0) {
        return reply.status(409).send({
          error: 'Your account cannot be closed until the following issues are resolved.',
          holds,
          canProceed: false,
        });
      }

      // Stage the deletion — 30 day grace period for legal retention processing
      const deletionScheduledAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const holdReasons: string[] = [];
      if (hasGstData) holdReasons.push('GST return data must be retained as required by applicable tax law.');
      if (hasInvoices) holdReasons.push('Tax invoices must be retained as required by applicable tax law.');

      await supabase
        .from('users')
        .update({
          deletion_requested_at: new Date().toISOString(),
          deletion_scheduled_at: deletionScheduledAt,
          deletion_hold_reason: holdReasons.length > 0 ? holdReasons.join(' | ') : null,
        })
        .eq('id', userId);

      // Create a privacy request record
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();

      const { data: privacyRequest } = await supabase
        .from('privacy_requests')
        .insert({
          user_id: userId,
          email: userData?.email ?? '',
          request_type: 'ERASURE',
          description: body.reason
            ? `User-initiated erasure. Reason: ${body.reason}`
            : 'User-initiated account erasure.',
          status: 'IN_REVIEW',
        })
        .select('id')
        .single();

      if (privacyRequest) {
        await supabase.from('privacy_request_events').insert([
          {
            request_id: privacyRequest.id,
            actor_user_id: userId,
            actor_label: 'USER',
            event_type: 'SUBMITTED',
            note: 'Erasure request submitted by user.',
            metadata: { ip: request.ip, hasTaxDataHold: hasGstData || hasInvoices },
          },
          {
            request_id: privacyRequest.id,
            actor_user_id: null,
            actor_label: 'SYSTEM',
            event_type: 'STATUS_CHANGED',
            note: `Account staged for deletion. Scheduled deletion: ${deletionScheduledAt}. ${holdReasons.length > 0 ? 'Legal retention holds apply to some data.' : 'No legal holds detected.'}`,
            metadata: { deletionScheduledAt, holdReasons },
          },
        ]);
      }

      await logAuthAudit({
        eventType: 'LOGOUT',
        userId,
        identifier: userData?.email ?? '',
        ipAddress: request.ip,
        metadata: {
          action: 'ERASURE_INITIATED',
          deletionScheduledAt,
          hasLegalHolds: holdReasons.length > 0,
        },
      });

      return {
        success: true,
        deletionScheduledAt,
        legalRetentionNote:
          holdReasons.length > 0
            ? `Some data (${holdReasons.join(' ')}) must be retained as required by law and cannot be immediately erased. It will be restricted to that legal purpose only and deleted when the retention period ends.`
            : null,
        message:
          'Your account erasure request has been received. Your personal information will be removed from active systems within 30 days. Records required by law will be retained as described in our Privacy Notice.',
        requestId: privacyRequest?.id ?? null,
      };
    }
  );

  // ----------------------------------------------------------------
  // POST /api/privacy/erasure/cancel
  // Cancel a pending erasure request (within grace period)
  // ----------------------------------------------------------------
  app.post(
    '/api/privacy/erasure/cancel',
    { preHandler: authenticate, config: { rateLimit: ERASURE_RATE_LIMIT } },
    async (request, reply) => {
      const userId = request.user.id;

      const { data: user } = await supabase
        .from('users')
        .select('deletion_requested_at, deletion_scheduled_at')
        .eq('id', userId)
        .single();

      if (!user?.deletion_requested_at) {
        return reply.status(404).send({ error: 'No pending erasure request found.' });
      }

      await supabase
        .from('users')
        .update({
          deletion_requested_at: null,
          deletion_scheduled_at: null,
          deletion_hold_reason: null,
        })
        .eq('id', userId);

      // Find and cancel the open privacy request
      const { data: openRequest } = await supabase
        .from('privacy_requests')
        .select('id')
        .eq('user_id', userId)
        .eq('request_type', 'ERASURE')
        .in('status', ['PENDING', 'IN_REVIEW'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (openRequest) {
        await supabase
          .from('privacy_requests')
          .update({ status: 'REJECTED', resolution_note: 'Cancelled by user.' })
          .eq('id', openRequest.id);

        await supabase.from('privacy_request_events').insert({
          request_id: openRequest.id,
          actor_user_id: userId,
          actor_label: 'USER',
          event_type: 'REJECTED',
          note: 'User cancelled the erasure request within the grace period.',
        });
      }

      return { success: true, message: 'Your erasure request has been cancelled. Your account remains active.' };
    }
  );
}
