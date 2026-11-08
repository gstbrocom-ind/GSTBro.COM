import { useState } from 'react';
import { motion } from 'motion/react';
import { PublicLayout } from '../../components/PublicLayout';
import { Breadcrumbs } from '../../components/seo/Breadcrumbs';
import { pricingMeta } from '../../seo/pages/services.meta';
import { useContent } from '../../context/ContentContext';
import { fadeUpVariants, staggerContainer, transitions } from '../../lib/animations';

interface PlanFeature {
  text: string;
  highlight?: boolean;
}

interface RetainerPlan {
  id: string;
  name: string;
  subtitle: string;
  badge?: string;
  popular?: boolean;
  idealFor: string;
  turnoverBand: string;
  monthlyPriceQuarterly: number;
  monthlyPriceAnnual: number;
  coreDeliverables: PlanFeature[];
  href: string;
  ctaText: string;
}

const retainerPlans: RetainerPlan[] = [
  {
    id: 'foundational',
    name: 'Foundational Statutory Retainer',
    subtitle: 'Essential monthly compliance for growing businesses with zero late-fee risk.',
    badge: 'Core Compliance',
    popular: false,
    idealFor: 'Emerging Startups, LLPs, Consultancies & Single-State MSMEs',
    turnoverBand: 'Up to ₹1.5 Cr Annual Turnover (~100 Invoices/mo)',
    monthlyPriceQuarterly: 2499,
    monthlyPriceAnnual: 2125,
    coreDeliverables: [
      { text: 'Monthly/Quarterly Form GSTR-1 preparation & portal submission (Tables 4–12)' },
      { text: 'Form GSTR-3B tax computation with Rule 88A offset optimization', highlight: true },
      { text: 'Monthly purchase register reconciliation with Form GSTR-2B' },
      { text: 'Section 9(3) Reverse Charge Mechanism (RCM) audit & verification' },
      { text: 'Dual-tier CA manual review before every portal upload', highlight: true },
      { text: 'Official government ARN delivery & secure digital document archive' },
      { text: 'Contractual 100% Zero-Penalty SLA Reimbursement Warranty', highlight: true },
      { text: 'Direct client portal access & ticket desk support' },
    ],
    href: '/contact?plan=foundational',
    ctaText: 'Engage Foundational Retainer',
  },
  {
    id: 'growth',
    name: 'Enterprise Growth & ITC Shield',
    subtitle: 'Comprehensive working capital protection with active vendor chasing & notice defense.',
    badge: 'Most Chosen Retainer',
    popular: true,
    idealFor: 'Manufacturers, D2C Brands, Distributors & Growing B2B Enterprises',
    turnoverBand: '₹1.5 Cr – ₹15 Cr Annual Turnover (High Vendor Volume)',
    monthlyPriceQuarterly: 4999,
    monthlyPriceAnnual: 4249,
    coreDeliverables: [
      { text: 'Everything in Foundational Retainer, PLUS:' },
      { text: 'Dynamic Multi-Point 2B Reconciliation (Invoice #, Date, GSTIN, Rate)', highlight: true },
      { text: 'Automated Vendor Default Tracking (Chasing non-filing suppliers)', highlight: true },
      { text: 'Section 16(4) Expiration Shield (Zero expired Input Tax Credit)', highlight: true },
      { text: 'Department Scrutiny Defense Coverage (ASMT-10 & DRC-01 legal drafting)', highlight: true },
      { text: 'Annual Return Form GSTR-9 Preparation & Statutory Submission' },
      { text: 'E-Way Bill & E-Invoice (IRN) Audit & Cross-Checking' },
      { text: 'Dedicated Senior CA Advisory Desk (Direct Phone & WhatsApp Access)', highlight: true },
      { text: 'Quarterly Working Capital Health & Tax Liability Optimization Review' },
    ],
    href: '/contact?plan=growth',
    ctaText: 'Activate Working Capital Shield',
  },
  {
    id: 'corporate',
    name: 'Corporate Advisory & Multi-GSTIN',
    subtitle: 'Institutional indirect tax outsourcing with certified audit, refunds & appeals.',
    badge: 'Enterprise Infrastructure',
    popular: false,
    idealFor: 'Multi-State Entities, Exporters, E-Commerce Marketplaces & Conglomerates',
    turnoverBand: '₹15 Cr+ Annual Turnover / Pan-India Multi-GSTIN',
    monthlyPriceQuarterly: 9999,
    monthlyPriceAnnual: 8499,
    coreDeliverables: [
      { text: 'Everything in Growth Retainer, PLUS:' },
      { text: 'Multi-State GSTIN Consolidation & Centralized Compliance Oversight', highlight: true },
      { text: 'Statutory Audit Reconciliation (Form GSTR-9C) with Certified CA Sign-off', highlight: true },
      { text: 'Expedited GST Refund Processing (LUT Export & Inverted Duty RFD-01)', highlight: true },
      { text: 'GST TDS (GSTR-7) & TCS (GSTR-8) Marketplace Compliance' },
      { text: 'Legal Representation before Adjudicating & Appellate Authorities', highlight: true },
      { text: 'Custom ERP Data Ingestion (SAP, Oracle, Zoho Books, Tally Prime)' },
      { text: 'Custom SLA with 4-Hour Response Guarantee & Dedicated CA Partner', highlight: true },
      { text: 'Bi-annual Advance Tax & Indirect Tax Optimization Audit' },
    ],
    href: '/contact?plan=corporate',
    ctaText: 'Request Corporate Scope Consultation',
  },
];

