import type { SeoMeta } from '@gst/ui';
import { homeMeta } from './pages/home.meta';
import {
  servicesMeta,
  registrationMeta,
  returnsMeta,
  cancellationMeta,
  complianceMeta,
  refundMeta,
  auditMeta,
  advisoryMeta,
  tdsTcsMeta,
  businessLicensesMeta,
  shopEstablishmentMeta,
  tradeLicenseMeta,
  fssaiMeta,
  udyamMeta,
  iecMeta,
  professionalTaxMeta,
  dscMeta,
  startupIndiaMeta,
  pricingMeta,
  howItWorksMeta,
  resourcesMeta,
  contactMeta,
  aboutMeta,
  refundPolicyMeta,
  loginMeta,
  signupMeta,
  forgotPasswordMeta,
  privacyMeta,
  termsMeta,
} from './pages/services.meta';

export interface RouteConfig {
  path: string;
  meta: SeoMeta;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export const indexableRoutes: RouteConfig[] = [
  { path: '/', meta: homeMeta, changefreq: 'weekly', priority: 1.0 },
  { path: '/services', meta: servicesMeta, changefreq: 'weekly', priority: 0.9 },
  { path: '/services/gst-registration', meta: registrationMeta, changefreq: 'weekly', priority: 0.9 },
  { path: '/services/gst-returns', meta: returnsMeta, changefreq: 'weekly', priority: 0.9 },
  { path: '/services/gst-cancellation', meta: cancellationMeta, changefreq: 'weekly', priority: 0.9 },
  { path: '/services/gst-compliance', meta: complianceMeta, changefreq: 'weekly', priority: 0.9 },
  { path: '/services/gst-refund', meta: refundMeta, changefreq: 'weekly', priority: 0.9 },
  { path: '/services/gst-audit', meta: auditMeta, changefreq: 'weekly', priority: 0.9 },
  { path: '/services/gst-advisory', meta: advisoryMeta, changefreq: 'weekly', priority: 0.9 },
  { path: '/services/gst-tds-tcs', meta: tdsTcsMeta, changefreq: 'weekly', priority: 0.9 },
  { path: '/services/business-licenses', meta: businessLicensesMeta, changefreq: 'weekly', priority: 0.8 },
  { path: '/services/business-licenses/shop-establishment', meta: shopEstablishmentMeta, changefreq: 'monthly', priority: 0.8 },
  { path: '/services/business-licenses/trade-license', meta: tradeLicenseMeta, changefreq: 'monthly', priority: 0.8 },
  { path: '/services/business-licenses/fssai', meta: fssaiMeta, changefreq: 'monthly', priority: 0.8 },
  { path: '/services/business-licenses/udyam', meta: udyamMeta, changefreq: 'monthly', priority: 0.8 },
  { path: '/services/business-licenses/iec', meta: iecMeta, changefreq: 'monthly', priority: 0.8 },
  { path: '/services/business-licenses/professional-tax', meta: professionalTaxMeta, changefreq: 'monthly', priority: 0.8 },
  { path: '/services/business-licenses/dsc', meta: dscMeta, changefreq: 'monthly', priority: 0.8 },
  { path: '/services/business-licenses/startup-india', meta: startupIndiaMeta, changefreq: 'monthly', priority: 0.8 },
  { path: '/pricing', meta: pricingMeta, changefreq: 'monthly', priority: 0.8 },
  { path: '/how-it-works', meta: howItWorksMeta, changefreq: 'monthly', priority: 0.7 },
  { path: '/resources', meta: resourcesMeta, changefreq: 'weekly', priority: 0.7 },
  { path: '/contact', meta: contactMeta, changefreq: 'monthly', priority: 0.8 },
  { path: '/about', meta: aboutMeta, changefreq: 'monthly', priority: 0.7 },
  { path: '/refund-policy', meta: refundPolicyMeta, changefreq: 'yearly', priority: 0.4 },
  { path: '/privacy', meta: privacyMeta, changefreq: 'yearly', priority: 0.3 },
  { path: '/terms', meta: termsMeta, changefreq: 'yearly', priority: 0.3 },
];

/**
 * Non-indexable authentication and restricted routes.
 * Excluded completely from sitemap.xml and flagged with noindex, nofollow.
 */
export const nonIndexableRoutes: RouteConfig[] = [
  { path: '/login', meta: loginMeta },
  { path: '/signup', meta: signupMeta },
  { path: '/forgot-password', meta: forgotPasswordMeta },
];

export const allRoutes: RouteConfig[] = [...indexableRoutes, ...nonIndexableRoutes];

export function getMetaForPath(path: string): SeoMeta | undefined {
  return allRoutes.find((r) => r.path === path)?.meta;
}

export const sitemapPaths = indexableRoutes.map((r) => r.path);
