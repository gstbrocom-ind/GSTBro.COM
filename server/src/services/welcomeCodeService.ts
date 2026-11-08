import crypto from 'crypto';
import { supabase } from '../lib/supabase.js';

export interface WelcomeCode {
  id: string;
  code: string;
  note: string | null;
  created_by?: string | null;
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
}

const SETTINGS_KEY = 'welcome_codes_store';

// In-memory fallback cache if Supabase table is unreachable
let memoryCodesCache: WelcomeCode[] = [];

/**
 * Helper to generate random code with specific length & charset
 */
export function generateRandomCode(length: number = 6, charsetType: string = 'UPPERCASE_ONLY'): string {
  const safeLength = Math.max(5, Math.min(8, length));

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
 * Fetch all welcome codes from DB with fallback to site_settings
 */
export async function getAllWelcomeCodes(): Promise<WelcomeCode[]> {
  try {
    const { data, error } = await supabase
      .from('welcome_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      return data as WelcomeCode[];
    }
  } catch (err) {
    // Table might not exist yet, fallback below
  }

  // Fallback to site_settings JSON store
  try {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle();

    if (data?.value) {
      const parsed = JSON.parse(data.value);
      if (Array.isArray(parsed)) {
        memoryCodesCache = parsed;
        return parsed;
      }
    }
  } catch (err) {
    // Ignore fallback parse error
  }

  return memoryCodesCache;
}

/**
 * Save codes to fallback site_settings store if table is missing
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
  const length = Math.max(5, Math.min(8, options.length || 6));
  const note = options.note?.trim() || null;

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
    const cleanCustom = options.customCode.trim().toUpperCase();
    if (cleanCustom.length < 5 || cleanCustom.length > 8) {
      throw new Error('Custom welcome code must be between 5 and 8 characters');
    }
    if (existingSet.has(cleanCustom)) {
      throw new Error(`Welcome code "${cleanCustom}" already exists`);
    }

    const item: WelcomeCode = {
      id: crypto.randomUUID(),
      code: cleanCustom,
      note,
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
        code = generateRandomCode(length, options.charset || 'UPPERCASE_ONLY');
        attempts++;
      } while ((existingSet.has(code) || newCodes.some((c) => c.code === code)) && attempts < 100);

      newCodes.push({
        id: crypto.randomUUID(),
        code,
        note,
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

  // Try inserting into Supabase table
  let insertedViaTable = false;
  try {
    const { error } = await supabase.from('welcome_codes').insert(newCodes);
    if (!error) {
      insertedViaTable = true;
    }
  } catch (err) {
    // Ignore and fallback
  }

  if (!insertedViaTable) {
    const updatedList = [...newCodes, ...existingCodes];
    await saveToFallbackStore(updatedList);
  }

  return { created: newCodes, count: newCodes.length };
}

/**
 * Verify if a welcome code is valid for new account registration
 */
export async function verifyWelcomeCode(codeRaw: string): Promise<{
  valid: boolean;
  error?: string;
  codeRecord?: WelcomeCode;
}> {
  if (!codeRaw || typeof codeRaw !== 'string') {
    return { valid: false, error: 'A Welcome Code is required to create an account' };
  }

  const clean = codeRaw.trim().toUpperCase();
  if (clean.length < 5 || clean.length > 16) {
    return { valid: false, error: 'Welcome Code must be 5 to 8 characters' };
  }

  const all = await getAllWelcomeCodes();
  const record = all.find((c) => c.code.toUpperCase() === clean);

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

  return { valid: true, codeRecord: record };
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
      .select('id')
      .maybeSingle();

    if (!error && data) {
      return true;
    }
  } catch (err) {
    // Ignore and fallback
  }

  // Fallback update
  const all = await getAllWelcomeCodes();
  const idx = all.findIndex((c) => c.code.toUpperCase() === clean);
  if (idx !== -1) {
    all[idx] = {
      ...all[idx],
      used: true,
      used_by_user_id: user.id,
      used_by_email: user.email,
      used_by_name: user.name,
      used_at: now,
      updated_at: now,
    };
    await saveToFallbackStore(all);
    return true;
  }

  return false;
}

/**
 * Revoke or delete an unused welcome code
 */
export async function revokeWelcomeCode(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('welcome_codes')
      .delete()
      .eq('id', id)
      .eq('used', false);

    if (!error) return true;
  } catch (err) {
    // Fallback
  }

  const all = await getAllWelcomeCodes();
  const filtered = all.filter((c) => !(c.id === id && !c.used));
  await saveToFallbackStore(filtered);
  return true;
}

/**
 * Get comprehensive statistics for Welcome Codes
 */
export async function getWelcomeCodesSummary(): Promise<{
  total: number;
  available: number;
  used: number;
  expired: number;
  redemptionRate: number;
  codes: WelcomeCode[];
}> {
  const codes = await getAllWelcomeCodes();
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

  return {
    total,
    available,
    used,
    expired,
    redemptionRate,
    codes,
  };
}
