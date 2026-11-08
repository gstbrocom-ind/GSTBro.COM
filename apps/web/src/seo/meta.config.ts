export const SITE_NAME = 'GSTBro';
export const SITE_URL = 'https://gstbro.in';
export const API_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ? import.meta.env.VITE_API_URL : '';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.svg`;
export const TITLE_TEMPLATE = (title: string) => `${title} | ${SITE_NAME}`;
export const LOCALE = 'en_IN';
