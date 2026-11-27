import { motion } from 'motion/react';
import { PublicLayout } from '../../components/PublicLayout';
import { Breadcrumbs } from '../../components/seo/Breadcrumbs';
import { useSettings } from '../../context/SettingsContext';
import { useTheme } from '../../context/ThemeContext';
import { openStrategyCallModal } from '../../components/StrategyCallModal';
import { TITLE_TEMPLATE, SITE_URL, DEFAULT_OG_IMAGE } from '../../seo/meta.config';
import type { SeoMeta } from '@gst/ui';

export const aboutMeta: SeoMeta = {
  title: TITLE_TEMPLATE('About Us — Institutional GST Compliance Platform'),
  description:
    'Learn about GSTBro — our mission, ICAI Chartered Accountant supervision, automated 2B reconciliation, and zero-penalty indirect tax compliance across India.',
  keywords:
    'about gstbro, gst consultants india, chartered accountant gst team, indirect tax advisory, gst compliance company',
  canonical: `${SITE_URL}/about`,
  robots: 'index, follow',
  ogTitle: TITLE_TEMPLATE('About Us — Institutional GST Compliance Platform'),
  ogDescription:
    'Learn about GSTBro — our mission, ICAI Chartered Accountant supervision, automated 2B reconciliation, and zero-penalty indirect tax compliance across India.',
  ogImage: DEFAULT_OG_IMAGE,
  ogUrl: `${SITE_URL}/about`,
};

