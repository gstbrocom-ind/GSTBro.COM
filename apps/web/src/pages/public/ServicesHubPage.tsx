import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { PublicLayout } from '../../components/PublicLayout';
import { Breadcrumbs } from '../../components/seo/Breadcrumbs';
import { servicesMeta } from '../../seo/pages/services.meta';
import { useTheme } from '../../context/ThemeContext';
import { openStrategyCallModal } from '../../components/StrategyCallModal';
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

  const { isLight } = useTheme();

  return (
    <PublicLayout meta={servicesMeta}>
      <div className={`min-h-screen transition-colors duration-300 ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-white'}`}>
        {/* Breadcrumb Header */}
        <div className="max-w-7xl mx-auto px-4 pt-6 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: 'Practice Areas & Services', path: '/services' }]} />
        </div>

        {/* Hero Section */}
        <section className="relative overflow-hidden pt-8 pb-14 lg:pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                isLight ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-blue-950 border-blue-800 text-blue-400'
              }`}>
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                Comprehensive Indirect Tax &amp; Regulatory Infrastructure
              </span>

              <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                Institutional-Grade <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 bg-clip-text text-transparent">GST &amp; Tax Advisory</span>
              </h1>

              <p className={`text-base sm:text-lg leading-relaxed max-w-2xl mx-auto ${
                isLight ? 'text-slate-600' : 'text-slate-300'
              }`}>
                End-to-end indirect tax compliance, automated Rule 88A ITC reconciliation, expedited refunds, and senior CA scrutiny defense engineered for enterprises and SMEs across India.
              </p>

              {/* Search & Discovery Bar */}
              <div className="pt-4 max-w-xl mx-auto">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search practice areas (e.g. Return filing, Refunds, GSTR-1, Notice defense, FSSAI)..."
                    className={`w-full pl-10 pr-4 py-3 rounded-2xl text-xs sm:text-sm shadow-xs focus:ring-2 focus:ring-blue-500 outline-hidden transition border ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                        : 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500'
                    }`}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Key Trust Stats */}
              <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto">
                <div className={`p-3.5 rounded-xl border shadow-2xs ${
                  isLight ? 'bg-white border-slate-200/80 text-slate-900' : 'bg-slate-900/90 border-slate-800 text-white'
                }`}>
                  <strong className="block text-2xl font-black font-mono">99.9%</strong>
                  <span className={`text-[11px] font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>On-Time Filing SLA</span>
                </div>
                <div className={`p-3.5 rounded-xl border shadow-2xs ${
                  isLight ? 'bg-white border-slate-200/80' : 'bg-slate-900/90 border-slate-800'
                }`}>
                  <strong className="block text-2xl font-black text-emerald-500 font-mono">₹42 Cr+</strong>
                  <span className={`text-[11px] font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Capital Recovered</span>
                </div>
                <div className={`p-3.5 rounded-xl border shadow-2xs ${
                  isLight ? 'bg-white border-slate-200/80' : 'bg-slate-900/90 border-slate-800'
                }`}>
                  <strong className="block text-2xl font-black text-blue-500 font-mono">100%</strong>
                  <span className={`text-[11px] font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Notice Resolution</span>
                </div>
                <div className={`p-3.5 rounded-xl border shadow-2xs ${
                  isLight ? 'bg-white border-slate-200/80' : 'bg-slate-900/90 border-slate-800'
                }`}>
                  <strong className="block text-2xl font-black text-amber-500 font-mono">3–5 Days</strong>
                  <span className={`text-[11px] font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Turnaround Average</span>
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
                    : isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <span className="whitespace-nowrap">{cat.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-white/20 text-white'
                    : isLight
                    ? 'bg-slate-100 text-slate-500'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {/* Results Summary if searched */}
          {searchQuery && (
            <div className={`mb-6 text-xs text-center font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Showing <strong className={isLight ? 'text-slate-800' : 'text-white'}>{filteredServices.length}</strong> service results for &quot;<span className="text-blue-500">{searchQuery}</span>&quot;
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
                className={`rounded-3xl border p-6 sm:p-7 shadow-xs hover:shadow-xl transition-all flex flex-col justify-between group ${
                  isLight
                    ? 'bg-white border-slate-200/90 hover:border-blue-400'
                    : 'bg-slate-900/90 border-slate-800 hover:border-blue-500'
                }`}
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
                    <h2 className={`text-lg font-bold transition-colors tracking-tight leading-snug ${
                      isLight ? 'text-slate-900 group-hover:text-blue-600' : 'text-white group-hover:text-blue-400'
                    }`}>
                      {srv.title}
                    </h2>
                    <p className={`mt-2 text-xs sm:text-sm leading-relaxed ${
                      isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                      {srv.desc}
                    </p>
                  </div>

                  {/* Deliverables Checklist */}
                  <div className={`pt-2 border-t space-y-2 ${isLight ? 'border-slate-100' : 'border-slate-800'}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                      isLight ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      Scope &amp; Deliverables
                    </span>
                    <ul className={`space-y-1.5 text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      {srv.deliverables.map((deliv, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                          <span className="leading-tight">{deliv}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card Action Link */}
                <div className={`mt-6 pt-4 border-t flex items-center justify-between ${
                  isLight ? 'border-slate-100' : 'border-slate-800'
                }`}>
                  <Link
                    to={srv.href}
                    className={`text-xs font-bold flex items-center gap-1.5 transition-transform group-hover:translate-x-1 ${
                      isLight ? 'text-blue-600 group-hover:text-blue-700' : 'text-blue-400 group-hover:text-blue-300'
                    }`}
                  >
                    <span>{srv.actionText}</span>
                  </Link>
                  <span className={`transition-colors text-sm ${
                    isLight ? 'text-slate-300 group-hover:text-blue-600' : 'text-slate-600 group-hover:text-blue-400'
                  }`}>
                    ➔
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {!filteredServices.length && (
            <div className="py-16 text-center space-y-3">
              <svg className="w-10 h-10 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className={`text-base font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>No matching practice areas found</h3>
              <p className={`text-xs max-w-md mx-auto ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                We could not find any services matching &quot;{searchQuery}&quot;. Please try a different search keyword or explore all practice areas.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </section>

        {/* The GSTBro Managed Framework (4 Pillars) */}
        <section className={`py-16 border-y transition-colors ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-slate-800'
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                isLight ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-blue-400 bg-blue-950 border-blue-800'
              }`}>
                Managed Service Guarantee
              </span>
              <h2 className={`mt-3 text-3xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                What Every GSTBro Client Receives
              </h2>
              <p className={`mt-2 text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Every service engagement is supported by our institutional-grade infrastructure.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
              <div className={`p-6 rounded-2xl border space-y-3 ${
                isLight ? 'bg-slate-50 border-slate-200/80' : 'bg-slate-900/80 border-slate-800'
              }`}>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 font-bold flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <strong className={`text-sm font-bold block ${isLight ? 'text-slate-900' : 'text-white'}`}>Dedicated CA Lead</strong>
                <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Direct 1-on-1 access to your assigned indirect tax specialist. No anonymous ticketing queues or rotating call center staff.
                </p>
              </div>

              <div className={`p-6 rounded-2xl border space-y-3 ${
                isLight ? 'bg-slate-50 border-slate-200/80' : 'bg-slate-900/80 border-slate-800'
              }`}>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <strong className={`text-sm font-bold block ${isLight ? 'text-slate-900' : 'text-white'}`}>Zero-Penalty Shield</strong>
                <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  We guarantee statutory on-time filing. In the rare event of a late submission caused by our team, we reimburse 100% of penalties.
                </p>
              </div>

              <div className={`p-6 rounded-2xl border space-y-3 ${
                isLight ? 'bg-slate-50 border-slate-200/80' : 'bg-slate-900/80 border-slate-800'
              }`}>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <strong className={`text-sm font-bold block ${isLight ? 'text-slate-900' : 'text-white'}`}>Dual Client Dashboard</strong>
                <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Tailored experience: Simple Mode (jargon-free sales &amp; tax saved) for business founders, or Tax Professional Mode for accounting teams.
                </p>
              </div>

              <div className={`p-6 rounded-2xl border space-y-3 ${
                isLight ? 'bg-slate-50 border-slate-200/80' : 'bg-slate-900/80 border-slate-800'
              }`}>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500 font-bold flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <strong className={`text-sm font-bold block ${isLight ? 'text-slate-900' : 'text-white'}`}>Google Drive Cloud Vault</strong>
                <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Private, 256-bit encrypted cloud vault storing your filed returns, challan proofs, and purchase registers for 6-year statutory audit readiness.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Corporate Engagement Tiers */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
              isLight ? 'text-indigo-700 bg-indigo-50 border-indigo-200' : 'text-indigo-400 bg-indigo-950 border-indigo-800'
            }`}>
              Engagement Models
            </span>
            <h2 className={`mt-3 text-3xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Flexible Compliance Engagements
            </h2>
            <p className={`mt-2 text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Select an engagement model tailored to your business structure and invoice volume.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className={`rounded-3xl p-7 border shadow-xs flex flex-col justify-between space-y-5 ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
            }`}>
              <div className="space-y-3">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-block border ${
                  isLight ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-blue-300 bg-blue-950 border-blue-800'
                }`}>
                  Proprietors &amp; LLPs
                </span>
                <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Startup &amp; Growing Business</h3>
                <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Essential monthly filing and compliance protection for growing businesses with regular B2B or B2C turnover.
                </p>
                <ul className={`text-xs space-y-2 pt-2 border-t ${
                  isLight ? 'text-slate-700 border-slate-100' : 'text-slate-300 border-slate-800'
                }`}>
                  <li className="flex items-center gap-2">✓ Monthly GSTR-1 &amp; GSTR-3B filings</li>
                  <li className="flex items-center gap-2">✓ Rule 88A monthly purchase ITC reconciliation</li>
                  <li className="flex items-center gap-2">✓ Direct PMT-06 challan generation</li>
                  <li className="flex items-center gap-2">✓ Dedicated CA assigned</li>
                </ul>
              </div>
              <Link
                to="/pricing"
                className={`w-full py-2.5 text-center rounded-xl text-xs font-bold transition ${
                  isLight ? 'bg-slate-900 hover:bg-slate-800 text-white' : 'bg-white hover:bg-slate-100 text-slate-900'
                }`}
              >
                View Plans &amp; Pricing ➔
              </Link>
            </div>

            <div className={`rounded-3xl p-7 border-2 border-blue-600 shadow-md flex flex-col justify-between space-y-5 relative ${
              isLight ? 'bg-white' : 'bg-slate-900'
            }`}>
              <span className="absolute -top-3 right-6 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
                Most Popular
              </span>
              <div className="space-y-3">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-block border ${
                  isLight ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : 'text-emerald-300 bg-emerald-950 border-emerald-800'
                }`}>
                  Private Ltd &amp; Multi-State
                </span>
                <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Enterprise Managed Retainer</h3>
                <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  High-volume automated reconciliation, vendor compliance follow-ups, and dedicated senior tax partner advisory.
                </p>
                <ul className={`text-xs space-y-2 pt-2 border-t ${
                  isLight ? 'text-slate-700 border-slate-100' : 'text-slate-300 border-slate-800'
                }`}>
                  <li className="flex items-center gap-2">✓ Multi-GSTIN consolidated filing &amp; ledgers</li>
                  <li className="flex items-center gap-2">✓ Continuous GSTR-2B vendor matching &amp; alerts</li>
                  <li className="flex items-center gap-2">✓ Reverse charge (RCM) audit &amp; compliance</li>
                  <li className="flex items-center gap-2">✓ Annual GSTR-9 / 9C statutory certification</li>
                  <li className="flex items-center gap-2">✓ Department notice defense included</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => openStrategyCallModal({ topic: 'Enterprise Managed Retainer' })}
                className="w-full py-2.5 text-center bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Request Enterprise Quote ➔
              </button>
            </div>

            <div className={`rounded-3xl p-7 border shadow-xs flex flex-col justify-between space-y-5 ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
            }`}>
              <div className="space-y-3">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-block border ${
                  isLight ? 'text-purple-700 bg-purple-50 border-blue-200' : 'text-purple-300 bg-purple-950 border-purple-800'
                }`}>
                  Ad-Hoc &amp; Legal
                </span>
                <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Audits, Scrutiny &amp; Refunds</h3>
                <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Targeted engagements for export refunds, ASMT-10 notice defense, DRC-01 demand disputes, and annual true-ups.
                </p>
                <ul className={`text-xs space-y-2 pt-2 border-t ${
                  isLight ? 'text-slate-700 border-slate-100' : 'text-slate-300 border-slate-800'
                }`}>
                  <li className="flex items-center gap-2">✓ LUT Export &amp; Inverted Duty refunds (RFD-01)</li>
                  <li className="flex items-center gap-2">✓ ASMT-10 scrutiny notice legal reply drafting</li>
                  <li className="flex items-center gap-2">✓ Senior CA personal hearing representation</li>
                  <li className="flex items-center gap-2">✓ GSTIN voluntary cancellation / revocation</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => openStrategyCallModal({ topic: 'Legal & Scrutiny Consultation' })}
                className={`w-full py-2.5 text-center rounded-xl text-xs font-bold transition cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                Consult Legal Team ➔
              </button>
            </div>
          </div>
        </section>

        {/* High-Impact Conversion CTA */}
        <section className={`py-20 text-center transition-colors ${
          isLight
            ? 'bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white'
            : 'bg-slate-900 border-t border-slate-800 text-white'
        }`}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <span className="px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
              Personalized Tax Consultation
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
              Unsure Which Practice Area Fits Your Business?
            </h2>
            <p className="text-blue-100 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
              Speak directly with an indirect tax specialist. We will audit your current filing status, review eligible Input Tax Credits, and recommend the optimal compliance setup.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-4">
              <button
                type="button"
                onClick={() => openStrategyCallModal({ topic: 'Services Hub Inquiry' })}
                className="px-8 py-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-base shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                Schedule Free Consultation ➔
              </button>
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
