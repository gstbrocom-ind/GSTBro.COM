import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type UserRole = 'CLIENT' | 'TEAM' | 'ADMIN';
export type ServiceType = 'REGISTRATION' | 'RETURNS' | 'CANCELLATION' | 'GENERAL';
export type CaseStatus = 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'ACTION_REQUIRED' | 'COMPLETED' | 'CANCELLED';
export type DriveOwnerType = 'CLIENT' | 'TEAM';

export interface User {
  id: string;
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
