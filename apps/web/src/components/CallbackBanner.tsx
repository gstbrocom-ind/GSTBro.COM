import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings } from '../context/SettingsContext';
import { API_URL } from '../seo/meta.config';

interface CallbackBannerProps {
  introActive: boolean;
}

export function CallbackBanner({ introActive }: CallbackBannerProps) {
  const settings = useSettings();
  const location = useLocation();

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
    // Only accept numeric digits, maximum 10 digits
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        >
          {/* Full-Screen Backdrop: Everything behind is completely blurred & dimmed */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleDismiss}
            aria-hidden="true"
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-all cursor-pointer"
          />

          {/* Centered Modal Card: Sharp, Elevated & Fully Mobile-Friendly */}
          <motion.aside
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            role="dialog"
            aria-modal="true"
            aria-label="Instant CA Callback Request"
            className="relative z-10 w-full max-w-[420px] max-h-[92vh] overflow-y-auto bg-white/98 dark:bg-slate-900/98 backdrop-blur-2xl border border-blue-200/90 dark:border-blue-500/30 rounded-3xl shadow-2xl shadow-blue-950/50 p-5 sm:p-7 text-slate-800 dark:text-slate-100"
          >
            {/* Subtle Ambient Decorative Glow in Modal */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/15 dark:bg-blue-500/25 rounded-full blur-3xl pointer-events-none" />

            {/* Top Bar: Live Status & Prominent Close Button */}
            <div className="flex items-center justify-between gap-2 mb-3 relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold tracking-tight shadow-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>{badge}</span>
              </div>

              {/* Top-Right Dismiss Button with Large Touch Target */}
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Close instant callback modal"
                className="p-2 -mr-1 -mt-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-90"
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
                className="py-6 text-center space-y-3 relative z-10"
              >
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-3xl font-extrabold shadow-inner">
                  ✓
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Request Dispatched!
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium px-2 leading-relaxed">
                  {successMsg}
                </p>
                <p className="text-[11px] text-slate-400 pt-1">
                  This window will close automatically.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                    {headline}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    {description}
                  </p>
                </div>

                {/* Name Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                      className="w-full pl-10 pr-3.5 py-2.5 text-base sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition font-medium"
                    />
                  </div>
                </div>

                {/* Mobile Number Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Number
                  </label>
                  <div className="relative flex rounded-xl shadow-xs">
                    <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold select-none">
                      🇮🇳 +91
                    </span>
                    <input
                      type="tel"
                      required
                      placeholder="98765 43210"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      maxLength={10}
                      className="w-full pl-3 pr-3.5 py-2.5 text-base sm:text-sm rounded-r-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 font-semibold tracking-wide focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                {/* Error Alert */}
                {errorMessage && (
                  <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl px-3 py-1.5">
                    ⚠️ {errorMessage}
                  </p>
                )}

                {/* Submit CTA Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-5 rounded-2xl font-black text-sm sm:text-base text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] transition-all shadow-xl shadow-blue-600/30 dark:shadow-blue-900/50 border border-blue-400/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
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
                    <span>{ctaText}</span>
                  )}
                </button>

                {/* Security & Privacy Microcopy */}
                <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 pt-0.5">
                  🔒 100% Confidential • ICAI Compliant • Zero Spam
                </p>
              </form>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
