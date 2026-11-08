import { supabase } from '../lib/supabase.js';
import { logAuthAudit } from './auditLogger.js';

export type ConsentPurpose =
  | 'service_delivery'
  | 'support_communications'
  | 'service_notifications'
  | 'marketing_email'
  | 'analytics';

export type ConsentAction = 'GRANTED' | 'WITHDRAWN' | 'UPDATED';

export type ConsentChannel =
  | 'SIGNUP_FORM'
  | 'LEAD_FORM'
  | 'PRIVACY_SETTINGS'
  | 'ACCOUNT_CLOSURE'
  | 'ADMIN_RECORDED'
  | 'SYSTEM';

export interface RecordConsentParams {
  userId?: string | null;
  email?: string | null;
  noticeVersion: string;
  purpose: ConsentPurpose;
  dataCategories: string[];
  action: ConsentAction;
  channel: ConsentChannel;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Record an append-only consent action compliant with DPDP Act, 2023 & Rules 2025.
 */
export async function recordConsent(params: RecordConsentParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('consent_records').insert({
      user_id: params.userId ?? null,
      email: params.email ?? null,
      notice_version: params.noticeVersion,
      purpose: params.purpose,
      data_categories: params.dataCategories,
      action: params.action,
      channel: params.channel,
      ip_address: params.ipAddress ?? null,
      user_agent: params.userAgent ?? null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (params.userId && params.email) {
      await logAuthAudit({
        eventType: 'LOGIN_SUCCESS',
        userId: params.userId,
        identifier: params.email,
        ipAddress: params.ipAddress ?? undefined,
        metadata: {
          action: 'CONSENT_RECORDED',
          purpose: params.purpose,
          consentAction: params.action,
          noticeVersion: params.noticeVersion,
        },
      });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Unknown error recording consent' };
  }
}

/**
 * Records default initial consents given during signup.
 */
export async function recordSignupConsents(options: {
  userId: string;
  email: string;
  marketingConsent?: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
  noticeVersion?: string;
}): Promise<void> {
  const noticeVersion = options.noticeVersion ?? '1.0.0';

  // 1. Mandatory Core Service Delivery
  await recordConsent({
    userId: options.userId,
    email: options.email,
    noticeVersion,
    purpose: 'service_delivery',
    dataCategories: ['name', 'business_name', 'phone', 'email', 'state', 'address', 'gstin'],
    action: 'GRANTED',
    channel: 'SIGNUP_FORM',
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
  });

  // 2. Mandatory Transactional / Service Notifications
  await recordConsent({
    userId: options.userId,
    email: options.email,
    noticeVersion,
    purpose: 'service_notifications',
    dataCategories: ['phone', 'email'],
    action: 'GRANTED',
    channel: 'SIGNUP_FORM',
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
  });

  // 3. Support Communications
  await recordConsent({
    userId: options.userId,
    email: options.email,
    noticeVersion,
    purpose: 'support_communications',
    dataCategories: ['name', 'phone', 'email'],
    action: 'GRANTED',
    channel: 'SIGNUP_FORM',
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
  });

  // 4. Optional Marketing Email (only recorded as GRANTED if explicitly checked)
  if (options.marketingConsent) {
    await recordConsent({
      userId: options.userId,
      email: options.email,
      noticeVersion,
      purpose: 'marketing_email',
      dataCategories: ['name', 'email'],
      action: 'GRANTED',
      channel: 'SIGNUP_FORM',
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
    });
  }
}
