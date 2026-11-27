import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../seo/meta.config';

export interface StrategyCallModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onVisibilityChange?: (visible: boolean) => void;
  initialTopic?: string;
}

// Full suite of major Indian business languages
interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  states: string[];
}

const ALL_LANGUAGES: LanguageOption[] = [
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', states: ['Telangana', 'Andhra Pradesh'] },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', states: ['Tamil Nadu', 'Puducherry'] },
  { code: 'en', name: 'English', nativeName: 'English', states: [] },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', states: ['Delhi', 'Uttar Pradesh', 'Madhya Pradesh', 'Rajasthan', 'Bihar', 'Haryana', 'Himachal Pradesh', 'Uttarakhand', 'Chhattisgarh', 'Jharkhand'] },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', states: ['Karnataka'] },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', states: ['Kerala', 'Lakshadweep'] },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', states: ['Maharashtra', 'Goa'] },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', states: ['Gujarat', 'Dadra and Nagar Haveli and Daman and Diu'] },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', states: ['West Bengal', 'Tripura'] },
];

// Helper function to globally trigger the Strategy Call Modal from anywhere
export function openStrategyCallModal(options?: { topic?: string }) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('gstbro:open-strategy-call', {
        detail: { topic: options?.topic || '' },
      })
    );
  }
}

