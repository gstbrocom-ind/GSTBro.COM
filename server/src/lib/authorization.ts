import { supabase, type UserRole } from './supabase.js';

export interface AuthUser {
  id: string;
  role: UserRole | string;
  email?: string;
  firm_id?: string | null;
  firm_role?: string | null;
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
 * 
 * Strict Two-Tier Access Control:
 * 1. Cross-Firm Isolation: The client and staff member MUST belong to the exact same firm_id.
 * 2. Intra-Firm Segmentation:
 *    - FIRM_OWNER / FIRM_MANAGER / ADMIN: Can access all clients belonging to their own firm.
 *    - FIRM_STAFF / TEAM (Article Clerks): Restricted ONLY to clients assigned to them:
 *      (client.assigned_staff_id === user.id OR active entry in team_assignments).
 *      They CANNOT access other articles' clients or other firms' clients.
 *    - CLIENT: Strictly restricted to their own account (user.id === clientUserId).
 */
export async function canAccessClient(
  user: AuthUser,
  clientUserId: string
): Promise<boolean> {
  if (!user || !user.id || !clientUserId) return false;

  // 1. Client can only access their own profile and documents
  if (user.role === 'CLIENT') {
    return user.id === clientUserId;
  }

  // 2. Fetch the target client's firm_id and assigned_staff_id
  const { data: client, error } = await supabase
    .from('users')
    .select('id, firm_id, assigned_staff_id, role')
    .eq('id', clientUserId)
    .maybeSingle();

  if (error || !client) return false;

  // 3. Super Admin platform telemetry (super admins do not access confidential client tax data)
  if (user.role === 'SUPER_ADMIN') {
    return false;
  }

  // 4. Tier 1: Cross-Firm Multi-Tenant Boundary Check
  // Both user and client MUST belong to the same firm
  if (!user.firm_id || user.firm_id !== client.firm_id) {
    return false;
  }

  // 5. CA Firm Partner / Owner: Full access to all clients of their own practice
  if (user.role === 'FIRM_OWNER' || user.firm_role === 'FIRM_OWNER' || user.role === 'ADMIN') {
    return true;
  }

  // 6. Practice Manager: Full access across practice clients within firm
  if (user.firm_role === 'FIRM_MANAGER') {
    return true;
  }

  // 7. Tier 2: Article Assistant / Staff Segmentation (FIRM_STAFF / TEAM)
  // Restricted ONLY to their assigned clients:
  if (user.role === 'FIRM_STAFF' || user.role === 'TEAM') {
    if (client.assigned_staff_id && client.assigned_staff_id === user.id) {
      return true;
    }

    const { data: assignment } = await supabase
      .from('team_assignments')
      .select('id')
      .eq('team_user_id', user.id)
      .eq('client_user_id', clientUserId)
      .eq('active', true)
      .maybeSingle();

    return Boolean(assignment);
  }

  return false;
}

/**
 * Determines whether an authenticated user is authorized to access or mutate a case.
 */
export async function canAccessCase(
  user: AuthUser,
  caseRecord: CaseAccessTarget
): Promise<boolean> {
  if (!user || !user.id || !caseRecord || !caseRecord.user_id) return false;

  if (user.role === 'CLIENT') {
    return caseRecord.user_id === user.id;
  }

  return canAccessClient(user, caseRecord.user_id);
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
