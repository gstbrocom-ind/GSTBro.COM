import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import {
  getStoredConsent,
  isSearchCrawler,
  OPEN_COOKIE_SETTINGS_EVENT,
  saveCookieConsent,
} from '../lib/consent';

interface CookieConsentBannerProps {
  introActive?: boolean;
}

export function CookieConsentBanner({ introActive = false }: CookieConsentBannerProps) {
  const { isLight } = useTheme();
  const [bannerVisible, setBannerVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [marketingEnabled, setMarketingEnabled] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined' || isSearchCrawler()) return;

    const existing = getStoredConsent();
    if (!existing) {
      setBannerVisible(true);
    } else {
      setAnalyticsEnabled(existing.analytics);
      setMarketingEnabled(existing.marketing);
    }

    const handleOpenSettings = () => {
      const current = getStoredConsent();
      if (current) {
        setAnalyticsEnabled(current.analytics);
        setMarketingEnabled(current.marketing);
      } else {
        setAnalyticsEnabled(true);
        setMarketingEnabled(true);
      }
      setModalOpen(true);
    };

    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, handleOpenSettings);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, handleOpenSettings);
  }, []);

  const handleAcceptAll = () => {
    saveCookieConsent({ analytics: true, marketing: true });
    setAnalyticsEnabled(true);
    setMarketingEnabled(true);
    setBannerVisible(false);
    setModalOpen(false);
  };

  const handleRejectNonEssential = () => {
    saveCookieConsent({ analytics: false, marketing: false });
    setAnalyticsEnabled(false);
    setMarketingEnabled(false);
    setBannerVisible(false);
    setModalOpen(false);
  };

  const handleSaveCustom = () => {
    saveCookieConsent({ analytics: analyticsEnabled, marketing: marketingEnabled });
    setBannerVisible(false);
    setModalOpen(false);
  };

  if (introActive && !modalOpen) return null;

  return (
    <>
      {bannerVisible && !modalOpen && (
        <aside
          aria-label="Cookie and Privacy Consent"
          className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-lg z-50"
        >
          <div
            className={`rounded-2xl border p-5 shadow-2xl backdrop-blur-md transition-colors ${
              isLight
                ? 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-900/15'
                : 'bg-slate-900/95 border-slate-700 text-slate-100 shadow-black/50'
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Cookies &amp; DPDP Privacy Notice
              </div>
            </div>

            <p className={`text-xs sm:text-sm leading-relaxed mb-4 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              We use essential cookies for security and login, and optional analytics cookies to improve our GST
              services. By clicking &ldquo;Accept All&rdquo;, you consent to optional cookies under our{' '}
              <Link to="/privacy" className="font-semibold text-blue-600 dark:text-blue-400 underline">
                Privacy Notice
              </Link>{' '}
              and{' '}
              <Link to="/terms" className="font-semibold text-blue-600 dark:text-blue-400 underline">
                Terms
              </Link>
              .
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAcceptAll}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors cursor-pointer"
              >
                Accept All
              </button>
              <button
                type="button"
                onClick={handleRejectNonEssential}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                Reject Non-Essential
              </button>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold underline transition-colors cursor-pointer ${
                  isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-300 hover:text-white'
                }`}
              >
                Customize
              </button>
            </div>
          </div>
        </aside>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-preferences-title"
        >
          <div
            className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-5 ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="cookie-preferences-title" className="text-lg font-bold">
                  Cookie &amp; Privacy Preferences
                </h2>
                <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Manage your consent preferences in accordance with the DPDP Act, 2023. Read our{' '}
                  <Link
                    to="/privacy"
                    onClick={() => setModalOpen(false)}
                    className="text-blue-600 dark:text-blue-400 underline font-semibold"
                  >
                    Privacy Notice
                  </Link>
                  .
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close cookie preferences"
                className={`p-1.5 rounded-lg text-sm font-bold cursor-pointer ${
                  isLight ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {/* Strictly Necessary */}
              <div
                className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div>
                  <div className="text-sm font-bold">Strictly Necessary Cookies</div>
                  <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Required for authentication, Cloudflare Turnstile security, theme preference, and portal sessions.
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Always On
                </span>
              </div>

              {/* Analytics */}
              <label
                className={`p-4 rounded-xl border flex items-start justify-between gap-4 cursor-pointer ${
                  isLight ? 'bg-white border-slate-200' : 'bg-slate-950/40 border-slate-800'
                }`}
              >
                <div>
                  <div className="text-sm font-bold">Analytics &amp; Performance</div>
                  <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Helps us understand page visits and improve GST tools without collecting sensitive PII or GSTINs.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={analyticsEnabled}
                  onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-blue-600 cursor-pointer shrink-0"
                />
              </label>

              {/* Marketing */}
              <label
                className={`p-4 rounded-xl border flex items-start justify-between gap-4 cursor-pointer ${
                  isLight ? 'bg-white border-slate-200' : 'bg-slate-950/40 border-slate-800'
                }`}
              >
                <div>
                  <div className="text-sm font-bold">Marketing &amp; Attribution</div>
                  <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Measures campaign effectiveness and referral attribution when you request a CA consultation.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={marketingEnabled}
                  onChange={(e) => setMarketingEnabled(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-blue-600 cursor-pointer shrink-0"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleRejectNonEssential}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                Reject Non-Essential
              </button>
              <button
                type="button"
                onClick={handleSaveCustom}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-slate-50 text-slate-900 border-slate-300'
                    : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-700'
                }`}
              >
                Save Preferences
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors cursor-pointer"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
