import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  getPublicSettings,
  getSeoForPath,
  updateSeoForPath,
  updateSocialSettings,
  getSocialSettingsAdmin,
} from '../services/seoSettings.js';
import { uploadToCloudinary } from '../services/cloudinaryService.js';
import { supabase } from '../lib/supabase.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  safePathSchema,
  hasPrototypePollution,
  validateUploadFile,
  ALLOWED_IMAGE_TYPES,
} from '../lib/security.js';
import { UPLOAD_RATE_LIMIT } from '../lib/rateLimiter.js';

const ALLOWED_SITE_KEYS = new Set([
  'site_name',
  'favicon_url',
  'logo_url',
  'contact_phone',
  'contact_email',
  'office_address',
  'office_city',
  'google_maps_url',
  'map_embed_url',
  'announcement_bar_text',
  'announcement_bar_enabled',
  'announcement_bar_url',
  'footer_tagline',
  'business_hours',
  'home_hero_eyebrow',
  'home_hero_title',
  'home_hero_subtitle',
  'home_hero_image_url',
  'home_trust_badge',
  'home_hero_cta_primary',
  'home_hero_cta_secondary',
  'home_stat_clients',
  'home_stat_returns',
  'home_stat_experience',
  'home_stat_satisfaction',
  'home_cta_title',
  'home_cta_subtitle',
  'drive_root_id',
  'brand_intro_enabled',
  'brand_intro_theme',
  'brand_intro_duration',
  'brand_intro_title',
  'brand_intro_subtitle',
  'brand_intro_tagline',
  'brand_intro_defer_loading',
  'signup_phone_otp_enabled',
  'welcome_code_support_phone',
  'callback_banner_enabled',
  'callback_banner_delay_seconds',
  'callback_banner_destination_email',
  'callback_banner_badge',
  'callback_banner_headline',
  'callback_banner_description',
  'callback_banner_cta_text',
  'callback_banner_success_msg',
]);

interface FaviconCache {
  buffer: Buffer;
  contentType: string;
  sourceUrl: string;
  timestamp: number;
}

let cachedFavicon: FaviconCache | null = null;

export function invalidateFaviconCache() {
  cachedFavicon = null;
}

function applyNoCacheHeaders(reply: any) {
  reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0');
  reply.header('Pragma', 'no-cache');
  reply.header('Expires', '0');
  reply.header('Surrogate-Control', 'no-store');
}

