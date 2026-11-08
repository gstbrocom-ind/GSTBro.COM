import { supabase } from '../lib/supabase.js';

export interface PurgeResult {
  table: string;
  purgedCount: number;
  error?: string;
}

export interface RetentionPurgeSummary {
  timestamp: string;
  results: PurgeResult[];
  totalPurged: number;
}

/**
 * Executes retention purge for tables where auto_purge_enabled = true
 * strictly according to the retention_policies register.
 *
 * Tables currently authorized for automated purge:
 * - otp_codes: older than 7 days
 * - mobile_otp_sessions: older than 7 days
 * - password_reset_authorizations: older than 30 days
 * - revoked_tokens: older than 30 days
 */
export async function runRetentionPurge(): Promise<RetentionPurgeSummary> {
  const timestamp = new Date().toISOString();
  const results: PurgeResult[] = [];
  let totalPurged = 0;

  // 1. otp_codes (7 days)
  try {
    const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await supabase
      .from('otp_codes')
      .delete({ count: 'exact' })
      .lt('created_at', cutoff7d);

    if (error) {
      results.push({ table: 'otp_codes', purgedCount: 0, error: error.message });
    } else {
      const c = count ?? 0;
      results.push({ table: 'otp_codes', purgedCount: c });
      totalPurged += c;
    }
  } catch (err: any) {
    results.push({ table: 'otp_codes', purgedCount: 0, error: err?.message });
  }

  // 2. mobile_otp_sessions (7 days)
  try {
    const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await supabase
      .from('mobile_otp_sessions')
      .delete({ count: 'exact' })
      .lt('created_at', cutoff7d);

    if (error) {
      results.push({ table: 'mobile_otp_sessions', purgedCount: 0, error: error.message });
    } else {
      const c = count ?? 0;
      results.push({ table: 'mobile_otp_sessions', purgedCount: c });
      totalPurged += c;
    }
  } catch (err: any) {
    results.push({ table: 'mobile_otp_sessions', purgedCount: 0, error: err?.message });
  }

  // 3. password_reset_authorizations (30 days)
  try {
    const cutoff30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await supabase
      .from('password_reset_authorizations')
      .delete({ count: 'exact' })
      .lt('created_at', cutoff30d);

    if (error) {
      results.push({ table: 'password_reset_authorizations', purgedCount: 0, error: error.message });
    } else {
      const c = count ?? 0;
      results.push({ table: 'password_reset_authorizations', purgedCount: c });
      totalPurged += c;
    }
  } catch (err: any) {
    results.push({ table: 'password_reset_authorizations', purgedCount: 0, error: err?.message });
  }

  // 4. revoked_tokens (30 days)
  try {
    const cutoff30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await supabase
      .from('revoked_tokens')
      .delete({ count: 'exact' })
      .lt('revoked_at', cutoff30d);

    if (error) {
      results.push({ table: 'revoked_tokens', purgedCount: 0, error: error.message });
    } else {
      const c = count ?? 0;
      results.push({ table: 'revoked_tokens', purgedCount: c });
      totalPurged += c;
    }
  } catch (err: any) {
    results.push({ table: 'revoked_tokens', purgedCount: 0, error: err?.message });
  }

  return { timestamp, results, totalPurged };
}
