import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '../../components/PublicLayout';
import { Breadcrumbs } from '../../components/seo/Breadcrumbs';
import { howItWorksMeta } from '../../seo/pages/services.meta';
import { useContent } from '../../context/ContentContext';

export function HowItWorksPage() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const headerData = useContent('content_how_it_works_header', {
    badge: 'End-to-End Managed Indirect Tax Platform',
    title: 'How GSTBro Works',
    subtitle:
      'From raw sales invoices to verified government filings in 5 seamless steps. Experience zero-stress compliance powered by dedicated indirect tax specialists and automated cloud technology.',
  });

  const steps = [
    {
      id: 1,
      number: '01',
      title: 'Effortless Onboarding & Team Assignment',
      badge: 'Step 1 · 2 Minutes',
      headline: 'Register Your GSTIN & Meet Your Dedicated Tax Specialist',
      desc: 'Get started simply by providing your 15-digit GSTIN and legal business credentials. Our system instantly verifies your jurisdiction on the official GST Common Portal.',
      features: [
        'Dedicated Chartered Accountant and Indirect Tax Specialist assigned exclusively to your account',
        'Private Google Drive Cloud Vault provisioned automatically for seamless file management',
        'Direct 1-on-1 team chat and phone support for quick answers to complex queries',
        'Automatic profile extraction ensuring 100% legal name and trade name precision',
      ],
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
      highlight: 'Dedicated CA assigned within 2 hours of registration',
    },
    {
      id: 2,
      number: '02',
      title: 'Document & Register Sync',
      badge: 'Step 2 · Monthly Upload',
      headline: 'Upload Invoices Seamlessly or Sync to Your Cloud Vault',
      desc: 'Share your monthly sales bills, purchase registers, expense invoices, and bank statements without manual paperwork or format conversion headaches.',
      features: [
        'Universal format support: Excel (.xlsx), CSV, Tally XML, Busy, Marg, Zoho Books, PDF, and scans',
        'Automated file naming convention categorized cleanly by Financial Year and Tax Period',
        'Direct Google Drive integration allowing team and client to access files anytime from any device',
        'Zero file size restrictions with bank-grade 256-bit AES encryption at rest and in transit',
      ],
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      ),
      highlight: 'Drag-and-drop web portal or direct Google Drive sync',
    },
    {
      id: 3,
      number: '03',
      title: 'Multi-Tier Audit & ITC Reconciliation',
      badge: 'Step 3 · Expert Audit',
      headline: 'Statutory Verification, Rule 88A Matching & RCM Assessment',
      desc: 'Our tax experts perform exhaustive statutory checks on every line item, classifying supplies under the correct GSTR-1 tables and maximizing your Input Tax Credit.',
      features: [
        'Granular Form GSTR-1 classification: Table 4 (B2B), Table 5 (B2C Large), Table 7 (B2CS), Table 12 (HSN Summary), Table 13 (Documents)',
        'Algorithmic Input Tax Credit (ITC) reconciliation matching inward purchases against Form GSTR-2B',
        'Reverse Charge Mechanism (RCM) audit under Sec 9(3) and 9(4) for GTA transport, rent, and legal fees',
        'Dedicated purchases turnover vetting entered and verified by your team to guarantee accurate books',
      ],
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      highlight: 'Rule 88A algorithmic ITC recovery saves thousands in cash outflow',
    },
    {
      id: 4,
      number: '04',
      title: 'Draft Review & Single-Click Approval',
      badge: 'Step 4 · Complete Transparency',
      headline: 'Review Your Exact Tax Computation Before Portal Submission',
      desc: 'No black-box filings or unexpected tax surprises. You receive an executive summary detailing your exact sales turnover, output tax, ITC discount saved, and bank challan.',
      features: [
        'Crystal-clear summary: Total Taxable Turnover, Total GST Collected, ITC Offset, and Net Cash to Pay',
        'Pre-generated Form GST PMT-06 challan with direct bank payment links (Net Banking, NEFT/RTGS, UPI)',
        'Choose your viewing preference: Simple Non-GST plain language or Full Statutory Tax Professional format',
        'Approval workflow ensuring no return is filed on gst.gov.in without your verified consent',
      ],
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      highlight: 'Complete liability transparency with zero surprise notices',
    },
    {
      id: 5,
      number: '05',
      title: 'Portal Filing & Verified ARN Delivery',
      badge: 'Step 5 · Guaranteed On-Time',
      headline: 'Official Government Submission, Instant ARN & Electronic Ledger Update',
      desc: 'Your assigned tax team submits the returns directly on the GST Common Portal before statutory deadlines, providing verified confirmation codes and permanent receipts.',
      features: [
        'Official filing of Form GSTR-1 (Outward Supplies) and Form GSTR-3B (Summary Return & Tax Settlement)',
        'Immediate delivery of government Acknowledgement Reference Numbers (ARNs) for audit verification',
        'Electronic Credit Ledger (Form GST PMT-02 compliant) automatically rolls closing balances into subsequent months',
        'Permanent archival of official government return PDFs and filing receipts in your client vault',
      ],
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ),
      highlight: '100% on-time filing backed by our late-fee protection guarantee',
    },
  ];

  const faqs = [
    {
      q: 'What documents do I need to provide each month?',
      a: 'You simply need to share your monthly sales invoices (or sales summary register), purchase bills, and any commercial expenses (such as rent, freight, or professional fees). You can upload them in Excel, PDF, CSV, or directly sync them to your private Google Drive file vault.',
    },
    {
      q: 'How do I pay my GST liability if tax is due?',
      a: 'Our team generates the official Form GST PMT-06 tax challan with the exact split of CGST, SGST, IGST, and Cess after offsetting all eligible Input Tax Credits (ITC). You can pay directly online using Net Banking, UPI, or NEFT/RTGS through the GST portal. We confirm and link your payment receipt immediately.',
    },
    {
      q: 'How do I know my returns are actually filed on the government portal?',
      a: 'Every filed return generates an official 14-to-18-digit Acknowledgement Reference Number (ARN) issued by gst.gov.in. This ARN, the filing timestamp, and the government-sealed PDF return are immediately displayed on your dashboard and stored in your vault. You can verify the ARN anytime on the official GST portal.',
    },
    {
      q: 'Can I view detailed Form GSTR-1 table breakdowns (Table 4 B2B, Table 7 B2CS, Table 12 HSN)?',
      a: 'Yes! Both in Simple Mode and Tax Professional Mode, clicking on any filed return allows you to open the full Form GSTR-1 Breakdown Modal. It displays Table 4 (B2B Regular & Reverse Charge), Table 5 (B2C Large), Table 6 (Exports & SEZ), Table 7 (B2CS Retail), Table 8 (Exempted), Tables 9-10 (Amendments & Credit Notes), Table 12 (HSN Summary), and Table 13 (Documents Issued).',
    },
    {
      q: 'What is the difference between Simple Mode and Tax Professional Mode?',
      a: 'Simple Mode is built for business owners who want zero accounting jargon—it translates figures into plain language: Sales Billed, Tax Collected, Purchase Tax Saved, and Bank Challan Paid. Tax Professional Mode is designed for CAs and in-house accountants who require full statutory tables, HSN analysis, and the PMT-02 Electronic Credit Ledger.',
    },
    {
      q: 'What happens if I have pending backlogs or unfiled returns from previous months?',
      a: 'Our team specializes in backlog clearance and tax regularizations. We audit your historical sales and purchase registers, compute cumulative tax liabilities, optimize unclaimed ITCs within statutory time limits (Section 16(4)), calculate exact Section 50 interest, and bring your account up to date.',
    },
    {
      q: 'Is my business and financial data secure?',
      a: 'Absolutely. We enforce bank-grade 256-bit SSL/TLS encryption for all data transmissions, secure cloud storage with strict role-based access control, and dedicated Google Drive file vaults. We sign a strict Non-Disclosure Agreement (NDA) with every client.',
    },
  ];

  return (
    <PublicLayout meta={howItWorksMeta}>
      <div className="bg-slate-50 min-h-screen">
        {/* Breadcrumb Navigation */}
        <div className="max-w-7xl mx-auto px-4 pt-6 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: 'How It Works', path: '/how-it-works' }]} />
        </div>

        {/* Hero Section */}
        <section className="relative overflow-hidden pt-8 pb-16 lg:pb-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                {headerData.badge}
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                {headerData.title}
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 leading-relaxed">
                {headerData.subtitle}
              </p>

              <div className="pt-2 flex flex-wrap justify-center gap-3">
                <Link
                  to="/signup"
                  className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                >
                  Get Started in 2 Minutes ➔
                </Link>
                <Link
                  to="/services"
                  className="px-6 py-3.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-bold text-sm shadow-xs transition-all"
                >
                  Explore Compliance Services
                </Link>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs text-center">
                <strong className="block text-3xl font-black text-slate-900 font-mono">100%</strong>
                <span className="text-xs font-semibold text-slate-500 mt-1 block">On-Time Filing Guarantee</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs text-center">
                <strong className="block text-3xl font-black text-emerald-600 font-mono">₹42 Cr+</strong>
                <span className="text-xs font-semibold text-slate-500 mt-1 block">ITC Reconciled &amp; Saved</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs text-center">
                <strong className="block text-3xl font-black text-blue-600 font-mono">5,000+</strong>
                <span className="text-xs font-semibold text-slate-500 mt-1 block">Active Business GSTINs</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs text-center">
                <strong className="block text-3xl font-black text-amber-600 font-mono">₹0</strong>
                <span className="text-xs font-semibold text-slate-500 mt-1 block">Late-Fee Risk Protection</span>
              </div>
            </div>
          </div>
        </section>

        {/* 5-Step Process Interactive Showcase */}
        <section className="py-16 bg-white border-y border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                The 5-Stage Lifecycle
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Simple, Transparent, and Audit-Ready
              </h2>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">
                Click on any step below to explore how our team and technology handle your indirect tax filings from start to finish.
              </p>
            </div>

            {/* Step Selection Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-w-5xl mx-auto mb-8">
              {steps.map((step) => {
                const isActive = activeStep === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setActiveStep(step.id)}
                    className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md transform -translate-y-0.5'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className={`block text-xs font-mono font-bold ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                      {step.number}
                    </span>
                    <strong className="block text-xs font-bold mt-1 line-clamp-1">
                      {step.title}
                    </strong>
                  </button>
                );
              })}
            </div>

            {/* Active Step Feature Display */}
            {(() => {
              const current = steps.find((s) => s.id === activeStep) || steps[0];
              return (
                <div className="max-w-5xl mx-auto bg-gradient-to-br from-slate-50 via-white to-blue-50/40 rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-lg">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    {/* Left Column: Details */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/80 text-blue-900 text-xs font-bold">
                        {current.badge}
                      </div>

                      <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                        {current.headline}
                      </h3>

                      <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                        {current.desc}
                      </p>

                      <div className="pt-2 space-y-2.5">
                        {current.features.map((feat, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                              ✓
                            </span>
                            <span className="text-xs sm:text-sm text-slate-700 font-medium">
                              {feat}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-4 border-t border-slate-200 flex items-center gap-2 text-xs font-bold text-blue-700">
                        <span>✨ Highlight:</span>
                        <span className="text-slate-800">{current.highlight}</span>
                      </div>
                    </div>

                    {/* Right Column: Visual Preview Card */}
                    <div className="lg:col-span-5">
                      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-md space-y-4 relative overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shadow-2xs">
                              {current.icon}
                            </div>
                            <div>
                              <strong className="text-sm font-bold text-slate-900 block">
                                Stage {current.number} Output
                              </strong>
                              <span className="text-[11px] text-slate-400 font-mono">
                                System Status: VERIFIED
                              </span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                            Active Sync
                          </span>
                        </div>

                        {current.id === 1 && (
                          <div className="space-y-2.5 text-xs">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-[10px] font-bold uppercase text-slate-400 block">Assigned CA Lead</span>
                              <strong className="text-sm font-bold text-slate-900 block mt-0.5">Charan Teja &amp; Team</strong>
                              <small className="text-slate-500 text-[11px]">Senior Indirect Tax Specialist</small>
                            </div>
                            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between">
                              <div>
                                <span className="font-semibold text-slate-800 block text-xs">Google Drive Vault</span>
                                <span className="text-[10px] text-slate-500">drive.google.com/gstbro-vault</span>
                              </div>
                              <span className="px-2 py-1 bg-white rounded border border-blue-200 text-blue-700 font-bold text-[10px]">
                                Connected
                              </span>
                            </div>
                          </div>
                        )}

                        {current.id === 2 && (
                          <div className="space-y-2.5 text-xs">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                              <div>
                                <span className="font-bold text-slate-800 block">Sales_Register_July.xlsx</span>
                                <small className="text-slate-400">142 Invoices · Verified</small>
                              </div>
                              <span className="text-emerald-700 font-bold">100% Parsed</span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                              <div>
                                <span className="font-bold text-slate-800 block">Purchase_Bills_July.pdf</span>
                                <small className="text-slate-400">88 Inward Vouchers · Matched</small>
                              </div>
                              <span className="text-blue-700 font-bold">Auto-Renamed</span>
                            </div>
                          </div>
                        )}

                        {current.id === 3 && (
                          <div className="space-y-2 text-xs">
                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                              <span className="text-slate-600 font-medium">Table 4 (B2B Regular)</span>
                              <strong className="font-mono text-slate-900">₹1,85,000</strong>
                            </div>
                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                              <span className="text-slate-600 font-medium">Table 7 (B2C Retail)</span>
                              <strong className="font-mono text-slate-900">₹50,000</strong>
                            </div>
                            <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-100 flex justify-between items-center text-emerald-800">
                              <span className="font-bold">Rule 88A ITC Eligible</span>
                              <strong className="font-mono font-bold">₹28,450</strong>
                            </div>
                          </div>
                        )}

                        {current.id === 4 && (
                          <div className="space-y-2 text-xs">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Billed Sales</span>
                                <strong className="font-mono font-bold text-slate-900 text-sm">₹2,35,000</strong>
                              </div>
                              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Output GST</span>
                                <strong className="font-mono font-bold text-amber-600 text-sm">₹11,750</strong>
                              </div>
                            </div>
                            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between">
                              <div>
                                <span className="font-bold text-blue-900 block text-xs">Challan PMT-06 (Bank)</span>
                                <small className="text-blue-700">Net after ITC offset</small>
                              </div>
                              <strong className="text-base font-bold text-blue-700 font-mono">₹0.00</strong>
                            </div>
                          </div>
                        )}

                        {current.id === 5 && (
                          <div className="space-y-2.5 text-xs">
                            <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">✓</span>
                                <strong className="text-emerald-900 font-bold">GSTR-3B &amp; GSTR-1 Filed</strong>
                              </div>
                              <code className="block mt-2 font-mono font-bold text-blue-800 bg-white px-2 py-1 rounded border border-emerald-200 text-xs">
                                ARN: AA3607260018942
                              </code>
                              <small className="text-emerald-700 text-[10px] block mt-1">Verified on GST Common Portal</small>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                          <span className="text-[11px] text-slate-400">Step {current.id} of 5</span>
                          <button
                            type="button"
                            onClick={() => setActiveStep((prev) => (prev % 5) + 1)}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition flex items-center gap-1 cursor-pointer"
                          >
                            Next Step ➔
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </section>

        {/* Dual Dashboard Experience Highlight */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              Personalized Experience
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Built for Every Business Persona
            </h2>
            <p className="mt-3 text-slate-600 text-sm sm:text-base">
              Whether you are a busy founder who wants clear English summaries or an in-house accountant who needs complete statutory tables, GSTBro adapts to you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Simple Mode Card */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-5">
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-xl">
                  👤
                </span>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Simple Mode</h3>
                  <p className="text-xs text-slate-500">For Founders, Directors &amp; Non-GST Business Owners</p>
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                Zero complex jargon. View your monthly tax health with four straightforward indicators designed for rapid executive understanding.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Sales Billed</span>
                  <strong className="text-sm font-bold text-slate-900 font-mono mt-0.5 block">Customer Sales</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Tax Collected</span>
                  <strong className="text-sm font-bold text-amber-600 font-mono mt-0.5 block">Govt Liability</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Purchase Tax Saved</span>
                  <strong className="text-sm font-bold text-emerald-600 font-mono mt-0.5 block">ITC Discount</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Bank Payment</span>
                  <strong className="text-sm font-bold text-blue-600 font-mono mt-0.5 block">Challan PMT-06</strong>
                </div>
              </div>

              <ul className="text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">✓ One-click copyable government ARN codes</li>
                <li className="flex items-center gap-2">✓ Download official filing proofs for bank loans</li>
                <li className="flex items-center gap-2">✓ Clutter-free monthly compliance timeline</li>
              </ul>
            </div>

            {/* Tax Professional Mode Card */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-5">
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-900 font-bold flex items-center justify-center text-xl">
                  🏢
                </span>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Tax Professional Mode</h3>
                  <p className="text-xs text-slate-500">For CAs, In-House Accountants &amp; Financial Controllers</p>
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                Complete statutory depth. Access every official schedule, table-level reconciliation, and electronic ledger balances aligned with the CGST Act.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Form GSTR-1</span>
                  <strong className="text-sm font-bold text-slate-900 font-mono mt-0.5 block">Tables 4–15 &amp; HSN</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Form GSTR-3B</span>
                  <strong className="text-sm font-bold text-slate-900 font-mono mt-0.5 block">Table 3.1 &amp; RCM</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Table 4 ITC</span>
                  <strong className="text-sm font-bold text-emerald-600 font-mono mt-0.5 block">All Other &amp; RCM</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Credit Ledger</span>
                  <strong className="text-sm font-bold text-blue-600 font-mono mt-0.5 block">Rule 88A Rolling PMT-02</strong>
                </div>
              </div>

              <ul className="text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">✓ Full interactive modal for GSTR-1 (Table 4 through 15)</li>
                <li className="flex items-center gap-2">✓ Reverse Charge (RCM) Sec 9(3)/9(4) asset/liability matching</li>
                <li className="flex items-center gap-2">✓ Multi-period ITC statement with rolling carry-forward</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Automated Compliance Calendar Feature */}
        <section className="py-16 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-6 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-900/60 px-3 py-1 rounded-full border border-blue-700/60">
                  Statutory Calendar Engine
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                  Automated Deadlines Generated on the 1st of Every Month
                </h2>
                <p className="text-blue-100/80 text-sm sm:text-base leading-relaxed">
                  Never risk late fees, interest under Section 50, or e-way bill blocking. GSTBro automatically schedules every statutory obligation specific to your business entity.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="p-4 rounded-xl bg-white/10 border border-white/10 backdrop-blur-xs flex items-center justify-between">
                    <div>
                      <strong className="text-sm text-white block">Form GSTR-1 (Monthly Outward Supplies)</strong>
                      <span className="text-xs text-blue-200">Due on the 11th of every month</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                      Auto-Scheduled
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-white/10 border border-white/10 backdrop-blur-xs flex items-center justify-between">
                    <div>
                      <strong className="text-sm text-white block">Form GSTR-3B (Summary Return &amp; Tax Settlement)</strong>
                      <span className="text-xs text-blue-200">Due on the 20th of every month</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">
                      Auto-Scheduled
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-white/10 border border-white/10 backdrop-blur-xs flex items-center justify-between">
                    <div>
                      <strong className="text-sm text-white block">GST TDS &amp; TCS (GSTR-7 &amp; GSTR-8)</strong>
                      <span className="text-xs text-blue-200">Due on the 10th of every month</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
                      Auto-Scheduled
                    </span>
                  </div>
                </div>

                <p className="text-xs text-blue-300/80 pt-2">
                  ✓ When filed, tasks are automatically marked as done and cleanly archived, keeping your dashboard distraction-free.
                </p>
              </div>

              <div className="lg:col-span-6">
                <div className="bg-white/5 border border-white/15 rounded-3xl p-6 sm:p-8 backdrop-blur-md space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>📅</span> Complete Statutory Coverage
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                      <span className="font-bold text-amber-300 block">Income Tax TDS (Challan 281)</span>
                      <span className="text-slate-300 text-[11px]">7th of each month</span>
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                      <span className="font-bold text-indigo-300 block">QRMP IFF Supplies</span>
                      <span className="text-slate-300 text-[11px]">13th of each quarter month</span>
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                      <span className="font-bold text-emerald-300 block">TDS Quarterly Returns (26Q/24Q)</span>
                      <span className="text-slate-300 text-[11px]">31st of month following quarter</span>
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                      <span className="font-bold text-purple-300 block">Annual Audit (GSTR-9 &amp; 9C)</span>
                      <span className="text-slate-300 text-[11px]">31st December statutory due date</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-600/20 border border-blue-500/30 text-xs text-blue-100 space-y-1">
                    <strong className="text-white block font-bold">Personalized Requirement Filters:</strong>
                    <span>Your assigned team customizes calendar requirements based on your registration status (Regular, Composition, Exporter, E-commerce).</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Matrix: Why GSTBro Wins */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              Platform Comparison
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Why Businesses Switch to GSTBro
            </h2>
            <p className="mt-3 text-slate-600 text-sm sm:text-base">
              See how our fully managed platform compares to traditional neighborhood tax agents and generic DIY accounting software.
            </p>
          </div>

          <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                  <tr>
                    <th className="py-4 px-5">Compliance Feature</th>
                    <th className="py-4 px-4 text-slate-500">Traditional Local Agent</th>
                    <th className="py-4 px-4 text-slate-500">Generic DIY Software</th>
                    <th className="py-4 px-5 bg-blue-50/60 text-blue-900 font-black">GSTBro Managed Platform</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3.5 px-5 font-semibold text-slate-800">Dedicated Tax Specialist / CA</td>
                    <td className="py-3.5 px-4 text-slate-500">❌ Random junior staff</td>
                    <td className="py-3.5 px-4 text-slate-500">❌ No human expert</td>
                    <td className="py-3.5 px-5 bg-blue-50/30 text-emerald-700 font-bold">✓ Dedicated Specialist Assigned</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-5 font-semibold text-slate-800">Actual Portal Filing (gst.gov.in)</td>
                    <td className="py-3.5 px-4 text-slate-500">⚠️ Often rushed / delayed</td>
                    <td className="py-3.5 px-4 text-slate-500">❌ You must file yourself</td>
                    <td className="py-3.5 px-5 bg-blue-50/30 text-emerald-700 font-bold">✓ 100% Handled by GSTBro Team</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-5 font-semibold text-slate-800">Dual Experience (Simple &amp; Pro)</td>
                    <td className="py-3.5 px-4 text-slate-500">❌ Confusing paper prints</td>
                    <td className="py-3.5 px-4 text-slate-500">❌ Overly complex UI</td>
                    <td className="py-3.5 px-5 bg-blue-50/30 text-emerald-700 font-bold">✓ Tailored for Non-GST &amp; CAs</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-5 font-semibold text-slate-800">Rule 88A Rolling ITC Ledger</td>
                    <td className="py-3.5 px-4 text-slate-500">❌ Manual Excel errors</td>
                    <td className="py-3.5 px-4 text-slate-500">⚠️ Basic static summary</td>
                    <td className="py-3.5 px-5 bg-blue-50/30 text-emerald-700 font-bold">✓ Automated PMT-02 Ledger Engine</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-5 font-semibold text-slate-800">Secure Cloud File Vault</td>
                    <td className="py-3.5 px-4 text-slate-500">❌ Lost on WhatsApp/Email</td>
                    <td className="py-3.5 px-4 text-slate-500">⚠️ Export limitations</td>
                    <td className="py-3.5 px-5 bg-blue-50/30 text-emerald-700 font-bold">✓ Dedicated Google Drive Vault</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-5 font-semibold text-slate-800">Form GSTR-1 Tables 4–15 Drilldown</td>
                    <td className="py-3.5 px-4 text-slate-500">❌ Opaque single totals</td>
                    <td className="py-3.5 px-4 text-slate-500">⚠️ Requires manual export</td>
                    <td className="py-3.5 px-5 bg-blue-50/30 text-emerald-700 font-bold">✓ Interactive Modal Breakdown</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-5 font-semibold text-slate-800">Late-Fee Reimbursement Guarantee</td>
                    <td className="py-3.5 px-4 text-slate-500">❌ Client pays penalties</td>
                    <td className="py-3.5 px-4 text-slate-500">❌ Disclaimed in fine print</td>
                    <td className="py-3.5 px-5 bg-blue-50/30 text-emerald-700 font-bold">✓ Zero-Penalty Guarantee</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Interactive FAQ Section */}
        <section className="py-16 bg-white border-t border-slate-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                Got Questions?
              </span>
              <h2 className="mt-3 text-3xl font-black text-slate-900 tracking-tight">
                Frequently Asked Questions
              </h2>
              <p className="mt-2 text-slate-600 text-sm">
                Everything you need to know about the filing process, ARNs, security, and payments.
              </p>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div
                    key={index}
                    className="border border-slate-200 rounded-2xl overflow-hidden transition-all duration-200"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="w-full text-left p-5 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between gap-4 font-bold text-sm text-slate-900 cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      <span className={`text-slate-400 text-lg transition-transform ${isOpen ? 'rotate-180 text-blue-600' : ''}`}>
                        ▼
                      </span>
                    </button>
                    {isOpen && (
                      <div className="p-5 bg-white text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* High-Impact CTA Section */}
        <section className="py-20 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <span className="px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
              Take the Stress Out of Tax Compliance
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Ready to Put Your GST Filings on Autopilot?
            </h2>
            <p className="text-blue-100 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
              Join thousands of businesses who trust GSTBro for guaranteed on-time filings, maximized ITC returns, and zero statutory headaches.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-4">
              <Link
                to="/signup"
                className="px-8 py-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-base shadow-lg transition-all transform hover:-translate-y-0.5"
              >
                Start Free Onboarding ➔
              </Link>
              <Link
                to="/contact"
                className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl text-base transition-all"
              >
                Talk to a GST Expert
              </Link>
            </div>
            <p className="text-xs text-blue-200">
              No credit card required · Instant setup in under 2 minutes · 100% Confidential
            </p>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}

export default HowItWorksPage;
