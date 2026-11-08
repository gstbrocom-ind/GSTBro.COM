import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { PublicLayout } from '../../components/PublicLayout';
import { Breadcrumbs } from '../../components/seo/Breadcrumbs';
import { servicesMeta } from '../../seo/pages/services.meta';
import { fadeUpVariants, staggerContainer, transitions } from '../../lib/animations';

interface ServiceItem {
  id: string;
  category: 'returns' | 'itc_refund' | 'legal_audit' | 'licensing';
  title: string;
  tag: string;
  tagColor: string;
  desc: string;
  deliverables: string[];
  href: string;
  actionText: string;
  statBadge?: string;
}

export function ServicesHubPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const services: ServiceItem[] = [
    {
      id: 'gst-returns',
      category: 'returns',
      title: 'Monthly & Quarterly Return Filing (GSTR-1 & 3B)',
      tag: 'Zero-Penalty Shield',
      tagColor: 'bg-blue-50 text-blue-700 border-blue-200',
      desc: 'Systematic monthly and quarterly filings with multi-tier ledger matching, cash challan creation, and late-fee reimbursement assurance.',
      deliverables: [
        'Form GSTR-1 granular table classification (Tables 4, 5, 7, 12 HSN, and 13 Documents)',
        'Form GSTR-3B tax settlement with automated offset against available Input Tax Credits',
        'Inward Reverse Charge (RCM) Sec 9(3)/9(4) audit & cash challan generation (PMT-06)',
        'Instant delivery of official government Acknowledgement Reference Numbers (ARNs)',
      ],
      href: '/services/gst-returns',
      actionText: 'Explore Return Filing ➔',
      statBadge: '99.9% On-Time SLA',
    },
    {
      id: 'gst-registration',
      category: 'licensing',
      title: 'Statutory GST Registration & Entity Setup',
      tag: '3–5 Day SLA',
      tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      desc: 'Fast-track GSTIN onboarding for private limited entities, LLPs, partnerships, and proprietorships with proactive departmental query resolution.',
      deliverables: [
        'Statutory jurisdiction evaluation & documentation verification by indirect tax experts',
        'Aadhaar biometric authentication guidance and site verification preparedness',
        'Principal and additional place of business geo-tagging compliance',
        'Guaranteed zero departmental rejection with proactive query response drafting',
      ],
      href: '/services/gst-registration',
      actionText: 'Apply for Registration ➔',
      statBadge: '100% Approval Rate',
    },
    {
      id: 'gst-compliance',
      category: 'itc_refund',
      title: 'Dynamic ITC Reconciliation & Leakage Prevention',
      tag: 'Max Capital Recovery',
      tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
      desc: 'Real-time 2B vs Purchase Register matching algorithms to identify non-compliant vendors, block inauditable claims, and recover 100% of eligible input tax.',
      deliverables: [
        'Rule 88A credit engine maximizing IGST, CGST, and SGST cross-utilization',
        'Continuous automated reconciliation with government auto-drafted Form GSTR-2B',
        'Vendor default detection & automated follow-up communication to clear supplier backlogs',
        'Section 16(4) time-bar risk alerts to ensure zero expired credits',
      ],
      href: '/services/gst-compliance',
      actionText: 'Reconcile ITC Ledgers ➔',
      statBadge: 'Avg 8% Tax Saved',
    },
    {
      id: 'gst-refund',
      category: 'itc_refund',
      title: 'Expedited GST Refunds (Export & Inverted Duty)',
      tag: 'Direct Bank Disbursement',
      tagColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      desc: 'End-to-end management of LUT export refunds, inverted duty structure applications, and excess cash ledger balances backed by certified CA documentation.',
      deliverables: [
        'Export refunds without payment of tax under Letter of Undertaking (LUT)',
        'Inverted duty structure (IDS) accumulated input tax credit computation and filing',
        'Preparation of certified Annexure-B statements, FIRC/BRC linking, and CA certification',
        'Direct tracking through Form RFD-01 to bank credit disbursement',
      ],
      href: '/services/gst-refund',
      actionText: 'Claim Entitlement ➔',
      statBadge: '₹42 Cr+ Disbursed',
    },
    {
      id: 'gst-tds-tcs',
      category: 'returns',
      title: 'GST TDS & TCS Compliance (GSTR-7 & GSTR-8)',
      tag: 'Section 51 & 52 SLA',
      tagColor: 'bg-purple-50 text-purple-700 border-purple-200',
      desc: 'Complete statutory deduction and collection compliance for government departments, PSUs, and e-commerce operators, with automated GSTR-7A certificate distribution.',
      deliverables: [
        'Monthly Form GSTR-7 preparation and filing for statutory tax deductors u/s 51',
        'Monthly Form GSTR-8 return filing for electronic commerce operators u/s 52',
        'Supplier-wise net supply reconciliation and automated TDS certificate distribution',
        'Challan generation and monthly deposit verification by the 10th of every month',
      ],
      href: '/services/gst-tds-tcs',
      actionText: 'Manage TDS / TCS ➔',
      statBadge: 'Govt & E-com Ready',
    },
    {
      id: 'gst-audit',
      category: 'legal_audit',
      title: 'Annual Statutory Audit & Filings (GSTR-9 & 9C)',
      tag: 'Audit Readiness',
      tagColor: 'bg-rose-50 text-rose-700 border-rose-200',
      desc: 'Meticulous cross-ledger reconciliation between statutory audited financial statements and GST portal ledgers, complete with formal CA certification.',
      deliverables: [
        'Form GSTR-9 annual return compilation and true-up liability computation',
        'Form GSTR-9C statutory reconciliation statement and difference certification',
        'Comprehensive review of Table 4, Table 9, Table 10/11 adjustments, and HSN disclosures',
        'Audit-defense documentation file compliant with Section 36 statutory retention',
      ],
      href: '/services/gst-audit',
      actionText: 'Initiate Annual Audit ➔',
      statBadge: 'Certified CA Review',
    },
    {
      id: 'gst-advisory',
      category: 'legal_audit',
      title: 'Departmental Scrutiny & Notice Defense (ASMT/DRC)',
      tag: 'Senior CA Representation',
      tagColor: 'bg-red-50 text-red-700 border-red-200',
      desc: 'Legal drafting of rigorous replies to ASMT-10 inquiries, SCNs, and DRC-01 demand notices with senior CA representation before tax adjudicators.',
      deliverables: [
        'Form ASMT-10 scrutiny notice analysis and discrepancy reconciliation',
        'Legal drafting of replies to Show Cause Notices (SCN) and Form DRC-01 demands',
        'Section 73 (non-fraud) and Section 74 (demand) statutory defense strategy',
        'Representation in personal hearings before Adjudicating and Appellate Authorities',
      ],
      href: '/services/gst-advisory',
      actionText: 'Request Defense Counsel ➔',
      statBadge: '100% Notice Resolution',
    },
    {
      id: 'gst-cancellation',
      category: 'licensing',
      title: 'Statutory GSTIN Surrender & Clean Closure',
      tag: 'Zero Liability Exit',
      tagColor: 'bg-slate-100 text-slate-700 border-slate-300',
      desc: 'Structured revocation and final GSTR-10 filing to achieve clean regulatory discharge without lingering liability or future departmental scrutiny.',
      deliverables: [
        'Closing stock and capital goods input tax credit reversal computation',
        'Application for cancellation of registration (Form GST REG-16)',
        'Final Return Form GSTR-10 preparation and statutory submission',
        'Complete liability discharge certificate issued by jurisdictional tax authorities',
      ],
      href: '/services/gst-cancellation',
      actionText: 'Surrender GSTIN ➔',
      statBadge: 'Clean Discharge',
    },
    {
      id: 'business-licenses',
      category: 'licensing',
      title: 'Corporate Licensing & Statutory Registrations',
      tag: 'Central & State Compliant',
      tagColor: 'bg-teal-50 text-teal-700 border-teal-200',
      desc: 'Turnkey onboarding for MSME Udyam, Import Export Code (DGFT), FSSAI food licensing, Shop & Establishment, and Class-3 DSC certifications.',
      deliverables: [
        'MSME / Udyam registration for priority bank credit and tender preferences',
        '10-digit Import Export Code (IEC) from Directorate General of Foreign Trade (DGFT)',
        'FSSAI food business registration and state/central licensing',
        'Class-3 Digital Signature Certificates (DSC) with USB crypto token delivery',
      ],
      href: '/services/business-licenses',
      actionText: 'Explore Business Licenses ➔',
      statBadge: 'All-in-One Setup',
    },
  ];

  const filteredServices = useMemo(() => {
    return services.filter((srv) => {
      const matchesCategory = selectedCategory === 'all' || srv.category === selectedCategory;
      const matchesSearch =
        srv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        srv.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        srv.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        srv.deliverables.some((d) => d.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery, services]);

  const categories = [
    { id: 'all', label: 'All Practice Areas', count: services.length },
    { id: 'returns', label: 'Returns & Compliance', count: services.filter((s) => s.category === 'returns').length },
    { id: 'itc_refund', label: 'ITC & Tax Refunds', count: services.filter((s) => s.category === 'itc_refund').length },
    { id: 'legal_audit', label: 'Audits & Notice Defense', count: services.filter((s) => s.category === 'legal_audit').length },
    { id: 'licensing', label: 'Licenses & Entity Setup', count: services.filter((s) => s.category === 'licensing').length },
  ];

  return (
    <PublicLayout meta={servicesMeta}>
      <div className="bg-slate-50 min-h-screen">
        {/* Breadcrumb Header */}
        <div className="max-w-7xl mx-auto px-4 pt-6 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: 'Practice Areas & Services', path: '/services' }]} />
        </div>

        {/* Hero Section */}
        <section className="relative overflow-hidden pt-8 pb-14 lg:pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                Comprehensive Indirect Tax &amp; Regulatory Infrastructure
              </span>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                Institutional-Grade <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 bg-clip-text text-transparent">GST &amp; Tax Advisory</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
                End-to-end indirect tax compliance, automated Rule 88A ITC reconciliation, expedited refunds, and senior CA scrutiny defense engineered for enterprises and SMEs across India.
              </p>

              {/* Search & Discovery Bar */}
              <div className="pt-4 max-w-xl mx-auto">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-base">
                    🔍
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search practice areas (e.g. Return filing, Refunds, GSTR-1, Notice defense, FSSAI)..."
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-2xl text-xs sm:text-sm shadow-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden transition"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Key Trust Stats */}
              <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <strong className="block text-2xl font-black text-slate-900 font-mono">99.9%</strong>
                  <span className="text-[11px] font-semibold text-slate-500">On-Time Filing SLA</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <strong className="block text-2xl font-black text-emerald-600 font-mono">₹42 Cr+</strong>
                  <span className="text-[11px] font-semibold text-slate-500">Capital Recovered</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <strong className="block text-2xl font-black text-blue-600 font-mono">100%</strong>
                  <span className="text-[11px] font-semibold text-slate-500">Notice Resolution</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <strong className="block text-2xl font-black text-amber-600 font-mono">3–5 Days</strong>
                  <span className="text-[11px] font-semibold text-slate-500">Turnaround Average</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Practice Areas Filter & Catalog */}
        <section className="pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Category Filter Pills */}
          <div className="flex items-center justify-start sm:justify-center gap-2.5 overflow-x-auto touch-scroll-x pb-4 mb-8 px-1 scroll-smooth no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer flex items-center gap-2 select-none active:scale-[0.98] min-h-[44px] ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span className="whitespace-nowrap">{cat.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono shrink-0 ${selectedCategory === cat.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {/* Results Summary if searched */}
          {searchQuery && (
            <div className="mb-6 text-xs text-slate-500 text-center font-medium">
              Showing <strong className="text-slate-800">{filteredServices.length}</strong> service results for &quot;<span className="text-blue-600">{searchQuery}</span>&quot;
            </div>
          )}

          {/* Services Grid */}
          <motion.div
            layout
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredServices.map((srv) => (
              <motion.div
                layout
                key={srv.id}
                variants={fadeUpVariants}
                whileHover={{ y: -4, transition: transitions.fast }}
                className="bg-white rounded-3xl border border-slate-200/90 hover:border-blue-400 p-6 sm:p-7 shadow-xs hover:shadow-xl transition-all flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  {/* Card Header Tags */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${srv.tagColor}`}>
                      {srv.tag}
                    </span>
                    {srv.statBadge && (
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                        {srv.statBadge}
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight leading-snug">
                      {srv.title}
                    </h2>
                    <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {srv.desc}
                    </p>
                  </div>

                  {/* Deliverables Checklist */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Scope &amp; Deliverables
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {srv.deliverables.map((deliv, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                          <span className="leading-tight">{deliv}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card Action Link */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    to={srv.href}
                    className="text-xs font-bold text-blue-600 group-hover:text-blue-700 flex items-center gap-1.5 transition-transform group-hover:translate-x-1"
                  >
                    <span>{srv.actionText}</span>
                  </Link>
                  <span className="text-slate-300 group-hover:text-blue-400 transition-colors text-sm">
                    ➔
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {!filteredServices.length && (
            <div className="py-16 text-center space-y-3">
              <span className="text-3xl block">🔍</span>
              <h3 className="text-base font-bold text-slate-800">No matching practice areas found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                We could not find any services matching &quot;{searchQuery}&quot;. Please try a different search keyword or explore all practice areas.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </section>

        {/* The GSTBro Managed Framework (4 Pillars) */}
        <section className="py-16 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                Managed Service Guarantee
              </span>
              <h2 className="mt-3 text-3xl font-black text-slate-900 tracking-tight">
                What Every GSTBro Client Receives
              </h2>
              <p className="mt-2 text-slate-600 text-sm">
                Every service engagement is supported by our institutional-grade infrastructure.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-lg">
                  👤
                </span>
                <strong className="text-sm font-bold text-slate-900 block">Dedicated CA Lead</strong>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Direct 1-on-1 access to your assigned indirect tax specialist. No anonymous ticketing queues or rotating call center staff.
                </p>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-lg">
                  🛡️
                </span>
                <strong className="text-sm font-bold text-slate-900 block">Zero-Penalty Shield</strong>
                <p className="text-xs text-slate-600 leading-relaxed">
                  We guarantee statutory on-time filing. In the rare event of a late submission caused by our team, we reimburse 100% of penalties.
                </p>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-lg">
                  📊
                </span>
                <strong className="text-sm font-bold text-slate-900 block">Dual Client Dashboard</strong>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tailored experience: Simple Mode (jargon-free sales &amp; tax saved) for business founders, or Tax Professional Mode for accounting teams.
                </p>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 font-bold flex items-center justify-center text-lg">
                  📁
                </span>
                <strong className="text-sm font-bold text-slate-900 block">Google Drive Cloud Vault</strong>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Private, 256-bit encrypted cloud vault storing your filed returns, challan proofs, and purchase registers for 6-year statutory audit readiness.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Corporate Engagement Tiers */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              Engagement Models
            </span>
            <h2 className="mt-3 text-3xl font-black text-slate-900 tracking-tight">
              Flexible Compliance Engagements
            </h2>
            <p className="mt-2 text-slate-600 text-sm">
              Select an engagement model tailored to your business structure and invoice volume.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="bg-white rounded-3xl p-7 border border-slate-200 shadow-xs flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full inline-block">
                  Proprietors &amp; LLPs
                </span>
                <h3 className="text-lg font-bold text-slate-900">Startup &amp; Growing Business</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Essential monthly filing and compliance protection for growing businesses with regular B2B or B2C turnover.
                </p>
                <ul className="text-xs text-slate-700 space-y-2 pt-2 border-t border-slate-100">
                  <li className="flex items-center gap-2">✓ Monthly GSTR-1 &amp; GSTR-3B filings</li>
                  <li className="flex items-center gap-2">✓ Rule 88A monthly purchase ITC reconciliation</li>
                  <li className="flex items-center gap-2">✓ Direct PMT-06 challan generation</li>
                  <li className="flex items-center gap-2">✓ Dedicated CA assigned</li>
                </ul>
              </div>
              <Link
                to="/pricing"
                className="w-full py-2.5 text-center bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
              >
                View Plans &amp; Pricing ➔
              </Link>
            </div>

            <div className="bg-white rounded-3xl p-7 border-2 border-blue-600 shadow-md flex flex-col justify-between space-y-5 relative">
              <span className="absolute -top-3 right-6 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
                Most Popular
              </span>
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-block">
                  Private Ltd &amp; Multi-State
                </span>
                <h3 className="text-lg font-bold text-slate-900">Enterprise Managed Retainer</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  High-volume automated reconciliation, vendor compliance follow-ups, and dedicated senior tax partner advisory.
                </p>
                <ul className="text-xs text-slate-700 space-y-2 pt-2 border-t border-slate-100">
                  <li className="flex items-center gap-2">✓ Multi-GSTIN consolidated filing &amp; ledgers</li>
                  <li className="flex items-center gap-2">✓ Continuous GSTR-2B vendor matching &amp; alerts</li>
                  <li className="flex items-center gap-2">✓ Reverse charge (RCM) audit &amp; compliance</li>
                  <li className="flex items-center gap-2">✓ Annual GSTR-9 / 9C statutory certification</li>
                  <li className="flex items-center gap-2">✓ Department notice defense included</li>
                </ul>
              </div>
              <Link
                to="/contact"
                className="w-full py-2.5 text-center bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                Request Enterprise Quote ➔
              </Link>
            </div>

            <div className="bg-white rounded-3xl p-7 border border-slate-200 shadow-xs flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full inline-block">
                  Ad-Hoc &amp; Legal
                </span>
                <h3 className="text-lg font-bold text-slate-900">Audits, Scrutiny &amp; Refunds</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Targeted engagements for export refunds, ASMT-10 notice defense, DRC-01 demand disputes, and annual true-ups.
                </p>
                <ul className="text-xs text-slate-700 space-y-2 pt-2 border-t border-slate-100">
                  <li className="flex items-center gap-2">✓ LUT Export &amp; Inverted Duty refunds (RFD-01)</li>
                  <li className="flex items-center gap-2">✓ ASMT-10 scrutiny notice legal reply drafting</li>
                  <li className="flex items-center gap-2">✓ Senior CA personal hearing representation</li>
                  <li className="flex items-center gap-2">✓ GSTIN voluntary cancellation / revocation</li>
                </ul>
              </div>
              <Link
                to="/contact"
                className="w-full py-2.5 text-center bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
              >
                Consult Legal Team ➔
              </Link>
            </div>
          </div>
        </section>

        {/* High-Impact Conversion CTA */}
        <section className="py-20 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <span className="px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
              Personalized Tax Consultation
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Unsure Which Practice Area Fits Your Business?
            </h2>
            <p className="text-blue-100 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
              Speak directly with an indirect tax specialist. We will audit your current filing status, review eligible Input Tax Credits, and recommend the optimal compliance setup.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-4">
              <Link
                to="/contact"
                className="px-8 py-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-base shadow-lg transition-all transform hover:-translate-y-0.5"
              >
                Schedule Free Consultation ➔
              </Link>
              <Link
                to="/how-it-works"
                className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl text-base transition-all"
              >
                See How It Works
              </Link>
            </div>
            <p className="text-xs text-blue-200">
              Zero obligation · 100% Confidential · Direct Chartered Accountant Review
            </p>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}

export default ServicesHubPage;
