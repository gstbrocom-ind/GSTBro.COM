import crypto from 'crypto';
import { supabase } from '../lib/supabase.js';

export interface WelcomeCode {
  id: string;
  code: string;
  note: string | null;
  created_by?: string | null;
  firm_id?: string | null;
  target_role?: 'CLIENT' | 'CA_FIRM' | null;
  firm_name?: string | null;
  used: boolean;
  used_by_user_id?: string | null;
  used_by_email?: string | null;
  used_by_name?: string | null;
  used_at?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GenerateCodesOptions {
  count?: number;
  length?: number;
  charset?: 'ALPHANUMERIC' | 'NUMBERS_ONLY' | 'UPPERCASE_ONLY' | 'SPECIAL_CHARS' | 'CUSTOM';
  customCode?: string;
  note?: string;
  expiresInDays?: number | null;
  targetRole?: 'CLIENT' | 'CA_FIRM';
  firmName?: string;
  firmId?: string | null;
}

const SETTINGS_KEY = 'welcome_codes_store';

// In-memory fallback cache if Supabase table is unreachable
let memoryCodesCache: WelcomeCode[] = [];

/**
 * Validates whether string is a valid UUID
 */
function isValidUuid(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

/**
 * Encodes firm_id & target_role metadata into note string as a reliable fallback
 * in case custom schema columns (firm_id, target_role) are missing in the DB table.
 */
export function encodeMetadataInNote(
  note: string | null | undefined,
  firmId?: string | null,
  targetRole?: string | null,
  firmName?: string | null
): string {
  const metaObj: Record<string, string> = {};
  if (targetRole) metaObj.role = targetRole;
  if (firmId) metaObj.firm = firmId;
  if (firmName) metaObj.name = firmName;

  const tag = Object.keys(metaObj).length > 0
    ? `[META:${JSON.stringify(metaObj)}]`
    : '';

  let baseNote = note?.trim() || '';
  baseNote = baseNote.replace(/\[META:\{.*?\}\]\s*/g, '');

  return tag ? `${tag} ${baseNote}`.trim() : baseNote;
}

/**
 * Parses firm_id & target_role metadata from note string
 */
export function parseMetadataFromNote(rawNote: string | null | undefined): {
  note: string | null;
  firmId: string | null;
  targetRole: 'CLIENT' | 'CA_FIRM' | null;
  firmName: string | null;
} {
  if (!rawNote) return { note: null, firmId: null, targetRole: null, firmName: null };

  let firmId: string | null = null;
  let targetRole: 'CLIENT' | 'CA_FIRM' | null = null;
  let firmName: string | null = null;
  let cleanNote = rawNote;

  const metaMatch = cleanNote.match(/\[META:(\{.*?\})\]/);
  if (metaMatch) {
    try {
      const parsed = JSON.parse(metaMatch[1]);
      if (parsed.firm) firmId = parsed.firm;
      if (parsed.role) targetRole = parsed.role;
      if (parsed.name) firmName = parsed.name;
      cleanNote = cleanNote.replace(metaMatch[0], '').trim();
    } catch {}
  }

  if (!targetRole && (cleanNote.includes('[CA_FIRM]') || cleanNote.includes('ROLE:CA_FIRM'))) {
    targetRole = 'CA_FIRM';
  }

  return { note: cleanNote || null, firmId, targetRole, firmName };
}

/**
 * Helper to generate random code with specific length & charset
 */
export function generateRandomCode(length: number = 6, charsetType: string = 'UPPERCASE_ONLY'): string {
  const safeLength = Math.max(5, Math.min(10, length));

  let chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Clean unambiguous uppercase alphanumeric
  if (charsetType === 'NUMBERS_ONLY') {
    chars = '0123456789';
  } else if (charsetType === 'ALPHANUMERIC') {
    chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
  } else if (charsetType === 'SPECIAL_CHARS') {
    chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ#$@!';
  }

  const bytes = crypto.randomBytes(safeLength);
  let result = '';
  for (let i = 0; i < safeLength; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/**
 * Fetch all welcome codes from DB with seamless fallback & merging
 */
export async function getAllWelcomeCodes(): Promise<WelcomeCode[]> {
  const codesMap = new Map<string, WelcomeCode>();

  // 1. Fetch from database table
  try {
    const { data, error } = await supabase
      .from('welcome_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      for (const r of data as any[]) {
        const parsedMeta = parseMetadataFromNote(r.note);
        const isCa =
          r.code?.startsWith('CA-') ||
          (r.note && r.note.includes('[CA_FIRM]')) ||
          parsedMeta.targetRole === 'CA_FIRM';

        const codeItem: WelcomeCode = {
          id: r.id,
          code: r.code,
          note: parsedMeta.note || r.note,
          created_by: r.created_by,
          firm_id: r.firm_id || parsedMeta.firmId || null,
          target_role: r.target_role || parsedMeta.targetRole || (isCa ? 'CA_FIRM' : 'CLIENT'),
          firm_name: r.firm_name || parsedMeta.firmName || null,
          used: Boolean(r.used),
          used_by_user_id: r.used_by_user_id || null,
          used_by_email: r.used_by_email || null,
          used_by_name: r.used_by_name || null,
          used_at: r.used_at || null,
          expires_at: r.expires_at || null,
          created_at: r.created_at,
          updated_at: r.updated_at,
        };
        codesMap.set(codeItem.code.toUpperCase(), codeItem);
      }
    }
  } catch (err) {
    console.warn('[WELCOME CODES] DB fetch warning:', err);
  }

  // 2. Fetch from site_settings fallback store & merge any missing codes
  try {
    const { data: storeSetting } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle();

    if (storeSetting?.value) {
      const parsed = JSON.parse(storeSetting.value);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const key = item.code?.toUpperCase();
          if (key && !codesMap.has(key)) {
            codesMap.set(key, item);

            // Opportunistically backfill this code into the DB table so it's permanently in SQL!
            const validAdmin = isValidUuid(item.created_by) ? item.created_by : null;
            void Promise.resolve(
              supabase.from('welcome_codes').insert({
                id: item.id || crypto.randomUUID(),
                code: item.code,
                note: encodeMetadataInNote(item.note, item.firm_id, item.target_role, item.firm_name),
                created_by: validAdmin,
                used: Boolean(item.used),
                expires_at: item.expires_at || null,
                created_at: item.created_at || new Date().toISOString(),
                updated_at: item.updated_at || new Date().toISOString(),
              })
            ).catch(() => {});
          }
        }
      }
    }
  } catch {}

  // 3. Merge in-memory cache
  for (const mem of memoryCodesCache) {
    const key = mem.code?.toUpperCase();
    if (key && !codesMap.has(key)) {
      codesMap.set(key, mem);
    }
  }

  const all = Array.from(codesMap.values());
  all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return all;
}

/**
 * Save codes to fallback site_settings store if table is missing or partial
 */
async function saveToFallbackStore(codes: WelcomeCode[]): Promise<void> {
  memoryCodesCache = codes;
  try {
    const serialized = JSON.stringify(codes);
    const { data: existing } = await supabase
      .from('site_settings')
      .select('key')
      .eq('key', SETTINGS_KEY)
      .maybeSingle();

    if (existing) {
      await supabase.from('site_settings').update({ value: serialized }).eq('key', SETTINGS_KEY);
    } else {
      await supabase.from('site_settings').insert({ key: SETTINGS_KEY, value: serialized });
    }
  } catch (err) {
    console.warn('Fallback store save warning', err);
  }
}

/**
 * Generate and persist one or more welcome codes
 */
export async function createWelcomeCodes(
  adminId: string,
  options: GenerateCodesOptions = {}
): Promise<{ created: WelcomeCode[]; count: number }> {
  const count = Math.max(1, Math.min(50, options.count || 1));
  const length = Math.max(5, Math.min(10, options.length || 6));
  const isCa = options.targetRole === 'CA_FIRM';
  const firmName = options.firmName?.trim() || null;
  let formattedNote = options.note?.trim() || null;

  if (isCa) {
    const caPrefix = firmName ? `[CA_FIRM] Practice: ${firmName}` : '[CA_FIRM] For CA / Tax Consultant Registration';
    formattedNote = formattedNote ? `${caPrefix} | ${formattedNote}` : caPrefix;
  }

  let expiresAt: string | null = null;
  if (options.expiresInDays && options.expiresInDays > 0) {
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + options.expiresInDays);
    expiresAt = expDate.toISOString();
  }

