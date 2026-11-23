import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../seo/meta.config';

interface CallbackBannerProps {
  introActive: boolean;
  onVisibilityChange?: (visible: boolean) => void;
}

export function CallbackBanner({ introActive, onVisibilityChange }: CallbackBannerProps) {
  const settings = useSettings();
  const location = useLocation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [visible, setVisible] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bannerSettings = settings?.callbackBanner;
  const enabled = bannerSettings?.enabled !== false;
  const delaySeconds = bannerSettings?.delaySeconds ?? 5;
  const badge = bannerSettings?.badge || '⭐ Instant CA Callback';
  const headline = bannerSettings?.headline || 'Need Expert GST or Tax Help?';
  const description =
    bannerSettings?.description ||
    'Leave your number — our Senior Chartered Accountant will call you in 5 minutes.';
  const ctaText = bannerSettings?.ctaText || 'Request Free Callback →';
  const successMsg =
    bannerSettings?.successMessage ||
    '🎉 Request Received! Our Senior CA is calling you in 5 minutes.';

  // Check if current route is private or auth where banner should not appear
  const isExcludedRoute =
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/app') ||
    location.pathname.startsWith('/firm') ||
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/signup') ||
    location.pathname.startsWith('/forgot-password');

  // Notify parent on visibility changes so background & header blur can sync
  useEffect(() => {
    onVisibilityChange?.(visible);
  }, [visible, onVisibilityChange]);

  useEffect(() => {
    // Clear any pending countdown timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!enabled || isExcludedRoute || introActive) {
      setVisible(false);
      return;
    }

    // Check suppression cache
    try {
      if (typeof window !== 'undefined') {
        const isDismissed = sessionStorage.getItem('gstbro_callback_dismissed') === '1';
        const isAlreadySubmitted = localStorage.getItem('gstbro_callback_submitted') === '1';
        if (isDismissed || isAlreadySubmitted) {
          return;
        }
      }
    } catch {}

    // Start delay timer after Brand Intro completes
    const ms = Math.max(1, delaySeconds) * 1000;
    timerRef.current = setTimeout(() => {
      setVisible(true);
    }, ms);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, isExcludedRoute, introActive, delaySeconds, location.pathname]);

  // Lock background body scroll while the center modal is active
  useEffect(() => {
    if (visible) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [visible]);

  // Allow closing with Escape key
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible]);

  const handleDismiss = () => {
    try {
      sessionStorage.setItem('gstbro_callback_dismissed', '1');
    } catch {}
    setVisible(false);
  };

  const handlePhoneChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 10);
    setPhone(cleaned);
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage('Please enter your full name (at least 2 letters).');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/leads/instant-callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          phone: cleanPhone,
          sourceUrl: typeof window !== 'undefined' ? window.location.href : '',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit callback request.');
      }

      setSubmitted(true);
      try {
        localStorage.setItem('gstbro_callback_submitted', '1');
      } catch {}

      // Auto dismiss after 4 seconds celebration
      setTimeout(() => {
        setVisible(false);
      }, 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed. Please try again.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <div
          role="presentation"
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        >
          {/* Full-Screen Backdrop: Deeply blurs everything behind including sticky Header */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleDismiss}
            aria-hidden="true"
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xl transition-all cursor-pointer"
          />

          {/* Centered Modal Card: Ultra-Professional, High Contrast & 100% Mobile Friendly */}
          <motion.aside
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            role="dialog"
            aria-modal="true"
            aria-label="Instant CA Callback Request"
            className={`relative z-10 w-full max-w-[440px] max-h-[92vh] overflow-y-auto rounded-3xl p-6 sm:p-8 transition-all ${
              isDark
                ? 'bg-[#0f172a] text-white border-2 border-slate-700/80 shadow-[0_25px_70px_rgba(0,0,0,0.85)]'
                : 'bg-white text-slate-900 border-2 border-slate-200 shadow-[0_25px_70px_rgba(15,23,42,0.3)]'
            }`}
          >
            {/* Top Brand Accent Hairline Strip */}
            <div
              className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-3xl ${
                isDark
                  ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-400'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500'
              }`}
            />

            {/* Top Bar: Live Status Badge & Clear Close Button */}
            <div className="flex items-center justify-between gap-3 mb-4 pt-1">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black tracking-tight shadow-xs ${
                  isDark
                    ? 'bg-blue-950/90 text-blue-300 border border-blue-700/70'
                    : 'bg-blue-50 text-blue-900 border border-blue-200'
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>{badge}</span>
              </div>

              {/* Close Button: High Visibility & Generous Touch Target */}
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Close instant callback modal"
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition active:scale-90 ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 border border-slate-200'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form / Content State */}
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-6 text-center space-y-3"
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border-2 border-emerald-500 text-emerald-500 flex items-center justify-center text-3xl font-black shadow-lg">
                  ✓
                </div>
                <h3
                  className={`text-lg sm:text-xl font-black tracking-tight ${
                    isDark ? 'text-white' : 'text-slate-950'
                  }`}
                >
                  Request Dispatched!
                </h3>
                <p
                  className={`text-xs sm:text-sm font-semibold px-2 leading-relaxed ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  {successMsg}
                </p>
                <p className="text-[11px] text-slate-400 font-medium pt-1">
                  This window will close automatically.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Headline & Description */}
                <div>
                  <h3
                    className={`text-lg sm:text-xl font-black tracking-tight leading-snug ${
                      isDark ? 'text-white' : 'text-slate-950'
                    }`}
                  >
                    {headline}
                  </h3>
                  <p
                    className={`text-xs sm:text-sm font-medium mt-1.5 leading-relaxed ${
                      isDark ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    {description}
                  </p>
                </div>

                {/* Name Input */}
                <div>
                  <label
                    className={`block text-xs font-black uppercase tracking-wider mb-1.5 ${
                      isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}
                  >
                    Your Full Name
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      className={`w-full pl-10 pr-4 py-2.5 sm:py-3 text-base sm:text-sm rounded-xl font-semibold transition focus:outline-none focus:ring-4 ${
                        isDark
                          ? 'bg-slate-900 border-2 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-400 focus:ring-blue-950/60'
                          : 'bg-slate-50 border-2 border-slate-300 text-slate-950 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-blue-100'
                      }`}
                    />
                  </div>
                </div>

                {/* Mobile Number Input */}
                <div>
                  <label
                    className={`block text-xs font-black uppercase tracking-wider mb-1.5 ${
                      isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}
                  >
                    Mobile Number
                  </label>
                  <div className="relative flex rounded-xl shadow-xs">
                    <span
                      className={`inline-flex items-center px-3.5 rounded-l-xl border-2 border-r-0 text-xs sm:text-sm font-black select-none ${
                        isDark
                          ? 'bg-slate-800 border-slate-700 text-slate-200'
                          : 'bg-slate-200 border-slate-300 text-slate-900'
                      }`}
                    >
                      🇮🇳 +91
                    </span>
                    <input
                      type="tel"
                      required
                      placeholder="98765 43210"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      maxLength={10}
                      className={`w-full pl-3.5 pr-4 py-2.5 sm:py-3 text-base sm:text-sm rounded-r-xl font-bold tracking-wide transition focus:outline-none focus:ring-4 ${
                        isDark
                          ? 'bg-slate-900 border-2 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-400 focus:ring-blue-950/60'
                          : 'bg-slate-50 border-2 border-slate-300 text-slate-950 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-blue-100'
                      }`}
                    />
                  </div>
                </div>

                {/* Error Alert */}
                {errorMessage && (
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-xl px-3.5 py-2">
                    ⚠️ {errorMessage}
                  </p>
                )}

                {/* Submit CTA Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-2xl font-black text-sm sm:text-base text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] transition-all shadow-xl shadow-blue-600/30 dark:shadow-blue-950/80 border border-blue-400/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Connecting Senior CA...</span>
                    </>
                  ) : (
                    <>
                      <span>{ctaText}</span>
                    </>
                  )}
                </button>

                {/* Security & Confidentiality Guarantee */}
                <p
                  className={`text-[11px] text-center font-bold pt-1 ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  🛡️ ICAI Compliant • 100% Confidential • Zero Spam
                </p>
              </form>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
