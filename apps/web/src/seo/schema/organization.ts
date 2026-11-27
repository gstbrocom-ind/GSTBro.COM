import { SITE_NAME, SITE_URL } from '../meta.config';
import type { PublicSettings } from '@gst/ui';

function buildSameAs(settings?: PublicSettings | null) {
  const social = settings?.socialLinks?.filter((l) => l.enabled && l.url).map((l) => l.url) ?? [];
  const mapsUrl = settings?.googleMapsUrl || 'https://maps.app.goo.gl/MYt3A1sexYqBWmRq9';
  return Array.from(new Set([...social, mapsUrl].filter(Boolean)));
}

const GST_KNOWLEDGE_TOPICS = [
  'Goods and Services Tax (GST) India',
  'GST Registration (REG-01)',
  'GSTR-1 and GSTR-3B Return Filing',
  'GSTR-2B Input Tax Credit (ITC) Reconciliation',
  'GST Annual Return (GSTR-9) and Audit (GSTR-9C)',
  'GST Scrutiny Notice Defense (ASMT-10, DRC-01)',
  'GST Refund Claims (RFD-01) and Export LUT',
  'E-Commerce GST TCS and TDS (GSTR-7, GSTR-8)',
];

export function organizationSchema(settings?: PublicSettings | null) {
  const sameAs = buildSameAs(settings);

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: settings?.siteName ?? SITE_NAME,
    alternateName: ['GSTBro', 'GST Bro', 'GSTBro India'],
    url: SITE_URL,
    logo: settings?.logoUrl || `${SITE_URL}/logo.svg`,
    description: 'Chartered Accountant-supervised Indirect Tax and GST compliance platform serving businesses across India.',
    knowsAbout: GST_KNOWLEDGE_TOPICS,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: settings?.contactPhone || '+91 8106004254',
      email: settings?.contactEmail || 'gstbro.com@gmail.com',
      contactType: 'customer service',
      areaServed: 'IN',
      availableLanguage: ['en', 'hi', 'te'],
    },
    sameAs,
  };
}

export function professionalServiceSchema(settings?: PublicSettings | null) {
  const sameAs = buildSameAs(settings);
  const address = settings?.officeAddress || '5-50B, SPR Street, Oldpet, Palamaner, Chittoor, Andhra Pradesh 517408';

  return {
    '@context': 'https://schema.org',
    '@type': 'AccountingService',
    '@id': `${SITE_URL}/#service-desk`,
    name: settings?.siteName ?? SITE_NAME,
    alternateName: ['GSTBro', 'GST Bro', 'GSTBro India'],
    url: SITE_URL,
    logo: settings?.logoUrl || `${SITE_URL}/logo.svg`,
    image: `${SITE_URL}/og-default.png`,
    knowsAbout: GST_KNOWLEDGE_TOPICS,
    telephone: settings?.contactPhone || '+91 8106004254',
    email: settings?.contactEmail || 'gstbro.com@gmail.com',
    priceRange: '₹₹',
    currenciesAccepted: 'INR',
    paymentAccepted: 'UPI, Net Banking, Credit Card',
    address: {
      '@type': 'PostalAddress',
      streetAddress: address,
      addressLocality: settings?.officeCity || 'Palamaner',
      addressRegion: 'Andhra Pradesh',
      postalCode: '517408',
      addressCountry: 'IN',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: '13.1983985',
      longitude: '78.7451149',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '09:00',
        closes: '19:00',
      },
    ],
    areaServed: {
      '@type': 'Country',
      name: 'India',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'GST Compliance & Licensing Services',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Statutory GST Registration',
            description: 'Fast-track online GST registration with document vetting and zero rejection guarantee.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Monthly GST Return Filing (GSTR-1 & 3B)',
            description: 'Timely and accurate GSTR-1 & GSTR-3B filing with Rule 88A tax offset optimization.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Dynamic 2B ITC Reconciliation',
            description: 'Continuous purchase ledger audit & automated vendor default recovery.',
          },
        },
      ],
    },
    sameAs,
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/resources?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}
