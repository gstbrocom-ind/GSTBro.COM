import { SITE_NAME, SITE_URL } from '../meta.config';
import type { PublicSettings } from '@gst/ui';

export function organizationSchema(settings?: PublicSettings | null) {
  const sameAs = settings?.socialLinks?.filter((l) => l.enabled && l.url).map((l) => l.url) ?? [];

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: settings?.siteName ?? SITE_NAME,
    url: SITE_URL,
    logo: settings?.logoUrl || `${SITE_URL}/logo.svg`,
    description: 'Premier Chartered Accountant-supervised Indirect Tax and GST compliance infrastructure across India.',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: settings?.contactPhone || '+91 800 123 4567',
      email: settings?.contactEmail || 'hello@gstbro.in',
      contactType: 'customer service',
      areaServed: 'IN',
      availableLanguage: ['en', 'hi'],
    },
    sameAs,
  };
}

export function professionalServiceSchema(settings?: PublicSettings | null) {
  const sameAs = settings?.socialLinks?.filter((l) => l.enabled && l.url).map((l) => l.url) ?? [];
  const address = settings?.officeAddress || 'Plot No. 42, Cyber Towers Area, Hitech City, Madhapur, Hyderabad, Telangana 500081';

  return {
    '@context': 'https://schema.org',
    '@type': 'AccountingService',
    '@id': `${SITE_URL}/#service-desk`,
    name: settings?.siteName ?? SITE_NAME,
    url: SITE_URL,
    logo: settings?.logoUrl || `${SITE_URL}/logo.svg`,
    image: `${SITE_URL}/og-default.svg`,
    telephone: settings?.contactPhone || '+91 800 123 4567',
    email: settings?.contactEmail || 'hello@gstbro.in',
    priceRange: '₹₹',
    currenciesAccepted: 'INR',
    paymentAccepted: 'UPI, Net Banking, Credit Card',
    address: {
      '@type': 'PostalAddress',
      streetAddress: address,
      addressLocality: settings?.officeCity || 'Hyderabad',
      addressRegion: 'Telangana',
      postalCode: '500081',
      addressCountry: 'IN',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: '17.4446',
      longitude: '78.3808',
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