export function AboutPage() {
  const settings = useSettings();
  const { isLight } = useTheme();

  return (
    <PublicLayout meta={aboutMeta}>
      {/* 1. HERO SECTION */}
      <section className={`relative pt-12 pb-16 sm:pt-20 sm:pb-24 overflow-hidden border-b transition-colors duration-300 ${
        isLight
          ? 'bg-gradient-to-b from-[#eef5ff] via-white to-slate-50 text-slate-900 border-slate-200'
          : 'bg-slate-950 text-white border-slate-900'
      }`}>
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px] blur-3xl pointer-events-none ${
          isLight ? 'bg-blue-400/10' : 'bg-blue-600/15'
        }`} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: 'About Us', path: '/about' }]} />

          <div className="text-center max-w-3xl mx-auto mt-6 space-y-4">
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border ${
              isLight
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
            }`}>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              ICAI Supervised Indirect Tax Infrastructure
            </div>

            <h1 className={`text-3xl sm:text-5xl font-bold tracking-tight leading-tight ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              Institutional Tax Governance. <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-400">
                Engineered for Indian Enterprises.
              </span>
            </h1>

            <p className={`text-sm sm:text-base max-w-2xl mx-auto leading-relaxed ${
              isLight ? 'text-slate-600' : 'text-slate-300'
            }`}>
              GSTBro bridges the gap between traditional Chartered Accountancy firms and modern technology. We protect Indian businesses against credit leakage, late fees, and statutory tax disputes.
            </p>
          </div>
        </div>
      </section>

      {/* 2. MISSION & CORE PILLARS */}
      <section className={`py-16 sm:py-24 border-b transition-colors ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-slate-800'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className={`p-8 rounded-3xl border space-y-3 transition-all ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/80 border-slate-800'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center font-bold">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Zero-Penalty SLA Guarantee</h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                When you share your records by our monthly 5th cutoff, we contractually guarantee 100% on-time filing. Any departmental late fee is reimbursed immediately.
              </p>
            </div>

            <div className={`p-8 rounded-3xl border space-y-3 transition-all ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/80 border-slate-800'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center font-bold">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
              <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Senior CA Legal Oversight</h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Every calculation, Rule 88A tax offset sequence, and ASMT/DRC reply is authored and signed off by practicing members of the Institute of Chartered Accountants of India.
              </p>
            </div>

            <div className={`p-8 rounded-3xl border space-y-3 transition-all ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/80 border-slate-800'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 flex items-center justify-center font-bold">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Algorithmic 2B Reconciliation</h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                We continuously cross-match purchase ledgers against supplier portal filings, catching defaulting vendors before your working capital is trapped.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. STORY & STANDARDS */}
      <section className={`py-16 sm:py-20 transition-colors ${
        isLight ? 'bg-slate-50' : 'bg-slate-950'
      }`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="space-y-4">
            <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              Why We Built GSTBro
            </h2>
            <div className={`text-sm sm:text-base leading-relaxed space-y-4 ${
              isLight ? 'text-slate-700' : 'text-slate-300'
            }`}>
              <p>
                In 2017, the rollout of the Goods and Services Tax fundamentally transformed Indian commerce. While unifying indirect taxes into a single national market, the compliance burden on MSMEs and fast-growing enterprises increased exponentially.
              </p>
              <p>
                Businesses were caught between two extremes: local standalone accountants who lacked automated reconciliation software, or generic SaaS tools that forced business owners to figure out complex tax laws on their own.
              </p>
              <p>
                GSTBro was founded to deliver the best of both worlds: enterprise-grade automated reconciliation paired with direct personal representation by senior Chartered Accountants. Today, we handle monthly filings, audits, and notice defense for over 2,500 active taxpayers across India.
              </p>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900 text-white p-8 sm:p-10 border border-slate-800 space-y-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white">Our Practice Credentials</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
              <div>
                <strong className="block text-3xl font-black text-blue-400 font-mono">2,500+</strong>
                <span className="text-xs text-slate-400">Businesses Retained</span>
              </div>
              <div>
                <strong className="block text-3xl font-black text-emerald-400 font-mono">99.9%</strong>
                <span className="text-xs text-slate-400">On-Time Filing SLA</span>
              </div>
              <div>
                <strong className="block text-3xl font-black text-cyan-400 font-mono">₹42 Cr+</strong>
                <span className="text-xs text-slate-400">GST Refunds Disbursed</span>
              </div>
              <div>
                <strong className="block text-3xl font-black text-purple-400 font-mono">100%</strong>
                <span className="text-xs text-slate-400">ICAI Regulated</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3B. CITATION-READY ENTITY SUMMARY (GEO / SEARCH) */}
      <section className={`py-14 border-t transition-colors ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
      }`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className={`text-2xl sm:text-3xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              GSTBro at a Glance
            </h2>
            <p className={`text-sm mt-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Verified practice details for Indian businesses seeking CA-supervised GST compliance.
            </p>
          </div>
          <div className={`overflow-hidden rounded-2xl border ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <table className="w-full text-left text-sm">
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800'}`}>
                {[
                  ['Platform Name', 'GSTBro (gstbro.com)'],
                  ['Practice Supervision', 'ICAI-Regulated Practicing Chartered Accountants'],
                  ['Core GST Services', 'GST Registration (REG-01), Monthly GSTR-1 & GSTR-3B Filing, GSTR-2B ITC Reconciliation, GST Audit (GSTR-9/9C), GST Refunds (RFD-01), ASMT-10 & DRC-01 Notice Defense'],
                  ['Service Coverage', 'Pan-India (all 28 states & 8 union territories)'],
                  ['Compliance Guarantee', '100% Zero-Penalty SLA on timely document submissions'],
                  ['Headquarters', settings?.officeAddress || '5-50B, SPR Street, Oldpet, Palamaner, Chittoor, Andhra Pradesh 517408'],
                  ['Direct Contact', `${settings?.contactPhone || '+91 8106004254'} • ${settings?.contactEmail || 'gstbro.com@gmail.com'}`],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <th className={`py-3.5 px-5 font-semibold w-48 sm:w-56 align-top ${
                      isLight ? 'text-slate-700 bg-slate-50/70' : 'text-slate-300 bg-slate-950/40'
                    }`}>
                      {label}
                    </th>
                    <td className={`py-3.5 px-5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 4. CTA BANNER */}
      <section className={`py-14 text-center transition-colors ${
        isLight
          ? 'bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white'
          : 'bg-slate-900 border-t border-slate-800 text-white'
      }`}>
        <div className="max-w-4xl mx-auto px-4 space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold">Ready to Automate Your GST Compliance?</h2>
          <p className="text-sm text-blue-100">
            Connect with our senior CA advisory desk for a complimentary 15-minute indirect tax evaluation.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => openStrategyCallModal({ topic: 'About Us CA Consultation' })}
              className="px-6 py-3.5 rounded-xl font-bold text-sm bg-white text-blue-900 hover:bg-blue-50 transition shadow-lg shadow-black/20 cursor-pointer"
            >
              Book Free CA Consultation &rarr;
            </button>
            <a
              href="/pricing"
              className={`px-6 py-3.5 rounded-xl font-bold text-sm border transition ${
                isLight ? 'bg-white/10 hover:bg-white/20 border-white/20 text-white' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
              }`}
            >
              View Retainer Plans
            </a>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

export default AboutPage;
