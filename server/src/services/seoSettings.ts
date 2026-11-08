import { supabase } from '../lib/supabase.js';
import { env } from '../config/env.js';

const SOCIAL_PLATFORMS = ['whatsapp', 'instagram', 'x', 'facebook'] as const;
type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

const PLATFORM_DOMAINS: Record<SocialPlatform, string[]> = {
  whatsapp: ['wa.me', 'api.whatsapp.com', 'chat.whatsapp.com'],
  instagram: ['instagram.com', 'www.instagram.com'],
  x: ['x.com', 'twitter.com', 'www.x.com', 'www.twitter.com'],
  facebook: ['facebook.com', 'www.facebook.com', 'fb.com'],
};

export interface SocialLink {
  platform: SocialPlatform;
  url: string;
  iconUrl: string | null;
  enabled: boolean;
}

export interface BrandIntroSettings {
  enabled: boolean;
  theme: string;
  duration: number;
  title?: string;
  subtitle?: string;
  tagline?: string;
  deferLoading?: boolean;
}

export interface PublicSettings {
  siteName: string;
  faviconUrl: string;
  logoUrl: string;
  contactPhone: string;
  contactEmail: string;
  officeAddress?: string;
  officeCity?: string;
  googleMapsUrl?: string;
  mapEmbedUrl?: string;
  announcementBarText?: string;
  announcementBarEnabled?: boolean;
  announcementBarUrl?: string;
  footerTagline?: string;
  businessHours?: string;
  brandIntro?: BrandIntroSettings;
  homepage: {
    heroEyebrow: string;
    heroTitle: string;
    heroSubtitle: string;
    heroImageUrl: string;
    heroTrustBadge?: string;
    heroCtaPrimary?: string;
    heroCtaSecondary?: string;
    statClients: string;
    statReturns: string;
    statExperience: string;
    statSatisfaction: string;
    ctaTitle: string;
    ctaSubtitle?: string;
  };
  socialLinks: SocialLink[];
}

async function getSettingsMap(): Promise<Record<string, string>> {
  const { data } = await supabase.from('site_settings').select('key, value');
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[row.key] = row.value ?? '';
  }
  return map;
}

export async function getPublicSettings(): Promise<PublicSettings> {
  const map = await getSettingsMap();

  const socialLinks: SocialLink[] = SOCIAL_PLATFORMS.map((platform) => ({
    platform,
    url: map[`social_${platform}_url`] ?? '',
    iconUrl: map[`social_${platform}_icon`] || null,
    enabled: map[`social_${platform}_enabled`] === 'true' && !!map[`social_${platform}_url`],
  })).filter((l) => l.enabled);

  return {
    siteName: map.site_name || 'GSTBro',
    faviconUrl: map.favicon_url || '',
    logoUrl: map.logo_url || '',
    contactPhone: map.contact_phone || '',
    contactEmail: map.contact_email || 'hello@gstbro.com',
    officeAddress: map.office_address || 'Plot No. 42, Cyber Towers Area, Hitech City, Madhapur, Hyderabad, Telangana 500081',
    officeCity: map.office_city || 'Hyderabad, Telangana',
    googleMapsUrl: map.google_maps_url || 'https://maps.google.com/?q=Cyber+Towers+Hitech+City+Hyderabad',
    mapEmbedUrl: map.map_embed_url || 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3806.314644503792!2d78.38084667595462!3d17.444634201150495!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb93dc8c5d69df%3A0x19688ebb557861c!2sCyber%20Towers!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin',
    announcementBarText: map.announcement_bar_text || '',
    announcementBarEnabled: map.announcement_bar_enabled === 'true',
    announcementBarUrl: map.announcement_bar_url || '',
    footerTagline: map.footer_tagline || 'Institutional Tax Operations & Practice Automation.',
    businessHours: map.business_hours || 'Mon - Sat: 9:00 AM - 7:00 PM IST',
    brandIntro: {
      enabled: map.brand_intro_enabled !== 'false',
      theme: map.brand_intro_theme || 'auto',
      duration: parseFloat(map.brand_intro_duration || '3.5') || 3.5,
      title: map.brand_intro_title || '',
      subtitle: map.brand_intro_subtitle || '',
      tagline: map.brand_intro_tagline || '',
      deferLoading: map.brand_intro_defer_loading === 'true',
    },
    homepage: {
      heroEyebrow: map.home_hero_eyebrow || 'Your Trusted Partner for GST Compliance',
      heroTitle: map.home_hero_title || 'Never Worry About GST Deadlines, Penalties or Notices Again.',
      heroSubtitle: map.home_hero_subtitle || 'Automate monthly GSTR-1 & 3B filings, lock down 100% of eligible 2B Input Tax Credit, and get dedicated senior Chartered Accountants defending your business against scrutiny notices.',
      heroImageUrl: map.home_hero_image_url || '',
      heroTrustBadge: map.home_trust_badge || '★ 4.9/5 Rating • Supervised by Real Chartered Accountants',
      heroCtaPrimary: map.home_hero_cta_primary || 'Book Free 15-Min CA Strategy Call',
      heroCtaSecondary: map.home_hero_cta_secondary || 'View Transparent Plans',
      statClients: map.home_stat_clients || '500+',
      statReturns: map.home_stat_returns || '10,000+',
      statExperience: map.home_stat_experience || '12+ Yrs',
      statSatisfaction: map.home_stat_satisfaction || '99.4%',
      ctaTitle: map.home_cta_title || "Stop Stressing Over Monthly GST Deadlines.",
      ctaSubtitle: map.home_cta_subtitle || "Transition your Indirect Tax compliance to a dedicated Chartered Accountant team with continuous 2B reconciliation and guaranteed on-time filing.",
    },
    socialLinks,
  };
}

