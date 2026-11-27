import { PublicLayout } from '../../components/PublicLayout';
import { Breadcrumbs } from '../../components/seo/Breadcrumbs';
import { HsnSacSearch } from '../../components/HsnSacSearch';
import { hsnSacMeta } from '../../seo/pages/services.meta';
import { faqSchema } from '../../seo/schema/faq';
import { openStrategyCallModal } from '../../components/StrategyCallModal';

const hsnFaqs = [
  {
    question: 'What are the prevailing GST tax slabs in India as of November 2026?',
    answer:
      'Following the GST 2.0 rate rationalization (56th & 57th GST Council reforms), the legacy 12% and 28% slabs have been largely phased out. Prevailing core slabs are 0% (Nil/Exempt), 5% (Merit rate), 18% (Standard rate), and 40% (Demerit/Sin tax slab), alongside special rates of 3% for gold/jewellery and 0.25% for rough diamonds.',
  },
  {
    question: 'What is the difference between HSN and SAC codes in GST?',
    answer:
      'HSN (Harmonized System of Nomenclature) codes classify physical goods (Chapters 01–98), whereas SAC (Services Accounting Code) codes classify services (Heading 99xx). Both must be reported on GST tax invoices and GSTR-1.',
  },
  {
    question: 'How many digits of HSN code are mandatory on GST invoices?',
    answer:
      'Businesses with aggregate turnover up to ₹5 Crore must report at least 4-digit HSN codes on B2B invoices, while taxpayers with turnover above ₹5 Crore must report minimum 6-digit HSN codes on all B2B and export invoices.',
  },
];

export function HsnSacSearchPage() {
  return (
    <PublicLayout meta={hsnSacMeta} jsonLd={faqSchema(hsnFaqs)}>
      <section className="relative bg-slate-950 text-white pt-12 pb-16 sm:pt-16 sm:pb-20 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: 'Resources', path: '/resources' },
              { name: 'HSN & SAC Code Search', path: '/hsn-sac-search' },
            ]}
          />
          <div className="text-center max-w-3xl mx-auto mt-6 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-bold text-blue-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Updated 27 Nov 2026 • GST 2.0 Rate Slabs (0%, 3%, 5%, 18%, 40%)
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              HSN &amp; SAC Code{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-300">
                GST Rate Finder
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Instantly search Indian HSN codes for goods and SAC codes for services with prevailing CGST, SGST, and
              IGST rates updated for the streamlined GST 2.0 schedule.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <HsnSacSearch />
        </div>
      </section>

      <section className="py-14 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 text-center">
            HSN &amp; SAC Classification FAQs
          </h2>
          <div className="space-y-4">
            {hsnFaqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-2xl border border-slate-200 bg-slate-50/60 p-5 open:bg-white open:border-blue-300"
              >
                <summary className="font-bold text-slate-900 cursor-pointer list-none flex items-center justify-between gap-4">
                  <span>{faq.question}</span>
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
          <div className="text-center pt-4">
            <button
              type="button"
              onClick={() => openStrategyCallModal({ topic: 'HSN/SAC Classification Review' })}
              className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 transition cursor-pointer"
            >
              Unsure About Your HSN/SAC Rate? Consult a CA &rarr;
            </button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

export default HsnSacSearchPage;
