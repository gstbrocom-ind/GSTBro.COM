import { useEffect, useState, useMemo } from 'react';
import { api } from '../lib/api';

const getLiveWebUrl = (path: string = '') => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) {
      return `http://localhost:5173${cleanPath}`;
    }
    return `${window.location.origin}${cleanPath}`;
  }
  return cleanPath;
};

// Default content structures for fallback & editing
const defaultContentTemplates: Record<string, any> = {
  // Pricing Header & Plans
  content_pricing_header: {
    badge: 'Institutional Indirect Tax Infrastructure • ICAI Standard Supervision',
    title: 'Invest in Working Capital Defense. Not Cheap Shortcuts.',
    subtitle:
      'Cheap mechanical return filing costs Indian businesses an average of 8% to 15% in lost Input Tax Credit and triggers crippling ASMT-10 scrutiny penalties. GSTBro delivers complete Indirect Tax Infrastructure backed by certified Chartered Accountants and contractual zero-penalty SLAs.',
  },
  content_pricing_plans: [
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
  ],
  content_pricing_faqs: [
    {
      q: 'Why does GSTBro cost more than a ₹500/month filing bot or local bookkeeper?',
      a: 'Cheap services are mechanical data-entry filers that do not examine 2B ledgers or optimize Rule 88A tax set-offs. Missing vendor invoices can cost ₹50,000+ in permanently lost Input Tax Credit. GSTBro is institutional tax infrastructure managed by certified Chartered Accountants.',
    },
    {
      q: 'How does the 100% Zero-Penalty SLA Guarantee work?',
      a: 'When you provide monthly documentation by our cutoff window, we contractually guarantee that GSTR-1 and GSTR-3B will be filed accurately before deadline. If a late fee occurs due to our delay, GSTBro reimburses 100% of the penalty.',
    },
    {
      q: 'What happens if our suppliers haven’t uploaded their invoices in GSTR-2B?',
      a: 'Our reconciliation engine detects missing invoices immediately and provides an automated Vendor Delinquency Report so your team can chase non-compliant vendors before tax cutoff.',
    },
  ],

  // How It Works Page
  content_how_it_works_header: {
    badge: 'The GSTBro Workflow Advantage',
    title: 'Institutional Compliance Made Effortless.',
    subtitle:
      'Experience a seamless 4-step compliance pipeline backed by dual-tier CA review, automated reconciliation, and contractual zero-penalty guarantees.',
  },
  content_how_it_works_steps: [
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
        'Granular Form GSTR-1 classification across all B2B, B2C, and HSN summary tables',
        'Cross-examination with Form GSTR-2B preventing ineligible ITC claims',
        'Pre-filing liability computation report shared for client approval before submission',
      ],
      highlight: 'Multi-point verification protecting you from ASMT-10 notices',
    },
    {
      id: 4,
      number: '04',
      title: 'Filing, Challan Generation & Government ARN',
      badge: 'Step 4 · Punctual Filing',
      headline: 'Zero Late-Fee Guarantee with Official Filing Receipt',
      desc: 'Once approved, returns are uploaded directly to the GST Common Portal with official ARN receipts delivered immediately to your vault.',
      features: [
        'Contractual Zero Late-Fee Guarantee covering any portal penalty on our watch',
        'Official government ARN delivery and PDF receipt generated instantly',
        'Complete historical archive stored in your private Google Drive vault',
      ],
      highlight: '100% On-Time Filing track record across 10,000+ returns',
    },
  ],

  // Contact Page
  content_contact_header: {
    badge: 'Direct Chartered Accountant Advisory Desk',
    title: 'Connect Directly With Our Senior Tax Specialists.',
    subtitle:
      'Whether you need end-to-end GST management, assistance with an urgent scrutiny notice, or statutory business licensing, our team is ready to assist with dedicated Chartered Accountant support.',
    noticeAlert:
      'Received a notice from the GST Department (Form ASMT-10, DRC-01, or SCN)? Upload your notice for an urgent 4-hour legal review and drafting strategy by senior CAs.',
  },

  // Legal Pages
  content_privacy_body: `# Privacy Policy for GSTBro

**Effective Date:** January 1, 2026  
**Last Updated:** Current

GSTBro ("we", "our", or "us") is dedicated to protecting your privacy and the confidentiality of your financial and statutory business data.

### 1. Information We Collect
We collect information required to perform professional taxation and statutory licensing services:
- Business details (Legal Name, Trade Name, GSTIN, PAN, TAN, CIN)
- Primary contact information (Name, Email, Mobile number, Address)
- Financial documentation (Sales invoices, purchase registers, Form GSTR-2B data, bank statements)
- Identity verification records (Aadhaar, Passport, or PAN of directors/proprietors)

### 2. How We Use Your Information
Your data is used strictly for:
- Preparing and filing statutory returns (GSTR-1, GSTR-3B, GSTR-9, GSTR-9C)
- Performing Input Tax Credit (ITC) reconciliation and vendor matching
- Drafting legal responses to scrutiny notices (ASMT-10, DRC-01)
- Communicating filing status, challan details, and statutory reminders

### 3. Data Protection and Security
- All document storage leverages bank-grade 256-bit encryption.
- Files uploaded to client vaults are restricted to authorized Chartered Accountants and compliance team members.
- We never sell, rent, or trade your data to third-party advertisers.

### 4. Contact Us
For privacy questions, reach us at support@gstbro.com.`,

  content_terms_body: `# Terms of Service for GSTBro

**Effective Date:** January 1, 2026  
**Last Updated:** Current

These Terms of Service govern your use of the GSTBro platform and professional tax compliance retainers.

### 1. Scope of Services
GSTBro provides indirect tax compliance management, statutory return filing, vendor 2B reconciliation, business licensing, and notice assistance supervised by qualified professionals.

### 2. Client Responsibilities
Clients agree to:
- Provide accurate and complete sales and purchase records before the monthly cutoff date.
- Review pre-filing tax liability reports in a timely manner.
- Ensure timely settlement of government cash tax challans through authorized banking channels.

### 3. 100% Zero-Penalty SLA Warranty
When all required records are provided by the agreed monthly cutoff date, GSTBro guarantees on-time portal filing. If a statutory late fee is assessed due to our operational delay, GSTBro will reimburse 100% of the late fee penalty.

### 4. Professional Relationship
Final statutory determinations and notices are governed by the Goods and Services Tax Act. GSTBro provides rigorous professional defense and filing services to ensure full legal compliance.`,

  // Sample Service Template (used across GST and license pages)
  content_service_default: {
    heroBadge: 'Government Approved • CA Supervised',
    heroTitle: 'Fast & Compliant Professional Service',
    heroSubtitle: 'Complete end-to-end statutory assistance with dedicated Chartered Accountant supervision, 100% accurate documentation, and guaranteed on-time processing.',
    turnaround: '2 to 4 Working Days',
    feesNote: 'All-inclusive transparent pricing with zero hidden charges.',
    highlights: [
      'Supervised by certified Chartered Accountants with 12+ years experience',
      'End-to-end government portal filing and application tracking',
      'Comprehensive document audit eliminating application rejection risks',
      'Dedicated helpline and WhatsApp advisory throughout the engagement',
    ],
    documents: [
      'PAN Card of Business / Proprietor / Directors',
      'Aadhaar Card / Identity Proof',
      'Proof of Business Address (Electricity Bill / Rent Agreement)',
      'Bank Account Proof (Cancelled Cheque or Bank Statement)',
    ],
    steps: [
      'Document Collection & Pre-Verification Audit',
      'Government Portal Data Drafting & Legal Verification',
      'Digital Signature (DSC) or Aadhaar OTP Verification',
      'Government ARN Receipt Delivery & Final Certificate Download',
    ],
    faqs: [
      {
        q: 'How long does this process take?',
        a: 'Typically 2 to 4 business days once all required documentation is verified by our Chartered Accountant team.',
      },
      {
        q: 'What if the government raises an objection or clarification notice?',
        a: 'Our CA team handles all departmental clarifications, drafting legal responses and resubmissions at zero extra charge.',
      },
    ],
  },
};

