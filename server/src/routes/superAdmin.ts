import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { env } from '../config/env.js';
import { supabase } from '../lib/supabase.js';
import { authenticate, requireRole } from '../middleware/auth.js';

function maskPhone(phone?: string | null): string {
  if (!phone) return '-';
  const clean = phone.replace(/\D/g, '');
  if (clean.length >= 10) {
    const last10 = clean.slice(-10);
    return `+91 ${last10.slice(0, 2)}****${last10.slice(6)}`;
  }
  return phone.slice(0, 3) + '****' + phone.slice(-2);
}

function maskEmail(email?: string | null): string {
  if (!email || !email.includes('@')) return '-';
  const [user, domain] = email.split('@');
  const visible = user.length > 2 ? user.slice(0, 2) : user.slice(0, 1);
  return `${visible}****@${domain}`;
}

export const superAdminRoutes: FastifyPluginAsync = async (app) => {
  // Public endpoint for web app to fetch published CMS blocks
  app.get('/api/public/cms/:key', async (request, reply) => {
    const { key } = request.params as { key: string };
    const { data, error } = await supabase
      .from('platform_site_content')
      .select('key, content, updated_at')
      .eq('key', key)
      .maybeSingle();

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch content' });
    }
    return reply.send({ key, content: data?.content || null });
  });

  // Protected Super Admin scope
  app.register(async (adminScope) => {
    adminScope.addHook('preHandler', authenticate);
    adminScope.addHook('preHandler', requireRole('SUPER_ADMIN', 'ADMIN'));

    // 1. Platform KPI Dashboard
    adminScope.get('/api/super-admin/kpis', async (_request, reply) => {
      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Aggregate counts in parallel without leaking individual client records
      const [firmsRes, teamRes, activeClientsRes, usageRes] = await Promise.all([
        supabase.from('firms').select('id, status', { count: 'exact', head: false }),
        supabase.from('users').select('id', { count: 'exact', head: true }).or('role.eq.FIRM_STAFF,role.eq.TEAM'),
        supabase.from('client_gst_data').select('client_user_id', { count: 'exact', head: false }).gte('updated_at', periodStart),
        supabase.from('firm_monthly_usage').select('active_clients_count, total_inr').eq('billing_period', currentPeriod),
      ]);

      const firmsList = firmsRes.data || [];
      const totalFirms = firmsList.length;
      const activeFirms = firmsList.filter((f) => f.status === 'ACTIVE').length;
      const totalTeamMembers = teamRes.count || 0;

      // Calculate distinct active clients this month
      const activeClientIds = new Set((activeClientsRes.data || []).map((r) => r.client_user_id));
      const activeClientsCount = Math.max(activeClientIds.size, (usageRes.data || []).reduce((sum, u) => sum + (u.active_clients_count || 0), 0));

      const RATE_PER_ACTIVE_CLIENT = 149;
      const projectedMonthlyRevenue = (usageRes.data || []).length > 0
        ? (usageRes.data || []).reduce((sum, u) => sum + Number(u.total_inr || 0), 0)
        : activeClientsCount * RATE_PER_ACTIVE_CLIENT * 1.18; // Includes 18% GST

      return reply.send({
        totalFirms,
        activeFirms,
        totalTeamMembers,
        activeClientsCount,
        projectedMonthlyRevenue: Math.round(projectedMonthlyRevenue),
        billingPeriod: currentPeriod,
        defaultRatePerClient: RATE_PER_ACTIVE_CLIENT,
      });
    });

    // 2. List CA Firms (Metadata only - zero client confidential data)
    adminScope.get('/api/super-admin/firms', async (_request, reply) => {
      const { data: firms, error } = await supabase
        .from('firms')
        .select('id, name, slug, email, phone, gstin, status, trial_ends_at, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) {
        return reply.send({ firms: [] });
      }

      // Fetch team and client counts per firm for usage display
      const firmsWithMetrics = await Promise.all(
        (firms || []).map(async (firm) => {
          const [teamCount, activeUsage] = await Promise.all([
            supabase.from('users').select('id', { count: 'exact', head: true }).eq('firm_id', firm.id),
            supabase.from('firm_monthly_usage').select('active_clients_count, total_inr, invoice_status').eq('firm_id', firm.id).order('billing_period', { ascending: false }).limit(1).maybeSingle(),
          ]);

          return {
            ...firm,
            totalTeamMembers: teamCount.count || 0,
            activeClientsCount: activeUsage.data?.active_clients_count || 0,
            latestInvoiceAmount: activeUsage.data?.total_inr || 0,
            invoiceStatus: activeUsage.data?.invoice_status || 'PENDING',
          };
        })
      );

      return reply.send({ firms: firmsWithMetrics });
    });

    // 3. Update Firm Status (Activate / Suspend)
    adminScope.patch('/api/super-admin/firms/:id/status', async (request, reply) => {
      const { id } = request.params as { id: string };
      const bodySchema = z.object({
        status: z.enum(['TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED']),
      });
      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      const { data, error } = await supabase
        .from('firms')
        .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id, name, status')
        .single();

      if (error) {
        return reply.send({ firms: [] });
      }
      return reply.send({ success: true, firm: data });
    });

    // 4. Website CMS - Get all content blocks
    adminScope.get('/api/super-admin/cms', async (_request, reply) => {
      const { data, error } = await supabase
        .from('platform_site_content')
        .select('*')
        .order('key');

      if (error) {
        return reply.send({ firms: [] });
      }
      return reply.send({ blocks: data || [] });
    });

    // 5. Website CMS - Update a content block
    adminScope.put('/api/super-admin/cms/:key', async (request, reply) => {
      const { key } = request.params as { key: string };
      const bodySchema = z.object({
        content: z.record(z.any()),
      });
      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.format() });
      }

      const { data, error } = await supabase
        .from('platform_site_content')
        .upsert({
          key,
          content: parsed.data.content,
          updated_by: request.user.id,
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (error) {
        return reply.send({ firms: [] });
      }
      return reply.send({ success: true, block: data });
    });

    // 6. OTP Gateway & Verification Telemetry - Get status & recent sessions
    adminScope.get('/api/super-admin/otp-config', async (_request, reply) => {
      // 1. Fetch phone OTP visibility setting
      const { data: settingData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'signup_phone_otp_enabled')
        .maybeSingle();

      const phoneOtpEnabled = settingData?.value === 'true';

      // 2. Fetch recent mobile OTP sessions (limit 25)
      const { data: mobileData } = await supabase
        .from('mobile_otp_sessions')
        .select('id, phone, purpose, attempts, max_attempts, verified, provider, expires_at, created_at')
        .order('created_at', { ascending: false })
        .limit(25);

      const recentMobileSessions = (mobileData || []).map((s) => ({
        id: s.id,
        identifier: maskPhone(s.phone),
        channel: 'MOBILE_SMS',
        purpose: s.purpose,
        provider: s.provider || env.OTP_PROVIDER || 'apitxt',
        verified: Boolean(s.verified),
        attempts: s.attempts || 0,
        maxAttempts: s.max_attempts || 5,
        isExpired: new Date(s.expires_at).getTime() < Date.now(),
        createdAt: s.created_at,
      }));

      // 3. Fetch recent email OTP sessions (limit 25)
      const { data: emailData } = await supabase
        .from('otp_codes')
        .select('id, email, purpose, expires_at, created_at')
        .order('created_at', { ascending: false })
        .limit(25);

      const recentEmailSessions = (emailData || []).map((s) => ({
        id: s.id,
        identifier: maskEmail(s.email),
        channel: 'EMAIL',
        purpose: s.purpose,
        provider: 'Resend',
        verified: false,
        attempts: 1,
        maxAttempts: 5,
        isExpired: new Date(s.expires_at).getTime() < Date.now(),
        createdAt: s.created_at,
      }));

      return reply.send({
        phoneOtpEnabled,
        activeSmsProvider: env.OTP_PROVIDER || 'apitxt',
        activeEmailProvider: 'Resend',
        recentMobileSessions,
        recentEmailSessions,
      });
    });

    // 7. OTP Gateway - Toggle phone OTP visibility on public signup
    adminScope.patch('/api/super-admin/otp-config', async (request, reply) => {
      const bodySchema = z.object({
        phoneOtpEnabled: z.boolean(),
      });
      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid input. phoneOtpEnabled must be a boolean.' });
      }

      const stringValue = parsed.data.phoneOtpEnabled ? 'true' : 'false';

      const { error } = await supabase
        .from('site_settings')
        .upsert({
          key: 'signup_phone_otp_enabled',
          value: stringValue,
          updated_at: new Date().toISOString(),
          updated_by: request.user.id,
        });

      if (error) {
        return reply.status(500).send({ error: 'Failed to update OTP configuration' });
      }

      return reply.send({
        success: true,
        phoneOtpEnabled: parsed.data.phoneOtpEnabled,
        message: parsed.data.phoneOtpEnabled
          ? 'Mobile SMS OTP verification is now enabled on the public registration page.'
          : 'Mobile SMS OTP verification is now hidden. All registrations will verify cleanly via Email OTP.',
      });
    });
  });
};
