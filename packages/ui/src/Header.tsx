import { useState, useRef, useEffect, type ReactNode } from 'react';
import { SocialLinks } from './SocialLinks';
import type { PublicSettings } from './types';

interface HeaderProps {
  settings?: PublicSettings | null;
  children?: ReactNode;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

const serviceDropdownItems = [
  {
    title: 'Monthly Return Filing (GSTR-1 & 3B)',
    desc: 'Systematic monthly filings with Rule 88A tax offset optimization & zero late fees',
    href: '/services/gst-returns',
    badge: '99.9% SLA',
    icon: '📊',
  },
  {
    title: 'Dynamic 2B ITC Reconciliation',
    desc: 'Continuous purchase ledger audit & automated vendor default recovery',
    href: '/services/gst-compliance',
    badge: 'Max Credit',
    icon: '🔄',
  },
  {
    title: 'Department Notice & Scrutiny Defense',
    desc: 'Senior Chartered Accountant representation for ASMT-10, DRC-01 & SCNs',
    href: '/services/gst-advisory',
    badge: '100% Resolved',
    icon: '🛡️',
  },
  {
    title: 'Statutory GST Registration',
    desc: 'Fast-track GSTIN setup with zero rejection guarantee & document vetting',
    href: '/services/gst-registration',
    badge: '3–5 Days',
    icon: '⚡',
  },
  {
    title: 'Annual Statutory Audit (9 & 9C)',
    desc: 'Comprehensive true-up of audited books with certified CA sign-off',
    href: '/services/gst-audit',
    badge: 'CA Certified',
    icon: '📑',
  },
  {
    title: 'Expedited GST Refunds (LUT Export)',
    desc: 'Inverted duty & export refund recovery credited directly to bank account',
    href: '/services/gst-refund',
    badge: '₹42Cr+ Disbursed',
    icon: '💰',
  },
];

export function Header({ settings, children, theme: propTheme, onToggleTheme }: HeaderProps) {
  const siteName = settings?.siteName ?? 'GSTBro';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Local theme state that syncs with prop or localStorage
  const [localTheme, setLocalTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gstbro_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'light';
  });

  const currentTheme = propTheme || localTheme;
  const isLight = currentTheme === 'light';

  const handleToggleTheme = () => {
    if (onToggleTheme) {
      onToggleTheme();
    } else {
      const next = currentTheme === 'light' ? 'dark' : 'light';
      setLocalTheme(next);
      if (typeof window !== 'undefined') {
        localStorage.setItem('gstbro_theme', next);
        const root = document.documentElement;
        if (next === 'light') {
          root.classList.add('light');
          root.classList.remove('dark');
        } else {
          root.classList.add('dark');
          root.classList.remove('light');
        }
        window.dispatchEvent(new CustomEvent('gstbro-theme-change', { detail: { theme: next } }));
      }
    }
  };

