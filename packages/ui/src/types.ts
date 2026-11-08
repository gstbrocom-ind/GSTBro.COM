export interface SocialLink {
  platform: 'whatsapp' | 'instagram' | 'x' | 'facebook';
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

export interface SeoMeta {
  title: string;
  description: string;
  keywords?: string;
  canonical: string;
  robots: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
}
