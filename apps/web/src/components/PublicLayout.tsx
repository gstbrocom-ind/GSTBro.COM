import type { ReactNode } from 'react';
import { Header, Footer } from '@gst/ui';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { SeoHead } from './seo/SeoHead';
import { JsonLd } from './seo/JsonLd';
import { organizationSchema, professionalServiceSchema, websiteSchema } from '../seo/schema/organization';
import { FridayAssistantWidget } from './FridayAssistantWidget';
import { WhatsAppFloatingButton } from './WhatsAppFloatingButton';
import type { SeoMeta } from '@gst/ui';

interface PublicLayoutProps {
  children: ReactNode;
  meta: SeoMeta;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export function PublicLayout({ children, meta, jsonLd }: PublicLayoutProps) {
  const settings = useSettings();
  const { theme, toggleTheme } = useTheme();
  const schemas = [
    organizationSchema(settings),
    professionalServiceSchema(settings),
    websiteSchema(),
    ...(jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : []),
  ];

  return (
    <>
      <SeoHead meta={meta} faviconUrl={settings?.faviconUrl || '/favicon.svg'} />
      <JsonLd data={schemas} />
      {settings?.announcementBarEnabled && settings?.announcementBarText && (
        <aside
          aria-label="Site announcement"
          className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white text-xs font-semibold py-2 px-4 text-center border-b border-blue-600/50 flex items-center justify-center gap-2 relative z-50"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{settings.announcementBarText}</span>
          {settings.announcementBarUrl && (
            <a
              href={settings.announcementBarUrl}
              className="underline text-blue-200 hover:text-white font-bold ml-1 transition"
            >
              Learn more &rarr;
            </a>
          )}
        </aside>
      )}
      <Header settings={settings} theme={theme} onToggleTheme={toggleTheme} />
      <main id="main-content">{children}</main>
      <Footer settings={settings} />
      <WhatsAppFloatingButton />
      <FridayAssistantWidget />
    </>
  );
}
