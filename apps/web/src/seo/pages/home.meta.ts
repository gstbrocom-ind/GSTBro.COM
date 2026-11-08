import type { SeoMeta } from '@gst/ui';
import { SITE_URL, TITLE_TEMPLATE, DEFAULT_OG_IMAGE } from '../meta.config';

const base = (title: string, description: string, path: string, keywords?: string): SeoMeta => ({
  title: TITLE_TEMPLATE(title),
  description,
  keywords,
  canonical: `${SITE_URL}${path}`,
  robots: 'index, follow',
  ogTitle: TITLE_TEMPLATE(title),
  ogDescription: description,
  ogImage: DEFAULT_OG_IMAGE,
  ogUrl: `${SITE_URL}${path}`,
});

export const homeMeta = base(
  'GST Consultant & Return Filing Services India',
  'Leading GST consultant in India. Guaranteed on-time monthly GSTR-1 & 3B return filing, fast online GST registration, 2B ITC reconciliation, and senior Chartered Accountant notice defense.',
  '/',
  'gst consultant, gst registration online, gst return filing, gst filing services, gst practitioner, gst compliance services, gstr-1 filing, gstr-3b filing, gst registration consultant, gst advisory services, india gst'
);