  const existingCodes = await getAllWelcomeCodes();
  const existingSet = new Set(existingCodes.map((c) => c.code.toUpperCase()));

  const newCodes: WelcomeCode[] = [];
  const now = new Date().toISOString();

  if (options.charset === 'CUSTOM' && options.customCode) {
    let cleanCustom = options.customCode.trim().toUpperCase();
    if (isCa && !cleanCustom.startsWith('CA-')) {
      cleanCustom = `CA-${cleanCustom}`;
    }
    if (cleanCustom.length < 5 || cleanCustom.length > 16) {
      throw new Error('Custom welcome code must be between 5 and 16 characters');
    }
    if (existingSet.has(cleanCustom)) {
      throw new Error(`Welcome code "${cleanCustom}" already exists`);
    }

    const item: WelcomeCode = {
      id: crypto.randomUUID(),
      code: cleanCustom,
      note: formattedNote,
      firm_id: options.firmId || null,
      target_role: isCa ? 'CA_FIRM' : 'CLIENT',
      firm_name: firmName,
      created_by: adminId,
      used: false,
      used_by_user_id: null,
      used_by_email: null,
      used_by_name: null,
      used_at: null,
      expires_at: expiresAt,
      created_at: now,
      updated_at: now,
    };
    newCodes.push(item);
  } else {
    for (let i = 0; i < count; i++) {
      let code = '';
      let attempts = 0;
      do {
        const rand = generateRandomCode(length, options.charset || 'UPPERCASE_ONLY');
        code = isCa ? `CA-${rand}` : rand;
        attempts++;
      } while ((existingSet.has(code) || newCodes.some((c) => c.code === code)) && attempts < 100);

      newCodes.push({
        id: crypto.randomUUID(),
        code,
        note: formattedNote,
        firm_id: options.firmId || null,
        target_role: isCa ? 'CA_FIRM' : 'CLIENT',
        firm_name: firmName,
        created_by: adminId,
        used: false,
        used_by_user_id: null,
        used_by_email: null,
        used_by_name: null,
        used_at: null,
        expires_at: expiresAt,
        created_at: now,
        updated_at: now,
      });
    }
  }