export async function settingsRoutes(app: FastifyInstance) {
  // Public endpoint: Serves the active favicon dynamically for Googlebot, favicon checkers, and browsers
  app.get('/api/favicon', async (_request, reply) => {
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'favicon_url')
        .maybeSingle();

      const faviconUrl = data?.value?.trim();

      if (!faviconUrl) {
        reply.header('Cache-Control', 'public, max-age=3600, s-maxage=86400');
        return reply.redirect('/favicon.svg', 302);
      }

      const now = Date.now();
      if (
        cachedFavicon &&
        cachedFavicon.sourceUrl === faviconUrl &&
        now - cachedFavicon.timestamp < 3600000
      ) {
        reply.header('Cache-Control', 'public, max-age=86400, s-maxage=604800');
        reply.type(cachedFavicon.contentType);
        return reply.send(cachedFavicon.buffer);
      }

      if (faviconUrl.startsWith('http://') || faviconUrl.startsWith('https://')) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const res = await fetch(faviconUrl, { signal: controller.signal });
          clearTimeout(timeout);

          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const contentType = res.headers.get('content-type') || 'image/png';

            cachedFavicon = {
              buffer,
              contentType,
              sourceUrl: faviconUrl,
              timestamp: now,
            };

            reply.header('Cache-Control', 'public, max-age=86400, s-maxage=604800');
            reply.type(contentType);
            return reply.send(buffer);
          }
        } catch {
          // If fetching buffer fails/times out, redirect directly to the URL
          reply.header('Cache-Control', 'public, max-age=3600, s-maxage=86400');
          return reply.redirect(faviconUrl, 302);
        }
      }

      // If relative URL or fallback
      reply.header('Cache-Control', 'public, max-age=3600, s-maxage=86400');
      return reply.redirect(faviconUrl, 302);
    } catch {
      reply.header('Cache-Control', 'public, max-age=3600, s-maxage=86400');
      return reply.redirect('/favicon.svg', 302);
    }
  });

  // Direct root favicon fallback
  app.get('/favicon.ico', async (_request, reply) => {
    return reply.redirect('/api/favicon', 302);
  });

  app.get('/api/settings/public', async (_request, reply) => {
    applyNoCacheHeaders(reply);
    return getPublicSettings();
  });

  app.get('/api/settings/seo', async (request, reply) => {
    applyNoCacheHeaders(reply);
    const { path } = z
      .object({ path: safePathSchema })
      .strict()
      .parse(request.query);
    const seo = await getSeoForPath(path);
    return { seo };
  });

  // Public endpoint: Fetch all active website content overrides
  app.get('/api/settings/content', async (_request, reply) => {
    applyNoCacheHeaders(reply);
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .like('key', 'content_%');
    const contentMap: Record<string, string> = {};
    for (const row of data || []) {
      contentMap[row.key] = row.value;
    }
    return { content: contentMap };
  });

  // Admin endpoint: Fetch all website content overrides
  app.get(
    '/api/admin/settings/content',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (_request, reply) => {
      applyNoCacheHeaders(reply);
      const { data } = await supabase
        .from('site_settings')
        .select('key, value, updated_at')
        .like('key', 'content_%');
      const contentMap: Record<string, string> = {};
      for (const row of data || []) {
        contentMap[row.key] = row.value;
      }
      return { content: contentMap };
    }
  );

  // Admin endpoint: Save and apply website content overrides
  app.put(
    '/api/admin/settings/content',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (request, reply) => {
      if (hasPrototypePollution(request.body)) {
        return reply.status(400).send({ error: 'Illegal object keys detected (prototype pollution attempt)' });
      }

      const body = z
        .record(z.string().max(250000, 'Content block exceeds allowable length'))
        .parse(request.body);

      for (const [key, value] of Object.entries(body)) {
        if (!/^content_[a-zA-Z0-9_\-]+$/.test(key)) {
          return reply.status(400).send({ error: `Disallowed content key: ${key}. Content keys must start with content_` });
        }
        await supabase
          .from('site_settings')
          .upsert({ key, value, updated_by: request.user.id });
      }

      const { data } = await supabase
        .from('site_settings')
        .select('key, value')
        .like('key', 'content_%');
      const contentMap: Record<string, string> = {};
      for (const row of data || []) {
        contentMap[row.key] = row.value;
      }
      return { content: contentMap };
    }
  );

  app.get(
    '/api/admin/settings/social',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (_request, reply) => {
      applyNoCacheHeaders(reply);
      return getSocialSettingsAdmin();
    }
  );

  app.put(
    '/api/admin/settings/social',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (request, reply) => {
      if (hasPrototypePollution(request.body)) {
        return reply.status(400).send({ error: 'Illegal object keys detected (prototype pollution attempt)' });
      }

      const body = z
        .record(z.string().trim().max(500, 'Value exceeds maximum length of 500 characters'))
        .parse(request.body);

      // Validate allowed social setting keys
      for (const key of Object.keys(body)) {
        if (!/^social_(whatsapp|instagram|x|facebook)_(url|enabled|icon)$/.test(key)) {
          return reply.status(400).send({ error: `Invalid social setting key: ${key}` });
        }
      }

      await updateSocialSettings(body, request.user.id);
      return getSocialSettingsAdmin();
    }
  );

  app.put(
    '/api/admin/settings/site',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (request, reply) => {
      if (hasPrototypePollution(request.body)) {
        return reply.status(400).send({ error: 'Illegal object keys detected (prototype pollution attempt)' });
      }

      const body = z
        .record(z.string().trim().max(2000, 'Setting value exceeds maximum length of 2000 characters'))
        .parse(request.body);

      // Enforce strict key whitelist
      for (const [key, value] of Object.entries(body)) {
        if (!ALLOWED_SITE_KEYS.has(key)) {
          return reply.status(400).send({ error: `Disallowed or unknown site setting key: ${key}` });
        }
        await supabase
          .from('site_settings')
          .upsert({ key, value, updated_by: request.user.id });
      }

      if ('favicon_url' in body) {
        invalidateFaviconCache();
      }

      return getPublicSettings();
    }
  );

  app.post(
    '/api/admin/settings/favicon',
    { preHandler: [authenticate, requireRole('ADMIN')], config: { rateLimit: UPLOAD_RATE_LIMIT } },
    async (request, reply) => {
      const data = await request.file();
      if (!data) return reply.status(400).send({ error: 'No file uploaded' });

      if (data.file.truncated) {
        return reply.status(413).send({ error: 'Favicon file exceeds maximum size of 5 MB' });
      }

      const buffer = await data.toBuffer();
      const validation = validateUploadFile(data.filename, data.mimetype, buffer.length, {
        maxSizeBytes: 5 * 1024 * 1024,
        allowedTypes: ALLOWED_IMAGE_TYPES,
        buffer,
      });

      if (!validation.valid) {
        return reply.status(400).send({ error: validation.error || 'Invalid icon file. Must be PNG, JPEG, WEBP, or ICO' });
      }

      const { url } = await uploadToCloudinary(buffer, { folder: 'gstbro/favicon' });

      await supabase.from('site_settings').upsert({
        key: 'favicon_url',
        value: url,
        updated_by: request.user.id,
      });

      invalidateFaviconCache();

      return { faviconUrl: url };
    }
  );

  app.post(
    '/api/admin/settings/logo',
    { preHandler: [authenticate, requireRole('ADMIN')], config: { rateLimit: UPLOAD_RATE_LIMIT } },
    async (request, reply) => {
      const data = await request.file();
      if (!data) return reply.status(400).send({ error: 'No file uploaded' });

      if (data.file.truncated) {
        return reply.status(413).send({ error: 'Logo file exceeds maximum size of 5 MB' });
      }

      const buffer = await data.toBuffer();
      const validation = validateUploadFile(data.filename, data.mimetype, buffer.length, {
        maxSizeBytes: 5 * 1024 * 1024,
        allowedTypes: ALLOWED_IMAGE_TYPES,
        buffer,
      });

      if (!validation.valid) {
        return reply.status(400).send({ error: validation.error || 'Invalid logo image. Must be PNG, JPEG, or WEBP' });
      }

      const { url } = await uploadToCloudinary(buffer, { folder: 'gstbro/logo' });
      await supabase.from('site_settings').upsert({ key: 'logo_url', value: url, updated_by: request.user.id });
      return { logoUrl: url };
    }
  );

  app.get(
    '/api/admin/seo',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (_request, reply) => {
      applyNoCacheHeaders(reply);
      const { data } = await supabase.from('page_seo').select('*').order('route_path');
      return { pages: data ?? [] };
    }
  );

  app.put(
    '/api/admin/seo/:path',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (request) => {
      const { path } = request.params as { path: string };
      const decodedPath = decodeURIComponent(path);
      safePathSchema.parse(decodedPath);

      const body = z
        .object({
          meta_title: z.string().trim().max(200, 'Title exceeds 200 characters').optional(),
          meta_description: z.string().trim().max(500, 'Description exceeds 500 characters').optional(),
          meta_keywords: z.string().trim().max(300, 'Keywords exceed 300 characters').optional(),
          og_title: z.string().trim().max(200, 'OG title exceeds 200 characters').optional(),
          og_description: z.string().trim().max(500, 'OG description exceeds 500 characters').optional(),
          og_image_url: z.string().trim().url('Invalid image URL').max(1000).optional().or(z.literal('')),
          canonical_url: z.string().trim().url('Invalid canonical URL').max(1000).optional().or(z.literal('')),
          robots: z.string().trim().max(100, 'Robots exceeds 100 characters').optional(),
        })
        .strict()
        .parse(request.body);

      const seo = await updateSeoForPath(decodedPath, body, request.user.id);
      return { seo };
    }
  );
}
