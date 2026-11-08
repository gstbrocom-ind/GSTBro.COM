import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { PublicSettings } from '@gst/ui';
import { API_URL } from '../seo/meta.config';

const SettingsContext = createContext<PublicSettings | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PublicSettings | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/settings/public`)
      .then((r) => r.json())
      .then(setSettings)
      .catch(() =>
        setSettings({
          siteName: 'GSTBro',
          faviconUrl: '',
          logoUrl: '',
          contactPhone: '+91 800 123 4567',
          contactEmail: 'hello@gstbro.in',
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
            theme: 'auto',
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
            ctaTitle: "Stop Stressing Over Monthly GST Deadlines.",
            ctaSubtitle: "Transition your Indirect Tax compliance to a dedicated Chartered Accountant team with continuous 2B reconciliation and guaranteed on-time filing.",
          },
          socialLinks: [],
        })
      );
  }, []);

  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}
