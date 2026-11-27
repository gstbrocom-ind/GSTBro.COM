import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase.js';

export type HsnSacType = 'HSN' | 'SAC';
export type HsnSacSource = 'portal_upload' | 'curated' | 'admin_override';

export interface ParsedHsnSacRow {
  code: string;
  type: HsnSacType;
  description: string;
  category: string | null;
  gst_rate: number | null;
  keywords: string[];
  note: string | null;
  source: HsnSacSource;
}

export interface SearchHsnSacParams {
  q?: string;
  type?: 'ALL' | HsnSacType;
  rate?: 'ALL' | number;
  page?: number;
  limit?: number;
}

const VALID_GST_RATES = new Set([0, 0.25, 3, 5, 18, 40]);

function normalizeHeader(h: unknown): string {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseOptionalRate(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const cleaned = String(val).replace(/%/g, '').trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return null;
  if (VALID_GST_RATES.has(num)) return num;
  return num >= 0 && num <= 100 ? num : null;
}

function parseKeywords(val: unknown): string[] {
  if (!val) return [];
  return String(val)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}

/**
 * Parse an uploaded GST Portal Excel (.xlsx/.xls) or CSV buffer into normalized HSN & SAC rows.
 * Supports:
 * - Official GST Portal sheets: HSN_MSTR (HSN_CD, HSN_Description) & SAC_MSTR (SAC_CD, SAC_Description)
 * - Generic sheets with code/description (+ optional type, gst_rate, category, keywords, note)
 */
export function parseHsnSacWorkbook(buffer: Buffer): {
  rows: ParsedHsnSacRow[];
  hsnCount: number;
  sacCount: number;
  skippedCount: number;
  sheetsProcessed: string[];
} {
  const workbook = XLSX.read(buffer, { type: 'buffer', raw: false });
  const deduped = new Map<string, ParsedHsnSacRow>();
  let skippedCount = 0;
  const sheetsProcessed: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
    if (matrix.length < 2) continue;

    // Find header row in first 5 rows
    let headerIdx = -1;
    let headers: string[] = [];
    for (let i = 0; i < Math.min(5, matrix.length); i++) {
      const candidate = (matrix[i] || []).map(normalizeHeader);
      const hasCode = candidate.some((h) =>
        ['hsn_cd', 'sac_cd', 'code', 'hsn_code', 'sac_code', 'hsn', 'sac'].includes(h)
      );
      const hasDesc = candidate.some((h) =>
        ['hsn_description', 'sac_description', 'description', 'desc', 'item_description'].includes(h)
      );
      if (hasCode && hasDesc) {
        headerIdx = i;
        headers = candidate;
        break;
      }
    }

    if (headerIdx === -1) continue;
    sheetsProcessed.push(sheetName);

    const sheetUpper = sheetName.toUpperCase();
    const defaultTypeFromSheet: HsnSacType | null = sheetUpper.includes('SAC')
      ? 'SAC'
      : sheetUpper.includes('HSN')
        ? 'HSN'
        : null;

    const idxHsnCd = headers.findIndex((h) => ['hsn_cd', 'hsn_code', 'hsn'].includes(h));
    const idxSacCd = headers.findIndex((h) => ['sac_cd', 'sac_code', 'sac'].includes(h));
    const idxGenericCd = headers.findIndex((h) => h === 'code');
    const idxType = headers.findIndex((h) => h === 'type');
    const idxDesc = headers.findIndex((h) =>
      ['hsn_description', 'sac_description', 'description', 'desc', 'item_description'].includes(h)
    );
    const idxRate = headers.findIndex((h) => ['gst_rate', 'rate', 'igst', 'gst', 'tax_rate'].includes(h));
    const idxCat = headers.findIndex((h) => ['category', 'chapter', 'group'].includes(h));
    const idxKw = headers.findIndex((h) => ['keywords', 'tags'].includes(h));
    const idxNote = headers.findIndex((h) => ['note', 'remarks'].includes(h));

    for (let r = headerIdx + 1; r < matrix.length; r++) {
      const row = matrix[r];
      if (!row || row.length === 0) continue;

      let code = '';
      let inferredType: HsnSacType | null = defaultTypeFromSheet;

      if (idxHsnCd !== -1 && String(row[idxHsnCd] ?? '').trim()) {
        code = String(row[idxHsnCd]).trim();
        inferredType = 'HSN';
      } else if (idxSacCd !== -1 && String(row[idxSacCd] ?? '').trim()) {
        code = String(row[idxSacCd]).trim();
        inferredType = 'SAC';
      } else if (idxGenericCd !== -1 && String(row[idxGenericCd] ?? '').trim()) {
        code = String(row[idxGenericCd]).trim();
      }

      if (!code) {
        skippedCount++;
        continue;
      }

      if (idxType !== -1) {
        const rawType = String(row[idxType] ?? '').trim().toUpperCase();
        if (rawType === 'HSN' || rawType === 'SAC') {
          inferredType = rawType;
        }
      }

      if (!inferredType) {
        inferredType = code.startsWith('99') ? 'SAC' : 'HSN';
      }

      const description = idxDesc !== -1 ? String(row[idxDesc] ?? '').trim() : '';
      if (!description) {
        skippedCount++;
        continue;
      }

      const gstRate = idxRate !== -1 ? parseOptionalRate(row[idxRate]) : null;
      const category = idxCat !== -1 ? String(row[idxCat] ?? '').trim() || null : null;
      const keywords = idxKw !== -1 ? parseKeywords(row[idxKw]) : [];
      const note = idxNote !== -1 ? String(row[idxNote] ?? '').trim() || null : null;

      const key = `${inferredType}:${code.toUpperCase()}`;
      deduped.set(key, {
        code,
        type: inferredType,
        description,
        category,
        gst_rate: gstRate,
        keywords,
        note,
        source: 'portal_upload',
      });
    }
  }

  const rows = Array.from(deduped.values());
  let hsnCount = 0;
  let sacCount = 0;
  for (const r of rows) {
    if (r.type === 'HSN') hsnCount++;
    else sacCount++;
  }

  return { rows, hsnCount, sacCount, skippedCount, sheetsProcessed };
}