  const validAdminId = isValidUuid(adminId) ? adminId : null;

  // 1. Prepare base rows (guaranteed to match base welcome_codes schema without failing)
  const baseRows = newCodes.map((c) => ({
    id: c.id,
    code: c.code,
    note: encodeMetadataInNote(c.note, c.firm_id, c.target_role, c.firm_name),
    created_by: validAdminId,
    used: false,
    expires_at: c.expires_at,
    created_at: c.created_at,
    updated_at: c.updated_at,
  }));

  // 2. Prepare full rows (with firm_id & target_role columns if available)
  const fullRows = newCodes.map((c) => ({
    ...baseRows.find((b) => b.id === c.id)!,
    firm_id: c.firm_id || null,
    target_role: c.target_role || (isCa ? 'CA_FIRM' : 'CLIENT'),
  }));

  let insertedViaTable = false;

  // Try inserting with full schema first
  try {
    const { error: fullErr } = await supabase.from('welcome_codes').insert(fullRows);
    if (!fullErr) {
      insertedViaTable = true;
    } else {
      console.warn('[WELCOME CODES] Full insert error (columns may not exist yet):', fullErr.message);
    }
  } catch {}

  // If full insert failed (e.g. column firm_id / target_role does not exist), insert via base schema
  if (!insertedViaTable) {
    try {
      const { error: baseErr } = await supabase.from('welcome_codes').insert(baseRows);
      if (!baseErr) {
        insertedViaTable = true;
      } else {
        console.warn('[WELCOME CODES] Base insert error:', baseErr.message);
        // If error was foreign key on created_by, retry with created_by: null
        if (baseErr.code === '23503' || baseErr.message?.includes('created_by')) {
          const noCreatedByRows = baseRows.map((r) => ({ ...r, created_by: null }));
          const { error: retryErr } = await supabase.from('welcome_codes').insert(noCreatedByRows);
          if (!retryErr) {
            insertedViaTable = true;
          }
        }
      }
    } catch (err) {
      console.error('[WELCOME CODES] DB insert exception:', err);
    }
  }

  // Backup to fallback store as well
  const updatedList = [...newCodes, ...existingCodes];
  await saveToFallbackStore(updatedList);

  return { created: newCodes, count: newCodes.length };
}

/**
 * Verify if a welcome code is valid for new account registration
 */