const standaloneServices = [
  {
    title: 'Statutory GST Registration & Entity Setup',
    desc: 'Turnkey GSTIN onboarding for Pvt Ltd, LLP, Partnership, and Proprietorship entities with zero rejection guarantee.',
    sla: '3–5 Business Days',
    price: '₹1,999',
    type: 'One-Time Statutory Fee',
    deliverables: ['Jurisdiction evaluation', 'Biometric authentication support', 'Aadhaar validation', 'Officer query defense'],
    href: '/services/gst-registration',
  },
  {
    title: 'Annual Statutory Audit & Certification (GSTR-9 & 9C)',
    desc: 'Comprehensive cross-ledger reconciliation between audited financial statements and portal ledgers with formal CA certification.',
    sla: 'Certified CA Sign-off',
    price: 'From ₹4,999',
    type: 'Annual Engagement',
    deliverables: ['GSTR-9 true-up liability compilation', 'GSTR-9C difference certification', 'Sec 36 defense dossier'],
    href: '/services/gst-audit',
  },
  {
    title: 'Expedited GST Refunds (Export LUT & Inverted Duty)',
    desc: 'End-to-end processing of accumulated ITC and cash ledger balances with direct liaison until bank disbursement.',
    sla: '₹42 Cr+ Recovered',
    price: 'Success Aligned',
    type: 'Milestone Engagement',
    deliverables: ['Annexure-B preparation', 'FIRC/BRC linking', 'RFD-01 tracking', 'Direct bank account credit'],
    href: '/services/gst-refund',
  },
  {
    title: 'Department Notice Defense (ASMT-10 / DRC-01)',
    desc: 'Legal drafting of rigorous replies to scrutiny notices, SCNs, and demands with senior CA personal hearing representation.',
    sla: '100% Notice Resolution',
    price: 'Fixed Defense Retainer',
    type: 'Per Notice Counsel',
    deliverables: ['Discrepancy reconciliation', 'Section 73/74 legal replies', 'Personal hearing representation'],
    href: '/services/gst-advisory',
  },
];