const servicePageOptions = [
  { key: 'content_service_gst-registration', path: '/services/gst-registration', label: 'GST Registration' },
  { key: 'content_service_gst-returns', path: '/services/gst-returns', label: 'GST Returns Filing' },
  { key: 'content_service_gst-cancellation', path: '/services/gst-cancellation', label: 'GST Cancellation' },
  { key: 'content_service_gst-compliance', path: '/services/gst-compliance', label: 'GST Compliance Management' },
  { key: 'content_service_gst-refund', path: '/services/gst-refund', label: 'GST Refund Processing' },
  { key: 'content_service_gst-audit', path: '/services/gst-audit', label: 'GST Audit & GSTR-9C' },
  { key: 'content_service_gst-advisory', path: '/services/gst-advisory', label: 'GST Advisory & Notice Defense' },
  { key: 'content_service_gst-tds-tcs', path: '/services/gst-tds-tcs', label: 'GST TDS & TCS Services' },
  { key: 'content_service_business-licenses', path: '/services/business-licenses', label: 'Business Licenses Overview' },
  { key: 'content_service_shop-establishment', path: '/services/business-licenses/shop-establishment', label: 'Shop & Establishment License' },
  { key: 'content_service_trade-license', path: '/services/business-licenses/trade-license', label: 'Trade License' },
  { key: 'content_service_fssai', path: '/services/business-licenses/fssai', label: 'FSSAI Food License' },
  { key: 'content_service_udyam', path: '/services/business-licenses/udyam', label: 'Udyam MSME Registration' },
  { key: 'content_service_iec', path: '/services/business-licenses/iec', label: 'Import Export Code (IEC)' },
  { key: 'content_service_professional-tax', path: '/services/business-licenses/professional-tax', label: 'Professional Tax Registration' },
  { key: 'content_service_dsc', path: '/services/business-licenses/dsc', label: 'Digital Signature (DSC)' },
  { key: 'content_service_startup-india', path: '/services/business-licenses/startup-india', label: 'Startup India Recognition' },
];

