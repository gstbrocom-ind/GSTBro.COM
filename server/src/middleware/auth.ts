import type { FastifyRequest, FastifyReply } from 'fastify';
import { supabase, type UserRole } from '../lib/supabase.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; email: string; role: UserRole };
    user: { id: string; email: string; role: UserRole };
  }
}

// Endpoints that a must-reset-password user is still allowed to call
const MUST_RESET_EXEMPT_PATHS = new Set([
  '/api/auth/change-password',
  '/api/auth/me',
]);

import { isTokenRevoked } from '../services/sessionRevocationService.js';

export function getRawAuthToken(request: FastifyRequest): string | null {
  const auth = request.headers.authorization;
  if (!auth) return null;
  return auth.replace(/^Bearer\s+/i, '').trim();
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  // 1. Server-side session revocation & token blacklist validation
  const rawToken = getRawAuthToken(request);
  if (rawToken) {
    const payload = (request.user as any);
    const isRevoked = await isTokenRevoked(rawToken, request.user.id, payload?.iat);
    if (isRevoked) {
      return reply.status(401).send({ error: 'Session has been revoked or signed out. Please log in again.' });
    }
  }

  // 2. Authoritative Database Role & Account Verification
  const { data: userRecord } = await supabase
    .from('users')
    .select('id, role, must_reset_password')
    .eq('id', request.user.id)
    .single();

  if (!userRecord) {
    return reply.status(401).send({ error: 'User account not found or deactivated.' });
  }

  // Authoritatively bind user role from trusted database
  request.user.role = userRecord.role;

  // 3. Server-side enforcement of forced password reset (HIGH-AUTH-02)
  if (!MUST_RESET_EXEMPT_PATHS.has(request.routeOptions?.url ?? request.url)) {
    if (userRecord.must_reset_password === true) {
      return reply.status(403).send({
        error: 'Password reset required. Please change your password before continuing.',
        mustResetPassword: true,
      });
    }
  }
}

export function requireRole(...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user || !roles.includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden: Insufficient privileges.' });
    }
  };
}