/**
 * Import parsed HSN/SAC rows into Supabase in batches.
 * In 'upsert' mode, preserves existing gst_rate/category/keywords/note when the incoming portal row has null/empty values.
 */
export async function importHsnSacRows(
  rows: ParsedHsnSacRow[],
  options: {
    mode: 'upsert' | 'replace';
    fileName?: string;
    updatedUpTo?: string;
    userId?: string;
  }
): Promise<{ totalProcessed: number; hsnCount: number; sacCount: number }> {
  if (rows.length === 0) {
    throw new Error('No valid HSN or SAC rows found in the uploaded file.');
  }

  if (options.mode === 'replace') {
    const { error: delErr } = await supabase
      .from('hsn_sac_codes')
      .delete()
      .eq('source', 'portal_upload');
    if (delErr) {
      throw new Error(`Failed to clear existing portal HSN/SAC rows: ${delErr.message}`);
    }
  }

  // Load existing rate/curated metadata so raw portal uploads (without rates) do not wipe mapped GST rates
  const existingRateMap = new Map<
    string,
    { gst_rate: number | null; category: string | null; keywords: string[]; note: string | null; source: string }
  >();

  let offset = 0;
  const fetchSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('hsn_sac_codes')
      .select('type, code, gst_rate, category, keywords, note, source')
      .not('gst_rate', 'is', null)
      .range(offset, offset + fetchSize - 1);

    if (error) {
      throw new Error(`Database error reading existing rates: ${error.message}`);
    }
    if (!data || data.length === 0) break;
    for (const item of data) {
      existingRateMap.set(`${item.type}:${String(item.code).toUpperCase()}`, {
        gst_rate: item.gst_rate,
        category: item.category,
        keywords: item.keywords || [],
        note: item.note,
        source: item.source,
      });
    }
    if (data.length < fetchSize) break;
    offset += fetchSize;
  }

  const nowIso = new Date().toISOString();
  const payload = rows.map((row) => {
    const existing = existingRateMap.get(`${row.type}:${row.code.toUpperCase()}`);
    return {
      code: row.code,
      type: row.type,
      description: row.description,
      category: row.category ?? existing?.category ?? null,
      gst_rate: row.gst_rate ?? existing?.gst_rate ?? null,
      keywords: row.keywords.length > 0 ? row.keywords : existing?.keywords ?? [],
      note: row.note ?? existing?.note ?? null,
      source: existing?.source === 'admin_override' ? 'admin_override' : row.source,
      is_active: true,
      updated_at: nowIso,
    };
  });

  const BATCH_SIZE = 500;
  for (let i = 0; i < payload.length; i += BATCH_SIZE) {
    const batch = payload.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('hsn_sac_codes')
      .upsert(batch, { onConflict: 'type,code' });
    if (error) {
      throw new Error(`Batch upsert failed at row ${i}: ${error.message}`);
    }
  }

  const settingsUpdates: { key: string; value: string; updated_by?: string }[] = [
    { key: 'hsn_sac_last_upload_at', value: nowIso, updated_by: options.userId },
  ];
  if (options.fileName) {
    settingsUpdates.push({ key: 'hsn_sac_last_upload_file', value: options.fileName, updated_by: options.userId });
  }
  if (options.updatedUpTo?.trim()) {
    settingsUpdates.push({ key: 'hsn_sac_updated_up_to', value: options.updatedUpTo.trim(), updated_by: options.userId });
  }

  for (const s of settingsUpdates) {
    await supabase.from('site_settings').upsert(s);
  }

  let hsnCount = 0;
  let sacCount = 0;
  for (const r of rows) {
    if (r.type === 'HSN') hsnCount++;
    else sacCount++;
  }

  return { totalProcessed: rows.length, hsnCount, sacCount };
}