export function ContentEditorPage() {
  const [activeTab, setActiveTab] = useState<'pricing' | 'how-it-works' | 'contact' | 'services' | 'legal'>('pricing');
  const [selectedService, setSelectedService] = useState<string>('content_service_gst-registration');
  const [contentStore, setContentStore] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);

  // Load content overrides from backend
  useEffect(() => {
    api<{ content: Record<string, string> }>('/api/admin/settings/content')
      .then((d) => {
        setContentStore(d.content || {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Helper to read content item with template fallback
  const getItem = (key: string) => {
    const raw = contentStore[key];
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }
    return defaultContentTemplates[key] ?? defaultContentTemplates.content_service_default;
  };

  // Helper to set item into state
  const setItem = (key: string, val: any) => {
    const str = typeof val === 'string' ? val : JSON.stringify(val);
    setContentStore((prev) => ({ ...prev, [key]: str }));
    setSaved(false);
    setApplied(false);
  };

  // Save changes to DB
  const handleSave = async (isApply = false, liveRoute = '/') => {
    setSaving(true);
    try {
      await api('/api/admin/settings/content', {
        method: 'PUT',
        body: JSON.stringify(contentStore),
      });

      if (isApply) {
        setApplied(true);
        setTimeout(() => setApplied(false), 4500);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save website content');
    } finally {
      setSaving(false);
    }
  };

  // Reset current section to default
  const handleResetSection = (key: string) => {
    if (window.confirm('Reset this section back to standard copy? You can edit and save again.')) {
      const template = defaultContentTemplates[key] ?? defaultContentTemplates.content_service_default;
      setItem(key, template);
    }
  };

  // Current active live route helper
  const currentLiveRoute = useMemo(() => {
    if (activeTab === 'pricing') return '/pricing';
    if (activeTab === 'how-it-works') return '/how-it-works';
    if (activeTab === 'contact') return '/contact';
    if (activeTab === 'legal') return '/privacy';
    if (activeTab === 'services') {
      const found = servicePageOptions.find((s) => s.key === selectedService);
      return found?.path ?? '/services';
    }
    return '/';
  }, [activeTab, selectedService]);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Website Content Management (Full CMS)</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live Webpage Sync
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Full visual editing for all website copy, pricing tiers, workflow steps, service descriptions, and legal policies
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={saving || loading}
            onClick={() => handleSave(false, currentLiveRoute)}
            className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-sm"
          >
            {saved ? '✓ Saved' : 'Save Content'}
          </button>
          <button
            type="button"
            disabled={saving || loading}
            onClick={() => handleSave(true, currentLiveRoute)}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
          >
            <span>🚀</span>
            {applied ? '✓ Applied Live' : 'Save & Apply to Webpage'}
          </button>
        </div>
      </div>

      {applied && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2 font-medium">
            <span className="text-base">✓</span>
            <span>All website content changes successfully applied live to <strong>{currentLiveRoute}</strong>!</span>
          </div>
          <a
            href={getLiveWebUrl(currentLiveRoute)}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-1.5 rounded-lg bg-emerald-700 text-white font-bold text-[11px] hover:bg-emerald-800 transition"
          >
            View Live Webpage ↗
          </a>
        </div>
      )}

      {/* Main Category Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-4 py-2 rounded-xl transition ${
            activeTab === 'pricing' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          💰 Pricing Plans & Retainers (/pricing)
        </button>
        <button
          onClick={() => setActiveTab('how-it-works')}
          className={`px-4 py-2 rounded-xl transition ${
            activeTab === 'how-it-works' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          ⚡ How It Works & Steps (/how-it-works)
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`px-4 py-2 rounded-xl transition ${
            activeTab === 'services' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          📋 Service Pages (All 17 Services)
        </button>
        <button
          onClick={() => setActiveTab('contact')}
          className={`px-4 py-2 rounded-xl transition ${
            activeTab === 'contact' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          📞 Contact & Advisory Desk (/contact)
        </button>
        <button
          onClick={() => setActiveTab('legal')}
          className={`px-4 py-2 rounded-xl transition ${
            activeTab === 'legal' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          ⚖️ Privacy Policy & Terms (/privacy, /terms)
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. PRICING TAB EDITOR */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'pricing' && (
        <div className="space-y-6">
          {/* Header block */}
          {(() => {
            const h = getItem('content_pricing_header');
            return (
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Pricing Page Header Banner
                  </h2>
                  <button
                    onClick={() => handleResetSection('content_pricing_header')}
                    className="text-[11px] text-slate-400 hover:text-slate-600 underline"
                  >
                    Reset to Default
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Badge Text</label>
                    <input
                      value={h.badge || ''}
                      onChange={(e) => setItem('content_pricing_header', { ...h, badge: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Main Headline Title</label>
                    <input
                      value={h.title || ''}
                      onChange={(e) => setItem('content_pricing_header', { ...h, title: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Descriptive Subtitle</label>
                    <textarea
                      rows={2}
                      value={h.subtitle || ''}
                      onChange={(e) => setItem('content_pricing_header', { ...h, subtitle: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Retainer Plans List */}
          {(() => {
            const plans = getItem('content_pricing_plans');
            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-slate-900 tracking-tight">Retainer Plans (3 Tiers)</h2>
                  <button
                    onClick={() => handleResetSection('content_pricing_plans')}
                    className="text-[11px] text-slate-400 hover:text-slate-600 underline"
                  >
                    Reset Plans
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {plans.map((plan: any, pIdx: number) => (
                    <div
                      key={plan.id || pIdx}
                      className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            Tier {pIdx + 1}
                          </span>
                          <input
                            placeholder="Badge (e.g. Most Popular)"
                            value={plan.badge || ''}
                            onChange={(e) => {
                              const updated = [...plans];
                              updated[pIdx].badge = e.target.value;
                              setItem('content_pricing_plans', updated);
                            }}
                            className="text-[10px] px-2 py-0.5 rounded border border-slate-200 font-bold text-slate-700 w-36 text-right"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Plan Title</label>
                          <input
                            value={plan.name || ''}
                            onChange={(e) => {
                              const updated = [...plans];
                              updated[pIdx].name = e.target.value;
                              setItem('content_pricing_plans', updated);
                            }}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Subtitle</label>
                          <textarea
                            rows={2}
                            value={plan.subtitle || ''}
                            onChange={(e) => {
                              const updated = [...plans];
                              updated[pIdx].subtitle = e.target.value;
                              setItem('content_pricing_plans', updated);
                            }}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">
                              Quarterly (₹/mo)
                            </label>
                            <input
                              type="number"
                              value={plan.monthlyPriceQuarterly || 0}
                              onChange={(e) => {
                                const updated = [...plans];
                                updated[pIdx].monthlyPriceQuarterly = Number(e.target.value);
                                setItem('content_pricing_plans', updated);
                              }}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 font-bold font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">
                              Annual (₹/mo)
                            </label>
                            <input
                              type="number"
                              value={plan.monthlyPriceAnnual || 0}
                              onChange={(e) => {
                                const updated = [...plans];
                                updated[pIdx].monthlyPriceAnnual = Number(e.target.value);
                                setItem('content_pricing_plans', updated);
                              }}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 font-bold font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Turnover Band</label>
                          <input
                            value={plan.turnoverBand || ''}
                            onChange={(e) => {
                              const updated = [...plans];
                              updated[pIdx].turnoverBand = e.target.value;
                              setItem('content_pricing_plans', updated);
                            }}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 font-medium"
                          />
                        </div>

                        {/* Deliverables */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-bold text-slate-600">Included Features</label>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...plans];
                                updated[pIdx].coreDeliverables.push({ text: 'New deliverable point' });
                                setItem('content_pricing_plans', updated);
                              }}
                              className="text-[10px] text-blue-600 font-bold hover:underline"
                            >
                              + Add Feature
                            </button>
                          </div>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {plan.coreDeliverables.map((item: any, iIdx: number) => (
                              <div key={iIdx} className="flex items-center gap-1.5">
                                <input
                                  value={item.text || ''}
                                  onChange={(e) => {
                                    const updated = [...plans];
                                    updated[pIdx].coreDeliverables[iIdx].text = e.target.value;
                                    setItem('content_pricing_plans', updated);
                                  }}
                                  className="w-full px-2 py-1 text-[11px] rounded border border-slate-200"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...plans];
                                    updated[pIdx].coreDeliverables.splice(iIdx, 1);
                                    setItem('content_pricing_plans', updated);
                                  }}
                                  className="text-slate-400 hover:text-rose-600 text-xs px-1"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">CTA Button Label</label>
                        <input
                          value={plan.ctaText || ''}
                          onChange={(e) => {
                            const updated = [...plans];
                            updated[pIdx].ctaText = e.target.value;
                            setItem('content_pricing_plans', updated);
                          }}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 font-bold text-blue-600"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Pricing FAQs */}
          {(() => {
            const faqs = getItem('content_pricing_faqs');
            return (
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Frequently Asked Questions</h2>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...faqs, { q: 'New Question Title', a: 'Detailed answer explanation.' }];
                      setItem('content_pricing_faqs', updated);
                    }}
                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition"
                  >
                    + Add FAQ
                  </button>
                </div>

                <div className="space-y-4">
                  {faqs.map((faq: any, fIdx: number) => (
                    <div key={fIdx} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Question {fIdx + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...faqs];
                            updated.splice(fIdx, 1);
                            setItem('content_pricing_faqs', updated);
                          }}
                          className="text-xs text-rose-500 font-bold hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                      <input
                        value={faq.q || ''}
                        onChange={(e) => {
                          const updated = [...faqs];
                          updated[fIdx].q = e.target.value;
                          setItem('content_pricing_faqs', updated);
                        }}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 font-bold"
                      />
                      <textarea
                        rows={2}
                        value={faq.a || ''}
                        onChange={(e) => {
                          const updated = [...faqs];
                          updated[fIdx].a = e.target.value;
                          setItem('content_pricing_faqs', updated);
                        }}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 text-slate-600"
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. HOW IT WORKS TAB EDITOR */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'how-it-works' && (
        <div className="space-y-6">
          {(() => {
            const h = getItem('content_how_it_works_header');
            const steps = getItem('content_how_it_works_steps');
            return (
              <>
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      How It Works Header Section
                    </h2>
                    <button
                      onClick={() => handleResetSection('content_how_it_works_header')}
                      className="text-[11px] text-slate-400 hover:text-slate-600 underline"
                    >
                      Reset Header
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Badge Text</label>
                      <input
                        value={h.badge || ''}
                        onChange={(e) => setItem('content_how_it_works_header', { ...h, badge: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Headline</label>
                      <input
                        value={h.title || ''}
                        onChange={(e) => setItem('content_how_it_works_header', { ...h, title: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Subtitle</label>
                      <textarea
                        rows={2}
                        value={h.subtitle || ''}
                        onChange={(e) => setItem('content_how_it_works_header', { ...h, subtitle: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 leading-relaxed"
                      />
                    </div>
                  </div>
                </div>

                {/* 4 Steps Editor */}
                <div className="space-y-4">
                  <h2 className="text-sm font-black text-slate-900 tracking-tight">4-Step Workflow Pipeline</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {steps.map((st: any, sIdx: number) => (
                      <div
                        key={st.id || sIdx}
                        className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-blue-600">Step {st.number || sIdx + 1}</span>
                          <input
                            value={st.badge || ''}
                            onChange={(e) => {
                              const updated = [...steps];
                              updated[sIdx].badge = e.target.value;
                              setItem('content_how_it_works_steps', updated);
                            }}
                            className="text-[10px] px-2 py-0.5 rounded border border-slate-200 font-bold text-slate-600 text-right"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Step Title</label>
                          <input
                            value={st.title || ''}
                            onChange={(e) => {
                              const updated = [...steps];
                              updated[sIdx].title = e.target.value;
                              setItem('content_how_it_works_steps', updated);
                            }}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Headline</label>
                          <input
                            value={st.headline || ''}
                            onChange={(e) => {
                              const updated = [...steps];
                              updated[sIdx].headline = e.target.value;
                              setItem('content_how_it_works_steps', updated);
                            }}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Description</label>
                          <textarea
                            rows={2}
                            value={st.desc || ''}
                            onChange={(e) => {
                              const updated = [...steps];
                              updated[sIdx].desc = e.target.value;
                              setItem('content_how_it_works_steps', updated);
                            }}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Key Highlight</label>
                          <input
                            value={st.highlight || ''}
                            onChange={(e) => {
                              const updated = [...steps];
                              updated[sIdx].highlight = e.target.value;
                              setItem('content_how_it_works_steps', updated);
                            }}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-emerald-700 font-semibold bg-emerald-50/50"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. SERVICE PAGES (ALL 17 WEBPAGES) EDITOR */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'services' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Service Selector Sidebar */}
          <div className="lg:col-span-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-2 h-fit">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
              Select Service Webpage
            </span>
            <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
              {servicePageOptions.map((opt) => {
                const isSelected = selectedService === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setSelectedService(opt.key)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-600 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate pr-2">{opt.label}</span>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">Edit</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Service Content Editor */}
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
            {(() => {
              const currentSvc = servicePageOptions.find((s) => s.key === selectedService);
              const data = getItem(selectedService);
              return (
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        Editing Webpage
                      </span>
                      <h2 className="text-base font-extrabold text-slate-900 mt-1">{currentSvc?.label}</h2>
                      <span className="text-xs font-mono text-slate-400">{currentSvc?.path}</span>
                    </div>
                    <button
                      onClick={() => handleResetSection(selectedService)}
                      className="text-xs text-slate-400 hover:text-slate-600 underline"
                    >
                      Reset to Default
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Hero Pill Badge</label>
                      <input
                        value={data.heroBadge || ''}
                        onChange={(e) => setItem(selectedService, { ...data, heroBadge: e.target.value })}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Page Hero Title (H1)</label>
                      <input
                        value={data.heroTitle || ''}
                        onChange={(e) => setItem(selectedService, { ...data, heroTitle: e.target.value })}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Hero Subtitle & Proposition</label>
                      <textarea
                        rows={3}
                        value={data.heroSubtitle || ''}
                        onChange={(e) => setItem(selectedService, { ...data, heroSubtitle: e.target.value })}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 leading-relaxed"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Turnaround Timeline</label>
                        <input
                          placeholder="2 to 4 Working Days"
                          value={data.turnaround || ''}
                          onChange={(e) => setItem(selectedService, { ...data, turnaround: e.target.value })}
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Pricing / Fees Note</label>
                        <input
                          placeholder="Transparent fee quote"
                          value={data.feesNote || ''}
                          onChange={(e) => setItem(selectedService, { ...data, feesNote: e.target.value })}
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-semibold"
                        />
                      </div>
                    </div>

                    {/* Required Documents */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700">Required Documents Checklist</label>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = { ...data, documents: [...(data.documents || []), 'New Required Document'] };
                            setItem(selectedService, updated);
                          }}
                          className="text-[11px] text-blue-600 font-bold hover:underline"
                        >
                          + Add Document
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {(data.documents || []).map((doc: string, dIdx: number) => (
                          <div key={dIdx} className="flex items-center gap-2">
                            <input
                              value={doc}
                              onChange={(e) => {
                                const docs = [...data.documents];
                                docs[dIdx] = e.target.value;
                                setItem(selectedService, { ...data, documents: docs });
                              }}
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const docs = [...data.documents];
                                docs.splice(dIdx, 1);
                                setItem(selectedService, { ...data, documents: docs });
                              }}
                              className="text-slate-400 hover:text-rose-600 px-1"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Procedure Steps */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700">Step-by-Step Procedure</label>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = { ...data, steps: [...(data.steps || []), 'New Procedure Step'] };
                            setItem(selectedService, updated);
                          }}
                          className="text-[11px] text-blue-600 font-bold hover:underline"
                        >
                          + Add Step
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {(data.steps || []).map((st: string, sIdx: number) => (
                          <div key={sIdx} className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400">{sIdx + 1}.</span>
                            <input
                              value={st}
                              onChange={(e) => {
                                const stps = [...data.steps];
                                stps[sIdx] = e.target.value;
                                setItem(selectedService, { ...data, steps: stps });
                              }}
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const stps = [...data.steps];
                                stps.splice(sIdx, 1);
                                setItem(selectedService, { ...data, steps: stps });
                              }}
                              className="text-slate-400 hover:text-rose-600 px-1"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. CONTACT TAB EDITOR */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'contact' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 max-w-4xl">
          {(() => {
            const c = getItem('content_contact_header');
            return (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Contact & Advisory Desk Copy
                  </h2>
                  <button
                    onClick={() => handleResetSection('content_contact_header')}
                    className="text-[11px] text-slate-400 hover:text-slate-600 underline"
                  >
                    Reset Contact Copy
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Badge Text</label>
                    <input
                      value={c.badge || ''}
                      onChange={(e) => setItem('content_contact_header', { ...c, badge: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Headline Title</label>
                    <input
                      value={c.title || ''}
                      onChange={(e) => setItem('content_contact_header', { ...c, title: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Subtitle</label>
                    <textarea
                      rows={2}
                      value={c.subtitle || ''}
                      onChange={(e) => setItem('content_contact_header', { ...c, subtitle: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Notice Review Alert Message</label>
                    <textarea
                      rows={2}
                      value={c.noticeAlert || ''}
                      onChange={(e) => setItem('content_contact_header', { ...c, noticeAlert: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 text-amber-900 bg-amber-50/40"
                    />
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. LEGAL POLICIES TAB (PRIVACY & TERMS) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'legal' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Privacy Policy */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Privacy Policy (/privacy)</h2>
              <button
                onClick={() => handleResetSection('content_privacy_body')}
                className="text-[11px] text-slate-400 hover:text-slate-600 underline"
              >
                Reset
              </button>
            </div>
            <textarea
              rows={18}
              value={getItem('content_privacy_body')}
              onChange={(e) => setItem('content_privacy_body', e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 font-mono leading-relaxed"
            />
          </div>

          {/* Terms of Service */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Terms of Service (/terms)</h2>
              <button
                onClick={() => handleResetSection('content_terms_body')}
                className="text-[11px] text-slate-400 hover:text-slate-600 underline"
              >
                Reset
              </button>
            </div>
            <textarea
              rows={18}
              value={getItem('content_terms_body')}
              onChange={(e) => setItem('content_terms_body', e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 font-mono leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* Bottom Save & Apply Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
        <a
          href={getLiveWebUrl(currentLiveRoute)}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1"
        >
          Open Live Webpage ({currentLiveRoute}) ↗
        </a>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={saving || loading}
            onClick={() => handleSave(false, currentLiveRoute)}
            className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-sm"
          >
            {saved ? '✓ Changes Saved' : 'Save'}
          </button>
          <button
            type="button"
            disabled={saving || loading}
            onClick={() => handleSave(true, currentLiveRoute)}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
          >
            <span>🚀</span>
            {applied ? '✓ Applied Live' : 'Apply to Live Webpage'}
          </button>
        </div>
      </div>
    </div>
  );
}
