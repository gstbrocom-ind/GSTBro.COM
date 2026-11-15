import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import type { PublicSettings } from '@gst/ui';
import { subscribeToSettingsUpdates } from '@gst/ui';
import { API_URL } from '../seo/meta.config';

const DEFAULT_FALLBACK_SETTINGS: PublicSettings = {
  siteName: 'GSTBro',
  faviconUrl: '',
  logoUrl: '',
  contactPhone: '+91 800 123 4567',
  contactEmail: 'hello@gstbro.com',
  officeAddress: 'Plot No. 42, Cyber Towers Area, Hitech City, Madhapur, Hyderabad, Telangana 500081',
  officeCity: 'Hyderabad, Telangana',
  googleMapsUrl: 'https://maps.google.com/?q=Cyber+Towers+Hitech+City+Hyderabad',
  mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3806.314644503792!2d78.38084667595462!3d17.444634201150495!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb93dc8c5d69df%3A0x19688ebb557861c!2sCyber%20Towers!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin',
  announcementBarText: '',
  announcementBarEnabled: false,
  announcementBarUrl: '',
  footerTagline: 'Institutional Tax Operations & Practice Automation.',
  businessHours: 'Mon - Sat: 9:00 AM - 7:00 PM IST',
  brandIntro: {
    enabled: true,
    theme: 'corporate',
    duration: 3.5,
    title: '',
    subtitle: '',
    tagline: '',
    deferLoading: false,
  },
  homepage: {
    heroEyebrow: 'Your Trusted Partner for GST Compliance',
    heroTitle: 'Never Worry About GST Deadlines, Penalties or Notices Again.',
    heroSubtitle: 'Automate monthly GSTR-1 & 3B filings, lock down 100% of eligible 2B Input Tax Credit, and get dedicated senior Chartered Accountants defending your business against scrutiny notices.',
    heroImageUrl: '',
    heroTrustBadge: '★ 4.9/5 Rating • Supervised by Real Chartered Accountants',
    heroCtaPrimary: 'Book Free 15-Min CA Strategy Call',
    heroCtaSecondary: 'View Transparent Plans',
    statClients: '500+',
    statReturns: '10,000+',
    statExperience: '12+ Yrs',
    statSatisfaction: '99.4%',
    ctaTitle: 'Stop Stressing Over Monthly GST Deadlines.',
    ctaSubtitle: 'Transition your Indirect Tax compliance to a dedicated Chartered Accountant team with continuous 2B reconciliation and guaranteed on-time filing.',
  },
  socialLinks: [],
};

const SettingsContext = createContext<PublicSettings | null>(null);
const SettingsRefreshContext = createContext<() => Promise<void>>(async () => {});

const SETTINGS_STORAGE_KEY = 'gstbro_public_settings_cache';

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PublicSettings | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      } catch {}
    }
    return null;
  });
  const lastFetchRef = useRef<number>(0);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings/public?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        lastFetchRef.current = Date.now();
        try {
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(data));
        } catch {}
      }
    } catch {
      setSettings((prev) => prev ?? DEFAULT_FALLBACK_SETTINGS);
    }
  }, []);

  useEffect(() => {
    // Initial fetch on mount
    fetchSettings();

    // 1. Subscribe to instant cross-tab (BroadcastChannel / storage) and same-window (CustomEvent) updates
    const unsubscribe = subscribeToSettingsUpdates((payload) => {
      if (!payload || payload.type === 'SETTINGS_UPDATED') {
        fetchSettings();
      }
    });

    // 2. Tab focus & visibility change revalidation (with 3-second throttle)
    const handleRevalidate = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetchRef.current > 3000) {
        fetchSettings();
      }
    };

    window.addEventListener('focus', handleRevalidate);
    document.addEventListener('visibilitychange', handleRevalidate);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleRevalidate);
      document.removeEventListener('visibilitychange', handleRevalidate);
    };
  }, [fetchSettings]);

  return (
    <SettingsRefreshContext.Provider value={fetchSettings}>
      <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>
    </SettingsRefreshContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

export function useRefreshSettings() {
  return useContext(SettingsRefreshContext);
}
