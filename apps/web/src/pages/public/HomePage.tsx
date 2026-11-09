import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PublicLayout } from '../../components/PublicLayout';
import { homeMeta } from '../../seo/pages/home.meta';
import { useSettings } from '../../context/SettingsContext';
import { useTheme } from '../../context/ThemeContext';
import { trackGstRegistrationClick, trackPhoneClick } from '../../lib/analytics';
import {
  fadeUpVariants,
  fadeInVariants,
  staggerContainer,
  staggerFast,
  cardHoverVariants,
  transitions,
} from '../../lib/animations';

export default function HomePage() {
  const settings = useSettings();
  const { isLight } = useTheme();
  const [activeTab, setActiveTab] = useState<'3b' | '2b' | 'notice'>('3b');
  const [calculatorTurnover, setCalculatorTurnover] = useState<number>(30000000); // 3 Cr
  const [billingCycle, setBillingCycle] = useState<'annual' | 'quarterly'>('annual');

  const contactPhone = settings?.contactPhone || '+91 800 123 4567';
  const officeAddress = settings?.officeAddress || 'Plot No. 42, Cyber Towers Area, Hitech City, Madhapur, Hyderabad, Telangana 500081';
  const googleMapsUrl = settings?.googleMapsUrl || 'https://maps.google.com/?q=Cyber+Towers+Hitech+City+Hyderabad';
  const mapEmbedUrl = settings?.mapEmbedUrl || 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3806.314644503792!2d78.38084667595462!3d17.444634201150495!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb93dc8c5d69df%3A0x19688ebb557861c!2sCyber%20Towers!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin';

  // Dynamic ROI calculation
  const estimatedPurchases = calculatorTurnover * 0.65;
  const estimatedInputTax = estimatedPurchases * 0.18;
  const averageItcLeakageAverted = Math.round(estimatedInputTax * 0.032);

  return (
    <PublicLayout meta={homeMeta}>
      {/* 1. HERO SECTION WITH FINANCIAL GRID & ACCENT GLOWS */}
      <section
        className={`relative pt-12 pb-16 sm:pt-20 sm:pb-24 overflow-hidden border-b transition-colors duration-300 ${
          isLight
            ? 'bg-gradient-to-b from-[#eef5ff] via-white to-slate-50 text-slate-900 border-slate-200'
            : 'bg-slate-950 text-white border-slate-900 bg-financial-grid'
        }`}
      >
        {/* Ambient atmospheric glows */}
        <div
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] blur-3xl pointer-events-none ${
            isLight ? 'bg-blue-400/10' : 'bg-blue-600/15'
          }`}
        />
        <div
          className={`absolute -top-24 right-0 w-[500px] h-[400px] blur-3xl pointer-events-none ${
            isLight ? 'bg-indigo-400/10' : 'bg-indigo-500/10'
          }`}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Content - Animated with Stagger */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="lg:col-span-7 space-y-6 text-left"
            >
              {/* Trust Badge */}
              <motion.div variants={fadeUpVariants}>
                <div
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-xs ${
                    isLight
                      ? 'bg-white border border-slate-200 text-slate-700 shadow-slate-100'
                      : 'bg-slate-900/90 border border-slate-800 text-slate-300 shadow-inner'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{settings?.homepage?.heroTrustBadge || '★ 4.9/5 Rating • Supervised by Real Chartered Accountants'}</span>
                </div>
              </motion.div>

              {/* Main Headline */}
              <motion.h1
                variants={fadeUpVariants}
                className={`text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                {settings?.homepage?.heroTitle || (
                  <>
                    Never Worry About GST Deadlines,{' '}
                    <span
                      className={`text-transparent bg-clip-text block sm:inline ${
                        isLight
                          ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800'
                          : 'bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300'
                      }`}
                    >
                      Penalties or Notices Again.
                    </span>
                  </>
                )}
              </motion.h1>

              {/* Value Proposition */}
              <motion.p
                variants={fadeUpVariants}
                className={`text-base sm:text-lg max-w-2xl leading-relaxed ${
                  isLight ? 'text-slate-600' : 'text-slate-300'
                }`}
              >
                {settings?.homepage?.heroSubtitle ||
                  'Automate monthly GSTR-1 & 3B filings, lock down 100% of eligible 2B Input Tax Credit, and get dedicated senior Chartered Accountants defending your business against scrutiny notices.'}
              </motion.p>

              {/* High-Converting Action CTAs */}
              <motion.div
                variants={fadeUpVariants}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2"
              >
                <motion.a
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={transitions.fast}
                  href="/contact"
                  onClick={() => trackGstRegistrationClick('hero_cta_primary')}
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-blue-600/30 cursor-pointer border border-blue-400/30"
                >
                  <span>{settings?.homepage?.heroCtaPrimary || 'Book Free 15-Min CA Strategy Call'}</span>
                  <span className="text-sm font-normal">&rarr;</span>
                </motion.a>
                <motion.a
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  transition={transitions.fast}
                  href="/pricing"
                  className={`inline-flex items-center justify-center px-6 py-4 rounded-xl font-bold text-sm text-center border transition-all ${
                    isLight
                      ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-xs'
                      : 'text-slate-200 bg-slate-900 hover:bg-slate-800 border-slate-700/80'
                  }`}
                >
                  {settings?.homepage?.heroCtaSecondary || 'View Transparent Plans →'}
                </motion.a>
              </motion.div>

              {/* Fast Trust Proofs */}
              <motion.div
                variants={fadeUpVariants}
                className={`pt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>✓</span>
                  <span>100% Zero Late-Fee Guarantee</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>✓</span>
                  <span>Continuous 2B Audit</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>✓</span>
                  <span>ICAI Chartered Accountants</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>✓</span>
                  <span>Bank-Grade 256-Bit SSL</span>
                </span>
              </motion.div>
            </motion.div>

            {/* Right: Live Interactive Compliance Terminal */}
            <motion.div
              initial={{ opacity: 0, y: 22, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.65, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5"
            >
              <div
                className={`rounded-3xl p-6 shadow-2xl backdrop-blur-md transition-all border ${
                  isLight
                    ? 'bg-white border-slate-200/90 text-slate-900 shadow-xl shadow-blue-500/5'
                    : 'bg-slate-900/95 border-slate-800 text-white glow-blue-subtle'
                }`}
              >
                {/* Terminal Header */}
                <div
                  className={`flex items-center justify-between pb-4 border-b ${
                    isLight ? 'border-slate-100' : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span
                      className={`text-xs font-bold uppercase tracking-wider font-mono ${
                        isLight ? 'text-slate-800' : 'text-white'
                      }`}
                    >
                      GSTBro Compliance Engine
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono border ${
                      isLight
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    }`}
                  >
                    Audit Verified ✓
                  </span>
                </div>

                {/* Terminal Switcher Tabs */}
                <div
                  className={`flex items-center gap-1 p-1 rounded-xl border my-4 text-[11px] ${
                    isLight
                      ? 'bg-slate-100 border-slate-200'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveTab('3b')}
                    className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                      activeTab === '3b'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Rule 88A Set-off
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('2b')}
                    className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                      activeTab === '2b'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    2B Invoice Sync
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('notice')}
                    className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                      activeTab === 'notice'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Notice Shield
                  </button>
                </div>

                {/* Animated Terminal Content */}
                <AnimatePresence mode="wait">
                  {activeTab === '3b' && (
                    <motion.div
                      key="tab-3b"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.22 }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div
                          className={`p-3.5 rounded-xl border ${
                            isLight
                              ? 'bg-slate-50 border-slate-200/90'
                              : 'bg-slate-950/80 border-slate-800/80'
                          }`}
                        >
                          <span
                            className={`text-[10px] uppercase font-bold block mb-1 ${
                              isLight ? 'text-slate-500' : 'text-slate-400'
                            }`}
                          >
                            Table 3.1(a) Sales Tax
                          </span>
                          <span
                            className={`text-xl font-black font-mono ${
                              isLight ? 'text-slate-900' : 'text-white'
                            }`}
                          >
                            ₹48,500
                          </span>
                          <span
                            className={`text-[10px] font-medium block mt-1 ${
                              isLight ? 'text-blue-600' : 'text-blue-400'
                            }`}
                          >
                            100% GSTR-1 Reconciled
                          </span>
                        </div>
                        <div
                          className={`p-3.5 rounded-xl border ${
                            isLight
                              ? 'bg-slate-50 border-slate-200/90'
                              : 'bg-slate-950/80 border-slate-800/80'
                          }`}
                        >
                          <span
                            className={`text-[10px] uppercase font-bold block mb-1 ${
                              isLight ? 'text-slate-500' : 'text-slate-400'
                            }`}
                          >
                            Table 4A(5) Purchase ITC
                          </span>
                          <span
                            className={`text-xl font-black font-mono ${
                              isLight ? 'text-emerald-600' : 'text-emerald-400'
                            }`}
                          >
                            ₹2,14,800
                          </span>
                          <span
                            className={`text-[10px] font-medium block mt-1 ${
                              isLight ? 'text-emerald-700' : 'text-emerald-400/80'
                            }`}
                          >
                            100% 2B Matched
                          </span>
                        </div>
                      </div>

                      <div
                        className={`p-3.5 rounded-xl border space-y-2 ${
                          isLight
                            ? 'bg-blue-50/80 border-blue-200'
                            : 'bg-blue-950/40 border-blue-900/40'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className={isLight ? 'text-slate-700 font-medium' : 'text-slate-300 font-medium'}>
                            Rule 88A Cross Set-off:
                          </span>
                          <span
                            className={`font-bold font-mono ${
                              isLight ? 'text-emerald-700' : 'text-emerald-400'
                            }`}
                          >
                            100% Absorbed
                          </span>
                        </div>
                        <div
                          className={`flex items-center justify-between text-xs pt-2 border-t ${
                            isLight ? 'border-blue-200/80' : 'border-blue-900/50'
                          }`}
                        >
                          <div>
                            <span
                              className={`text-[10px] uppercase font-bold block ${
                                isLight ? 'text-slate-500' : 'text-slate-400'
                              }`}
                            >
                              Cash Liability
                            </span>
                            <span
                              className={`text-base font-black font-mono ${
                                isLight ? 'text-slate-900' : 'text-white'
                              }`}
                            >
                              ₹0.00
                            </span>
                          </div>
                          <span
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-md border font-mono ${
                              isLight
                                ? 'text-emerald-800 bg-emerald-100 border-emerald-300'
                                : 'text-emerald-300 bg-emerald-950/80 border-emerald-800/60'
                            }`}
                          >
                            ₹1,66,300 ITC C/F
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === '2b' && (
                    <motion.div
                      key="tab-2b"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.22 }}
                      className="space-y-4"
                    >
                      <div
                        className={`p-3.5 rounded-xl border space-y-2.5 text-xs ${
                          isLight
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-slate-950/80 border-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                            Total Purchase Invoices:
                          </span>
                          <span
                            className={`font-bold font-mono ${
                              isLight ? 'text-slate-900' : 'text-white'
                            }`}
                          >
                            142 Invoices
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                            Perfect 2B Matches:
                          </span>
                          <span
                            className={`font-bold font-mono ${
                              isLight ? 'text-emerald-700' : 'text-emerald-400'
                            }`}
                          >
                            138 Invoices (98.2%)
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                            Missing in 2B (Vendor Follow-up):
                          </span>
                          <span
                            className={`font-bold font-mono ${
                              isLight ? 'text-amber-600' : 'text-amber-400'
                            }`}
                          >
                            4 Invoices (Actioned)
                          </span>
                        </div>
                      </div>

                      <div
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                          isLight
                            ? 'bg-emerald-50 border-emerald-200 text-slate-700'
                            : 'bg-emerald-950/30 border-emerald-800/40 text-slate-300'
                        }`}
                      >
                        <span className={`text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                          Uncredited ITC Protected:
                        </span>
                        <strong
                          className={`font-mono font-bold text-sm ${
                            isLight ? 'text-emerald-700' : 'text-emerald-400'
                          }`}
                        >
                          ₹18,400 Saved
                        </strong>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'notice' && (
                    <motion.div
                      key="tab-notice"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.22 }}
                      className="space-y-4"
                    >
                      <div
                        className={`p-3.5 rounded-xl border space-y-2 ${
                          isLight
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-slate-950/80 border-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                            Scrutiny Notice:
                          </span>
                          <span
                            className={`font-bold font-mono ${
                              isLight ? 'text-slate-900' : 'text-white'
                            }`}
                          >
                            Form ASMT-10
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                            Alleged Mismatch:
                          </span>
                          <span
                            className={`font-bold font-mono ${
                              isLight ? 'text-red-600' : 'text-red-400'
                            }`}
                          >
                            ₹14.2 Lakhs Proposed
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                            Legal Defense Status:
                          </span>
                          <span
                            className={`font-bold font-mono ${
                              isLight ? 'text-emerald-700' : 'text-emerald-400'
                            }`}
                          >
                            Notice Dropped (₹0 Penalty)
                          </span>
                        </div>
                      </div>

                      <div
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                          isLight
                            ? 'bg-blue-50 border-blue-200 text-slate-700'
                            : 'bg-blue-950/30 border-blue-900/40 text-slate-300'
                        }`}
                      >
                        <span className={`text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                          Handled by Senior CA:
                        </span>
                        <strong
                          className={`font-bold ${isLight ? 'text-blue-700' : 'text-blue-400'}`}
                        >
                          100% Resolved
                        </strong>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Terminal Footer */}
                <div
                  className={`mt-4 pt-3 border-t flex items-center justify-between text-[11px] font-mono ${
                    isLight
                      ? 'border-slate-100 text-slate-600'
                      : 'border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    GSTN API Connected
                  </span>
                  <span
                    className={`font-semibold ${
                      isLight ? 'text-emerald-700' : 'text-emerald-400'
                    }`}
                  >
                    CA Sign-off Ready ✓
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. STATS & SOCIAL PROOF RIBBON */}
      <section className={`border-b py-8 transition-colors ${isLight ? "bg-white border-slate-200 text-slate-900 shadow-xs" : "bg-slate-900 border-slate-800 text-white"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center"
          >
            <motion.div variants={fadeUpVariants} className="p-2">
              <p className={`text-3xl sm:text-4xl font-black font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                2,500+
              </p>
              <p className={`text-xs sm:text-sm font-semibold mt-1 ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                Active Indian Businesses
              </p>
              <span className={`text-[10px] block mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                MSMEs, Traders &amp; Enterprises
              </span>
            </motion.div>
            <motion.div variants={fadeUpVariants} className="p-2">
              <p className={`text-3xl sm:text-4xl font-black font-mono ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                ₹45 Cr+
              </p>
              <p className={`text-xs sm:text-sm font-semibold mt-1 ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                Working Capital Protected
              </p>
              <span className={`text-[10px] block mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                Through 2B Reconciliation
              </span>
            </motion.div>
            <motion.div variants={fadeUpVariants} className="p-2">
              <p className={`text-3xl sm:text-4xl font-black font-mono ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>
                99.9%
              </p>
              <p className={`text-xs sm:text-sm font-semibold mt-1 ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                On-Time Filing Record
              </p>
              <span className={`text-[10px] block mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                Backed by Zero-Penalty SLA
              </span>
            </motion.div>
            <motion.div variants={fadeUpVariants} className="p-2">
              <p className={`text-3xl sm:text-4xl font-black font-mono ${isLight ? 'text-amber-500' : 'text-amber-400'}`}>
                100%
              </p>
              <p className={`text-xs sm:text-sm font-semibold mt-1 ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                Notice Defense Record
              </p>
              <span className={`text-[10px] block mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                Senior CA Representation
              </span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 3. THE 4 PRACTICE PILLARS (CLEAN & BENEFIT-DRIVEN) */}
      <section className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full inline-block mb-2">
              Core Practice Pillars
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Complete Indirect Tax Protection
            </h2>
            <p className="text-slate-600 mt-2 text-sm sm:text-base leading-relaxed">
              Engineered to eliminate compliance friction, maximize Input Tax Credit, and ensure complete audit readiness.
            </p>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {/* Pillar 1 */}
            <motion.div
              variants={fadeUpVariants}
              whileHover={{ y: -4, transition: transitions.fast }}
              className="bg-white rounded-3xl border border-slate-200/90 p-7 shadow-xs hover:shadow-xl hover:border-blue-400 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                    99.9% On-Time SLA
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Monthly Returns (GSTR-1 &amp; 3B)
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Form GSTR-1 &amp; GSTR-3B preparation with Rule 88A offset optimization, RCM Sec 9(3) verification, and official ARN generation.
                </p>

                <ul className="space-y-1.5 text-xs text-slate-700 pt-2 border-t border-slate-100">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Tables 4–12 &amp; HSN Table 12</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Dual-Tier CA Review</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Zero Late-Fee Warranty</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <a href="/services/gst-returns" className="text-xs font-bold text-blue-600 group-hover:text-blue-700 flex items-center justify-between">
                  <span>Explore Return Filing</span>
                  <span>➔</span>
                </a>
              </div>
            </motion.div>

            {/* Pillar 2 */}
            <motion.div
              variants={fadeUpVariants}
              whileHover={{ y: -4, transition: transitions.fast }}
              className="bg-white rounded-3xl border border-slate-200/90 p-7 shadow-xs hover:shadow-xl hover:border-emerald-400 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                    Avg 8% Tax Saved
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                  Dynamic 2B ITC Recovery
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Continuous invoice-by-invoice reconciliation against auto-drafted 2B ledgers to catch non-compliant vendors and prevent expired credits.
                </p>

                <ul className="space-y-1.5 text-xs text-slate-700 pt-2 border-t border-slate-100">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Multi-Point Invoice Matching</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Vendor Delinquency Chasing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Sec 16(4) Expiration Shield</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <a href="/services/gst-compliance" className="text-xs font-bold text-emerald-600 group-hover:text-emerald-700 flex items-center justify-between">
                  <span>Explore ITC Recovery</span>
                  <span>➔</span>
                </a>
              </div>
            </motion.div>

            {/* Pillar 3 */}
            <motion.div
              variants={fadeUpVariants}
              whileHover={{ y: -4, transition: transitions.fast }}
              className="bg-white rounded-3xl border border-slate-200/90 p-7 shadow-xs hover:shadow-xl hover:border-red-400 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 font-bold group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 font-mono">
                    Senior CA Defense
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                  Department Notice Defense
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Legal drafting of rigorous replies to Form ASMT-10, SCNs, and DRC-01 demand notices with senior CA personal hearing representation.
                </p>

                <ul className="space-y-1.5 text-xs text-slate-700 pt-2 border-t border-slate-100">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>ASMT-10 Discrepancy Defense</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Sec 73 &amp; 74 Penalty Mitigation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Appellate Representation</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <a href="/services/gst-advisory" className="text-xs font-bold text-red-600 group-hover:text-red-700 flex items-center justify-between">
                  <span>Explore Notice Defense</span>
                  <span>➔</span>
                </a>
              </div>
            </motion.div>

            {/* Pillar 4 */}
            <motion.div
              variants={fadeUpVariants}
              whileHover={{ y: -4, transition: transitions.fast }}
              className="bg-white rounded-3xl border border-slate-200/90 p-7 shadow-xs hover:shadow-xl hover:border-purple-400 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 font-bold group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-mono">
                    Certified Audit
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                  Annual Audit &amp; Setup
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Turnkey GST registration (3–5 days), statutory Form GSTR-9 annual return true-up, and certified Form GSTR-9C reconciliation statements.
                </p>

                <ul className="space-y-1.5 text-xs text-slate-700 pt-2 border-t border-slate-100">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>GSTR-9 &amp; 9C CA Certification</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Entity Registration (3–5 Days)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Sec 36 Audit-Proof Vault</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <a href="/services/gst-audit" className="text-xs font-bold text-purple-600 group-hover:text-purple-700 flex items-center justify-between">
                  <span>Explore Audit &amp; Setup</span>
                  <span>➔</span>
                </a>
              </div>
            </motion.div>
          </motion.div>

          <div className="mt-12 text-center space-y-4">
            <a
              href="/services"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 bg-white border border-slate-300 shadow-xs px-6 py-3.5 rounded-2xl hover:border-blue-500 hover:shadow-md transition-all"
            >
              <span>Need Export Refunds, TDS/TCS or Business Licensing? Explore All Practice Areas on Services Hub</span>
              <span>➔</span>
            </a>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-400">Popular:</span>
              <a href="/services/gst-registration" className="px-3 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 transition">GST Registration</a>
              <a href="/services/gst-returns" className="px-3 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 transition">Return Filing</a>
              <a href="/services/gst-refund" className="px-3 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 transition">Export Refunds</a>
              <a href="/services/gst-tds-tcs" className="px-3 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 transition">TDS &amp; TCS</a>
              <a href="/services/gst-cancellation" className="px-3 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 transition">GST Cancellation</a>
              <a href="/services/business-licenses" className="px-3 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 transition">Business Licenses</a>
              <a href="/services/business-licenses/udyam" className="px-3 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 transition">Udyam MSME</a>
              <a href="/services/business-licenses/fssai" className="px-3 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 transition">FSSAI License</a>
              <a href="/services/business-licenses/iec" className="px-3 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 transition">IEC Code</a>
            </div>
          </div>
        </div>
      </section>

      {/* 4. WHY CHOOSE GSTBRO (POWERFUL COMPARISON) */}
      <section className="py-16 sm:py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full inline-block mb-2">
              The GSTBro Advantage
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Why 2,500+ Indian Companies Trust GSTBro
            </h2>
            <p className="text-slate-600 mt-2 text-sm sm:text-base leading-relaxed">
              See how our institutional Chartered Accountant infrastructure outperforms traditional local accountants and generic DIY software.
            </p>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-6"
          >
            {/* Traditional Accountant */}
            <motion.div variants={fadeUpVariants} className="bg-slate-50 rounded-3xl border border-slate-200 p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Traditional Local Accountant</h3>
                <span className="text-xs font-bold text-red-600 bg-red-100/80 px-2.5 py-0.5 rounded-md">High Risk</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">✕</span>
                  <span>Manual Excel entry prone to transposition errors</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">✕</span>
                  <span>Missed 2B reconciliation causing lost input credit</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">✕</span>
                  <span>Last-minute rush leading to late fees &amp; interest</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">✕</span>
                  <span>Unprepared for ASMT-10 scrutiny demand notices</span>
                </li>
              </ul>
            </motion.div>

            {/* Generic DIY Software */}
            <motion.div variants={fadeUpVariants} className="bg-slate-50 rounded-3xl border border-slate-200 p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Generic DIY Software</h3>
                <span className="text-xs font-bold text-amber-600 bg-amber-100/80 px-2.5 py-0.5 rounded-md">No CA Oversight</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">✕</span>
                  <span>You still do all the filing and classification work</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">✕</span>
                  <span>Zero expert human review before portal upload</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">✕</span>
                  <span>No one to represent you when department issues notice</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">✕</span>
                  <span>Software fees without any legal accountability</span>
                </li>
              </ul>
            </motion.div>

            {/* GSTBro Advantage */}
            <motion.div
              variants={fadeUpVariants}
              whileHover={{ y: -4, transition: transitions.fast }}
              className="bg-gradient-to-b from-blue-950 to-slate-900 text-white rounded-3xl border border-blue-500/40 p-6 sm:p-7 space-y-4 shadow-xl relative overflow-hidden glow-blue-subtle"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white">GSTBro Institutional Infrastructure</h3>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 rounded-md">
                  ★ Superior
                </span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Full-service execution by qualified Chartered Accountants</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Continuous 2B ledger sync &amp; automated vendor chasing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>100% Zero Late-Fee Guarantee with SLA penalty warranty</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Senior CA defense representation included for scrutiny notices</span>
                </li>
              </ul>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 5. TRANSPARENT PRICING & RETAINER PLANS (CLEAN & DIRECT) */}
      <section className={`py-16 sm:py-24 border-b transition-colors ${isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900 border-slate-800"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span
              className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-2 border ${
                isLight
                  ? 'text-blue-700 bg-blue-50 border-blue-200'
                  : 'text-blue-400 bg-blue-950 border-blue-800'
              }`}
            >
              Transparent Retainers
            </span>
            <h2 className={`text-2xl sm:text-4xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Predictable Monthly Plans. Zero Hidden Fees.
            </h2>
            <p className={`mt-2 text-sm sm:text-base ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Choose the statutory compliance tier matched to your business turnover and invoice volume.
            </p>

            {/* Billing Cycle Switcher */}
            <div
              className={`inline-flex items-center gap-2 p-1.5 rounded-2xl border mt-6 text-xs ${
                isLight
                  ? 'bg-slate-200/90 border-slate-300'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                  billingCycle === 'annual'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : isLight
                    ? 'text-slate-700 hover:text-slate-900'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Annual Billing</span>
                <span
                  className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                    isLight
                      ? 'text-emerald-800 bg-emerald-100 border-emerald-300'
                      : 'text-emerald-300 bg-emerald-950 border-emerald-800'
                  }`}
                >
                  Save 15%
                </span>
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('quarterly')}
                className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                  billingCycle === 'quarterly'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : isLight
                    ? 'text-slate-700 hover:text-slate-900'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Quarterly Billing
              </button>
            </div>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8 items-stretch"
          >
            {/* Plan 1: Foundational */}
            <motion.div
              variants={fadeUpVariants}
              whileHover={{ y: -4, transition: transitions.fast }}
              className={`rounded-3xl border p-7 flex flex-col justify-between space-y-6 transition-all ${
                isLight
                  ? 'bg-white border-slate-200/90 shadow-sm hover:border-slate-300'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="space-y-4">
                <div>
                  <span
                    className={`text-xs font-bold uppercase tracking-wider ${
                      isLight ? 'text-blue-600' : 'text-blue-400'
                    }`}
                  >
                    Core Compliance
                  </span>
                  <h3 className={`text-xl font-extrabold mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Foundational Retainer
                  </h3>
                  <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    For startups, LLPs &amp; single-state MSMEs up to ₹1.5 Cr turnover
                  </p>
                </div>

                <div className={`py-3 border-y ${isLight ? 'border-slate-100' : 'border-slate-800/80'}`}>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl sm:text-4xl font-black font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      ₹{billingCycle === 'annual' ? '2,125' : '2,499'}
                    </span>
                    <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>/ month</span>
                  </div>
                  <span className={`text-[11px] block mt-1 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                    {billingCycle === 'annual' ? 'Billed annually at ₹25,500' : 'Billed quarterly at ₹7,497'}
                  </span>
                </div>

                <ul className={`space-y-2.5 text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  <li className="flex items-center gap-2">
                    <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>✓</span>
                    <span>Monthly Form GSTR-1 &amp; 3B filing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>✓</span>
                    <span>Rule 88A tax offset optimization</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>✓</span>
                    <span>Monthly purchase 2B matching</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>✓</span>
                    <span>Dual-tier CA review &amp; ARN delivery</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>✓</span>
                    <span>100% Zero Late-Fee Guarantee</span>
                  </li>
                </ul>
              </div>

              <a
                href="/contact?plan=foundational"
                className={`w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm text-center border transition-all block ${
                  isLight
                    ? 'text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-300'
                    : 'text-white bg-slate-900 hover:bg-slate-800 border-slate-700'
                }`}
              >
                Select Foundational Retainer &rarr;
              </a>
            </motion.div>

            {/* Plan 2: Growth Shield (Popular) */}
            <motion.div
              variants={fadeUpVariants}
              whileHover={{ y: -5, transition: transitions.fast }}
              className={`rounded-3xl border-2 p-7 flex flex-col justify-between space-y-6 shadow-2xl relative transition-all ${
                isLight
                  ? 'bg-white border-blue-600 shadow-blue-600/15'
                  : 'bg-gradient-to-b from-blue-950/80 via-slate-950 to-slate-950 border-blue-500 glow-blue-subtle'
              }`}
            >
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-extrabold uppercase tracking-wider px-4 py-1 rounded-full shadow-md">
                ★ Most Chosen Plan
              </div>

              <div className="space-y-4 pt-1">
                <div>
                  <span
                    className={`text-xs font-bold uppercase tracking-wider ${
                      isLight ? 'text-emerald-700' : 'text-emerald-400'
                    }`}
                  >
                    Working Capital Shield
                  </span>
                  <h3 className={`text-xl font-extrabold mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Growth &amp; ITC Shield
                  </h3>
                  <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    For manufacturers, D2C brands &amp; growing B2B enterprises up to ₹15 Cr turnover
                  </p>
                </div>

                <div className={`py-3 border-y ${isLight ? 'border-blue-100' : 'border-blue-900/50'}`}>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl sm:text-4xl font-black font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      ₹{billingCycle === 'annual' ? '4,249' : '4,999'}
                    </span>
                    <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>/ month</span>
                  </div>
                  <span className={`text-[11px] block mt-1 ${isLight ? 'text-blue-700 font-semibold' : 'text-blue-300'}`}>
                    {billingCycle === 'annual' ? 'Billed annually at ₹50,988 (Save ₹9,000)' : 'Billed quarterly at ₹14,997'}
                  </span>
                </div>

                <ul className={`space-y-2.5 text-xs ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>
                  <li className={`flex items-center gap-2 font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>✓</span>
                    <span>Everything in Foundational, plus:</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>✓</span>
                    <span>Continuous Multi-Point 2B Reconciliation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>✓</span>
                    <span>Vendor Default Tracking &amp; Chasing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>✓</span>
                    <span>ASMT-10 &amp; DRC-01 Notice Defense Coverage</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>✓</span>
                    <span>Annual Return GSTR-9 Preparation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>✓</span>
                    <span>Dedicated Senior CA on WhatsApp &amp; Call</span>
                  </li>
                </ul>
              </div>

              <a
                href="/contact?plan=growth"
                className="w-full py-4 rounded-xl font-extrabold text-xs sm:text-sm text-center text-white bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-600/40 transition-all block"
              >
                Activate Growth Shield &rarr;
              </a>
            </motion.div>

            {/* Plan 3: Corporate */}
            <motion.div
              variants={fadeUpVariants}
              whileHover={{ y: -4, transition: transitions.fast }}
              className={`rounded-3xl border p-7 flex flex-col justify-between space-y-6 transition-all ${
                isLight
                  ? 'bg-white border-slate-200/90 shadow-sm hover:border-slate-300'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="space-y-4">
                <div>
                  <span
                    className={`text-xs font-bold uppercase tracking-wider ${
                      isLight ? 'text-purple-700' : 'text-purple-400'
                    }`}
                  >
                    Enterprise Infrastructure
                  </span>
                  <h3 className={`text-xl font-extrabold mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Corporate Multi-GSTIN
                  </h3>
                  <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    For multi-state enterprises, exporters &amp; conglomerates exceeding ₹15 Cr
                  </p>
                </div>

                <div className={`py-3 border-y ${isLight ? 'border-slate-100' : 'border-slate-800/80'}`}>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl sm:text-4xl font-black font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      ₹{billingCycle === 'annual' ? '8,499' : '9,999'}
                    </span>
                    <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>/ month</span>
                  </div>
                  <span className={`text-[11px] block mt-1 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                    {billingCycle === 'annual' ? 'Billed annually at ₹1,01,988' : 'Billed quarterly at ₹29,997'}
                  </span>
                </div>

                <ul className={`space-y-2.5 text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  <li className={`flex items-center gap-2 font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>✓</span>
                    <span>Everything in Growth, plus:</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>✓</span>
                    <span>Multi-State GSTIN Consolidation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>✓</span>
                    <span>Form GSTR-9C Certified CA Audit Sign-off</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>✓</span>
                    <span>Expedited Export &amp; Inverted Duty Refunds</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>✓</span>
                    <span>Custom ERP Integration (SAP, Zoho, Tally)</span>
                  </li>
                </ul>
              </div>

              <a
                href="/contact?plan=corporate"
                className={`w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm text-center border transition-all block ${
                  isLight
                    ? 'text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-300'
                    : 'text-white bg-slate-900 hover:bg-slate-800 border-slate-700'
                }`}
              >
                Request Corporate Consultation &rarr;
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 6. INTERACTIVE ROI & WORKING CAPITAL CALCULATOR */}
      <section className={`py-16 sm:py-24 border-b transition-colors ${isLight ? "bg-white text-slate-900 border-slate-200" : "bg-slate-950 text-white border-slate-900"}`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span
              className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-2 border ${
                isLight
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : 'text-emerald-400 bg-emerald-950 border-emerald-800'
              }`}
            >
              Working Capital Protection
            </span>
            <h2 className={`text-2xl sm:text-4xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Calculate How Much Lost ITC You Can Recover
            </h2>
            <p className={`mt-2 text-sm sm:text-base ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Slide to your approximate annual business turnover to calculate the average uncredited Input Tax Credit protected by our 2B reconciliation engine.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={transitions.smooth}
            className={`border rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 ${
              isLight
                ? 'bg-slate-50 border-slate-200/90'
                : 'bg-slate-900/90 border-slate-800'
            }`}
          >
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <span className={`text-xs font-bold uppercase ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Select Your Annual Turnover:
                </span>
                <span className={`text-2xl font-black font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  ₹{(calculatorTurnover / 10000000).toFixed(1)} Crore
                </span>
              </div>
              <input
                type="range"
                min="5000000"
                max="200000000"
                step="5000000"
                value={calculatorTurnover}
                onChange={(e) => setCalculatorTurnover(Number(e.target.value))}
                className={`w-full h-2.5 rounded-lg appearance-none cursor-pointer accent-blue-600 ${
                  isLight ? 'bg-slate-200' : 'bg-slate-800'
                }`}
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1.5">
                <span>₹50 Lakhs</span>
                <span>₹5 Crores</span>
                <span>₹10 Crores</span>
                <span>₹20 Crores</span>
              </div>
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  isLight
                    ? 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span className={`text-[11px] block font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Estimated Annual ITC Saved
                </span>
                <strong
                  className={`text-2xl font-black font-mono mt-1 block ${
                    isLight ? 'text-emerald-700' : 'text-emerald-400'
                  }`}
                >
                  ₹{(averageItcLeakageAverted / 100000).toFixed(2)} Lakhs
                </strong>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Avg 3.2% vendor default averted</span>
              </div>

              <div
                className={`p-4 rounded-2xl border transition-all ${
                  isLight
                    ? 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span className={`text-[11px] block font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Late-Fee Exposure
                </span>
                <strong
                  className={`text-2xl font-black font-mono mt-1 block ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  ₹0.00 Guaranteed
                </strong>
                <span className="text-[10px] text-slate-500 mt-0.5 block">100% Zero-Penalty SLA</span>
              </div>

              <div
                className={`p-4 rounded-2xl border transition-all ${
                  isLight
                    ? 'bg-blue-50/80 border-blue-200 hover:border-blue-300 shadow-xs'
                    : 'bg-blue-950/40 border-blue-800/50 hover:border-blue-700'
                }`}
              >
                <span className={`text-[11px] block font-medium ${isLight ? 'text-blue-900' : 'text-blue-300'}`}>
                  Net Working Capital Preserved
                </span>
                <strong
                  className={`text-2xl font-black font-mono mt-1 block ${
                    isLight ? 'text-emerald-700' : 'text-emerald-300'
                  }`}
                >
                  ₹{((averageItcLeakageAverted - 50988) / 100000).toFixed(2)} Lakhs
                </strong>
                <span className={`text-[10px] mt-0.5 block font-bold ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>
                  6x to 10x ROI on Retainer Cost
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 7. 3-STEP COMPLIANCE WORKFLOW (CLEAN & EFFORTLESS) */}
      <section className="py-16 sm:py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full inline-block mb-2">
              Execution Methodology
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Filing in 3 Effortless Steps
            </h2>
            <p className="text-slate-600 mt-2 text-sm sm:text-base leading-relaxed">
              We handle the complex statutory ledger audits, multi-tier cross-utilization, and portal filings. You stay 100% compliant in minutes.
            </p>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
            className="grid sm:grid-cols-3 gap-8"
          >
            <motion.div
              variants={fadeUpVariants}
              whileHover={{ y: -4, transition: transitions.fast }}
              className="bg-slate-50 border border-slate-200/90 rounded-3xl p-8 hover:border-blue-400 transition-all shadow-xs"
            >
              <span className="text-3xl font-black text-blue-600 font-mono block mb-3">01</span>
              <h3 className="text-base font-bold text-slate-900 mb-2">Sync Inward &amp; Outward Books</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Connect your accounting software (Tally, Zoho Books, Busy, SAP) or upload clean Excel records via our 256-bit encrypted client portal.
              </p>
            </motion.div>

            <motion.div
              variants={fadeUpVariants}
              whileHover={{ y: -4, transition: transitions.fast }}
              className="bg-slate-50 border border-slate-200/90 rounded-3xl p-8 hover:border-blue-400 transition-all shadow-xs"
            >
              <span className="text-3xl font-black text-blue-600 font-mono block mb-3">02</span>
              <h3 className="text-base font-bold text-slate-900 mb-2">Dual-Tier CA Audit &amp; 2B Matching</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Our Chartered Accountants cross-reference your purchase register with government 2B ledgers, audit RCM liabilities, and compute optimal Rule 88A offsets.
              </p>
            </motion.div>

            <motion.div
              variants={fadeUpVariants}
              whileHover={{ y: -4, transition: transitions.fast }}
              className="bg-slate-50 border border-slate-200/90 rounded-3xl p-8 hover:border-blue-400 transition-all shadow-xs"
            >
              <span className="text-3xl font-black text-blue-600 font-mono block mb-3">03</span>
              <h3 className="text-base font-bold text-slate-900 mb-2">1-Click Sign-off &amp; ARN Delivery</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Review your computed tax summary and approve with 1 click. We file on the official GSTN portal and archive your signed filing receipt and ARN certificate.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 8. VERIFIED CLIENT TESTIMONIALS */}
      <section className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full inline-block mb-2">
              Client Track Record
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Trusted Across India
            </h2>
            <p className="text-slate-600 mt-2 text-sm sm:text-base">
              Real statutory results, tangible working capital saved, and zero late-fees guaranteed.
            </p>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={staggerContainer}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <motion.div
              variants={fadeUpVariants}
              whileHover={{ y: -4, transition: transitions.fast }}
              className="bg-white border border-slate-200/90 rounded-3xl p-7 flex flex-col justify-between shadow-xs hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-mono">
                    ₹8.4L ITC Salvaged
                  </span>
                  <span className="text-amber-400 text-xs font-bold">★★★★★</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-6 italic">
                  &quot;GSTBro uncovered ₹8.4 Lakhs in uncredited ITC across 40+ non-compliant vendors in our very first quarter. Their CA team handled every vendor follow-up.&quot;
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-900">Rajesh Varma</p>
                <p className="text-[11px] text-slate-500 font-medium">Varma Heavy Fabworks, Pune</p>
                <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">Engineering &amp; Manufacturing</span>
              </div>
            </motion.div>

            <motion.div
              variants={fadeUpVariants}
              whileHover={{ y: -4, transition: transitions.fast }}
              className="bg-white border border-slate-200/90 rounded-3xl p-7 flex flex-col justify-between shadow-xs hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-mono">
                    Notice Dropped (Zero Fine)
                  </span>
                  <span className="text-amber-400 text-xs font-bold">★★★★★</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-6 italic">
                  &quot;We received an ASMT-10 notice proposing ₹18 Lakhs penalty for an ITC difference. The senior CAs at GSTBro drafted a water-tight reply and got the notice dropped in 12 days.&quot;
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-900">Priya Narayanan</p>
                <p className="text-[11px] text-slate-500 font-medium">Elysian Retail Brands, Chennai</p>
                <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">Omnichannel D2C</span>
              </div>
            </motion.div>

            <motion.div
              variants={fadeUpVariants}
              whileHover={{ y: -4, transition: transitions.fast }}
              className="bg-white border border-slate-200/90 rounded-3xl p-7 flex flex-col justify-between shadow-xs hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-mono">
                    100% On-Time Record
                  </span>
                  <span className="text-amber-400 text-xs font-bold">★★★★★</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-6 italic">
                  &quot;Handling GSTR-1, 3B, and TCS compliance for our e-commerce marketplace was a constant headache. With GSTBro, our filings are 100% on-time without a single reminder.&quot;
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-900">Aditya Mehta</p>
                <p className="text-[11px] text-slate-500 font-medium">CartSphere Technologies, Bengaluru</p>
                <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">E-Commerce Marketplace</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 9. EXECUTIVE OFFICE & LOCATION SIDE SECTION */}
      <section className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-8 items-center bg-slate-900 text-white rounded-3xl p-8 sm:p-12 border border-slate-800 shadow-2xl">
            {/* Left: Office Details & Direct CA Contact */}
            <div className="lg:col-span-6 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-bold text-blue-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Physical Headquarters &amp; CA Desk
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Visit Our Advisory Office Or Consult Online
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Whether you need an in-person indirect tax review or instant Pan-India digital filing, our senior Chartered Accountants are here to support your business growth.
              </p>

              <div className="space-y-3 pt-2 text-xs">
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <span className="text-base">📍</span>
                  <div>
                    <strong className="block text-slate-200 font-bold">Office Address:</strong>
                    <span className="text-slate-400 leading-relaxed">{officeAddress}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <span className="text-base">📞</span>
                  <div>
                    <strong className="block text-slate-200 font-bold">Direct Helpline:</strong>
                    <a
                      href={`tel:${contactPhone}`}
                      onClick={() => trackPhoneClick('homepage_office_card')}
                      className="text-blue-400 font-mono font-bold hover:underline"
                    >
                      {contactPhone}
                    </a>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-3">
                <a
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-md"
                >
                  <span>Book Consultation &rarr;</span>
                </a>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
                >
                  <span>Open Directions in Maps &rarr;</span>
                </a>
              </div>
            </div>

            {/* Right: Sleek Interactive Location Map */}
            <div className="lg:col-span-6">
              <div className="w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-2xl relative">
                <iframe
                  title="GSTBro Corporate Office"
                  src={mapEmbedUrl}
                  className="w-full h-full border-0 grayscale-[20%] contrast-125"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. PRE-FOOTER DIRECT CA CONSULTATION BANNER */}
      <section className={`py-16 sm:py-20 transition-colors ${isLight ? "bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white" : "bg-slate-950 text-white"}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-bold text-blue-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Senior Chartered Accountant Consultation Desk
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            {settings?.homepage?.ctaTitle || 'Stop Stressing Over Monthly GST Deadlines.'}
          </h2>

          <p className={`text-sm sm:text-base max-w-xl mx-auto leading-relaxed ${isLight ? 'text-blue-100' : 'text-slate-300'}`}>
            {settings?.homepage?.ctaSubtitle ||
              'Transition your Indirect Tax compliance to a dedicated Chartered Accountant team with continuous 2B reconciliation and guaranteed on-time filing.'}
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/contact"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-extrabold text-sm text-white bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-600/30 transition-all cursor-pointer"
            >
              <span>Book Free 15-Min CA Compliance Review</span>
              <span>➔</span>
            </a>
            <a
              href="/pricing"
              className={`w-full sm:w-auto inline-flex items-center justify-center px-6 py-4 rounded-xl font-bold text-sm border transition-all text-center ${
                isLight
                  ? 'text-white bg-white/10 hover:bg-white/20 border-white/20'
                  : 'text-slate-200 bg-slate-900 hover:bg-slate-800 border-slate-700'
              }`}
            >
              View Transparent Pricing Retainers
            </a>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
