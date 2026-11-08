import { motion } from 'motion/react';
import { PublicLayout } from '../../components/PublicLayout';
import { Breadcrumbs } from '../../components/seo/Breadcrumbs';
import { useSettings } from '../../context/SettingsContext';
import { TITLE_TEMPLATE, SITE_URL, DEFAULT_OG_IMAGE } from '../../seo/meta.config';
import type { SeoMeta } from '@gst/ui';

export const aboutMeta: SeoMeta = {
  title: TITLE_TEMPLATE('About Us — India’s Institutional GST Compliance Platform'),
  description:
    'Learn about GSTBro — our mission, ICAI Chartered Accountant supervision, technology-driven reconciliation, and commitment to zero-penalty compliance for Indian businesses.',
  keywords:
    'about gstbro, gst consultants india, chartered accountant gst team, indirect tax advisory, gst compliance company',
  canonical: `${SITE_URL}/about`,
  robots: 'index, follow',
  ogTitle: TITLE_TEMPLATE('About Us — India’s Institutional GST Compliance Platform'),
  ogDescription:
    'Learn about GSTBro — our mission, ICAI Chartered Accountant supervision, technology-driven reconciliation, and commitment to zero-penalty compliance for Indian businesses.',
  ogImage: DEFAULT_OG_IMAGE,
  ogUrl: `${SITE_URL}/about`,
};

export function AboutPage() {
  const settings = useSettings();

  return (
    <PublicLayout meta={aboutMeta}>
      {/* 1. HERO SECTION */}
      <section className="relative bg-slate-950 text-white pt-12 pb-16 sm:pt-20 sm:pb-24 overflow-hidden border-b border-slate-900">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px] bg-blue-600/15 blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: 'About Us', path: '/about' }]} />

          <div className="text-center max-w-3xl mx-auto mt-6 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-bold text-blue-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              ICAI Supervised Indirect Tax Infrastructure
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Institutional Tax Governance. <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300">
                Engineered for Indian Enterprises.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
              GSTBro bridges the gap between traditional Chartered Accountancy firms and modern technology. We protect Indian businesses against credit leakage, late fees, and statutory tax disputes.
            </p>
          </div>
        </div>
      </section>

      {/* 2. MISSION & CORE PILLARS */}
      <section className="py-16 sm:py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl">
                🛡️
              </div>
              <h3 className="text-lg font-bold text-slate-900">Zero-Penalty SLA Guarantee</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                When you share your records by our monthly 5th cutoff, we contractually guarantee 100% on-time filing. Any departmental late fee is reimbursed immediately.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xl">
                ⚖️
              </div>
              <h3 className="text-lg font-bold text-slate-900">Senior CA Legal Oversight</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Every calculation, Rule 88A tax offset sequence, and ASMT/DRC reply is authored and signed off by practicing members of the Institute of Chartered Accountants of India.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center font-bold text-xl">
                🔄
              </div>
              <h3 className="text-lg font-bold text-slate-900">Algorithmic 2B Reconciliation</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                We continuously cross-match purchase ledgers against supplier portal filings, catching defaulting vendors before your working capital is trapped.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. STORY & STANDARDS */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Why We Built GSTBro
            </h2>
            <div className="text-sm sm:text-base text-slate-700 leading-relaxed space-y-4">
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

          <div className="rounded-3xl bg-slate-900 text-white p-8 sm:p-10 border border-slate-800 space-y-6">
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

      {/* 4. CTA BANNER */}
      <section className="py-14 bg-gradient-to-r from-blue-900 to-indigo-950 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 space-y-4">
          <h2 className="text-2xl sm:text-3xl font-black">Ready to Automate Your GST Compliance?</h2>
          <p className="text-sm text-blue-200">
            Connect with our senior CA advisory desk for a complimentary 15-minute indirect tax evaluation.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/contact"
              className="px-6 py-3.5 rounded-xl font-bold text-sm bg-white text-blue-900 hover:bg-blue-50 transition shadow-lg shadow-black/20"
            >
              Book Free CA Consultation &rarr;
            </a>
            <a
              href="/pricing"
              className="px-6 py-3.5 rounded-xl font-bold text-sm bg-slate-900/80 border border-slate-700 text-white hover:bg-slate-900 transition"
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
