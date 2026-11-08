import { PublicLayout } from '../../components/PublicLayout';
import { Breadcrumbs } from '../../components/seo/Breadcrumbs';
import { TITLE_TEMPLATE, SITE_URL, DEFAULT_OG_IMAGE } from '../../seo/meta.config';
import type { SeoMeta } from '@gst/ui';

export const refundPolicyMeta: SeoMeta = {
  title: TITLE_TEMPLATE('Refund & Cancellation Policy'),
  description:
    'GSTBro Refund and Cancellation Policy: Learn about our 100% Zero-Penalty SLA, service cancellation timelines, and refund eligibility for tax advisory engagements.',
  keywords: 'gstbro refund policy, cancellation policy, service fee refund, zero penalty sla',
  canonical: `${SITE_URL}/refund-policy`,
  robots: 'index, follow',
  ogTitle: TITLE_TEMPLATE('Refund & Cancellation Policy'),
  ogDescription:
    'GSTBro Refund and Cancellation Policy: Learn about our 100% Zero-Penalty SLA, service cancellation timelines, and refund eligibility.',
  ogImage: DEFAULT_OG_IMAGE,
  ogUrl: `${SITE_URL}/refund-policy`,
};

export function RefundPolicyPage() {
  return (
    <PublicLayout meta={refundPolicyMeta}>
      {/* Hero */}
      <section className="bg-slate-950 text-white pt-12 pb-14 sm:pt-16 sm:pb-16 border-b border-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-3">
          <Breadcrumbs items={[{ name: 'Refund & Cancellation Policy', path: '/refund-policy' }]} />
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Refund &amp; Cancellation Policy
          </h1>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Transparent compliance agreements backed by our contractual 100% Zero-Penalty Guarantee.
          </p>
        </div>
      </section>

      {/* Main Legal Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8 text-slate-700 leading-relaxed text-sm">
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0">
              1
            </span>
            Overview &amp; Commitment
          </h2>
          <p>
            At GSTBro, we pride ourselves on institutional-grade indirect tax services. We are dedicated to ensuring error-free return filing, accurate 2B ITC reconciliations, and robust notice defense. Because our services involve statutory legal drafting and personalized CA review, this policy outlines the terms under which cancellations and refunds are granted.
          </p>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0">
              2
            </span>
            Contractual 100% Zero-Penalty SLA
          </h2>
          <p>
            For all monthly and quarterly retainer clients, when inward purchase invoices, outward sales registers, and bank statements are submitted to our team by the agreed monthly cutoff (5th of each calendar month):
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>
              <strong>Zero Late Fee Guarantee:</strong> GSTBro contractually guarantees timely filing of Form GSTR-1 and GSTR-3B before the statutory due date.
            </li>
            <li>
              <strong>Full Late Fee Reimbursement:</strong> If a late fee under Section 47 of the CGST Act is incurred due to any operational delay on GSTBro&apos;s part, GSTBro will directly reimburse or credit the full penalty amount within 3 business days.
            </li>
          </ul>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0">
              3
            </span>
            Cancellation &amp; Refund Scenarios
          </h2>
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <strong className="block text-slate-900 font-semibold mb-1">
                A. Prior to Commencing Document Processing (Full Refund)
              </strong>
              <p className="text-xs text-slate-600">
                If you request cancellation before our Chartered Accountants begin data ingestion, reconciliation, or portal preparation, you will receive a 100% refund of the professional fee minus any direct gateway transaction charges.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <strong className="block text-slate-900 font-semibold mb-1">
                B. After Reconciliation / Drafting Has Commenced (Pro-Rata Refund)
              </strong>
              <p className="text-xs text-slate-600">
                If statutory audit, ledger true-up, or legal notice drafting has already commenced, professional fees are refunded pro-rata based on work completed. Any statutory government fees already disbursed to the GST Portal or MCA are strictly non-refundable.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <strong className="block text-slate-900 font-semibold mb-1">
                C. Turnkey Registration &amp; Licensing Services
              </strong>
              <p className="text-xs text-slate-600">
                GST registration applications undergo strict document pre-screening. If an application is rejected solely due to an error in GSTBro&apos;s filing documentation, we will re-file at zero additional cost or issue a 100% refund of our advisory fee.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0">
              4
            </span>
            Refund Processing Timelines
          </h2>
          <p>
            Approved refunds will be processed to the original payment source (UPI, net banking, or debit/credit card) within 5 to 7 business days following formal approval by our billing team.
          </p>
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
            For refund or billing inquiries, please contact our billing desk directly at{' '}
            <a href="mailto:billing@gstbro.com" className="font-bold underline text-blue-700 hover:text-blue-900">
              billing@gstbro.com
            </a>{' '}
            or write to{' '}
            <a href="mailto:hello@gstbro.com" className="font-bold underline text-blue-700 hover:text-blue-900">
              hello@gstbro.com
            </a>.
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}

export default RefundPolicyPage;