const comparisonRows = [
  {
    category: 'Execution Standard',
    feature: 'Who reviews and signs off on your returns?',
    cheapFiling: 'Unqualified data-entry clerks or automated bots without human review',
    gstBro: 'Dual-Tier Certified ICAI Chartered Accountants (Four-Eye Principle)',
  },
  {
    category: 'ITC Protection',
    feature: 'Inward GSTR-2B invoice-by-invoice reconciliation',
    cheapFiling: 'Skipped or mechanical summary filing (causes 8–15% lost tax credit)',
    gstBro: 'Continuous multi-point matching (Invoice #, Date, GSTIN, Rate) with vendor default chasing',
  },
  {
    category: 'Tax Liability',
    feature: 'Rule 88A Tax Offset Calculation',
    cheapFiling: 'Raw payment without optimization (businesses pay unnecessary cash tax)',
    gstBro: 'Mathematical cross-utilization engine maximizing ledger set-offs legally',
  },
  {
    category: 'Scrutiny Defense',
    feature: 'Handling Department Notices (Form ASMT-10 / DRC-01)',
    cheapFiling: 'Declared "Out of scope" — charged ₹15,000+ extra per notice or abandoned',
    gstBro: 'Included in Growth/Corporate plans with senior CA legal defense drafting',
  },
  {
    category: 'Risk & Warranty',
    feature: 'Late Fee & Interest Penalty Policy',
    cheapFiling: 'Zero liability disclaimers — 100% of fine and interest pushed onto client',
    gstBro: 'Contractual Zero-Penalty Guarantee: We pay 100% of late fees if delayed on our watch',
  },
  {
    category: 'Support Channel',
    feature: 'Direct access to your tax professional',
    cheapFiling: 'Generic ticketing queues, AI chatbots, slow email turnaround',
    gstBro: 'Dedicated Senior CA on direct phone, WhatsApp, and private client portal',
  },
];

const pricingFaqs = [
  {
    q: 'Why does GSTBro cost more than a ₹500/month filing bot or local bookkeeper?',
    a: 'Cheap ₹500 services are mechanical data-entry filers. They do not cross-examine your 2B purchase ledgers, follow up with delinquent suppliers, or calculate optimal Rule 88A tax set-offs. In Indian indirect taxation, missing just two vendor invoices can cost you ₹50,000+ in permanently lost Input Tax Credit, while an unreconciled return triggers ASMT-10 scrutiny with 18% statutory interest. GSTBro is an institutional tax infrastructure managed by certified Chartered Accountants that pays for itself many times over by protecting your working capital.',
  },
  {
    q: 'How does the 100% Zero-Penalty SLA Guarantee work?',
    a: 'When you provide your monthly invoices and documentation by our cutoff window (typically by the 7th of the month), we contractually guarantee that your GSTR-1 and GSTR-3B will be filed accurately before the government portal deadline. In the rare event that a late fee or statutory penalty occurs due to our delay, GSTBro reimburses 100% of the penalty amount.',
  },
  {
    q: 'What happens if our suppliers haven’t uploaded their invoices in GSTR-2B?',
    a: 'Under Section 16(2)(aa) of the CGST Act, you cannot claim ITC unless your supplier has filed their return and it reflects in your GSTR-2B. In our Growth and Corporate tiers, our reconciliation engine detects missing invoices immediately and provides an automated Vendor Delinquency Report so your team can chase non-compliant vendors before the tax filing cutoff.',
  },
  {
    q: 'Can we customize our retainer if we operate across multiple Indian states?',
    a: 'Yes. For multi-state companies, we provide consolidated Pan-India Retainers where all state GSTINs are managed under a single centralized Chartered Accountant partner with unified billing, cross-state stock transfer reconciliation, and consolidated reporting.',
  },
  {
    q: 'What if we already have pending notices or messy past records?',
    a: 'We routinely onboard businesses with historical discrepancies, unresolved ASMT-10 notices, or blocked credits. During onboarding, our senior CA team performs a comprehensive Diagnostic Health Audit to clean up historical ledger mismatches and formulate legal responses to any open departmental notices.',
  },
];