export async function verifyWelcomeCode(codeRaw: string): Promise<{
  valid: boolean;
  error?: string;
  codeRecord?: WelcomeCode;
  isCaFirm?: boolean;
  firmId?: string;
  firmName?: string;
}> {
  if (!codeRaw || typeof codeRaw !== 'string') {
    return { valid: false, error: 'A Welcome Code is required to create an account' };
  }

  const clean = codeRaw.trim().toUpperCase();
  if (clean.length < 4 || clean.length > 16) {
    return { valid: false, error: 'Welcome Code must be between 4 and 16 characters' };
  }

  // 1. Check Supabase table
  let record: WelcomeCode | null = null;
  try {
    const { data } = await supabase
      .from('welcome_codes')
      .select('*')
      .ilike('code', clean)
      .maybeSingle();

    if (data) {
      const parsedMeta = parseMetadataFromNote(data.note);
      record = {
        ...data,
        firm_id: data.firm_id || parsedMeta.firmId || null,
        target_role: data.target_role || parsedMeta.targetRole || (data.code?.startsWith('CA-') ? 'CA_FIRM' : 'CLIENT'),
        firm_name: data.firm_name || parsedMeta.firmName || null,
        note: parsedMeta.note || data.note,
      } as WelcomeCode;
    }
  } catch (err) {
    // Fallback
  }

  // 2. Check fallback store
  if (!record) {
    const all = await getAllWelcomeCodes();
    const found = all.find((c) => c.code.toUpperCase() === clean);
    if (found) {
      record = found;
    }
  }

  if (!record) {
    return { valid: false, error: 'Invalid Welcome Code. Registration is by invite only' };
  }

  if (record.used) {
    return {
      valid: false,
      error: `This Welcome Code was already used on ${record.used_at ? new Date(record.used_at).toLocaleDateString('en-IN') : 'an earlier date'}`,
    };
  }

  if (record.expires_at) {
    const exp = new Date(record.expires_at).getTime();
    if (Date.now() > exp) {
      return { valid: false, error: 'This Welcome Code has expired' };
    }
  }

  let firmName: string | undefined = record.firm_name || undefined;
  if (record.firm_id && !firmName) {
    try {
      const { data: firm } = await supabase
        .from('firms')
        .select('name')
        .eq('id', record.firm_id)
        .maybeSingle();
      if (firm?.name) {
        firmName = firm.name;
      }
    } catch {}
  }

  const isCaFirm =
    record.target_role === 'CA_FIRM' ||
    record.code.startsWith('CA-') ||
    Boolean(record.note && (record.note.includes('[CA_FIRM]') || record.note.includes('ROLE:CA_FIRM')));

  return {
    valid: true,
    codeRecord: record,
    isCaFirm,
    firmId: record.firm_id || undefined,
    firmName,
  };
}

/**
 * Mark a welcome code as used / redeemed upon successful registration
 */
export async function consumeWelcomeCode(
  codeRaw: string,
  user: { id: string; email: string; name: string }
): Promise<boolean> {
  const clean = codeRaw.trim().toUpperCase();
  const now = new Date().toISOString();

  // Try DB table update
  try {
    const { data, error } = await supabase
      .from('welcome_codes')
      .update({
        used: true,
        used_by_user_id: user.id,
        used_by_email: user.email,
        used_by_name: user.name,
        used_at: now,
        updated_at: now,
      })
      .ilike('code', clean)
      .select();

    if (!error && data && data.length > 0) {
      return true;
    }
  } catch (err) {
    // Fallback to memory
  }

  // Update in fallback store
  const all = await getAllWelcomeCodes();
  let found = false;
  const updated = all.map((c) => {
    if (c.code.toUpperCase() === clean && !c.used) {
      found = true;
      return {
        ...c,
        used: true,
        used_by_user_id: user.id,
        used_by_email: user.email,
        used_by_name: user.name,
        used_at: now,
        updated_at: now,
      };
    }
    return c;
  });

  if (found) {
    await saveToFallbackStore(updated);
    return true;
  }

  return false;
}

/**
 * Super Admin helper: when a CA Firm registers using a Welcome Code,
 * automatically create their multi-tenant practice workspace.
 */