  useEffect(() => {
    const handleCustom = (e: any) => {
      if (e.detail?.theme) {
        setLocalTheme(e.detail.theme);
      }
    };
    window.addEventListener('gstbro-theme-change', handleCustom);
    return () => window.removeEventListener('gstbro-theme-change', handleCustom);
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setServicesOpen(true);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setServicesOpen(false);
    }, 150);
  };

  // Close dropdown on outside click or on window scroll
  useEffect(() => {
    function handleScroll() {
      setServicesOpen(false);
    }
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setServicesOpen(false);
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 backdrop-blur-2xl border-b transition-all duration-200 ${
        isLight
          ? 'bg-white/95 border-slate-200/90 text-slate-900 shadow-md shadow-slate-900/5'
          : 'bg-slate-950/95 border-slate-800/80 text-white shadow-xl shadow-black/20'
      }`}
    >
      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between gap-4">
        {/* Brand Name */}
        <a href="/" className="flex items-center group focus:outline-hidden shrink-0">
          <span
            className={`text-2xl sm:text-[28px] font-black tracking-tight select-none leading-none group-hover:opacity-95 transition-opacity ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            GST
            <span
              className={`text-transparent bg-clip-text ${
                isLight
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
                  : 'bg-gradient-to-r from-blue-400 to-cyan-300'
              }`}
            >
              Bro
            </span>
          </span>
        </a>

        {/* Desktop Navigation */}
        <nav
          className={`hidden lg:flex items-center gap-1 xl:gap-2 text-[13px] font-semibold ${
            isLight ? 'text-slate-700' : 'text-slate-200'
          }`}
        >
          {/* Services Dropdown */}
          <div
            className="relative"
            ref={dropdownRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              onClick={() => setServicesOpen(!servicesOpen)}
              className={`px-3 py-2 rounded-xl inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                servicesOpen
                  ? isLight
                    ? 'text-blue-600 bg-blue-50 border border-blue-200 shadow-xs'
                    : 'text-white bg-slate-900 border border-slate-700 shadow-sm'
                  : isLight
                  ? 'text-slate-700 hover:text-blue-600 hover:bg-slate-100/80'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
              }`}
            >
              <span>Services</span>
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  servicesOpen
                    ? 'rotate-180 text-blue-500'
                    : isLight
                    ? 'text-slate-500'
                    : 'text-slate-400'
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Mega Dropdown Panel */}
            {servicesOpen && (
              <div
                className={`absolute top-full left-0 mt-2 w-[580px] border rounded-3xl p-5 z-[100] transition-all duration-200 ease-out animate-fadeIn origin-top ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-900 shadow-2xl'
                    : 'bg-[#090D16] border-slate-700/90 text-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)]'
                }`}
              >
                <div
                  className={`flex items-center justify-between pb-3.5 border-b mb-3.5 ${
                    isLight ? 'border-slate-100' : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${
                        isLight ? 'text-slate-800' : 'text-slate-200'
                      }`}
                    >
                      Statutory CA Practice Areas
                    </span>
                  </div>
                  <a
                    href="/services"
                    onClick={() => setServicesOpen(false)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors flex items-center gap-1 group"
                  >
                    <span>Full Services Hub</span>
                    <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {serviceDropdownItems.map((item) => (
                    <a
                      key={item.title}
                      href={item.href}
                      onClick={() => setServicesOpen(false)}
                      className={`p-3 rounded-2xl border transition-all duration-150 flex flex-col justify-between group shadow-xs hover:translate-y-[-1px] hover:shadow-md ${
                        isLight
                          ? 'bg-slate-50 hover:bg-blue-50/60 border-slate-200/90 hover:border-blue-300'
                          : 'bg-slate-900/90 hover:bg-slate-850 border-slate-800 hover:border-blue-500/50'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base group-hover:scale-110 transition-transform duration-200">
                            {item.icon}
                          </span>
                          <strong
                            className={`block text-xs font-bold transition-colors line-clamp-1 ${
                              isLight
                                ? 'text-slate-900 group-hover:text-blue-600'
                                : 'text-slate-100 group-hover:text-blue-400'
                            }`}
                          >
                            {item.title}
                          </strong>
                        </div>
                        <p
                          className={`text-[11px] leading-snug line-clamp-2 pl-6 ${
                            isLight
                              ? 'text-slate-600 group-hover:text-slate-800'
                              : 'text-slate-400 group-hover:text-slate-300'
                          }`}
                        >
                          {item.desc}
                        </p>
                      </div>
                      <div className="mt-2.5 pl-6 flex items-center justify-between">
                        <span
                          className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded border ${
                            isLight
                              ? 'text-blue-700 bg-blue-100/70 border-blue-200'
                              : 'text-blue-300 bg-blue-950 border-blue-700/60'
                          }`}
                        >
                          {item.badge}
                        </span>
                        <span
                          className={`text-xs group-hover:translate-x-1 transition-all ${
                            isLight
                              ? 'text-slate-400 group-hover:text-blue-600'
                              : 'text-slate-400 group-hover:text-blue-400'
                          }`}
                        >
                          &rarr;
                        </span>
                      </div>
                    </a>
                  ))}
                </div>

                <div
                  className={`mt-3.5 pt-3 border-t flex items-center justify-between text-xs ${
                    isLight ? 'border-slate-100 text-slate-600' : 'border-slate-800 text-slate-400'
                  }`}
                >
                  <span
                    className={`flex items-center gap-1.5 font-medium ${
                      isLight ? 'text-slate-700' : 'text-slate-300'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    All filings verified by ICAI Chartered Accountants
                  </span>
                  <a
                    href="/services/business-licenses"
                    onClick={() => setServicesOpen(false)}
                    className="font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors flex items-center gap-1 group"
                  >
                    <span>Business Licenses Directory</span>
                    <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          <a
            href="/pricing"
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
              isLight
                ? 'text-slate-700 hover:text-blue-600 hover:bg-slate-100/80'
                : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
            }`}
          >
            Pricing
          </a>

          <a
            href="/how-it-works"
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
              isLight
                ? 'text-slate-700 hover:text-blue-600 hover:bg-slate-100/80'
                : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
            }`}
          >
            How It Works
          </a>

          <a
            href="/resources"
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
              isLight
                ? 'text-slate-700 hover:text-blue-600 hover:bg-slate-100/80'
                : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
            }`}
          >
            Resources
          </a>

          <a
            href="/about"
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
              isLight
                ? 'text-slate-700 hover:text-blue-600 hover:bg-slate-100/80'
                : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
            }`}
          >
            About Us
          </a>

          <a
            href="/contact"
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
              isLight
                ? 'text-slate-700 hover:text-blue-600 hover:bg-slate-100/80'
                : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
            }`}
          >
            Contact
          </a>
        </nav>

        {/* Right Action Trigger Buttons */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Quick Sun/Moon Theme Toggle (Desktop & Mobile) */}
          <button
            type="button"
            onClick={handleToggleTheme}
            aria-label={`Switch to ${isLight ? 'Dark' : 'Light'} Mode`}
            title={`Switch to ${isLight ? 'Dark' : 'Light'} Mode`}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-amber-500 shadow-xs'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-blue-300'
            }`}
          >
            {isLight ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          <a
            href="/login"
            className={`hidden sm:inline-flex items-center gap-2 text-xs sm:text-sm font-bold px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border transition-all whitespace-nowrap shrink-0 shadow-xs ${
              isLight
                ? 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-300'
                : 'text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
            }`}
          >
            <svg
              className={`w-4 h-4 shrink-0 ${isLight ? 'text-blue-600' : 'text-blue-400'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            <span>Client Login</span>
          </a>

          <a
            href="/contact"
            className="hidden sm:inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap shrink-0 border border-blue-400/30"
          >
            <svg className="w-4 h-4 text-blue-200 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Talk to CA</span>
          </a>

          {/* Mobile Menu Toggle Button (Three Dashes) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            className={`lg:hidden p-2.5 rounded-xl border transition-all focus:outline-hidden cursor-pointer ${
              isLight
                ? 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-300'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer (Under Three Dashes) */}
      {mobileMenuOpen && (
        <div
          className={`lg:hidden border-t px-4 py-5 shadow-2xl animate-fadeIn space-y-4 ${
            isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-950'
          }`}
        >
          {/* Light / Dark Mode Toggle under the three dashes */}
          <div
            className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
              isLight ? 'bg-slate-50 border-slate-200 shadow-xs' : 'bg-slate-900/90 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold shadow-xs ${
                  isLight ? 'bg-amber-100 text-amber-600' : 'bg-blue-500/20 text-blue-400'
                }`}
              >
                {isLight ? '☀️' : '🌙'}
              </div>
              <div>
                <span className={`text-xs font-bold block ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Color Theme
                </span>
                <span className={`text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {isLight ? 'Light Mode Active' : 'Dark Mode Active'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleTheme}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                isLight
                  ? 'bg-slate-900 hover:bg-slate-800 text-white'
                  : 'bg-white hover:bg-slate-100 text-slate-900'
              }`}
            >
              <span>{isLight ? '🌙 Switch to Dark' : '☀️ Switch to Light'}</span>
            </button>
          </div>

          <nav className="flex flex-col space-y-2 text-sm font-semibold">
            <a
              href="/services"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                isLight
                  ? 'text-slate-800 bg-slate-50 active:bg-slate-100 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                  : 'text-slate-200 bg-slate-900/70 active:bg-slate-800 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span>📑</span>
                <span>Services Hub (All Practice Areas)</span>
              </div>
              <span className="text-blue-500 font-mono text-xs">&rarr;</span>
            </a>
            <a
              href="/pricing"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                isLight
                  ? 'text-slate-800 bg-slate-50 active:bg-slate-100 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                  : 'text-slate-200 bg-slate-900/70 active:bg-slate-800 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span>💎</span>
                <span>Pricing &amp; Retainer Plans</span>
              </div>
              <span className="text-blue-500 font-mono text-xs">&rarr;</span>
            </a>
            <a
              href="/how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                isLight
                  ? 'text-slate-800 bg-slate-50 active:bg-slate-100 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                  : 'text-slate-200 bg-slate-900/70 active:bg-slate-800 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span>⚡</span>
                <span>How It Works (Filing Workflow)</span>
              </div>
              <span className="text-blue-500 font-mono text-xs">&rarr;</span>
            </a>
            <a
              href="/resources"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                isLight
                  ? 'text-slate-800 bg-slate-50 active:bg-slate-100 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                  : 'text-slate-200 bg-slate-900/70 active:bg-slate-800 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span>🧮</span>
                <span>GST Calculators &amp; Guides</span>
              </div>
              <span className="text-blue-500 font-mono text-xs">&rarr;</span>
            </a>
            <a
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                isLight
                  ? 'text-slate-800 bg-slate-50 active:bg-slate-100 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                  : 'text-slate-200 bg-slate-900/70 active:bg-slate-800 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span>🏢</span>
                <span>About Us (Chartered CA Practice)</span>
              </div>
              <span className="text-blue-500 font-mono text-xs">&rarr;</span>
            </a>
            <a
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                isLight
                  ? 'text-slate-800 bg-slate-50 active:bg-slate-100 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                  : 'text-slate-200 bg-slate-900/70 active:bg-slate-800 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span>📞</span>
                <span>Contact Chartered Accountant Desk</span>
              </div>
              <span className="text-blue-500 font-mono text-xs">&rarr;</span>
            </a>
          </nav>

          <div
            className={`pt-3 border-t flex flex-col gap-2.5 ${
              isLight ? 'border-slate-200' : 'border-slate-800/80'
            }`}
          >
            <a
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-xl text-xs font-bold border shadow-xs ${
                isLight
                  ? 'bg-slate-100 active:bg-slate-200 border-slate-300 text-slate-900'
                  : 'bg-slate-900 active:bg-slate-850 border-slate-700 text-white'
              }`}
            >
              <svg
                className={`w-4 h-4 ${isLight ? 'text-blue-600' : 'text-blue-400'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span>Client Portal Login</span>
            </a>
            {settings?.contactPhone && (
              <a
                href={`tel:${settings.contactPhone}`}
                className="flex items-center justify-center gap-2 py-3 text-xs font-bold text-blue-600 dark:text-blue-400"
              >
                <span>📞 Direct CA Hotline:</span>
                <span className="underline font-mono">{settings.contactPhone}</span>
              </a>
            )}
          </div>
        </div>
      )}

      {children}
    </header>
  );
}
