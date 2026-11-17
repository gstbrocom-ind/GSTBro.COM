import { supabase, type FirmDocumentRoutingRule } from '../lib/supabase.js';

export interface RouteResolutionInput {
  firmId: string;
  category: 'SALES' | 'PURCHASES' | 'BANK' | 'FILED_RETURNS' | 'NOTICES' | 'CLIENT_DOCS' | 'CUSTOM';
  clientName: string;
  clientGstin?: string | null;
  period?: string | null; // e.g. '112026' or '2026-11'
}

export interface RouteResolutionResult {
  ruleId?: string;
  ruleName?: string;
  targetFolderId?: string | null;
  resolvedPath: string;
  customFolderName?: string | null;
}

/**
 * Resolves the destination folder path and Google Drive folder ID
 * based on the CA firm's configured routing rules.
 */
export async function resolveDocumentRoute(input: RouteResolutionInput): Promise<RouteResolutionResult> {
  const { firmId, category, clientName, clientGstin, period } = input;

  // 1. Fetch matching active routing rule for this firm and category
  const { data: rules } = await supabase
    .from('firm_document_routing_rules')
    .select('*')
    .eq('firm_id', firmId)
    .eq('category', category)
    .eq('is_active', true)
    .order('priority', { ascending: false })
    .limit(1);

  const matchedRule: FirmDocumentRoutingRule | null = rules && rules.length > 0 ? (rules[0] as FirmDocumentRoutingRule) : null;

  // 2. Default template if no custom rule is defined
  const template = matchedRule?.target_path_template || '{Client_Name}/{Category}/{Year}_{Month}';

  // 3. Prepare replacement variables
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const safeClientName = clientName.replace(/[\\/:*?"<>|]/g, '').trim() || 'Client';
  const safeGstin = (clientGstin || 'NO-GSTIN').replace(/[\\/:*?"<>|]/g, '').trim();
  const safePeriod = (period || `${month}${year}`).replace(/[\\/:*?"<>|]/g, '').trim();

  // 4. Interpolate variables into path template
  const resolvedPath = template
    .replace(/\{Client_Name\}/gi, safeClientName)
    .replace(/\{Client_GSTIN\}/gi, safeGstin)
    .replace(/\{Category\}/gi, category)
    .replace(/\{Year\}/gi, year)
    .replace(/\{Month\}/gi, month)
    .replace(/\{Period\}/gi, safePeriod)
    .replace(/\{FY\}/gi, `${now.getMonth() >= 3 ? year : String(Number(year) - 1)}-${now.getMonth() >= 3 ? String(Number(year) + 1).slice(-2) : year.slice(-2)}`);

  return {
    ruleId: matchedRule?.id,
    ruleName: matchedRule?.rule_name,
    targetFolderId: matchedRule?.google_folder_id || null,
    resolvedPath,
    customFolderName: matchedRule?.custom_folder_name || null,
  };
}
