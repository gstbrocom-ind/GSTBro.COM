import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';
import {
  getHsnSacStats,
  importHsnSacRows,
  invalidateHsnSacCache,
  parseHsnSacWorkbook,
  searchHsnSacCodes,
} from '../services/hsnSacService.js';

export const hsnSacRoutes: FastifyPluginAsync = async (app) => {
  // Public search endpoint: never dumps all codes; requires q, type, or rate filter
  app.get('/api/hsn-sac/search', async (request, reply) => {
    const querySchema = z.object({
      q: z.string().trim().max(120).optional().default(''),
      type: z.enum(['ALL', 'HSN', 'SAC']).optional().default('ALL'),
      rate: z.string().trim().optional().default('ALL'),
      page: z.coerce.number().int().min(1).max(500).optional().default(1),
      limit: z.coerce.number().int().min(1).max(50).optional().default(25),
    });

    const parsed = querySchema.parse(request.query);
    let rateFilter: 'ALL' | number = 'ALL';
    if (parsed.rate !== 'ALL' && parsed.rate !== '') {
      const n = Number(parsed.rate);
      if (!Number.isFinite(n)) {
        return reply.status(400).send({ error: 'Invalid GST rate filter' });
      }
      rateFilter = n;
    }

    try {
      const result = await searchHsnSacCodes({
        q: parsed.q,
        type: parsed.type,
        rate: rateFilter,
        page: parsed.page,
        limit: parsed.limit,
      });
      return reply.send(result);
    } catch (err: any) {
      request.log.error(err, 'HSN/SAC search error');
      return reply.status(500).send({ error: err.message || 'Search failed' });
    }
  });

  // Public summary stats (counts + updatedUpTo metadata, no rows)
  app.get('/api/hsn-sac/stats', async (_request, reply) => {
    try {
      const stats = await getHsnSacStats();
      return reply.send(stats);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || 'Failed to load HSN/SAC stats' });
    }
  });

  // Super Admin / Admin protected routes
  app.register(async (adminScope) => {
    adminScope.addHook('preHandler', authenticate);
    adminScope.addHook('preHandler', requireRole('SUPER_ADMIN', 'ADMIN'));

    // Live HSN/SAC catalog stats
    adminScope.get('/api/super-admin/hsn-sac/stats', async (_request, reply) => {
      try {
        const stats = await getHsnSacStats();
        return reply.send(stats);
      } catch (err: any) {
        return reply.status(500).send({ error: err.message || 'Failed to fetch HSN/SAC stats' });
      }
    });

    // Upload Excel (.xlsx / .xls) or CSV (.csv) matching GST Portal format (HSN_MSTR / SAC_MSTR)
    adminScope.post('/api/super-admin/hsn-sac/upload', async (request, reply) => {
      const filePart = await request.file();
      if (!filePart) {
        return reply.status(400).send({ error: 'Please attach an Excel (.xlsx/.xls) or CSV file.' });
      }

      const filename = (filePart.filename || 'upload.xlsx').trim();
      const lower = filename.toLowerCase();
      if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls') && !lower.endsWith('.csv')) {
        return reply.status(400).send({
          error: 'Unsupported file format. Please upload .xlsx, .xls, or .csv.',
        });
      }

      const fields = filePart.fields as Record<string, { value?: string } | undefined>;
      const modeRaw = fields?.mode?.value;
      const mode: 'upsert' | 'replace' = modeRaw === 'replace' ? 'replace' : 'upsert';
      const updatedUpTo = fields?.updatedUpTo?.value?.trim() || undefined;

      const buffer = await filePart.toBuffer();
      if (buffer.length === 0) {
        return reply.status(400).send({ error: 'Uploaded file is empty.' });
      }

      const parsed = parseHsnSacWorkbook(buffer);
      if (parsed.rows.length === 0) {
        return reply.status(400).send({
          error:
            'No valid HSN_CD/HSN_Description or SAC_CD/SAC_Description rows found. Please check your Excel/CSV headers.',
        });
      }

      const summary = await importHsnSacRows(parsed.rows, {
        mode,
        fileName: filename,
        updatedUpTo,
        userId: request.user.id,
      });

      const stats = await getHsnSacStats();
      return reply.send({
        ok: true,
        fileName: filename,
        mode,
        sheetsProcessed: parsed.sheetsProcessed,
        skippedCount: parsed.skippedCount,
        ...summary,
        stats,
      });
    });

    // Single-code add/override in hsn_sac_codes
    adminScope.post('/api/super-admin/hsn-sac/entry', async (request, reply) => {
      const body = z
        .object({
          code: z.string().trim().min(2).max(16),
          type: z.enum(['HSN', 'SAC']),
          description: z.string().trim().min(1).max(600),
          category: z.string().trim().max(120).optional().nullable(),
          gstRate: z.number().min(0).max(100).optional().nullable(),
          keywords: z.array(z.string().trim().max(60)).max(20).optional().default([]),
          note: z.string().trim().max(300).optional().nullable(),
        })
        .parse(request.body);

      const { error } = await supabase.from('hsn_sac_codes').upsert(
        {
          code: body.code,
          type: body.type,
          description: body.description,
          category: body.category || null,
          gst_rate: body.gstRate ?? null,
          keywords: body.keywords,
          note: body.note || null,
          source: 'admin_override',
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'type,code' }
      );

      if (error) {
        return reply.status(500).send({ error: error.message });
      }
      await invalidateHsnSacCache();
      return reply.send({ ok: true });
    });
  });
};
