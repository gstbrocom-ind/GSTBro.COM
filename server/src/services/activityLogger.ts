import type { FastifyRequest } from 'fastify';
import { supabase } from '../lib/supabase.js';
import { getClientIp } from '../lib/rateLimiter.js';

export type ActionType =
  | 'VIEW'
  | 'UPDATE'
  | 'CREATE'
  | 'DELETE'
  | 'MESSAGE'
  | 'UPLOAD'
  | 'ASSIGN'
  | 'COMPLIANCE'
  | 'LOGIN'
  | 'SECURITY';

export type ActionCategory = 'LOOKED' | 'CHANGED' | 'SECURITY' | 'COMMUNICATION';

export interface LogActivityParams {
  actionType: ActionType;
  actionCategory?: ActionCategory;
  resourceType: string;
  resourceId?: string | null;
  clientUserId?: string | null;
  clientName?: string | null;
  description: string;
  details?: Record<string, unknown>;
}

export interface ActivityLogRecord {
  id: string;
  actor_user_id: string | null;
  actor_name: string;
  actor_email: string;
  actor_role: string;
  action_type: ActionType;
  action_category: ActionCategory;
  resource_type: string;
  resource_id?: string | null;
  client_user_id?: string | null;
  client_name?: string | null;
  description: string;
  details: Record<string, unknown>;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

// In-memory buffer to ensure resilient audit logging under all DB conditions
const memoryActivityLogs: ActivityLogRecord[] = [];

/**
 * Automatically determine action category if omitted
 */
function inferActionCategory(type: ActionType): ActionCategory {
  switch (type) {
    case 'VIEW':
      return 'LOOKED';
    case 'MESSAGE':
      return 'COMMUNICATION';
    case 'SECURITY':
    case 'LOGIN':
      return 'SECURITY';
    case 'UPDATE':
    case 'CREATE':
    case 'DELETE':
    case 'UPLOAD':
    case 'ASSIGN':
    case 'COMPLIANCE':
    default:
      return 'CHANGED';
  }
}

/**
 * Record an immutable audit/activity event.
 * Tracks who looked at or changed any client data or system resource.
 */
export async function logActivity(
  requestOrContext:
    | FastifyRequest
    | {
        user?: { id?: string; name?: string; email?: string; role?: string };
        ip?: string;
        headers?: Record<string, string | string[] | undefined>;
      },
  params: LogActivityParams
): Promise<void> {
  const timestamp = new Date().toISOString();
  const req = requestOrContext as any;
  const user = req.user || {};

  const actorUserId = user.id || null;
  const actorName = user.name || (user.role === 'ADMIN' ? 'Admin' : user.role === 'TEAM' ? 'Team Staff' : 'User');
  const actorEmail = user.email || 'system@gstbro.in';
  const actorRole = user.role || 'SYSTEM';

  let ipAddress: string | null = null;
  try {
    ipAddress = typeof getClientIp === 'function' && req.headers ? getClientIp(req) : req.ip || null;
  } catch {
    ipAddress = req.ip || null;
  }

  const userAgent = (req.headers && req.headers['user-agent']) ? String(req.headers['user-agent']).substring(0, 255) : null;
  const actionCategory = params.actionCategory || inferActionCategory(params.actionType);

  // Sanitize details to ensure sensitive secrets are never logged
  const sanitizedDetails: Record<string, unknown> = {};
  if (params.details) {
    for (const [key, val] of Object.entries(params.details)) {
      const lower = key.toLowerCase();
      if (lower.includes('password') || lower.includes('otp') || lower.includes('token') || lower.includes('secret')) {
        sanitizedDetails[key] = '[REDACTED]';
      } else {
        sanitizedDetails[key] = val;
      }
    }
  }

  const record: ActivityLogRecord = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    actor_user_id: actorUserId,
    actor_name: actorName,
    actor_email: actorEmail,
    actor_role: actorRole,
    action_type: params.actionType,
    action_category: actionCategory,
    resource_type: params.resourceType,
    resource_id: params.resourceId || null,
    client_user_id: params.clientUserId || null,
    client_name: params.clientName || null,
    description: params.description,
    details: sanitizedDetails,
    ip_address: ipAddress,
    user_agent: userAgent,
    created_at: timestamp,
  };

  // Structured console log
  console.info(
    `\x1b[35m[ACTIVITY LOG]\x1b[0m \x1b[1m${actorRole}\x1b[0m ${actorName} (${actorEmail}) -> \x1b[33m${actionCategory}:${params.actionType}\x1b[0m "${params.description}"`
  );

  // Always keep in memory buffer
  memoryActivityLogs.unshift(record);
  if (memoryActivityLogs.length > 2000) memoryActivityLogs.pop();

