import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
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
        message: 'Welcome Code verified! You can proceed with registration.',
      };
    }
  );

  // --------------------------------------------------------------------------
  // 2. ADMIN: List all Welcome Codes & statistics
  // --------------------------------------------------------------------------
  app.get(
    '/api/admin/welcome-codes',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async () => {
      const summary = await getWelcomeCodesSummary();
      return summary;
    }
  );

  // --------------------------------------------------------------------------
  // 3. ADMIN: Generate one or more unique Welcome Codes (5-8 characters)
  // --------------------------------------------------------------------------
  app.post(
    '/api/admin/welcome-codes/generate',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (request, reply) => {
      const user = (request as any).user;
      const body = z
        .object({
          count: z.number().int().min(1).max(50).optional().default(1),
          length: z.number().int().min(5).max(8).optional().default(6),
          charset: z
            .enum(['UPPERCASE_ONLY', 'ALPHANUMERIC', 'NUMBERS_ONLY', 'SPECIAL_CHARS', 'CUSTOM'])
            .optional()
            .default('UPPERCASE_ONLY'),
          customCode: z.string().trim().min(5).max(8).optional(),
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
          note: body.note,
          expiresInDays: body.expiresInDays,
        });

        return {
          success: true,
          message: `Successfully generated ${result.count} unique welcome code(s)`,
          created: result.created,
        };
      } catch (err: any) {
        return reply.status(400).send({
          error: err.message || 'Failed to generate welcome codes',
        });
      }
    }
  );

  // --------------------------------------------------------------------------
  // 4. ADMIN: Revoke / Delete an unused Welcome Code
  // --------------------------------------------------------------------------
  app.delete(
    '/api/admin/welcome-codes/:id',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      if (!id) return reply.status(400).send({ error: 'Code ID is required' });

      await revokeWelcomeCode(id);
      return { success: true, message: 'Welcome code revoked successfully' };
    }
  );
}
