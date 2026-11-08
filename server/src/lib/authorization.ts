import { supabase, type UserRole } from './supabase.js';

export interface AuthUser {
  id: string;
  role: UserRole | string;
  email?: string;
}

export interface CaseAccessTarget {
  user_id: string;
  assigned_team_id?: string | null;
}

/**
 * Standardized database column selection for users that strictly omits password_hash.
 */
export const SAFE_USER_SELECT =
  'id, email, name, phone, role, business_name, gstin, state, address, email_verified, mobile_verified, pan, logo_url, signature_url, bank_details, upi_id, invoice_terms, state_code, created_at';

/**
 * Strips sensitive fields like password_hash from user objects.
 */
export function sanitizeUser<T extends Record<string, any>>(user: T): Omit<T, 'password_hash'> {
  if (!user || typeof user !== 'object') return user;
  const { password_hash, ...safe } = user;
  return safe;
}

/**
 * Determines whether an authenticated user is authorized to access a given client's resources.
 * - ADMIN: Unrestricted access across all clients.
 * - CLIENT: Strictly restricted to their own account (user.id === clientUserId).
 * - TEAM: Restricted to clients where an active team_assignment exists.
 */
export async function canAccessClient(
  user: AuthUser,
  clientUserId: string
): Promise<boolean> {
  if (!user || !user.id || !clientUserId) return false;
  if (user.role === 'ADMIN') return true;
  if (user.role === 'CLIENT') return user.id === clientUserId;
  if (user.role !== 'TEAM') return false;

  const { data } = await supabase
    .from('team_assignments')
    .select('id')
    .eq('team_user_id', user.id)
    .eq('client_user_id', clientUserId)
    .eq('active', true)
    .maybeSingle();

  return Boolean(data);
}

/**
 * Determines whether an authenticated user is authorized to access or mutate a case.
 * - ADMIN: Authorized across all cases.
 * - CLIENT: Authorized ONLY if they are the owner of the case (caseRecord.user_id === user.id).
 * - TEAM: Authorized ONLY if:
 *     1. They are the assigned team member on the case (caseRecord.assigned_team_id === user.id), OR
 *     2. They have an active assignment to the client (canAccessClient(user, caseRecord.user_id)).
 */
export async function canAccessCase(
  user: AuthUser,
  caseRecord: CaseAccessTarget
): Promise<boolean> {
  if (!user || !user.id || !caseRecord || !caseRecord.user_id) return false;
  if (user.role === 'ADMIN') return true;

  if (user.role === 'CLIENT') {
    return caseRecord.user_id === user.id;
  }

  if (user.role === 'TEAM') {
    if (caseRecord.assigned_team_id && caseRecord.assigned_team_id === user.id) {
      return true;
    }
    return canAccessClient(user, caseRecord.user_id);
  }

  return false;
}

/**
 * Unified document authorization verification.
 * Checks both case-specific `documents` table and client-level `client_documents` table.
 * Returns whether access is authorized and the retrieved document metadata.
 */
export async function canAccessDocument(
  user: AuthUser,
  documentId: string
): Promise<{
  authorized: boolean;
  document: Record<string, any> | null;
  driveFileId?: string;
  fileName?: string;
  source?: 'case' | 'client';
}> {
  if (!user || !user.id || !documentId) {
    return { authorized: false, document: null };
  }

  // 1. Check case-associated documents
  const { data: caseDoc } = await supabase
    .from('documents')
    .select('*, cases(id, user_id, assigned_team_id)')
    .eq('id', documentId)
    .maybeSingle();

  if (caseDoc) {
    const caseRecord = (caseDoc.cases as CaseAccessTarget | null);
    if (!caseRecord) {
      return { authorized: false, document: null };
    }
    const authorized = await canAccessCase(user, caseRecord);
    return {
      authorized,
      document: authorized ? caseDoc : null,
      driveFileId: caseDoc.drive_file_id,
      fileName: caseDoc.file_name,
      source: 'case',
    };
  }

  // 2. Check client-level workspace documents (client_documents)
  const { data: clientDoc } = await supabase
    .from('client_documents')
    .select('*')
    .eq('id', documentId)
    .maybeSingle();

  if (clientDoc) {
    const authorized = await canAccessClient(user, clientDoc.client_user_id);
    return {
      authorized,
      document: authorized ? clientDoc : null,
      driveFileId: clientDoc.drive_file_id,
      fileName: clientDoc.file_name,
      source: 'client',
    };
  }

  return { authorized: false, document: null };
}