  // Persist to Supabase activity_logs table
  try {
    const { error } = await supabase.from('activity_logs').insert({
      actor_user_id: record.actor_user_id,
      actor_name: record.actor_name,
      actor_email: record.actor_email,
      actor_role: record.actor_role,
      action_type: record.action_type,
      action_category: record.action_category,
      resource_type: record.resource_type,
      resource_id: record.resource_id,
      client_user_id: record.client_user_id,
      client_name: record.client_name,
      description: record.description,
      details: record.details,
      ip_address: record.ip_address,
      user_agent: record.user_agent,
    });

    if (error) {
      // Table might not be migrated yet in some local environments
      console.warn('[ActivityLog] Supabase insert notice:', error.message);
    }
  } catch (err: any) {
    console.warn('[ActivityLog] Supabase insert fallback to memory:', err?.message);
  }
}

/**
 * Retrieve paginated, filtered activity logs with aggregate statistics.
 * Strictly Read-Only (no deletion or modification).
 */
export async function getActivityLogs(options: {
  page?: number;
  limit?: number;
  role?: string;
  actionCategory?: string;
  actionType?: string;
  clientUserId?: string;
  search?: string;
}): Promise<{
  logs: ActivityLogRecord[];
  total: number;
  page: number;
  limit: number;
  metrics: {
    totalCount: number;
    lookedCount: number;
    changedCount: number;
    adminCount: number;
    teamCount: number;
  };
}> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 30));
  const offset = (page - 1) * limit;

  try {
    let query = supabase
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (options.role && options.role !== 'ALL') {
      query = query.eq('actor_role', options.role);
    }

    if (options.actionCategory && options.actionCategory !== 'ALL') {
      query = query.eq('action_category', options.actionCategory);
    }

    if (options.actionType && options.actionType !== 'ALL') {
      query = query.eq('action_type', options.actionType);
    }

    if (options.clientUserId) {
      query = query.eq('client_user_id', options.clientUserId);
    }

    if (options.search && options.search.trim()) {
      const s = options.search.trim();
      query = query.or(
        `actor_name.ilike.%${s}%,actor_email.ilike.%${s}%,client_name.ilike.%${s}%,description.ilike.%${s}%`
      );
    }

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error || !data) {
      throw new Error(error?.message || 'Database query failed');
    }

    // Calculate metrics
    const [
      { count: lookedCount },
      { count: changedCount },
      { count: adminCount },
      { count: teamCount },
    ] = await Promise.all([
      supabase.from('activity_logs').select('id', { count: 'exact', head: true }).eq('action_category', 'LOOKED'),
      supabase.from('activity_logs').select('id', { count: 'exact', head: true }).eq('action_category', 'CHANGED'),
      supabase.from('activity_logs').select('id', { count: 'exact', head: true }).eq('actor_role', 'ADMIN'),
      supabase.from('activity_logs').select('id', { count: 'exact', head: true }).eq('actor_role', 'TEAM'),
    ]);

    return {
      logs: data as ActivityLogRecord[],
      total: count || 0,
      page,
      limit,
      metrics: {
        totalCount: count || 0,
        lookedCount: lookedCount || 0,
        changedCount: changedCount || 0,
        adminCount: adminCount || 0,
        teamCount: teamCount || 0,
      },
    };
  } catch {
    // Memory fallback filter
    let filtered = [...memoryActivityLogs];

    if (options.role && options.role !== 'ALL') {
      filtered = filtered.filter((l) => l.actor_role === options.role);
    }

    if (options.actionCategory && options.actionCategory !== 'ALL') {
      filtered = filtered.filter((l) => l.action_category === options.actionCategory);
    }

    if (options.actionType && options.actionType !== 'ALL') {
      filtered = filtered.filter((l) => l.action_type === options.actionType);
    }

    if (options.clientUserId) {
      filtered = filtered.filter((l) => l.client_user_id === options.clientUserId);
    }

    if (options.search && options.search.trim()) {
      const s = options.search.trim().toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.actor_name.toLowerCase().includes(s) ||
          l.actor_email.toLowerCase().includes(s) ||
          (l.client_name && l.client_name.toLowerCase().includes(s)) ||
          l.description.toLowerCase().includes(s)
      );
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      logs: paginated,
      total,
      page,
      limit,
      metrics: {
        totalCount: total,
        lookedCount: memoryActivityLogs.filter((l) => l.action_category === 'LOOKED').length,
        changedCount: memoryActivityLogs.filter((l) => l.action_category === 'CHANGED').length,
        adminCount: memoryActivityLogs.filter((l) => l.actor_role === 'ADMIN').length,
        teamCount: memoryActivityLogs.filter((l) => l.actor_role === 'TEAM').length,
      },
    };
  }
}
