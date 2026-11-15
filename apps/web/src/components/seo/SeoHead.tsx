import { Helmet } from 'react-helmet-async';
import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import type { SeoMeta } from '@gst/ui';
import { subscribeToSettingsUpdates } from '@gst/ui';
import { LOCALE, API_URL } from "../../seo/meta.config";

interface SeoHeadProps {
  meta: SeoMeta;
  faviconUrl?: string;
}

interface SeoOverride {
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image_url?: string | null;
  canonical_url?: string | null;
  robots?: string | null;
}

export function SeoHead({ meta, faviconUrl }: SeoHeadProps) {
  const location = useLocation();
  const [override, setOverride] = useState<SeoOverride | null>(null);

  const fetchSeo = useCallback(async () => {
    const path = location.pathname;
    try {
      const res = await fetch(`${API_URL}/api/settings/seo?path=${encodeURIComponent(path)}&_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setOverride(data.seo);
      }
    } catch {
      // Fallback to meta defaults
    }
  }, [location.pathname]);

  useEffect(() => {
    fetchSeo();

    const unsubscribe = subscribeToSettingsUpdates((payload) => {
      if (!payload || payload.type === 'SEO_UPDATED' || payload.type === 'SETTINGS_UPDATED') {
        fetchSeo();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [fetchSeo]);

  const title = override?.meta_title || meta.title;
  const description = override?.meta_description || meta.description;
  const keywords = override?.meta_keywords || meta.keywords;
  const canonical = override?.canonical_url || meta.canonical;
  const robots = override?.robots || meta.robots;
  const ogTitle = override?.og_title || meta.ogTitle || title;
  const ogDescription = override?.og_description || meta.ogDescription || description;
  const ogImage = override?.og_image_url || meta.ogImage;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonical} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="GSTBro" />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:url" content={canonical} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta property="og:locale" content={LOCALE} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle} />
      <meta name="twitter:description" content={ogDescription} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}

      {faviconUrl && <link rel="icon" href={faviconUrl} />}
    </Helmet>
  );
}
