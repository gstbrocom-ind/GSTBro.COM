export interface CookieConsentState {
  version: number;
  essential: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
}

export const CONSENT_STORAGE_KEY = 'gstbro_cookie_consent_v1';
export const ANALYTICS_CONSENT_KEY = 'gstbro_analytics_consent';
export const CONSENT_UPDATED_EVENT = 'gstbro:consent-updated';
export const OPEN_COOKIE_SETTINGS_EVENT = 'gstbro:open-cookie-settings';

const CONSENT_VERSION = 1;

export function isSearchCrawler(): boolean {
  if (typeof navigator === 'undefined') return true;
  const ua = navigator.userAgent.toLowerCase();
  return /googlebot|bingbot|yandex|duckduckbot|slurp|baiduspider|lighthouse|headlesschrome|bytespider|oai-searchbot|chatgpt-user|gptbot|perplexitybot|claudebot|applebot/i.test(
    ua
  );
}

export function getStoredConsent(): CookieConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsentState>;
    if (typeof parsed.analytics !== 'boolean' || typeof parsed.marketing !== 'boolean') {
      return null;
    }
    return {
      version: typeof parsed.version === 'number' ? parsed.version : CONSENT_VERSION,
      essential: true,
      analytics: parsed.analytics,
      marketing: parsed.marketing,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = getStoredConsent();
  if (stored) return stored.analytics;
  return localStorage.getItem(ANALYTICS_CONSENT_KEY) === 'granted';
}

export function saveCookieConsent(prefs: { analytics: boolean; marketing: boolean }): CookieConsentState {
  const next: CookieConsentState = {
    version: CONSENT_VERSION,
    essential: true,
    analytics: prefs.analytics,
    marketing: prefs.marketing,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next));
      localStorage.setItem(ANALYTICS_CONSENT_KEY, prefs.analytics ? 'granted' : 'denied');
    } catch {
      // Ignore storage quota errors
    }

    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: prefs.analytics ? 'granted' : 'denied',
        ad_storage: prefs.marketing ? 'granted' : 'denied',
        ad_user_data: prefs.marketing ? 'granted' : 'denied',
        ad_personalization: prefs.marketing ? 'granted' : 'denied',
      });
    }

    window.dispatchEvent(new CustomEvent(CONSENT_UPDATED_EVENT, { detail: next }));
  }

  return next;
}

export function openCookieSettings(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_COOKIE_SETTINGS_EVENT));
}