export async function provisionCaFirmOnRegistration(
  user: {
    id: string;
    email: string;
    name: string;
    phone?: string | null;
    practice_type?: string | null;
    constitution_type?: string | null;
    membership_number?: string | null;
    business_name?: string | null;
    gstin?: string | null;
  },
  codeRecord?: WelcomeCode
): Promise<{ firmId: string; firmName: string } | null> {
  try {
    // 1. Determine firm practice name
    const firmName =
      codeRecord?.firm_name ||
      user.business_name ||
      (user.practice_type === 'CHARTERED_ACCOUNTANT'
        ? `${user.name} & Associates, Chartered Accountants`
        : user.practice_type === 'TAX_CONSULTANT'
        ? `${user.name} & Co. Tax Consultancy`
        : `${user.name} & Associates`);

    // 2. Check if firm already exists for this email
    const { data: existingFirm } = await supabase
      .from('firms')
      .select('id, name')
      .eq('email', user.email.toLowerCase())
      .maybeSingle();

    if (existingFirm) {
      return { firmId: existingFirm.id, firmName: existingFirm.name };
    }

    // 3. Create newly provisioned multi-tenant firm practice record
    const { data: newFirm, error: firmErr } = await supabase
      .from('firms')
      .insert({
        name: firmName,
        email: user.email.toLowerCase(),
        phone: user.phone || null,
        gstin: user.gstin || null,
        practice_type: user.practice_type || 'CHARTERED_ACCOUNTANT',
        constitution_type: user.constitution_type || 'PROPRIETORSHIP',
        membership_number: user.membership_number || null,
        owner_id: user.id,
        status: 'ACTIVE',
      })
      .select()
      .single();

    if (firmErr || !newFirm) {
      console.error('Failed to auto-provision CA firm during registration', firmErr);
      return null;
    }

    // 4. Update user role and associate with newly created firm
    await supabase
      .from('users')
      .update({
        role: 'FIRM_OWNER',
        firm_id: newFirm.id,
        firm_role: 'FIRM_OWNER',
        practice_type: user.practice_type || null,
        constitution_type: user.constitution_type || null,
        membership_number: user.membership_number || null,
      })
      .eq('id', user.id);

    return { firmId: newFirm.id, firmName: newFirm.name };
  } catch (err) {
    console.error('Error in provisionCaFirmOnRegistration', err);
    return null;
  }
}

/**
 * Revoke or delete an unused welcome code
 */
export async function revokeWelcomeCode(id: string): Promise<boolean> {
  try {
    await supabase
      .from('welcome_codes')
      .delete()
      .eq('id', id)
      .eq('used', false);
  } catch (err) {
    // Fallback
  }

  const all = await getAllWelcomeCodes();
  const filtered = all.filter((c) => !(c.id === id && !c.used));
  await saveToFallbackStore(filtered);
  memoryCodesCache = filtered;
  return true;
}

/**
 * Get comprehensive statistics for Welcome Codes
 */
export async function getWelcomeCodesSummary(options?: {
  firmId?: string | null;
  targetRole?: 'CLIENT' | 'CA_FIRM';
}): Promise<{
  total: number;
  available: number;
  used: number;
  expired: number;
  redemptionRate: number;
  codes: WelcomeCode[];
  supportPhone?: string;
}> {
  let codes = await getAllWelcomeCodes();

  // Filter by firmId if specified (for CA Firm Portal)
  if (options?.firmId) {
    codes = codes.filter((c) => c.firm_id === options.firmId && !c.code.startsWith('CA-'));
  } else if (options?.targetRole === 'CA_FIRM') {
    // For Super Admin: show CA Firm codes (or legacy codes with no firm_id)
    codes = codes.filter(
      (c) =>
        c.target_role === 'CA_FIRM' ||
        c.code.startsWith('CA-') ||
        (c.note && (c.note.includes('[CA_FIRM]') || c.note.includes('ROLE:CA_FIRM'))) ||
        !c.firm_id
    );
  }

  const now = Date.now();

  let available = 0;
  let used = 0;
  let expired = 0;

  for (const c of codes) {
    if (c.used) {
      used++;
    } else if (c.expires_at && new Date(c.expires_at).getTime() < now) {
      expired++;
    } else {
      available++;
    }
  }

  const total = codes.length;
  const redemptionRate = total > 0 ? Math.round((used / total) * 100) : 0;

  let supportPhone = '+91 98765 43210';
  try {
    const { data: phoneSetting } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'welcome_code_support_phone')
      .maybeSingle();
    if (phoneSetting?.value) {
      supportPhone = phoneSetting.value;
    }
  } catch {}

  return {
    total,
    available,
    used,
    expired,
    redemptionRate,
    codes,
    supportPhone,
  };
}
