import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PublicLayout } from '../../components/PublicLayout';
import { Breadcrumbs } from '../../components/seo/Breadcrumbs';
import { TurnstileWidget } from '../../components/TurnstileWidget';
import { contactMeta } from '../../seo/pages/services.meta';
import { useSettings } from '../../context/SettingsContext';
import { useContent } from '../../context/ContentContext';
import { useTheme } from '../../context/ThemeContext';
import { apiFetch } from '../../lib/api';
import {
  trackFormStart,
  trackFormSubmit,
  trackContactSubmit,
  trackPhoneClick,
  trackEmailClick,
  getAttributionData,
} from '../../lib/analytics';

export function ContactPage() {
  const settings = useSettings();
  const { isLight } = useTheme();
  const contactHeader = useContent('content_contact_header', {
    badge: 'Senior Chartered Accountant Desk • Confidential Consultation',
    title: 'Connect Directly with a Chartered Accountant.',
    subtitle:
      'Have questions regarding monthly GSTR-1/3B filing, uncredited 2B Input Tax Credit, or a pending scrutiny notice? Connect directly with our indirect tax advisory desk for immediate legal guidance.',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [activeTab, setActiveTab] = useState<'consultation' | 'notice'>('consultation');
  const [formStarted, setFormStarted] = useState(false);

  const contactPhone = settings?.contactPhone || '+91 800 123 4567';
  const contactEmail = settings?.contactEmail || 'hello@gstbro.com';

  const handleInputFocus = () => {
    if (!formStarted) {
      setFormStarted(true);
      trackFormStart('contact_enquiry_form');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    trackFormSubmit('contact_enquiry_form');

    if (!turnstileToken) {
      setError('Please complete the security verification challenge before submitting.');
      return;
    }
    setLoading(true);
    setError('');
    const form = new FormData(e.currentTarget);
    const serviceType = (form.get('serviceType') as string) || (activeTab === 'notice' ? 'ADVISORY' : 'RETURNS');
    const rawMessage = (form.get('message') as string) || '';

    // Append UTM attribution parameters to the message for CRM/admin tracking
    const attribution = getAttributionData();
    const utmTags: string[] = [];
    if (attribution.utm_source) utmTags.push(`src=${attribution.utm_source}`);
    if (attribution.utm_medium) utmTags.push(`med=${attribution.utm_medium}`);
    if (attribution.utm_campaign) utmTags.push(`cmp=${attribution.utm_campaign}`);
    const attributionSuffix = utmTags.length > 0 ? ` [UTM: ${utmTags.join(', ')}]` : '';
    const finalMessage = `${rawMessage}${attributionSuffix}`.trim();

    try {
      await apiFetch('/api/leads', {
        method: 'POST',
        body: JSON.stringify({
          name: form.get('name'),
          email: form.get('email'),
          phone: form.get('phone'),
          company: form.get('company'),
          turnover: form.get('turnover'),
          serviceType,
          message: finalMessage,
          turnstileToken,
        }),
      });

      // Dispatch verified conversion event to GA4 / GTM / Google Ads readiness
      trackContactSubmit(serviceType, activeTab);

      setSubmitted(true);
      setTurnstileToken('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit inquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout meta={contactMeta}>
      {/* 1. HERO HEADER */}
      <section className={`relative pt-12 pb-16 sm:pt-20 sm:pb-20 overflow-hidden border-b transition-colors duration-300 ${
        isLight
          ? 'bg-gradient-to-b from-[#eef5ff] via-white to-slate-50 text-slate-900 border-slate-200'
          : 'bg-slate-950 text-white border-slate-900'
      }`}>
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px] blur-3xl pointer-events-none ${
          isLight ? 'bg-blue-400/10' : 'bg-blue-600/15'
        }`} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: 'Contact & Advisory Desk', path: '/contact' }]} />

          <div className="text-center max-w-3xl mx-auto mt-6 space-y-4">
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border ${
              isLight
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
            }`}>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {contactHeader.badge}
            </div>

            <h1 className={`text-3xl sm:text-5xl font-bold tracking-tight leading-tight ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              {contactHeader.title}
            </h1>

            <p className={`text-sm sm:text-base max-w-2xl mx-auto leading-relaxed ${
              isLight ? 'text-slate-600' : 'text-slate-300'
            }`}>
              {contactHeader.subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* 2. MAIN INTERACTIVE FORM & ADVISORY CONTACT GRID */}
      <section className={`py-14 sm:py-20 border-b transition-colors ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-900'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-10 items-start">
            {/* Left Column: Interactive Consultation Form (Span 7) */}
            <div className={`lg:col-span-7 rounded-3xl border p-7 sm:p-10 shadow-xl transition-all ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
            }`}>
              {/* Inquiry Type Tabs */}
              <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 rounded-2xl border mb-8 ${
                isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}>
                <button
                  type="button"
                  onClick={() => setActiveTab('consultation')}
                  className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer select-none active:scale-[0.98] ${
                    activeTab === 'consultation'
                      ? 'bg-blue-600 text-white shadow-md'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  General GST &amp; Retainer Advisory
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('notice')}
                  className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer select-none active:scale-[0.98] ${
                    activeTab === 'notice'
                      ? 'bg-red-600 text-white shadow-md'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Urgent Notice / Scrutiny Defense
                </button>
              </div>

              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-8 sm:p-10 text-center space-y-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800"
                  >
                    <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center text-2xl mx-auto shadow-lg shadow-emerald-500/30">
                      ✓
                    </div>
                    <h3 className={`text-xl sm:text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Consultation Request Received
                    </h3>
                    <p className={`text-xs sm:text-sm max-w-md mx-auto leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                      Your inquiry has been assigned to our senior indirect tax team. A Chartered Accountant will review your business profile and reach out within 2 hours.
                    </p>
                    <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSubmitted(false)}
                        className="px-6 py-2.5 rounded-xl font-bold text-xs text-emerald-800 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900 dark:text-emerald-200 transition cursor-pointer"
                      >
                        Submit Another Request
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit}
                    className="space-y-5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                          isLight ? 'text-slate-700' : 'text-slate-300'
                        }`}>
                          Full Name *
                        </label>
                        <input
                          required
                          type="text"
                          name="name"
                          onFocus={handleInputFocus}
                          placeholder="e.g. Rajesh Sharma"
                          className={`w-full px-4 py-3 rounded-xl border text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-hidden transition ${
                            isLight
                              ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                              : 'bg-slate-950 border-slate-700 text-white placeholder:text-slate-500'
                          }`}
                        />
                      </div>
                      <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                          isLight ? 'text-slate-700' : 'text-slate-300'
                        }`}>
                          Official Work Email *
                        </label>
                        <input
                          required
                          type="email"
                          name="email"
                          onFocus={handleInputFocus}
                          placeholder="rajesh@company.com"
                          className={`w-full px-4 py-3 rounded-xl border text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-hidden transition ${
                            isLight
                              ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                              : 'bg-slate-950 border-slate-700 text-white placeholder:text-slate-500'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                          isLight ? 'text-slate-700' : 'text-slate-300'
                        }`}>
                          Business / Enterprise Name
                        </label>
                        <input
                          type="text"
                          name="company"
                          onFocus={handleInputFocus}
                          placeholder="Apex Tech Pvt Ltd"
                          className={`w-full px-4 py-3 rounded-xl border text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-hidden transition ${
                            isLight
                              ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                              : 'bg-slate-950 border-slate-700 text-white placeholder:text-slate-500'
                          }`}
                        />
                      </div>
                      <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                          isLight ? 'text-slate-700' : 'text-slate-300'
                        }`}>
                          Direct Mobile Number *
                        </label>
                        <input
                          required
                          type="tel"
                          name="phone"
                          onFocus={handleInputFocus}
                          placeholder="+91 98765 43210"
                          className={`w-full px-4 py-3 rounded-xl border text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-hidden transition ${
                            isLight
                              ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                              : 'bg-slate-950 border-slate-700 text-white placeholder:text-slate-500'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                          isLight ? 'text-slate-700' : 'text-slate-300'
                        }`}>
                          Practice Area Required
                        </label>
                        <select
                          name="serviceType"
                          defaultValue={activeTab === 'notice' ? 'ADVISORY' : 'RETURNS'}
                          className={`w-full px-4 py-3 rounded-xl border text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-hidden transition ${
                            isLight
                              ? 'bg-white border-slate-300 text-slate-900'
                              : 'bg-slate-950 border-slate-700 text-white'
                          }`}
                        >
                          <option value="RETURNS">Monthly Return Filing (GSTR-1 &amp; 3B)</option>
                          <option value="COMPLIANCE">Dynamic 2B ITC Reconciliation</option>
                          <option value="ADVISORY">Scrutiny &amp; Notice Defense (ASMT/DRC)</option>
                          <option value="REFUND">Expedited GST Refunds (LUT / Inverted Duty)</option>
                          <option value="AUDIT">Annual Audit &amp; Certification (GSTR-9 &amp; 9C)</option>
                          <option value="REGISTRATION">Statutory GST Registration</option>
                          <option value="TDS_TCS">GST TDS &amp; TCS Compliance</option>
                          <option value="CANCELLATION">GSTIN Cancellation &amp; Surrender</option>
                        </select>
                      </div>
                      <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                          isLight ? 'text-slate-700' : 'text-slate-300'
                        }`}>
                          Approximate Annual Turnover
                        </label>
                        <select
                          name="turnover"
                          className={`w-full px-4 py-3 rounded-xl border text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-hidden transition ${
                            isLight
                              ? 'bg-white border-slate-300 text-slate-900'
                              : 'bg-slate-950 border-slate-700 text-white'
                          }`}
                        >
                          <option value="below_1_5cr">Up to ₹1.5 Crore (Foundational Retainer)</option>
                          <option value="1_5cr_to_15cr">₹1.5 Cr to ₹15 Crore (Growth Shield)</option>
                          <option value="above_15cr">₹15 Crore+ (Corporate Multi-GSTIN)</option>
                          <option value="pre_revenue">Pre-Revenue / New Setup</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                        isLight ? 'text-slate-700' : 'text-slate-300'
                      }`}>
                        {activeTab === 'notice' ? 'Notice Details & Statutory Deadline' : 'Specific Compliance Needs or Questions'}
                      </label>
                      <textarea
                        name="message"
                        rows={4}
                        onFocus={handleInputFocus}
                        placeholder={
                          activeTab === 'notice'
                            ? 'Please mention Form Number (e.g., ASMT-10, DRC-01, SCN), tax period, and the reply deadline mentioned by the department.'
                            : 'Describe your current volume, existing accounting software (Tally/Zoho/Busy/SAP), and any specific pain points...'
                        }
                        className={`w-full px-4 py-3 rounded-xl border text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-hidden transition ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                            : 'bg-slate-950 border-slate-700 text-white placeholder:text-slate-500'
                        }`}
                      />
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700"
                        >
                          {error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="pt-2">
                      <TurnstileWidget
                        onVerify={(token) => {
                          setTurnstileToken(token);
                          setError('');
                        }}
                        onExpire={() => setTurnstileToken('')}
                        onError={() => {
                          setTurnstileToken('');
                        }}
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-600/30 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                            <span>Connecting to CA Desk...</span>
                          </span>
                        ) : (
                          <>
                            <span>Request Free 15-Minute CA Consultation</span>
                            <span>&rarr;</span>
                          </>
                        )}
                      </button>
                      <span className="block text-center text-[11px] text-slate-400 mt-2.5">
                        🔒 256-Bit SSL Encrypted • NDA &amp; Client Privilege Protected
                      </span>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* Right Column: Multi-Channel Advisory Touchpoints (Span 5) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Emergency Scrutiny Hotline Card */}
              <div className="rounded-3xl bg-slate-900 text-white p-7 sm:p-8 border border-slate-800 shadow-xl space-y-5">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-[11px] font-bold text-red-400">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  Urgent Notice Defense Desk
                </div>

                <h3 className="text-xl font-black text-white tracking-tight">
                  Received an ASMT-10 or DRC-01 Notice?
                </h3>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  GST scrutiny notices carry statutory reply deadlines (usually 30 days). Missing the deadline leads to ex-parte orders with 18% mandatory interest and Section 73/74 penalties.
                </p>

                <div className="pt-2 space-y-3">
                  <a
                    href={`tel:${contactPhone}`}
                    onClick={() => trackPhoneClick('contact_page_emergency_card')}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-blue-500 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Senior CA Helpline</span>
                      <strong className="text-sm font-bold text-white font-mono">{contactPhone}</strong>
                    </div>
                  </a>

                  <a
                    href={`mailto:${contactEmail}`}
                    onClick={() => trackEmailClick('contact_page_emergency_card')}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Direct Notice Email</span>
                      <strong className="text-sm font-bold text-white">{contactEmail}</strong>
                    </div>
                  </a>
                </div>
              </div>

              {/* Operating Hours & Accreditations */}
              <div className={`rounded-3xl border p-6 sm:p-7 shadow-xs space-y-4 transition-all ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800 text-white'
              }`}>
                <h4 className={`text-sm font-bold uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Advisory Desk Operations
                </h4>

                <div className={`space-y-3 text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                  <div className="flex items-start gap-2.5">
                    <svg className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <strong className={`block ${isLight ? 'text-slate-900' : 'text-white'}`}>Consultation Hours:</strong>
                      <span>Monday – Saturday: 9:00 AM – 7:00 PM IST</span>
                    </div>
                  </div>

                  <div className={`flex items-start gap-2.5 pt-2 border-t ${isLight ? 'border-slate-100' : 'border-slate-800'}`}>
                    <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <div>
                      <strong className={`block ${isLight ? 'text-slate-900' : 'text-white'}`}>Institutional Guarantee:</strong>
                      <span>All legal drafting &amp; review conducted by ICAI-accredited Chartered Accountants.</span>
                    </div>
                  </div>

                  <div className={`flex items-start gap-2.5 pt-2 border-t ${isLight ? 'border-slate-100' : 'border-slate-800'}`}>
                    <svg className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <div>
                      <strong className={`block ${isLight ? 'text-slate-900' : 'text-white'}`}>SLA Response Commitment:</strong>
                      <span>Standard queries answered within 2 hours. Urgent notice response within 4 hours.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

export default ContactPage;
