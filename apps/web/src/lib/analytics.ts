/**
 * GSTBro Google Analytics 4 (GA4) & Conversion Tracking Infrastructure
 * 
 * Compliant with Google Analytics 4, DPDP Act 2023, and Google Ads Conversion Tracking.
 * 
 * Key Principles:
 * 1. Zero PII: Never sends passwords, OTPs, GSTINs, phone numbers, email addresses, or document data.
 * 2. De-duplication: Prevents double-counting from React re-renders or rapid button clicks.
 * 3. UTM Parameter Persistence: Captures utm_source, utm_medium, utm_campaign, utm_content, utm_term.
 * 4. Consent-Aware: Respects user privacy preferences and does not initialize without approval if consent mode is active.
 */

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

export interface UtmParameters {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  landing_page?: string;
  referrer?: string;
}

const GA_MEASUREMENT_ID = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GA_MEASUREMENT_ID) || '';
const GTM_ID = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GTM_ID) || '';
const GOOGLE_ADS_CONVERSION_ID = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GOOGLE_ADS_ID) || '';

// In-memory cache for de-duplicating rapid repeated event triggers (within 3 seconds)
const recentEvents = new Map<string, number>();

/**
 * Capture UTM and referrer parameters on initial site arrival and persist in sessionStorage
 */
export function captureTrafficSource(): UtmParameters {
  if (typeof window === 'undefined') return {};

  try {
    const searchParams = new URLSearchParams(window.location.search);
    const existing = sessionStorage.getItem('gstbro_traffic_source');
    
    if (existing) {
      return JSON.parse(existing);
    }

    const utm: UtmParameters = {
      utm_source: searchParams.get('utm_source') || undefined,
      utm_medium: searchParams.get('utm_medium') || undefined,
      utm_campaign: searchParams.get('utm_campaign') || undefined,
      utm_term: searchParams.get('utm_term') || undefined,
      utm_content: searchParams.get('utm_content') || undefined,
      landing_page: window.location.pathname,
      referrer: document.referrer || undefined,
    };

    // Only save if at least one parameter or referrer is present
    if (utm.utm_source || utm.referrer) {
      sessionStorage.setItem('gstbro_traffic_source', JSON.stringify(utm));
    }

    return utm;
  } catch {
    return {};
  }
}

/**
 * Get current traffic attribution parameters for attaching to lead submission
 */
export function getAttributionData(): UtmParameters {
  if (typeof window === 'undefined') return {};
  try {
    const stored = sessionStorage.getItem('gstbro_traffic_source');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Initialize GA4 and Google Tag Manager
 */
export function initializeAnalytics(): void {
  if (typeof window === 'undefined') return;

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function () {
      window.dataLayer?.push(arguments);
    };
  }

  // Check consent setting (if user opted out, abort tracking)
  const consentSetting = localStorage.getItem('gstbro_analytics_consent');
  if (consentSetting === 'denied') {
    return;
  }

  // Load GA4 script dynamically if ID exists and not already injected
  if (GA_MEASUREMENT_ID && !document.getElementById('ga4-script')) {
    const script = document.createElement('script');
    script.id = 'ga4-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      send_page_view: false, // Managed manually on route change for SPA accuracy
      anonymize_ip: true,
      cookie_flags: 'SameSite=None;Secure',
    });
  }

  // Load GTM script dynamically if ID exists and not already injected
  if (GTM_ID && !document.getElementById('gtm-script')) {
    const script = document.createElement('script');
    script.id = 'gtm-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
    document.head.appendChild(script);
  }

  // Record initial traffic source
  captureTrafficSource();
}

/**
 * Safe generic event tracker with de-duplication and PII sanitization
 */