export function StrategyCallModal({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  onVisibilityChange,
  initialTopic = '',
}: StrategyCallModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Internal open state supports both controlled and event-driven modes
  const [internalOpen, setInternalOpen] = useState(false);
  const isVisible = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;

  // Form Fields & Multi-Step Wizard State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [topic, setTopic] = useState(initialTopic);
  const [timeMode, setTimeMode] = useState<'NOW' | 'MORNING' | 'AFTERNOON' | 'EVENING' | 'CUSTOM'>('NOW');
  const [customDateTime, setCustomDateTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Geo Location State for dynamic language sorting
  const [userRegion, setUserRegion] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');

  // Listen to global open event
  useEffect(() => {
    const handleGlobalOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ topic?: string }>;
      if (customEvent.detail?.topic) {
        setTopic(customEvent.detail.topic);
      }
      setStep(1);
      setDirection(1);
      setInternalOpen(true);
      setSubmitted(false);
      setErrorMessage(null);
    };

    window.addEventListener('gstbro:open-strategy-call', handleGlobalOpen);
    return () => window.removeEventListener('gstbro:open-strategy-call', handleGlobalOpen);
  }, []);

  // Reset wizard to step 1 whenever modal opens
  useEffect(() => {
    if (isVisible) {
      setStep(1);
      setDirection(1);
      setSubmitted(false);
      setErrorMessage(null);
    }
  }, [isVisible]);

  // Detect user region and prioritize regional language to top
  useEffect(() => {
    let isMounted = true;

    async function detectLocation() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);

        const res = await fetch('https://ipwho.is/', {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          if (isMounted && data?.success && data?.region) {
            const detectedState = data.region;
            setUserRegion(detectedState);

            // Match language by region
            const matchedLang = ALL_LANGUAGES.find((l) =>
              l.states.some((st) => detectedState.toLowerCase().includes(st.toLowerCase()))
            );
            if (matchedLang) {
              setSelectedLanguage(`${matchedLang.name} (${matchedLang.nativeName})`);
            }
            return;
          }
        }
      } catch {
        // Fallback to browser locale
      }

      // Browser locale fallback
      if (isMounted && typeof navigator !== 'undefined') {
        const langCode = navigator.language?.slice(0, 2)?.toLowerCase();
        const fallbackMatch = ALL_LANGUAGES.find((l) => l.code === langCode);
        if (fallbackMatch) {
          setSelectedLanguage(`${fallbackMatch.name} (${fallbackMatch.nativeName})`);
        }
      }
    }

    detectLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute sorted languages with local language at the very top
  const orderedLanguages = useMemo(() => {
    if (!userRegion) {
      // Default order: English, Telugu, Tamil, Hindi, Kannada, Malayalam, etc.
      return ALL_LANGUAGES;
    }

    const localMatch = ALL_LANGUAGES.find((l) =>
      l.states.some((st) => userRegion.toLowerCase().includes(st.toLowerCase()))
    );

    if (!localMatch) {
      return ALL_LANGUAGES;
    }

    // Place local match at index 0, followed by others without duplicates
    const others = ALL_LANGUAGES.filter((l) => l.code !== localMatch.code);
    return [localMatch, ...others];
  }, [userRegion]);

  // Synchronize parent visibility callback (for blurring header & body)
  useEffect(() => {
    onVisibilityChange?.(isVisible);
  }, [isVisible, onVisibilityChange]);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (isVisible) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isVisible]);

  // Keyboard accessibility: Escape to close
  useEffect(() => {
    if (!isVisible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  const handleClose = () => {
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalOpen(false);
    }
  };

  const handlePhoneChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 10);
    setPhone(cleaned);
    if (errorMessage) setErrorMessage(null);
  };

  const getComputedCallTimeString = (): string => {
    switch (timeMode) {
      case 'NOW':
        return 'Call Right Now (within 5-15 mins)';
      case 'MORNING':
        return 'Morning Slot (10:00 AM - 1:00 PM)';
      case 'AFTERNOON':
        return 'Afternoon Slot (1:00 PM - 4:00 PM)';
      case 'EVENING':
        return 'Evening Slot (4:00 PM - 8:00 PM)';
      case 'CUSTOM':
        return customDateTime ? `Scheduled: ${customDateTime}` : 'Custom Scheduled Time';
      default:
        return 'Call Right Now';
    }
  };

  const validateStep1 = (): boolean => {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage('Please enter your full name (at least 2 characters).');
      return false;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
      return false;
    }

    return true;
  };

  const handleNextStep = () => {
    setErrorMessage(null);
    if (step === 1 && !validateStep1()) {
      return;
    }
    setDirection(1);
    setStep((prev) => (prev < 3 ? ((prev + 1) as 1 | 2 | 3) : prev));
  };

  const handlePrevStep = () => {
    setErrorMessage(null);
    setDirection(-1);
    setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : prev));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step < 3) {
      handleNextStep();
      return;
    }

    setErrorMessage(null);

    if (!validateStep1()) {
      setDirection(-1);
      setStep(1);
      return;
    }

    const trimmedName = name.trim();
    const cleanPhone = phone.replace(/\D/g, '');

    if (timeMode === 'CUSTOM' && !customDateTime) {
      setErrorMessage('Please select your preferred custom date & time.');
      return;
    }

    setLoading(true);
    const callTimeString = getComputedCallTimeString();

    try {
      const res = await fetch(`${API_URL}/api/leads/strategy-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          phone: cleanPhone,
          language: selectedLanguage,
          callTime: callTimeString,
          notes: topic.trim() || undefined,
          sourceUrl: typeof window !== 'undefined' ? window.location.href : '',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to schedule strategy call.');
      }

      setSubmitted(true);

      // Auto close after celebratory feedback
      setTimeout(() => {
        handleClose();
      }, 4500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Booking request failed. Please try again.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div
          role="presentation"
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          {/* Deep Blur Full Backdrop: Blurs all background content and sticky header */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={handleClose}
            aria-hidden="true"
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl transition-all cursor-pointer"
          />

          {/* Centered Modal Dialogue Box */}
          <motion.aside
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            role="dialog"
            aria-modal="true"
            aria-label="Book Free 15-Minute CA Strategy Call"
            className={`relative z-10 w-full max-w-[480px] max-h-[94vh] overflow-y-auto rounded-3xl p-5 sm:p-7 transition-all ${
              isDark
                ? 'bg-[#0f172a] text-white border-2 border-slate-700/80 shadow-[0_25px_80px_rgba(0,0,0,0.9)]'
                : 'bg-white text-slate-900 border-2 border-slate-200 shadow-[0_25px_80px_rgba(15,23,42,0.3)]'
            }`}
          >
            {/* Top Brand Decorative Gradient Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-3xl bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-400" />

            {/* Top Bar: Live CA Badge & Close Button */}
            <div className="flex items-center justify-between gap-3 mb-3 pt-1">
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
                <span>⭐ Senior CA Strategy Hotline</span>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close dialog"
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition active:scale-90 ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 border border-slate-200'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {submitted ? (
              /* Success Celebration State */
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 mx-auto flex items-center justify-center text-3xl shadow-inner">
                  🎉
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">Strategy Call Confirmed!</h3>
                  <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    Our Senior Chartered Accountant will call you at{' '}
                    <strong className="text-blue-500 font-bold">+91 {phone}</strong> in{' '}
                    <strong className="text-purple-500 font-bold">{selectedLanguage}</strong>.
                  </p>
                  <p className={`text-[11px] font-semibold mt-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    ⏱️ Preferred Time: {getComputedCallTimeString()}
                  </p>
                </div>

                <div className="pt-2">
                  <a
                    href={`https://wa.me/919989600000?text=${encodeURIComponent(
                      `Hello GSTBro, I just requested a 15-Min CA Strategy Call for ${name} (+91 ${phone}).`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-md shadow-emerald-600/30"
                  >
                    💬 Connect on WhatsApp Instantly
                  </a>
                </div>
              </div>
            ) : (
              /* Booking Form (3-Step Slide Wizard) */
              <>
                <div className="mb-4">
                  <h2 className="text-lg sm:text-xl font-black tracking-tight leading-snug">
                    Book Free 15-Min CA Strategy Call
                  </h2>
                  <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Discuss notice defense, GST filing, or ITC audit directly with a Senior CA.
                  </p>
                </div>

                {/* Step Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
                    <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>
                      Step {step} of 3
                    </span>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                      {step === 1
                        ? 'Your Contact Details'
                        : step === 2
                        ? 'Preferred Language'
                        : 'Preferred Call Time'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[1, 2, 3].map((s) => (
                      <div
                        key={s}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          s <= step
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-500'
                            : isDark
                            ? 'bg-slate-800'
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {errorMessage && (
                  <div className="mb-3.5 p-3 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/30 flex items-start gap-2">
                    <span className="shrink-0 text-sm">⚠️</span>
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="relative overflow-hidden">
                  <AnimatePresence mode="wait" custom={direction}>
                    {step === 1 && (
                      <motion.div
                        key="step-1"
                        custom={direction}
                        initial={{ x: direction > 0 ? 36 : -36, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: direction > 0 ? -36 : 36, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="space-y-3.5"
                      >
                        {/* Full Name */}
                        <div>
                          <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Your Full Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            autoFocus
                            placeholder="e.g. Rajesh Kumar"
                            value={name}
                            onChange={(e) => {
                              setName(e.target.value);
                              if (errorMessage) setErrorMessage(null);
                            }}
                            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold outline-hidden transition border ${
                              isDark
                                ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500'
                                : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-600'
                            }`}
                          />
                        </div>

                        {/* 10-Digit Mobile Number */}
                        <div>
                          <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Mobile Number <span className="text-rose-500">*</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <div
                              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-black shrink-0 ${
                                isDark
                                  ? 'bg-slate-900 border-slate-700 text-slate-300'
                                  : 'bg-slate-100 border-slate-300 text-slate-700'
                              }`}
                            >
                              <span className="text-sm">🇮🇳</span>
                              <span>+91</span>
                            </div>
                            <input
                              type="tel"
                              required
                              inputMode="numeric"
                              placeholder="10-digit mobile number"
                              value={phone}
                              onChange={(e) => handlePhoneChange(e.target.value)}
                              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold outline-hidden transition border tracking-wider ${
                                isDark
                                  ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500'
                                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-600'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleNextStep}
                            className="w-full py-3 px-4 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <span>Continue</span>
                            <span>&rarr;</span>
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {step === 2 && (
                      <motion.div
                        key="step-2"
                        custom={direction}
                        initial={{ x: direction > 0 ? 36 : -36, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: direction > 0 ? -36 : 36, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="space-y-4"
                      >
                        {/* Preferred Language Dropdown (Location-Prioritized at Top) */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              Preferred Language <span className="text-rose-500">*</span>
                            </label>
                            {userRegion && (
                              <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                                <span>📍</span>
                                <span>{userRegion}</span>
                              </span>
                            )}
                          </div>

                          <div className="relative">
                            <select
                              value={selectedLanguage}
                              onChange={(e) => setSelectedLanguage(e.target.value)}
                              className={`w-full px-3.5 py-3 rounded-xl text-xs font-bold outline-hidden transition border appearance-none cursor-pointer ${
                                isDark
                                  ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500'
                                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600'
                              }`}
                            >
                              {orderedLanguages.map((lang, idx) => {
                                const isLocalTop = idx === 0 && userRegion && lang.states.some((s) => userRegion.toLowerCase().includes(s.toLowerCase()));
                                const label = `${lang.name} (${lang.nativeName})${isLocalTop ? ` ⭐ Detected for ${userRegion}` : ''}`;
                                return (
                                  <option
                                    key={lang.code}
                                    value={`${lang.name} (${lang.nativeName})`}
                                    className={isDark ? 'bg-slate-900 text-white py-1' : 'bg-white text-slate-900 py-1'}
                                  >
                                    {label}
                                  </option>
                                );
                              })}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                          <p className={`text-[11px] mt-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {userRegion
                              ? `Local language for ${userRegion} is placed at the top of the menu.`
                              : 'Select your preferred language for the Senior CA consultation.'}
                          </p>
                        </div>

                        <div className="pt-2 flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={handlePrevStep}
                            className={`px-4 py-3 rounded-xl font-bold text-xs border transition cursor-pointer ${
                              isDark
                                ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                                : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            &larr; Back
                          </button>
                          <button
                            type="button"
                            onClick={handleNextStep}
                            className="flex-1 py-3 px-4 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <span>Continue</span>
                            <span>&rarr;</span>
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {step === 3 && (
                      <motion.div
                        key="step-3"
                        custom={direction}
                        initial={{ x: direction > 0 ? 36 : -36, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: direction > 0 ? -36 : 36, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="space-y-3.5"
                      >
                        {/* Time to Call or Now Options */}
                        <div>
                          <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            When Should We Call You? <span className="text-rose-500">*</span>
                          </label>

                          <div className="grid grid-cols-2 gap-2">
                            {/* Option 1: Call Me Right Now */}
                            <button
                              type="button"
                              onClick={() => setTimeMode('NOW')}
                              className={`col-span-2 p-2.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                                timeMode === 'NOW'
                                  ? isDark
                                    ? 'bg-rose-950/60 border-rose-500 text-white shadow-xs'
                                    : 'bg-rose-50 border-rose-400 text-rose-950 shadow-xs'
                                  : isDark
                                  ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                                </span>
                                <div>
                                  <span className="text-xs font-black block">⚡ Call Me Right Now</span>
                                  <span className="text-[10px] font-semibold opacity-80 block">Senior CA will connect in 5–15 mins</span>
                                </div>
                              </div>
                              <span className={`text-xs font-black ${timeMode === 'NOW' ? 'text-rose-500' : 'text-transparent'}`}>
                                ✓
                              </span>
                            </button>

                            {/* Option 2: Morning Slot */}
                            <button
                              type="button"
                              onClick={() => setTimeMode('MORNING')}
                              className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                                timeMode === 'MORNING'
                                  ? isDark
                                    ? 'bg-blue-950/60 border-blue-500 text-white'
                                    : 'bg-blue-50 border-blue-400 text-blue-950'
                                  : isDark
                                  ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <span className="text-[11px] font-bold block">☀️ Morning</span>
                              <span className="text-[10px] opacity-75 block">10:00 AM – 1:00 PM</span>
                            </button>

                            {/* Option 3: Afternoon Slot */}
                            <button
                              type="button"
                              onClick={() => setTimeMode('AFTERNOON')}
                              className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                                timeMode === 'AFTERNOON'
                                  ? isDark
                                    ? 'bg-blue-950/60 border-blue-500 text-white'
                                    : 'bg-blue-50 border-blue-400 text-blue-950'
                                  : isDark
                                  ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <span className="text-[11px] font-bold block">⛅ Afternoon</span>
                              <span className="text-[10px] opacity-75 block">1:00 PM – 4:00 PM</span>
                            </button>

                            {/* Option 4: Evening Slot */}
                            <button
                              type="button"
                              onClick={() => setTimeMode('EVENING')}
                              className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                                timeMode === 'EVENING'
                                  ? isDark
                                    ? 'bg-blue-950/60 border-blue-500 text-white'
                                    : 'bg-blue-50 border-blue-400 text-blue-950'
                                  : isDark
                                  ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <span className="text-[11px] font-bold block">🌙 Evening</span>
                              <span className="text-[10px] opacity-75 block">4:00 PM – 8:00 PM</span>
                            </button>

                            {/* Option 5: Custom Date & Time */}
                            <button
                              type="button"
                              onClick={() => setTimeMode('CUSTOM')}
                              className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                                timeMode === 'CUSTOM'
                                  ? isDark
                                    ? 'bg-blue-950/60 border-blue-500 text-white'
                                    : 'bg-blue-50 border-blue-400 text-blue-950'
                                  : isDark
                                  ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <span className="text-[11px] font-bold block">📅 Custom Time</span>
                              <span className="text-[10px] opacity-75 block">Pick date & hour</span>
                            </button>
                          </div>

                          {/* Inline Custom Date & Time Picker */}
                          {timeMode === 'CUSTOM' && (
                            <div className="mt-2">
                              <input
                                type="datetime-local"
                                value={customDateTime}
                                onChange={(e) => setCustomDateTime(e.target.value)}
                                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold outline-hidden border ${
                                  isDark
                                    ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500'
                                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600'
                                }`}
                              />
                            </div>
                          )}
                        </div>

                        {/* Navigation & Submit CTA */}
                        <div className="pt-2">
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={handlePrevStep}
                              disabled={loading}
                              className={`px-4 py-3.5 rounded-xl font-bold text-xs border transition cursor-pointer disabled:opacity-50 ${
                                isDark
                                  ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              &larr; Back
                            </button>
                            <button
                              type="submit"
                              disabled={loading}
                              className="flex-1 py-3.5 px-4 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] transition shadow-lg shadow-blue-600/30 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                            >
                              {loading ? (
                                <>
                                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                  <span>Confirming...</span>
                                </>
                              ) : (
                                <>
                                  <span>Confirm Strategy Call</span>
                                  <span>&rarr;</span>
                                </>
                              )}
                            </button>
                          </div>
                          <p className={`text-[10px] text-center mt-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            🔒 100% Free Consultation • Zero Obligation • Strict CA Client Confidentiality
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>
              </>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
