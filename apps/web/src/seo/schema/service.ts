import { SITE_NAME, SITE_URL } from '../meta.config';

export function serviceSchema(
  name: string,
  description: string,
  serviceType: string,
  path: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description,
    serviceType,
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    areaServed: {
      '@type': 'Country',
      name: 'India',
    },
    url: `${SITE_URL}${path}`,
  };
}