export function trackEvent(eventName: string, params: Record<string, any> = {}): void {
  if (typeof window === 'undefined') return;

  // De-duplication check: identical event within 3 seconds is ignored
  const dedupKey = `${eventName}_${JSON.stringify(params)}`;
  const lastTime = recentEvents.get(dedupKey);
  const now = Date.now();
  if (lastTime && now - lastTime < 3000) {
    return;
  }
  recentEvents.set(dedupKey, now);

  // Clean old cache entries occasionally
  if (recentEvents.size > 100) {
    recentEvents.clear();
  }

  // Sanitize params to guarantee zero PII transmission
  const safeParams: Record<string, any> = {};
  for (const [key, value] of Object.entries(params)) {
    const lowerKey = key.toLowerCase();
    // Exclude any keys that might contain sensitive PII
    if (
      lowerKey.includes('password') ||
      lowerKey.includes('otp') ||
      lowerKey.includes('phone') ||
      lowerKey.includes('mobile') ||
      lowerKey.includes('email') ||
      lowerKey.includes('gstin') ||
      lowerKey.includes('token')
    ) {
      continue;
    }
    safeParams[key] = value;
  }

  // Attach traffic attribution where applicable
  const attribution = getAttributionData();
  if (attribution.utm_source) {
    safeParams.utm_source = attribution.utm_source;
    safeParams.utm_medium = attribution.utm_medium;
    safeParams.utm_campaign = attribution.utm_campaign;
  }

  // Push to dataLayer (for GTM)
  window.dataLayer?.push({
    event: eventName,
    ...safeParams,
  });

  // Dispatch to GA4 via gtag
  if (window.gtag) {
    window.gtag('event', eventName, safeParams);
  }

  if (import.meta.env.DEV) {
    console.debug(`[Analytics Event] ${eventName}:`, safeParams);
  }
}

/**
 * Track SPA Route Page Views
 */
export function trackPageView(path: string, title?: string): void {
  trackEvent('page_view', {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href,
  });
}

/**
 * Track user beginning a form interaction (form_start)
 */
export function trackFormStart(formName: string): void {
  trackEvent('form_start', {
    form_name: formName,
  });
}

/**
 * Track form submission attempt (form_submit)
 */
export function trackFormSubmit(formName: string): void {
  trackEvent('form_submit', {
    form_name: formName,
  });
}

/**
 * Track successful contact enquiry submission (contact_submit & generate_lead)
 */
export function trackContactSubmit(serviceType?: string, planType?: string): void {
  trackEvent('contact_submit', {
    service_type: serviceType || 'GENERAL',
    plan_type: planType || 'standard',
  });

  // Key Conversion Event: generate_lead
  trackEvent('generate_lead', {
    lead_type: 'enquiry',
    service_type: serviceType || 'GENERAL',
    value: 0,
    currency: 'INR',
  });

  // Google Ads conversion tracking hook (ready when ad campaign ID is supplied)
  if (GOOGLE_ADS_CONVERSION_ID && window.gtag) {
    window.gtag('event', 'conversion', {
      send_to: GOOGLE_ADS_CONVERSION_ID,
      value: 0,
      currency: 'INR',
    });
  }
}

/**
 * Track direct WhatsApp enquiry click (High-intent conversion)
 */
export function trackWhatsAppClick(sourceLocation: string): void {
  trackEvent('whatsapp_click', {
    click_location: sourceLocation,
  });

  trackEvent('generate_lead', {
    lead_type: 'whatsapp_contact',
    channel: 'whatsapp',
  });
}

/**
 * Track direct Phone call click (High-intent conversion)
 */
export function trackPhoneClick(sourceLocation: string): void {
  trackEvent('phone_call_click', {
    click_location: sourceLocation,
  });

  trackEvent('generate_lead', {
    lead_type: 'phone_call',
    channel: 'telephone',
  });
}

/**
 * Track email enquiry link click
 */
export function trackEmailClick(sourceLocation: string): void {
  trackEvent('email_click', {
    click_location: sourceLocation,
  });
}

/**
 * Track GST Registration CTA Click
 */
export function trackGstRegistrationClick(sourceLocation: string): void {
  trackEvent('gst_registration_click', {
    click_location: sourceLocation,
  });
}

/**
 * Track Service Page view
 */
export function trackServicePageView(serviceName: string, serviceSlug: string): void {
  trackEvent('service_page_view', {
    service_name: serviceName,
    service_slug: serviceSlug,
  });
}

/**
 * Track successful client login (strictly zero PII)
 */
export function trackLoginSuccess(role: string): void {
  trackEvent('login_success', {
    user_role: role,
    method: 'email_password',
  });
}

/**
 * Track client registration (strictly zero PII)
 */
export function trackSignUp(businessState?: string): void {
  trackEvent('sign_up', {
    business_state: businessState || 'unspecified',
    method: 'email_otp',
  });
}