export async function getSeoForPath(path: string) {
  const { data } = await supabase.from('page_seo').select('*').eq('route_path', path).single();
  return data;
}

export async function updateSeoForPath(
  path: string,
  updates: Record<string, unknown>,
  updatedBy: string
) {
  const { data, error } = await supabase
    .from('page_seo')
    .upsert({ route_path: path, ...updates, updated_by: updatedBy }, { onConflict: 'route_path' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function formatWhatsAppUrl(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith('http')) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  return `https://wa.me/${digits}`;
}

export function validateSocialUrl(platform: SocialPlatform, url: string): boolean {
  if (!url) return true;
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return PLATFORM_DOMAINS[platform].some(
      (d) => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`)
    );
  } catch {
    return false;
  }
}

export async function updateSocialSettings(
  settings: Partial<Record<string, string>>,
  updatedBy: string
): Promise<void> {
  for (const [key, value] of Object.entries(settings)) {
    if (key.startsWith('social_')) {
      const platform = key.replace(/^social_(\w+)_(url|enabled|icon)$/, '$1') as SocialPlatform;
      if (key.endsWith('_url') && value) {
        const finalUrl = platform === 'whatsapp' ? formatWhatsAppUrl(value) : value;
        if (!validateSocialUrl(platform, finalUrl)) {
          throw new Error(`Invalid URL for ${platform}`);
        }
        await supabase.from('site_settings').upsert({
          key,
          value: finalUrl,
          updated_by: updatedBy,
        });
        continue;
      }
    }
    await supabase.from('site_settings').upsert({ key, value: value ?? '', updated_by: updatedBy });
  }
}

export async function getSocialSettingsAdmin(): Promise<Record<string, string>> {
  const map = await getSettingsMap();
  const result: Record<string, string> = {};
  for (const platform of SOCIAL_PLATFORMS) {
    result[`social_${platform}_url`] = map[`social_${platform}_url`] ?? '';
    result[`social_${platform}_enabled`] = map[`social_${platform}_enabled`] ?? 'false';
    result[`social_${platform}_icon`] = map[`social_${platform}_icon`] ?? '';
  }
  return result;
}

export function getSameAsUrls(socialLinks: SocialLink[]): string[] {
  return socialLinks.filter((l) => l.enabled && l.url).map((l) => l.url);
}

export { SOCIAL_PLATFORMS, env };
