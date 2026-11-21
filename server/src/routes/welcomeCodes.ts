import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  getWelcomeCodesSummary,
  createWelcomeCodes,
  revokeWelcomeCode,
  verifyWelcomeCode,
} from '../services/welcomeCodeService.js';
import { OTP_VERIFY_RATE_LIMIT, HEAVY_DATA_RATE_LIMIT } from '../lib/rateLimiter.js';

export async function welcomeCodeRoutes(app: FastifyInstance) {
  // --------------------------------------------------------------------------
  // 1. PUBLIC: Verify Welcome Code before / during registration
  // --------------------------------------------------------------------------
  app.post(
    '/api/auth/welcome-codes/verify',
    { config: { rateLimit: OTP_VERIFY_RATE_LIMIT } },
    async (request, reply) => {
      const body = z
        .object({
          code: z.string().trim().min(1, 'Enter your Welcome Code'),
        })
        .strict()
        .parse(request.body);

      const res = await verifyWelcomeCode(body.code);
      if (!res.valid) {
        return reply.status(400).send({
          valid: false,
          error: res.error || 'Invalid or already used Welcome Code',
        });
      }

      return {
        valid: true,
        isCaFirm: res.isCaFirm || false,
        firmId: res.firmId,
        firmName: res.firmName,
        message: res.isCaFirm
          ? 'CA Firm Welcome Code verified! You can proceed to register your practice.'
          : res.firmName
          ? `Welcome Code confirmed! You are joining ${res.firmName}.`
          : 'Welcome Code verified! You can proceed with registration.',
      };
    }
  );

  // --------------------------------------------------------------------------
  // 2. ADMIN / SUPER ADMIN: List CA Firm Welcome Codes & statistics
  // --------------------------------------------------------------------------
  app.get(
    '/api/admin/welcome-codes',
    { preHandler: [authenticate, requireRole('ADMIN', 'SUPER_ADMIN')] },
    async () => {
      const summary = await getWelcomeCodesSummary({ targetRole: 'CA_FIRM' });
      return summary;
    }
  );

  // --------------------------------------------------------------------------
  // 3. ADMIN / SUPER ADMIN: Generate Welcome Codes for CA Firms Only
  // --------------------------------------------------------------------------
  app.post(
    '/api/admin/welcome-codes/generate',
    { preHandler: [authenticate, requireRole('ADMIN', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const user = (request as any).user;
      const body = z
        .object({
          count: z.number().int().min(1).max(50).optional().default(1),
          length: z.number().int().min(5).max(10).optional().default(6),
          charset: z
            .enum(['UPPERCASE_ONLY', 'ALPHANUMERIC', 'NUMBERS_ONLY', 'SPECIAL_CHARS', 'CUSTOM'])
            .optional()
            .default('UPPERCASE_ONLY'),
          customCode: z.string().trim().min(4).max(16).optional(),
          targetRole: z.literal('CA_FIRM').optional().default('CA_FIRM'),
          firmName: z.string().trim().max(120).optional(),
          note: z.string().trim().max(250).optional(),
          expiresInDays: z.number().int().min(1).max(365).nullable().optional(),
        })
        .strict()
        .parse(request.body);

      try {
        const result = await createWelcomeCodes(user?.id || 'admin', {
          count: body.count,
          length: body.length,
          charset: body.charset,
          customCode: body.customCode,
          targetRole: 'CA_FIRM', // Strictly CA_FIRM for Super Admin
          firmName: body.firmName,
          note: body.note,
          expiresInDays: body.expiresInDays,
        });

        return reply.status(201).send({
          success: true,
          count: result.count,
          codes: result.created,
          message: `Successfully generated ${result.count} unique CA Firm registration code(s)`,
        });
      } catch (err: any) {
        return reply.status(400).send({
          error: err.message || 'Failed to generate CA Firm welcome codes',
        });
      }
    }
  );

  // --------------------------------------------------------------------------
  // 4. ADMIN / SUPER ADMIN: Revoke / Delete an unused Welcome Code
  // --------------------------------------------------------------------------
  app.delete(
    '/api/admin/welcome-codes/:id',
    { preHandler: [authenticate, requireRole('ADMIN', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await revokeWelcomeCode(id);
      return { success: true, message: 'Welcome code revoked successfully' };
    }
  );

  // --------------------------------------------------------------------------
  // 5. ADMIN / SUPER ADMIN: Update Welcome Code GET Hotline Phone Number
  // --------------------------------------------------------------------------
  app.patch(
    '/api/admin/welcome-codes/support-phone',
    { preHandler: [authenticate, requireRole('ADMIN', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const body = z
        .object({
          supportPhone: z.string().trim().min(5).max(30),
        })
        .safeParse(request.body);

      if (!body.success) {
        return reply.status(400).send({ error: 'Valid phone number is required (5-30 characters)' });
      }

      const user = (request as any).user;
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          key: 'welcome_code_support_phone',
          value: body.data.supportPhone,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        });

      if (error) {
        return reply.status(500).send({ error: 'Failed to update support phone number' });
      }

      return reply.send({ success: true, supportPhone: body.data.supportPhone });
    }
  );
}
