import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type UserRole = 'CLIENT' | 'TEAM' | 'ADMIN' | 'SUPER_ADMIN' | 'FIRM_OWNER' | 'FIRM_STAFF';
export type FirmRole = 'FIRM_OWNER' | 'FIRM_MANAGER' | 'FIRM_STAFF';
export type ServiceType = 'REGISTRATION' | 'RETURNS' | 'CANCELLATION' | 'GENERAL';
export type CaseStatus = 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'ACTION_REQUIRED' | 'COMPLETED' | 'CANCELLED';
export type DriveOwnerType = 'CLIENT' | 'TEAM';

export interface Firm {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string | null;
  email: string;
  phone: string | null;
  gstin: string | null;
  address: string | null;
  branding: Record<string, unknown>;
  status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED';
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FirmDriveConfig {
  id: string;
  firm_id: string;
  auth_type: 'OAUTH' | 'SERVICE_ACCOUNT';
  refresh_token_encrypted?: string | null;
  access_token_encrypted?: string | null;
  token_expires_at?: string | null;
  service_account_json_encrypted?: string | null;
  root_folder_id?: string | null;
  root_folder_name?: string | null;
  is_connected: boolean;
  created_at: string;
  updated_at: string;
}

export interface FirmDocumentRoutingRule {
  id: string;
  firm_id: string;
  category: 'SALES' | 'PURCHASES' | 'BANK' | 'FILED_RETURNS' | 'NOTICES' | 'CLIENT_DOCS' | 'CUSTOM';
  rule_name: string;
  custom_folder_name?: string | null;
  target_path_template: string;
  google_folder_id?: string | null;
  auto_create_subfolders: boolean;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface FirmMonthlyUsage {
  id: string;
  firm_id: string;
  billing_period: string;
  total_clients_count: number;
  active_clients_count: number;
  team_members_count: number;
  rate_per_active_client: number;
  base_platform_fee: number;
  subtotal_inr: number;
  gst_inr: number;
  total_inr: number;
  invoice_status: 'PENDING' | 'PAID' | 'OVERDUE' | 'WAIVED';
  paid_at?: string | null;
  invoice_url?: string | null;
  calculated_at: string;
}

export interface User {
  id: string;
  firm_id?: string | null;
  firm_role?: FirmRole | null;
  email: string;
  phone: string | null;
  name: string;
  role: UserRole;
  business_name: string | null;
  gstin: string | null;
  state: string | null;
  address: string | null;
  email_verified: boolean;
  mobile_verified?: boolean;
  mobile_verified_at?: string | null;
  mobile_verification_method?: string | null;
  must_reset_password?: boolean;
  created_at: string;
}

export interface SiteSetting {
  key: string;
  value: string | null;
}

export interface PageSeo {
  route_path: string;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  canonical_url: string | null;
  robots: string | null;
  json_ld_extra: Record<string, unknown> | null;
}
