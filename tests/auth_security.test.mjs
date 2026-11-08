import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { env } from '../server/dist/config/env.js';

const API_BASE = 'http://127.0.0.1:3001';

// Real database accounts
const ADMIN_USER = {
  id: 'e660db48-69b7-4a63-9659-b27a27cacbe9',
  email: 'gstbro.in@gmail.com',
  role: 'ADMIN',
};

const TEAM_USER = {
  id: '355ae369-9dbe-4667-b7ff-ffe7b6ed86eb',
  email: 'tec594490@gmail.com',
  role: 'TEAM',
};

const CLIENT_USER = {
  id: '04d03b97-1bee-4abb-9344-9a9801cb2161',
  email: 'macroc.consultants@zohomail.in',
  role: 'CLIENT',
};

const OTHER_CLIENT_USER = {
  id: '84a38960-96d7-4678-b7ce-9566d448c0ab',
  email: 'srisuwathi.e@gmail.com',
  role: 'CLIENT',
};

function base64UrlEncode(obj) {
  return Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj)).toString('base64url');
}

function signJwt(payload, secret = env.JWT_SECRET, expiresIn = 3600) {
  const header = base64UrlEncode({ alg: 'HS256', typ: 'JWT' });
  const now = Math.floor(Date.now() / 1000);
  const body = base64UrlEncode({ ...payload, iat: now, exp: now + expiresIn });
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

describe('GSTBro Critical Security Audit & Authorization Verification Suite', () => {
  // --------------------------------------------------------------------------
  // TEST 1: Open Admin URL without logging in — Access Denied (401)
  // --------------------------------------------------------------------------
  it('1. Open Admin URL in a clean browser without logging in -> access denied', async () => {
    const endpoints = [
      '/api/admin/clients',
      '/api/admin/leads',
      '/api/admin/team',
      '/api/admin/activity-logs',
      '/api/admin/conversations',
    ];

    for (const ep of endpoints) {
      const res = await fetch(`${API_BASE}${ep}`);
      assert.strictEqual(
        res.status,
        401,
        `Expected 401 Unauthorized on unauthenticated Admin endpoint ${ep}, got ${res.status}`
      );
    }
  });

  // --------------------------------------------------------------------------
  // TEST 2: Open Team URL without logging in — Access Denied (401)
  // --------------------------------------------------------------------------
  it('2. Open Team URL in a clean browser without logging in -> access denied', async () => {
    const endpoints = [
      '/api/team/dashboard',
      '/api/team/clients',
      `/api/team/clients/${CLIENT_USER.id}/messages`,
      `/api/clients/${CLIENT_USER.id}/workspace`,
    ];

    for (const ep of endpoints) {
      const res = await fetch(`${API_BASE}${ep}`);
      assert.strictEqual(
        res.status,
        401,
        `Expected 401 Unauthorized on unauthenticated Team endpoint ${ep}, got ${res.status}`
      );
    }
  });

  // --------------------------------------------------------------------------
  // TEST 3: Open Client URL without logging in — Access Denied (401)
  // --------------------------------------------------------------------------
  it('3. Open Client URL in a clean browser without logging in -> access denied', async () => {
    const endpoints = [
      '/api/client/dashboard',
      '/api/client/messages',
      '/api/client/fees',
    ];

    for (const ep of endpoints) {
      const res = await fetch(`${API_BASE}${ep}`);
      assert.strictEqual(
        res.status,
        401,
        `Expected 401 Unauthorized on unauthenticated Client endpoint ${ep}, got ${res.status}`
      );
    }
  });

  // --------------------------------------------------------------------------
  // TEST 4: Copy a protected URL into incognito window -> Access Denied
  // --------------------------------------------------------------------------
  it('4. Copy a protected URL into an incognito window -> access denied without valid session', async () => {
    // Incognito window sends standard clean headers with no Authorization token
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { 'User-Agent': 'Mozilla/5.0 Incognito' },
    });
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.error, 'Unauthorized');
  });

  // --------------------------------------------------------------------------
  // TEST 5: Access protected APIs directly without a valid session -> 401
  // --------------------------------------------------------------------------
  it('5. Access protected APIs directly without a valid session -> 401 denial', async () => {
    const res = await fetch(`${API_BASE}/api/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceType: 'GENERAL' }),
    });
    assert.strictEqual(res.status, 401);
  });

  // --------------------------------------------------------------------------
  // TEST 6: Use an expired or invalid session -> Access Denied (401)
  // --------------------------------------------------------------------------
  it('6. Use an expired or invalid session -> access denied', async () => {
    // 6a: Expired token (expires in -300 seconds)
    const expiredToken = signJwt(ADMIN_USER, env.JWT_SECRET, -300);
    const resExpired = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    assert.strictEqual(resExpired.status, 401);

    // 6b: Malformed / tampered signature
    const tamperedToken = `${expiredToken}corrupted`;
    const resTampered = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${tamperedToken}` },
    });
    assert.strictEqual(resTampered.status, 401);

    // 6c: Forged with wrong secret
    const forgedToken = signJwt(ADMIN_USER, 'attacker_wrong_secret_123456');
    const resForged = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${forgedToken}` },
    });
    assert.strictEqual(resForged.status, 401);
  });

  // --------------------------------------------------------------------------
  // TEST 7: Log out and try to access the previous protected URL -> 401 Denied
  // --------------------------------------------------------------------------
  it('7. Log out and try to access the previous protected URL -> session revoked & access denied', async () => {
    const freshToken = signJwt(ADMIN_USER, env.JWT_SECRET, 3600);

    // Initial check: token works
    const resBefore = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${freshToken}` },
    });
    assert.strictEqual(resBefore.status, 200);

    // Perform server-side logout
    const resLogout = await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${freshToken}` },
    });
    assert.strictEqual(resLogout.status, 200);
    const logoutData = await resLogout.json();
    assert.strictEqual(logoutData.success, true);

    // Subsequent access with the logged-out token MUST BE REJECTED
    const resAfter = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${freshToken}` },
    });
    assert.strictEqual(resAfter.status, 401);
    const afterData = await resAfter.json();
    assert.ok(afterData.error.includes('revoked') || afterData.error.includes('signed out'));
  });

  // --------------------------------------------------------------------------
  // TEST 8: Log in as a Client and attempt to access Admin and Team resources -> Denied (403)
  // --------------------------------------------------------------------------
  it('8. Log in as a Client and attempt to access Admin and Team resources -> 403 Forbidden', async () => {
    const clientToken = signJwt(CLIENT_USER, env.JWT_SECRET, 3600);

    // Attempt Admin operations
    const adminEndpoints = [
      '/api/admin/clients',
      '/api/admin/team',
      '/api/admin/activity-logs',
      '/api/admin/leads',
      '/api/admin/conversations',
    ];

    for (const ep of adminEndpoints) {
      const res = await fetch(`${API_BASE}${ep}`, {
        headers: { Authorization: `Bearer ${clientToken}` },
      });
      assert.strictEqual(
        res.status,
        403,
        `Client MUST be forbidden (403) from accessing Admin endpoint ${ep}, got ${res.status}`
      );
    }

    // Attempt Team operations
    const teamEndpoints = [
      { url: '/api/team/dashboard', method: 'GET' },
      { url: '/api/team/clients', method: 'GET' },
      { url: `/api/clients/${OTHER_CLIENT_USER.id}/workspace`, method: 'GET' },
      { url: `/api/clients/${OTHER_CLIENT_USER.id}/mis-config`, method: 'PUT' },
      { url: `/api/clients/${OTHER_CLIENT_USER.id}/compliance`, method: 'GET' },
    ];

    for (const ep of teamEndpoints) {
      const res = await fetch(`${API_BASE}${ep.url}`, {
        method: ep.method,
        headers: {
          Authorization: `Bearer ${clientToken}`,
          'Content-Type': 'application/json',
        },
        body: ep.method === 'PUT' ? JSON.stringify({ dashboardMode: 'SIMPLE' }) : undefined,
      });
      assert.strictEqual(
        res.status,
        403,
        `Client MUST be forbidden (403) from accessing Team endpoint ${ep.url}, got ${res.status}`
      );
    }
  });

  // --------------------------------------------------------------------------
  // TEST 9: Log in as a Team member and attempt to access Admin resources -> Denied (403)
  // --------------------------------------------------------------------------
  it('9. Log in as a Team member and attempt to access Admin resources -> 403 Forbidden', async () => {
    const teamToken = signJwt(TEAM_USER, env.JWT_SECRET, 3600);

    const adminOnlyEndpoints = [
      '/api/admin/team',
      '/api/admin/activity-logs',
      '/api/admin/leads',
      '/api/admin/conversations',
    ];

    for (const ep of adminOnlyEndpoints) {
      const res = await fetch(`${API_BASE}${ep}`, {
        headers: { Authorization: `Bearer ${teamToken}` },
      });
      assert.strictEqual(
        res.status,
        403,
        `Team member MUST be forbidden (403) from accessing Admin-only endpoint ${ep}, got ${res.status}`
      );
    }
  });

  // --------------------------------------------------------------------------
  // TEST 10: Attempt to access another client's data by changing record IDs -> Denied (403)
  // --------------------------------------------------------------------------
  it("10. Attempt to access another client's data by changing record IDs -> 403 Forbidden", async () => {
    // Client A attempting to access Client B's messages via team route
    const clientAToken = signJwt(CLIENT_USER, env.JWT_SECRET, 3600);

    const resMessages = await fetch(`${API_BASE}/api/team/clients/${OTHER_CLIENT_USER.id}/messages`, {
      headers: { Authorization: `Bearer ${clientAToken}` },
    });
    assert.strictEqual(resMessages.status, 403);

    // Team member attempting to access a client NOT assigned to them
    const teamToken = signJwt(TEAM_USER, env.JWT_SECRET, 3600);
    // Unassigned random UUID
    const randomClientId = '00000000-0000-0000-0000-000000000099';
    const resWorkspace = await fetch(`${API_BASE}/api/clients/${randomClientId}/workspace`, {
      headers: { Authorization: `Bearer ${teamToken}` },
    });
    assert.strictEqual(resWorkspace.status, 403);
  });

  // --------------------------------------------------------------------------
  // TEST 11: Attempt to modify role in localStorage or request payload -> No Privilege Escalation
  // --------------------------------------------------------------------------
  it('11. Attempt to modify role in payload or token -> no privilege escalation', async () => {
    // 11a: An attacker tries to send role: "ADMIN" in signup payload
    const resSignup = await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hacker',
        businessName: 'Hacker Corp',
        phone: '9876543210',
        email: 'hacker@example.com',
        state: 'Karnataka',
        address: 'MG Road, Bangalore',
        password: 'Password123!',
        role: 'ADMIN', // Illegal injection
      }),
    });
    // Schema validation MUST reject unauthorized properties (strict mode)
    assert.strictEqual(resSignup.status, 400);

    // 11b: A client creates a JWT with client ID but claims role: "ADMIN"
    // Our middleware verifies the authoritative role from the DB for client.id!
    const spoofedToken = signJwt({ id: CLIENT_USER.id, email: CLIENT_USER.email, role: 'ADMIN' });
    // Attempting to access Admin-only route:
    const resAdmin = await fetch(`${API_BASE}/api/admin/leads`, {
      headers: { Authorization: `Bearer ${spoofedToken}` },
    });
    // The server authoritatively pulls user's DB role (CLIENT) and denies access!
    assert.strictEqual(
      resAdmin.status,
      403,
      'Spoofed role in token payload MUST be overridden by authoritative database role'
    );
  });

  // --------------------------------------------------------------------------
  // TEST 12: Verify legitimate Admin, Team and Client accounts still work correctly
  // --------------------------------------------------------------------------
  it('12. Verify legitimate Admin, Team and Client accounts operate with 200 OK', async () => {
    // Admin access
    const adminToken = signJwt(ADMIN_USER);
    const resAdmin = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resAdmin.status, 200);
    const adminData = await resAdmin.json();
    assert.strictEqual(adminData.user.role, 'ADMIN');

    // Team access
    const teamToken = signJwt(TEAM_USER);
    const resTeam = await fetch(`${API_BASE}/api/team/dashboard`, {
      headers: { Authorization: `Bearer ${teamToken}` },
    });
    assert.strictEqual(resTeam.status, 200);

    // Client access
    const clientToken = signJwt(CLIENT_USER);
    const resClient = await fetch(`${API_BASE}/api/client/dashboard`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    assert.strictEqual(resClient.status, 200);
    const clientData = await resClient.json();
    assert.ok(clientData.client);
  });

  // --------------------------------------------------------------------------
  // TEST 13: Verify customer data and security headers remain intact
  // --------------------------------------------------------------------------
  it('13. Verify cache-control headers, non-exposure of passwords, and data intactness', async () => {
    const adminToken = signJwt(ADMIN_USER);
    const res = await fetch(`${API_BASE}/api/admin/clients`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);

    // Sensitive API Cache-Control check
    const cacheControl = res.headers.get('cache-control');
    assert.ok(cacheControl?.includes('no-store'), 'Sensitive API responses must be no-store');

    // Ensure password_hash is never leaked
    const data = await res.json();
    for (const client of data.clients) {
      assert.strictEqual(client.password_hash, undefined, 'password_hash must never be leaked');
    }
  });
});