export async function getHsnSacStats() {
  const [totalRes, hsnRes, sacRes, ratedRes, settingsRes] = await Promise.all([
    supabase.from('hsn_sac_codes').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('hsn_sac_codes').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('type', 'HSN'),
    supabase.from('hsn_sac_codes').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('type', 'SAC'),
    supabase.from('hsn_sac_codes').select('id', { count: 'exact', head: true }).eq('is_active', true).not('gst_rate', 'is', null),
    supabase
      .from('site_settings')
      .select('key, value')
      .in('key', [
        'hsn_sac_updated_up_to',
        'hsn_sac_schedule_note',
        'hsn_sac_last_upload_file',
        'hsn_sac_last_upload_at',
      ]),
  ]);

  const map: Record<string, string> = {};
  for (const row of settingsRes.data || []) {
    map[row.key] = row.value;
  }

  return {
    totalCount: totalRes.count ?? 0,
    hsnCount: hsnRes.count ?? 0,
    sacCount: sacRes.count ?? 0,
    ratedCount: ratedRes.count ?? 0,
    updatedUpTo: map.hsn_sac_updated_up_to || '27 Nov 2026',
    scheduleNote:
      map.hsn_sac_schedule_note ||
      'GST 2.0 — Post 56th & 57th GST Council Reforms (0%, 3%, 5%, 18%, 40%)',
    lastUploadFile: map.hsn_sac_last_upload_file || null,
    lastUploadAt: map.hsn_sac_last_upload_at || null,
  };
}

export async function searchHsnSacCodes(params: SearchHsnSacParams) {
  const q = (params.q || '').trim();
  const type = params.type && params.type !== 'ALL' ? params.type : null;
  const rate = typeof params.rate === 'number' ? params.rate : null;
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(50, Math.max(1, params.limit || 25));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Never dump all 22k+ rows when no search query and no filters are provided
  if (!q && !type && rate === null) {
    const stats = await getHsnSacStats();
    return {
      items: [],
      totalMatches: 0,
      page,
      limit,
      totalPages: 0,
      requireFilter: true,
      stats,
    };
  }

  let query = supabase
    .from('hsn_sac_codes')
    .select('code, type, description, category, gst_rate, keywords, note, source', { count: 'exact' })
    .eq('is_active', true);

  if (type) {
    query = query.eq('type', type);
  }
  if (rate !== null) {
    query = query.eq('gst_rate', rate);
  }
  if (q) {
    // Escape commas/parens that could break PostgREST .or() syntax
    const safeQ = q.replace(/[,()]/g, ' ').trim();
    if (safeQ) {
      query = query.or(
        `code.ilike.${safeQ}%,description.ilike.%${safeQ}%,category.ilike.%${safeQ}%`
      );
    }
  }

  const { data, count, error } = await query
    .order('code', { ascending: true })
    .range(from, to);

  if (error) {
    throw new Error(`Search failed: ${error.message}`);
  }

  const totalMatches = count ?? 0;
  return {
    items: (data || []).map((row) => ({
      code: row.code,
      type: row.type as HsnSacType,
      description: row.description,
      category: row.category || (row.type === 'HSN' ? 'Goods (HSN Master)' : 'Services (SAC Master)'),
      gstRate: row.gst_rate !== null && row.gst_rate !== undefined ? Number(row.gst_rate) : null,
      keywords: Array.isArray(row.keywords) ? row.keywords : [],
      note: row.note || undefined,
      source: row.source,
    })),
    totalMatches,
    page,
    limit,
    totalPages: Math.ceil(totalMatches / limit),
    requireFilter: false,
  };
}