export function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'quarterly' | 'annual'>('annual');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [calculatorTurnover, setCalculatorTurnover] = useState<number>(30000000); // 3 Cr default

  const customHeader = useContent('content_pricing_header', {
    badge: 'Institutional Indirect Tax Infrastructure • ICAI Standard Supervision',
    title: 'Invest in Working Capital Defense. Not Cheap Shortcuts.',
    subtitle:
      'Cheap mechanical return filing costs Indian businesses an average of 8% to 15% in lost Input Tax Credit and triggers crippling ASMT-10 scrutiny penalties. GSTBro delivers complete Indirect Tax Infrastructure backed by certified Chartered Accountants and contractual zero-penalty SLAs.',
  });
  const plans = useContent('content_pricing_plans', retainerPlans);
  const faqs = useContent('content_pricing_faqs', pricingFaqs);

  // ROI calculation based on turnover
  const estimatedPurchases = calculatorTurnover * 0.65;
  const estimatedInputTax = estimatedPurchases * 0.18;
  const averageItcLeakageAverted = Math.round(estimatedInputTax * 0.032); // ~3.2% average leakage in unmanaged 2B
  const annualRetainerCost = 4249 * 12; // Growth plan annual
  const netWorkingCapitalSaved = averageItcLeakageAverted - annualRetainerCost;
  const roiMultiplier = (averageItcLeakageAverted / annualRetainerCost).toFixed(1);

  return (
    <PublicLayout meta={pricingMeta}>
      {/* 1. HERO SECTION: VALUE & SERVICE OVERVIEW */}
      <section className="relative bg-slate-950 text-white pt-12 pb-16 sm:pt-20 sm:pb-24 overflow-hidden border-b border-slate-900">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-blue-600/15 blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: 'Pricing & Retainers', path: '/pricing' }]} />

          <div className="text-center max-w-3xl mx-auto mt-6 space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-bold text-blue-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {customHeader.badge}
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.12]">
              {customHeader.title}
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              {customHeader.subtitle}
            </p>

            {/* Billing Cycle Switcher */}
            <div className="pt-4 flex items-center justify-center">
              <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 shadow-xl w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setBillingCycle('quarterly')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer touch-target ${
                    billingCycle === 'quarterly'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Quarterly Retainer
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 touch-target ${
                    billingCycle === 'annual'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Annual Retainer</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Save 15% + GSTR-9
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THREE COMPREHENSIVE RETAINER PLANS */}
      <section className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid md:grid-cols-3 gap-8 items-stretch"
          >
            {plans.map((plan: RetainerPlan) => {
              const displayPrice = billingCycle === 'annual' ? plan.monthlyPriceAnnual : plan.monthlyPriceQuarterly;
              return (
                <motion.div
                  key={plan.id}
                  variants={fadeUpVariants}
                  whileHover={{ y: -6, transition: transitions.springHover }}
                  className={`relative rounded-3xl flex flex-col justify-between p-7 sm:p-8 transition-all ${
                    plan.popular
                      ? 'bg-white border-2 border-blue-600 shadow-2xl shadow-blue-600/15 scale-100 lg:-translate-y-2'
                      : 'bg-white border border-slate-200 shadow-sm hover:border-slate-300'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] font-bold uppercase tracking-wider py-1 px-4 rounded-full shadow-lg">
                      {plan.badge}
                    </div>
                  )}

                  <div>
                    {/* Header */}
                    <div className="mb-4">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
                        {plan.idealFor}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        {plan.name}
                      </h2>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed min-h-[36px]">
                        {plan.subtitle}
                      </p>
                    </div>

                    {/* Bandwidth tag */}
                    <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 mb-6">
                      <span className="text-slate-500 font-normal block text-[10px] uppercase font-mono">Turnover Scope:</span>
                      {plan.turnoverBand}
                    </div>

                    {/* Pricing Display */}
                    <div className="mb-6 pb-6 border-b border-slate-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-mono">
                          ₹{displayPrice.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          / month
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        {billingCycle === 'annual' ? 'Billed annually (includes annual return audit)' : 'Billed quarterly in advance'}
                      </span>
                    </div>

                    {/* Core Deliverables Checklist */}
                    <div className="space-y-3 mb-8">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Included Statutory Scope &amp; SLAs
                      </span>
                      <ul className="space-y-2.5 text-xs text-slate-700">
                        {plan.coreDeliverables.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 leading-snug">
                            <span className={`shrink-0 font-bold text-sm mt-[-2px] ${item.highlight ? 'text-blue-600' : 'text-emerald-600'}`}>
                              ✓
                            </span>
                            <span className={item.highlight ? 'font-bold text-slate-900' : 'text-slate-700'}>
                              {item.text}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <a
                    href={plan.href}
                    className={`w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm text-center transition-all cursor-pointer ${
                      plan.popular
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    {plan.ctaText} →
                  </a>
                  </motion.div>
                );
              })}
            </motion.div>

          {/* Zero-Penalty Assurance Badge */}
          <div className="mt-14 max-w-4xl mx-auto rounded-3xl bg-slate-900 text-white p-7 sm:p-8 shadow-xl border border-slate-800 flex flex-col sm:flex-row items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="text-center sm:text-left space-y-1">
              <h3 className="text-lg font-black text-white">
                The GSTBro 100% Zero-Penalty Financial Warranty
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                When your monthly invoices are synced by our standard cutoff window, we guarantee timely portal submission with official ARN delivery. In the rare event that a late-filing fee or statutory interest occurs on our watch, GSTBro reimburses 100% of the penalty out of our own pocket.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HARD TRUTH: CHEAP FILING VS THE GSTBRO STANDARD */}
      <section className="py-16 sm:py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-full inline-block mb-2">
              The True Cost of Cheap Filing
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Why Cheap GST Services Cost Businesses Lakhs in Lost Capital
            </h2>
            <p className="text-slate-600 mt-2 text-sm sm:text-base leading-relaxed">
              When a service charges ₹500/month, they cannot afford a qualified Chartered Accountant to audit your books. Here is what actually happens behind the scenes.
            </p>
          </div>

          <div className="overflow-x-auto max-w-5xl mx-auto border border-slate-200 rounded-3xl shadow-sm">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="py-4 px-6 font-bold w-1/3">Statutory Capability</th>
                  <th className="py-4 px-6 font-bold w-1/3 text-red-400 bg-slate-950">
                    Cheap &quot;Bot&quot; Filing (₹499–₹1,000)
                  </th>
                  <th className="py-4 px-6 font-bold w-1/3 text-emerald-400 bg-slate-900 border-l border-slate-800">
                    The GSTBro Institutional Standard
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {comparisonRows.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="py-4 px-6">
                      <strong className="block text-slate-900 text-xs sm:text-sm">{row.feature}</strong>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">{row.category}</span>
                    </td>
                    <td className="py-4 px-6 text-red-700 bg-red-50/30 text-xs sm:text-sm leading-relaxed">
                      <span className="text-red-600 font-bold mr-1.5">✕</span>
                      {row.cheapFiling}
                    </td>
                    <td className="py-4 px-6 text-emerald-900 bg-emerald-50/30 font-medium text-xs sm:text-sm leading-relaxed border-l border-slate-200">
                      <span className="text-emerald-600 font-bold mr-1.5">✓</span>
                      {row.gstBro}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 4. INTERACTIVE ROI & WORKING CAPITAL CALCULATOR */}
      <section className="py-16 sm:py-24 bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950 border border-emerald-800 px-3 py-1 rounded-full inline-block mb-2">
              Tangible Value Calculator
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              See How Proper CA Compliance Pays for Itself
            </h2>
            <p className="text-slate-400 mt-2 text-sm sm:text-base">
              Slide to your approximate annual turnover to see how much working capital is saved through systematic 2B reconciliation and zero-penalty protection.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <label htmlFor="turnover-slider" className="text-xs font-bold uppercase text-slate-400">
                  Select Your Annual Business Turnover:
                </label>
                <span className="text-2xl font-black text-white font-mono">
                  ₹{(calculatorTurnover / 10000000).toFixed(1)} Crore
                </span>
              </div>
              <input
                id="turnover-slider"
                type="range"
                min="5000000"
                max="200000000"
                step="5000000"
                value={calculatorTurnover}
                onChange={(e) => setCalculatorTurnover(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1.5">
                <span>₹50 Lakhs</span>
                <span>₹5 Crores</span>
                <span>₹10 Crores</span>
                <span>₹20 Crores</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
              <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block font-medium">Estimated Annual ITC Protected</span>
                <strong className="text-2xl font-black text-emerald-400 font-mono mt-1 block">
                  ₹{(averageItcLeakageAverted / 100000).toFixed(2)} Lakhs
                </strong>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Avg 3.2% leakage averted via 2B</span>
              </div>

              <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block font-medium">GSTBro Annual Retainer</span>
                <strong className="text-2xl font-black text-white font-mono mt-1 block">
                  ₹{(annualRetainerCost / 1000).toFixed(1)}K
                </strong>
                <span className="text-[10px] text-slate-500 mt-0.5 block">All-inclusive CA supervision</span>
              </div>

              <div className="bg-blue-950/40 p-4 rounded-2xl border border-blue-800/50">
                <span className="text-[11px] text-blue-300 block font-medium">Net Working Capital Saved</span>
                <strong className="text-2xl font-black text-emerald-300 font-mono mt-1 block">
                  ₹{(netWorkingCapitalSaved / 100000).toFixed(2)} Lakhs
                </strong>
                <span className="text-[10px] text-blue-400 mt-0.5 block font-bold">
                  {roiMultiplier}x Return on Retainer Cost
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. STANDALONE STATUTORY ENGAGEMENTS */}
      <section className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full inline-block mb-2">
              Project-Based Solutions
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              One-Time Statutory Legal &amp; Audit Services
            </h2>
            <p className="text-slate-600 mt-2 text-sm sm:text-base">
              For businesses requiring specialized departmental approvals, statutory filings, or defense representation.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {standaloneServices.map((svc) => (
              <div
                key={svc.title}
                className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between hover:border-blue-400 shadow-2xs hover:shadow-md transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                      {svc.sla}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 font-mono">
                      {svc.type}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-2">
                    {svc.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    {svc.desc}
                  </p>

                  <div className="pt-3 border-t border-slate-100 space-y-1.5 mb-6">
                    {svc.deliverables.map((d, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-slate-700">
                        <span className="text-emerald-600 font-bold text-[10px]">✓</span>
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="pb-3 border-t border-slate-100 flex items-baseline justify-between">
                    <span className="text-lg font-black text-slate-900 font-mono">{svc.price}</span>
                    <a
                      href={svc.href}
                      className="text-xs font-bold text-blue-600 group-hover:text-blue-700 flex items-center gap-1"
                    >
                      <span>Engage</span>
                      <span>➔</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. VALUE & ENGAGEMENT FAQS */}
      <section className="py-16 sm:py-24 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full inline-block mb-2">
              Common Questions
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Value, Security &amp; Retainer FAQs
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq: { q: string; a: string }, index: number) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="border border-slate-200 rounded-2xl overflow-hidden transition-all bg-slate-50/50"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-slate-900 cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <span className="text-slate-400 font-mono text-base shrink-0">
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="p-5 pt-0 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-white">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. PRE-FOOTER DIRECT CA CONSULTATION BANNER */}
      <section className="py-16 sm:py-20 bg-slate-950 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-bold text-blue-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Complimentary Statutory Compliance Diagnostic
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Stop Guessing Your Real Compliance Costs.
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Schedule a free 15-minute diagnostic call with a Senior Chartered Accountant. We will analyze your GSTR-2B inward ledgers and calculate your exact uncredited ITC potential.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/contact"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-600/30 transition-all cursor-pointer"
            >
              <span>Book 15-Min CA Compliance Diagnostic</span>
              <span>➔</span>
            </a>
            <a
              href="/services"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-4 rounded-xl font-semibold text-sm text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-all text-center"
            >
              Explore 9 Practice Areas Directory
            </a>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

export default PricingPage;
