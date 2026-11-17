import type { FastifyRequest, FastifyReply } from 'fastify';
import { supabase, type UserRole, type FirmRole } from '../lib/supabase.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { 
      id: string; 
      email: string; 
      role: UserRole; 
      firm_id?: string | null; 
      firm_role?: FirmRole | null; 
      sid?: string;
    };
    user: { 
      id: string; 
      email: string; 
      role: UserRole; 
      firm_id?: string | null; 
      firm_role?: FirmRole | null; 
      sid?: string;
    };
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

  // 1. Server-side session revocation & Single Active Device Policy validation
  const rawToken = getRawAuthToken(request);
  if (rawToken) {
    const payload = (request.user as any);
    const isRevoked = await isTokenRevoked(rawToken, request.user.id, payload?.iat, payload?.sid);
    if (isRevoked) {
      return reply.status(401).send({
        error: 'Your account was logged into from another device or your session has expired. You have been logged out on this device.',
        code: 'SESSION_REVOKED',
      });
    }
  }

  // 2. Authoritative Database Role, Firm & Account Verification
  const { data: userRecord } = await supabase
    .from('users')
    .select('id, role, firm_id, firm_role, must_reset_password')
    .eq('id', request.user.id)
    .single();

  if (!userRecord) {
    return reply.status(401).send({ error: 'User account not found or deactivated.' });
  }

  // Authoritatively bind user role and tenant firm from trusted database
  request.user.role = userRecord.role;
  request.user.firm_id = userRecord.firm_id;
  request.user.firm_role = userRecord.firm_role;

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

export function requireSuperAdmin() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user || request.user.role !== 'SUPER_ADMIN') {
      return reply.status(403).send({ error: 'Forbidden: Super Admin access required.' });
    }
  };
}

export function requireFirm() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user || !request.user.firm_id) {
      return reply.status(403).send({ error: 'Forbidden: User is not associated with an active firm/tenant.' });
    }
  };
}

export function requireFirmAdmin() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const isFirmAdmin = 
      request.user?.role === 'FIRM_OWNER' || 
      request.user?.firm_role === 'FIRM_OWNER' || 
      request.user?.role === 'ADMIN';

    if (!request.user || !isFirmAdmin) {
      return reply.status(403).send({ error: 'Forbidden: Firm Owner / Admin privileges required.' });
    }
  };
}
