import { useState, type ReactNode } from 'react';
import { PublicLayout } from '../../components/PublicLayout';
import { Breadcrumbs } from '../../components/seo/Breadcrumbs';
import {
  registrationMeta,
  returnsMeta,
  cancellationMeta,
  servicesMeta,
  complianceMeta,
  refundMeta,
  auditMeta,
  advisoryMeta,
  tdsTcsMeta,
  businessLicensesMeta,
  shopEstablishmentMeta,
  tradeLicenseMeta,
  fssaiMeta,
  udyamMeta,
  iecMeta,
  professionalTaxMeta,
  dscMeta,
  startupIndiaMeta,
} from '../../seo/pages/services.meta';
import { serviceSchema } from '../../seo/schema/service';
import { faqSchema } from '../../seo/schema/faq';
import { useContent } from '../../context/ContentContext';

function InteractiveDocumentChecklist({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: (string | string[])[] | string[] | string[][];
}) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const normalizedItems: [string, string][] = items.map((it) =>
    Array.isArray(it) ? [it[0] || '', it[1] || ''] : [it, '']
  );
  const total = normalizedItems.length;
  const readyCount = Object.values(checked).filter(Boolean).length;

  const toggle = (idx: number) => {
    setChecked((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const selectAll = () => {
    const all: Record<number, boolean> = {};
    normalizedItems.forEach((_, idx) => {
      all[idx] = true;
    });
    setChecked(all);
  };

  const clearAll = () => {
    setChecked({});
  };

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-10 text-center">
          <p className="text-sm font-bold text-[#1454b8] uppercase tracking-wider">{subtitle}</p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#07184a]">{title}</h2>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs">
            <span className="font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
              {readyCount} of {total} Documents Prepared
            </span>
            <button
              type="button"
              onClick={selectAll}
              className="font-bold text-blue-700 hover:text-blue-900 underline px-2 py-1 cursor-pointer touch-target"
            >
              Select All
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={clearAll}
              className="font-bold text-slate-500 hover:text-slate-800 underline px-2 py-1 cursor-pointer touch-target"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {normalizedItems.map(([docTitle, docDesc], index) => {
            const isChecked = !!checked[index];
            return (
              <div
                key={docTitle}
                onClick={() => toggle(index)}
                className={`touch-checkbox-item flex flex-col justify-between ${
                  isChecked
                    ? 'checked !bg-blue-50/90 !border-blue-400 shadow-xs'
                    : '!bg-slate-50 !border-slate-200 hover:!border-blue-300'
                }`}
                role="checkbox"
                aria-checked={isChecked}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    toggle(index);
                  }
                }}
              >
                <div className="flex items-start gap-3 w-full">
                  <div className={`touch-checkbox-box ${isChecked ? '!bg-[#1454b8] !border-[#1454b8]' : '!border-slate-400'}`}>
                    {isChecked && (
                      <svg className="w-3.5 h-3.5 text-white stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-bold text-sm text-[#07184a] ${isChecked ? 'text-blue-900' : ''}`}>
                      {docTitle}
                    </p>
                    {docDesc && (
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        {docDesc}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{isChecked ? '✓ Ready for upload' : 'Tap to mark prepared'}</span>
                  <span className={isChecked ? 'text-blue-600 font-bold' : ''}>{isChecked ? 'Ready' : 'Pending'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const services = [
  { href: '/services/gst-registration', title: 'GST Registration', desc: 'Fast-track statutory onboarding for corporate entities, LLPs, and proprietorships.', icon: 'doc' },
  { href: '/services/gst-returns', title: 'GST Return Filing', desc: 'Systematic monthly & quarterly filings (GSTR-1, 3B) with multi-tier ledger matching.', icon: 'file' },
  { href: '/services/gst-tds-tcs', title: 'GST TDS & TCS Compliance', desc: 'Statutory deduction (Sec 51) and collection (Sec 52) management with GSTR-7/8 filing.', icon: 'file' },
  { href: '/services/business-licenses', title: 'Business Licenses & Certifications', desc: 'Statutory central and state commercial licenses to maintain full regulatory standing.', icon: 'audit' },
  { href: '/services/gst-refund', title: 'GST Refund Services', desc: 'Expedited capital recovery for exporters, inverted duty structures, and cash ledgers.', icon: 'refund' },
  { href: '/services/gst-audit', title: 'GST Audit & Assessment', desc: 'Statutory reconciliation (GSTR-9/9C) and dedicated assessment defense representation.', icon: 'audit' },
  { href: '/services/gst-advisory', title: 'GST Advisory', desc: 'Strategic tax planning, classification review, and departmental dispute counsel.', icon: 'chat' },
];

function ServiceIcon({ type }: { type: string }) {
  const common = 'h-12 w-12 text-[#004aad]';
  if (type === 'sync') return <svg className={common} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3"><path d="M38 16A16 16 0 0 0 10 12" /><path d="M10 12v10h10" /><path d="M10 32a16 16 0 0 0 28 4" /><path d="M38 36V26H28" /></svg>;
  if (type === 'refund') return <svg className={common} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3"><path d="M8 28h10l8-8a6 6 0 0 1 8 0" /><path d="M18 36h16l8-10" /><path d="M24 14h10" /><path d="M29 9v10" /></svg>;
  if (type === 'audit') return <svg className={common} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14 6h18l6 6v28H14z" /><path d="M31 6v9h7" /><circle cx="27" cy="28" r="6" /><path d="m32 33 6 6" /></svg>;
  if (type === 'chat') return <svg className={common} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3"><path d="M8 12h32v20H18l-10 8z" /><path d="M16 20h16" /><path d="M16 27h10" /></svg>;
  return <svg className={common} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14 6h18l6 6v30H14z" /><path d="M31 6v9h7" /><path d="M20 24h12" /><path d="M20 31h10" /><path d="M34 32h10" /><path d="M39 27v10" /></svg>;
}

const servicePages = {
  registration: {
    meta: registrationMeta,
    title: 'GST Registration',
    serviceType: 'GST Registration',
    description: registrationMeta.description,
    faqs: [
      { question: 'Who needs GST registration?', answer: 'Businesses with turnover exceeding the threshold limit, e-commerce sellers, and certain service providers must register for GST in India.' },
      { question: 'How long does GST registration take?', answer: 'Typically 3–7 working days after document submission, depending on verification by the tax department.' },
      { question: 'What documents are required?', answer: 'PAN, Aadhaar, business proof, bank account details, and address proof of the principal place of business.' },
    ],
  },
  returns: {
    meta: returnsMeta,
    title: 'GST Return Filing',
    serviceType: 'GST Return Filing',
    description: returnsMeta.description,
    faqs: [
      { question: 'Which GST returns does GSTBro file?', answer: 'We handle GSTR-1, GSTR-3B, GSTR-9 (annual return), and other applicable returns based on your registration type.' },
      { question: 'What is the penalty for late filing?', answer: 'Late filing attracts interest and late fees as per GST law. We ensure timely filing to avoid penalties.' },
    ],
  },
  cancellation: {
    meta: cancellationMeta,
    title: 'GST Cancellation',
    serviceType: 'GST Cancellation',
    description: cancellationMeta.description,
    faqs: [
      { question: 'When can I cancel GST registration?', answer: 'When business is discontinued, amalgamated, transferred, or turnover falls below threshold — subject to clearance of liabilities.' },
      { question: 'What happens after cancellation?', answer: 'Final returns must be filed and all dues cleared. We handle the entire surrender process.' },
    ],
  },
};

interface ServiceDetailPageProps {
  type: 'registration' | 'returns' | 'cancellation';
}

export function ServiceDetailPage({ type }: ServiceDetailPageProps) {
  const page = servicePages[type];
  const path = `/services/gst-${type === 'returns' ? 'returns' : type === 'registration' ? 'registration' : 'cancellation'}`;

  return (
    <PublicLayout
      meta={page.meta}
      jsonLd={[
        serviceSchema(page.title, page.description, page.serviceType, path),
        faqSchema(page.faqs),
      ]}
    >
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Breadcrumbs items={[{ name: 'Services', path: '/services' }, { name: page.title, path }]} />
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{page.title}</h1>
        <p className="text-lg text-gray-600 mb-8">{page.description}</p>

        <div className="prose max-w-none mb-12">
          <h2 className="text-2xl font-semibold mb-4">Why choose GSTBro?</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>Dedicated expert assigned to your case</li>
            <li>Secure document upload via client portal</li>
            <li>Real-time case status tracking</li>
            <li>Transparent pricing with no hidden fees</li>
          </ul>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {page.faqs.map((faq) => (
              <details key={faq.question} className="border border-gray-200 rounded-lg p-4">
                <summary className="font-medium cursor-pointer">{faq.question}</summary>
                <p className="mt-2 text-gray-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap gap-4">
          <a href="/signup" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700">
            Get Started
          </a>
          <a href="/contact" className="border border-gray-300 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50">
            Contact Us
          </a>
        </div>

        <aside className="mt-12 pt-8 border-t">
          <h3 className="font-semibold mb-3">Other Services</h3>
          <div className="flex flex-wrap gap-3">
            {type !== 'registration' && <a href="/services/gst-registration" className="text-blue-600 hover:underline">GST Registration</a>}
            {type !== 'returns' && <a href="/services/gst-returns" className="text-blue-600 hover:underline">GST Returns</a>}
            {type !== 'cancellation' && <a href="/services/gst-cancellation" className="text-blue-600 hover:underline">GST Cancellation</a>}
          </div>
        </aside>
      </div>
    </PublicLayout>
  );
}

const registrationTypes = [
  ['Corporate Entities & LLPs', 'Statutory onboarding for Private Limited, Public Limited, and Limited Liability Partnerships.'],
  ['Sole Proprietorships & Firms', 'Expedited tax registration for individual enterprises, HUFs, and partnership firms.'],
  ['E-Commerce Operators & Sellers', 'Mandatory registration under Section 9(5) and 52 for digital marketplaces and online vendors.'],
  ['TDS / TCS Deductors & Collectors', 'Statutory onboarding for government bodies, PSUs, and entities liable for tax deduction at source.'],
  ['Non-Resident Taxable Persons (NRTP)', 'Registration and authorized representative management for foreign entities transacting in India.'],
  ['Input Service Distributors (ISD)', 'Specialized GSTIN setup to apportion and distribute common input tax credit across branches.'],
  ['Casual Taxable Persons (CTP)', 'Temporary seasonal registration for exhibitions, trade fairs, and short-term commercial projects.'],
  ['UN Bodies, Embassies & Consulates', 'Unique Identification Number (UIN) issuance for diplomatic missions and specialized agencies.'],
  ['OIDAR Service Providers', 'Onboarding for offshore entities providing cloud, digital media, or online data access in India.'],
];

const registrationDocuments = [
  ['PAN Card', 'Permanent Account Number of business/individual'], ['Aadhaar Card', 'Aadhaar of the proprietor/partners/directors'], ['Business Proof', 'Registration certificate, partnership deed, or MOA/AOA'], ['Digital Signature (DSC)', 'For authorized signatory'],
  ['Business Address Proof', 'Electricity bill, rent agreement, or property document'], ['Passport Size Photo', 'Recent photograph of proprietor/partners/directors'], ['Bank Account Details', 'Cancelled cheque or bank statement'], ['Email ID & Mobile Number', 'For OTP verification and communication'],
];

const returnTypes = [
  ['GSTR-1 (Outward Supplies)', 'Comprehensive reporting of outward taxable supplies, debit/credit notes, and B2B invoices.'],
  ['GSTR-3B (Summary Return & Tax Settlement)', 'Summary declaration of outward supplies, input tax credit claims, and net tax settlement.'],
  ['CMP-08 / GSTR-4 (Composition Levy)', 'Quarterly tax liability statement and annual return compilation for composition dealers.'],
  ['GSTR-9 (Annual Statutory Return)', 'Consolidated financial year-end return compiling aggregate turnover, taxes paid, and ITC.'],
  ['GSTR-9C (Reconciliation Statement)', 'CA-certified reconciliation statement harmonizing audited financial balance sheets with GST portal filings.'],
  ['GSTR-5, 6, 7 & 8 (Specialized Returns)', 'Statutory filings for non-residents, Input Service Distributors (ISD), TDS authorities, and e-commerce operators.'],
];
const filingSteps = [['Share Documents', 'Upload your invoices and relevant documents securely.'], ['Review & Reconciliation', 'We review, reconcile, and prepare your returns accurately.'], ['File Returns', 'We file the returns on time with accurate details.'], ['Confirmation', 'You receive confirmation and acknowledgment instantly.'], ['Record Keeping', 'All filings and documents are stored securely.']];
const complianceAreas = [
  ['Statutory Tax Registration', 'Initial onboarding, multi-state establishment, and dynamic amendment filings.'],
  ['Periodic Return Submissions', 'Error-free filing of GSTR-1, 3B, and CMP-08 backed by multi-level validation.'],
  ['Treasury & Tax Settlement', 'Accurate liability calculation, cash ledger utilization, and timely tax payments.'],
  ['Multi-tier ITC Reconciliation', 'Cross-matching purchase registers against GSTR-2B to block tax leakage.'],
  ['Statutory Record Retention', 'Archiving tax invoices, delivery challans, and ledgers in compliance with GST rules.'],
  ['Scrutiny & Assessment Defense', 'End-to-end representation and response drafting for departmental notices and audits.'],
];
const complianceSteps = [['Understand & Collect', 'We understand your business and collect necessary documents & data.'], ['Review & Analyze', 'Our experts review transactions, returns, and records for compliance gaps.'], ['Comply & File', 'Timely filing of returns and payments as per GST regulations.'], ['Reconcile & Verify', 'Reconcile data and verify compliance to ensure accuracy.'], ['Monitor & Support', 'Continuous monitoring, updates, and support for ongoing compliance.']];
const refundEligibility = [
  ['Zero-Rated Export Supplies', 'Full refund of accumulated unutilized ITC on export of goods or services under LUT.'],
  ['Supplies to SEZ Units & Developers', 'Expedited recovery of taxes paid or accumulated ITC on supplies to Special Economic Zones.'],
  ['Deemed Export Transactions', 'Statutory refund facilitation for qualifying deemed export manufacturing supplies.'],
  ['Inverted Duty Tariff Structure', 'Refund of accumulated credit where the tax rate on inputs exceeds output supply rates.'],
  ['Excess Balance in Electronic Ledgers', 'Direct cash refund of excess payments or balance sitting in electronic cash ledgers.'],
  ['Pre-Deposit & Appellate Refunds', 'Recovery of pre-deposit amounts following favorable appellate orders or rulings.'],
];
const refundDocuments = [['GST Return Filing', 'Copy of GSTR-1 and GSTR-3B'], ['Invoices', 'Tax invoices of the relevant period'], ['Bank Statement', 'Proof of receipt and payment'], ['B/L or E-way Bill', 'Transport and export documents'], ['Export Documents', 'Shipping bill, LUT, or other proof'], ['ITC Statement', 'Input tax credit reconciliation'], ['Authorization Letter', 'Signed authorization for filing'], ['Other Supporting Docs', 'Any documents requested by the department']];
const refundSteps = [['Review & Consultation', 'We check your eligibility and refund claim.'], ['Document Collection', 'We collect and verify all required documents.'], ['Prepare & File', 'We prepare and submit the refund application.'], ['Follow Up', 'We follow up with the department until approval.'], ['Refund Received', 'Refund is credited to your bank account.']];
const auditTypes = [
  ['Section 65 Departmental Audit', 'Audits conducted by GST Commissionerate officers at business premises under statutory mandate.'],
  ['Section 61 Scrutiny Proceedings', 'Detailed return scrutiny assessing discrepancies in outward supplies, turnover, and ITC.'],
  ['Section 66 Special Audit', 'Nominated audits conducted by department-appointed Chartered Accountants for complex cases.'],
  ['Summary & Best Judgment Assessment', 'Statutory defense against assessments initiated under Sections 62, 63, or 64.'],
  ['Pre-Audit Readiness Review', 'Proactive mock audit to uncover exposure, correct misclassifications, and ensure zero surprises.'],
  ['Appellate Tribunal Litigation Support', 'Drafting appeals and providing strategic advocacy before the First Appellate Authority and Tribunal.'],
];
const auditServices = [
  ['ASMT Notice Handling', 'Handling audit notices, queries, ASMT-10 discrepancies, and DRC-01 show cause notices.'],
  ['Statutory Defense Drafting', 'Drafting rigorous legal replies, reconciliations, and formal departmental submissions.'],
  ['Departmental Representation', 'Senior CA representation before adjudicating tax authorities and appellate tribunals.'],
  ['Cross-Ledger Reconciliation', 'Reconciliation of electronic liability, cash, and credit ledgers against statutory books.'],
  ['Fiscal Risk Exposure Assessment', 'Identifying compliance loopholes, exposure to penalties, and latent tax liabilities.'],
  ['Litigation & Appellate Support', 'Preparing appeals, drafting grounds of appeal, and advocacy before First Appellate Authorities.'],
];
const auditDocs = ['GSTR-1, GSTR-3B, GSTR-9/9C', 'Sales & Purchase Registers', 'Tax Invoices & Credit Notes', 'E-way Bills & E-invoices', 'Books of Accounts', 'ITC Register & Reconciliations', 'Bank Statements', 'Previous Notices / Orders'];
const auditSteps = [['Initial Consultation', 'Understand your business and compliance history.'], ['Document Collection', 'Collect and review relevant documents.'], ['Data Analysis', 'Reconcile data and identify discrepancies.'], ['Risk Identification', 'Assess risks, exposure and potential liabilities.'], ['Reply & Representation', 'Draft replies and represent before authorities.'], ['Compliance Closure', 'Ensure resolution and future compliance.']];
const advisoryBenefits = [
  ['Tax Efficiency Optimization', 'Structuring commercial transactions and supply chains to legally minimize indirect tax burden.'],
  ['Regulatory Risk Mitigation', 'Continuous monitoring of GST Council notifications and circulars to keep operations bulletproof.'],
  ['Working Capital Acceleration', 'Eliminating credit blockages, optimizing reverse charge liabilities, and accelerating cash flow.'],
  ['Institutional Governance', 'Equipping finance and accounting teams with standardized SOPs and audit-ready workflows.'],
];
const advisoryServices = [
  ['Indirect Tax Restructuring & M&A', 'Advising on corporate mergers, acquisitions, business sales, and restructuring implications.'],
  ['ASMT & DRC Notice Representation', 'Drafting defense briefs and providing senior CA representation for scrutiny and show cause notices.'],
  ['Comprehensive GST Health Check', 'Exhaustive audit of past filings, ledgers, and contract terms to detect latent liabilities.'],
  ['HSN Classification & Rate Review', 'Determining exact tariff classifications, exemption notifications, and applicable tax rates.'],
  ['Cross-Border & SEZ Supply Advisory', 'Navigating place of supply rules, export documentation, zero-rated supplies, and transfer pricing.'],
  ['Corporate Tax Training & SOPs', 'Custom institutional workshops and operational standard operating procedures for accounts teams.'],
];

const tdsTcsFrameworks = [
  ['Section 51 GST TDS (Government & PSUs)', 'Mandatory 2% deduction on commercial supply contracts exceeding ₹2.5 Lakhs awarded by government departments, local authorities, and PSUs.'],
  ['Section 52 GST TCS (E-Commerce Marketplaces)', 'Statutory 1% tax collection on net value of taxable supplies made by third-party sellers through marketplace platforms.'],
  ['GSTR-7 Monthly Return Filing', 'Meticulous compilation and submission of monthly deductions by the 10th of every month with error-free payment challans.'],
  ['GSTR-8 E-Commerce Return Filing', 'Comprehensive monthly reporting of gross sales, returns/cancellations, and net TCS collection before statutory deadlines.'],
  ['Form GSTR-7A Digital Certificates', 'Automated generation and dispatch of statutory TDS certificates credited directly to suppliers’ Electronic Cash Ledgers.'],
  ['Ledger Reconciliation & Discrepancy Defense', 'Handling departmental inquiries, reconciling vendor mismatches, and rectifying unallocated deduction credits.'],
];

const tdsTcsDocuments = [
  ['Contract & Work Orders', 'Copies of government or PSU work orders exceeding ₹2.5 Lakhs'],
  ['Payment & Deduction Registers', 'Itemized deduction ledgers matching vendor payment vouchers'],
  ['E-Commerce Merchant Logs', 'Monthly merchant sales, returns, and net payout summary'],
  ['Digital Signature Certificate (DSC)', 'Class-3 DSC of the authorized signatory for portal submission'],
  ['Bank Account Statements', 'Bank statement proving statutory tax payment deposition'],
  ['Active GSTIN (Deductor/Collector)', 'Valid 15-digit GSTIN under Tax Deductor or Collector category'],
  ['Vendor Master Roster', 'GSTIN, legal name, and address roster of deductees/sellers'],
  ['Previous Filing Receipts', 'Challan acknowledgments and ARN filing receipts'],
];

const tdsTcsSteps = [
  ['Data Ingestion & Review', 'Extract contract terms, payment vouchers, or marketplace sales logs.'],
  ['Statutory Threshold Check', 'Validate ₹2.5L contract thresholds for TDS and net value for TCS.'],
  ['Tax Challan Deposition', 'Generate PMT-06 challans and deposit deducted/collected amounts.'],
  ['GSTR-7 / GSTR-8 Submission', 'File returns on the GST portal before the 10th cutoff with zero penalties.'],
  ['Certificate Distribution', 'Issue GSTR-7A certificates and ensure cash ledger credit reflects for vendors.'],
];

export function RegistrationServicePage() {
  const content = useContent('content_service_gst-registration', {
    heroBadge: 'STATUTORY TAX ONBOARDING',
    heroTitle: 'Seamless GST Entity Registration for Enterprises',
    heroSubtitle:
      'Accelerate indirect tax readiness with end-to-end statutory drafting, jurisdictional liaison, and proactive departmental query resolution.',
  });

  return (
    <PublicLayout
      meta={registrationMeta}
      jsonLd={serviceSchema(
        'Statutory GST Registration Services',
        'Professional GST registration services for businesses across India with complete document vetting and zero rejection guarantee.',
        'GST Registration',
        '/services/gst-registration'
      )}
    >
      <div className="bg-slate-50">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#eef5ff] via-white to-blue-50">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
            <div className="fade-up">
              <span className="inline-flex rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-[#004aad]">{content.heroBadge}</span>
              <h1 className="mt-6 text-5xl font-extrabold leading-tight text-[#07184a]">{content.heroTitle}</h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">{content.heroSubtitle}</p>
              <div className="mt-8 flex flex-wrap gap-4"><a href="/signup" className="rounded-lg bg-[#003b8f] px-6 py-3 font-bold text-white transition hover:-translate-y-1 hover:bg-[#1454b8]">Get Started Today</a><a href="#process" className="rounded-lg border border-[#003b8f] px-6 py-3 font-bold text-[#003b8f] transition hover:bg-blue-50">How It Works</a></div>
              <div className="mt-10 grid grid-cols-3 gap-4 text-sm font-semibold text-slate-700"><span>♙ Senior CA Oversight<br /><small className="font-normal">End-to-end statutory review</small></span><span>⚡ Fast-Track 3–5 Day SLA<br /><small className="font-normal">Quick & error-free filing</small></span><span>✓ 100% Audit-Ready<br /><small className="font-normal">Strict GST law compliance</small></span></div>
            </div>
            <div className="fade-up hero-delay-2 relative rounded-3xl bg-[#003b8f] p-3 shadow-2xl transition duration-500 hover:-translate-y-2"><img src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1100&q=85" alt="GST registration assistance" className="h-80 w-full rounded-2xl object-cover" /><div className="absolute -bottom-5 -left-5 rounded-2xl bg-[#1454b8] px-6 py-5 text-white shadow-xl"><p className="font-bold">Statutory Tax Onboarding</p><p className="mt-1 text-sm text-blue-100">Fast. Accurate. Fully Compliant.</p></div></div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 py-16">
          <div className="mb-10 text-center"><p className="text-sm font-bold text-[#1454b8]">REGULATORY FRAMEWORKS</p><h2 className="mt-2 text-3xl font-extrabold text-[#07184a]">Supported Business Structures & Categories</h2><div className="mx-auto mt-4 h-1 w-12 bg-[#1454b8]" /></div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{registrationTypes.map(([title, description], index) => <div key={title} className="fade-up rounded-2xl border bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl" style={{ animationDelay: `${index * 80}ms` }}><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-xl text-[#1454b8]">◎</div><h3 className="font-bold text-[#07184a]">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></div>)}</div>
        </section>
        <div className="mx-auto grid max-w-7xl grid-cols-3 gap-3 rounded-xl bg-white px-4 py-4 text-center text-xs font-bold text-[#1454b8] shadow-sm"><span>◎ 100% Online Execution</span><span>◷ 3–5 Working Days SLA</span><span>♧ Senior CA Consultation</span></div>
        <InteractiveDocumentChecklist
          title="Documents Required for Entity Registration"
          subtitle="STATUTORY COMPLIANCE CHECKLIST"
          items={registrationDocuments}
        />
        <section className="bg-white pb-16">
          <div className="mx-auto max-w-7xl px-4">
            <div id="process" className="mt-6 flex flex-col items-center justify-between gap-5 rounded-2xl bg-gradient-to-r from-[#003b8f] to-[#1454b8] p-8 text-white md:flex-row">
              <div><h2 className="text-2xl font-extrabold">Let senior tax consultants structure your GST onboarding</h2><p className="mt-2 text-blue-100">Establish a compliant indirect tax footprint with complete audit readiness from day one.</p></div>
              <a href="/signup" className="rounded-lg bg-white px-8 py-3 font-bold text-[#003b8f] transition hover:-translate-y-1">Get Started Today</a>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 text-center text-xs font-semibold text-[#07184a] md:grid-cols-4">
              <span>♧ Transparent Professional Fees<br /><small className="font-normal">No hidden retainers</small></span>
              <span>◷ Real-Time Milestone Tracking<br /><small className="font-normal">Track portal progress live</small></span>
              <span>♧ Dedicated Tax Officer<br /><small className="font-normal">Single point of contact</small></span>
              <span>♧ Enterprise-Grade Data Vault<br /><small className="font-normal">Encrypted & confidential</small></span>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}

export function ReturnsServicePage() {
  const content = useContent('content_service_gst-returns', {
    heroBadge: 'STATUTORY TAX FILINGS',
    heroTitle: 'Precision GST Return Filing & Reconciliation',
    heroSubtitle: 'Multi-tier invoice matching, automated credit verification, and timely submissions to eliminate late fees, interest, and departmental notices.',
  });

  return (
    <PublicLayout
      meta={returnsMeta}
      jsonLd={serviceSchema(
        'GST Return Filing Services (GSTR-1 & 3B)',
        'Timely and accurate monthly & quarterly GST return filing services with Rule 88A tax offset optimization and CA certification.',
        'GST Return Filing',
        '/services/gst-returns'
      )}
    >
      <div className="bg-slate-50">
    <section className="relative overflow-hidden bg-gradient-to-br from-[#eef5ff] via-white to-blue-50"><div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24"><div className="fade-up"><span className="inline-flex rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-[#004aad]">{content.heroBadge}</span><h1 className="mt-6 text-5xl font-extrabold leading-tight text-[#07184a]">{content.heroTitle}</h1><p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">{content.heroSubtitle}</p><div className="mt-8 flex flex-wrap gap-4"><a href="/signup" className="rounded-lg bg-[#003b8f] px-6 py-3 font-bold text-white transition hover:-translate-y-1">Get Started Today</a><a href="#filing-process" className="rounded-lg border border-[#003b8f] px-6 py-3 font-bold text-[#003b8f]">How It Works</a></div><div className="mt-10 grid grid-cols-3 gap-4 text-sm font-semibold text-slate-700"><span>◷ On-Time Filing SLA<br /><small className="font-normal">Zero late fee exposure</small></span><span>◎ 100% Multi-tier Match<br /><small className="font-normal">Automated reconciliation</small></span><span>✓ Audit Protection<br /><small className="font-normal">Defensible filings</small></span></div></div><div className="fade-up hero-delay-2 relative rounded-3xl bg-[#003b8f] p-3 shadow-2xl transition hover:-translate-y-2"><img src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1100&q=85" alt="GST return filing" className="h-80 w-full rounded-2xl object-cover" /><div className="absolute -bottom-5 -left-5 rounded-2xl bg-[#1454b8] px-6 py-5 text-white shadow-xl"><p className="font-bold">Statutory Return Filing</p><p className="mt-1 text-sm text-blue-100">Timely. Reconciled. Defensible.</p></div></div></div></section>
    <section className="mx-auto max-w-7xl px-4 py-16"><div className="mb-10 text-center"><p className="text-sm font-bold text-[#1454b8]">STATUTORY RETURN CATEGORIES</p><h2 className="mt-2 text-3xl font-extrabold text-[#07184a]">Comprehensive Return Coverage Across Schedules</h2><div className="mx-auto mt-4 h-1 w-12 bg-[#1454b8]" /></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{returnTypes.map(([title, description], index) => <div key={title} className="fade-up rounded-2xl border bg-white p-6 text-center shadow-sm transition hover:-translate-y-2 hover:shadow-xl" style={{ animationDelay: `${index * 80}ms` }}><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-xl text-[#1454b8]">◎</div><h3 className="font-bold text-[#07184a]">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></div>)}</div><div className="mt-8 rounded-xl bg-blue-50 p-5 text-center text-sm font-semibold text-[#1454b8]">⚙ Continuous Reconciliation. Zero Discrepancies.<span className="ml-2 font-normal text-slate-600">Cross-matched against GSTR-2B before every submission to safeguard against departmental inquiries.</span></div></section>
    <section id="filing-process" className="bg-white"><div className="mx-auto max-w-7xl px-4 py-16"><div className="mb-12 text-center"><p className="text-sm font-bold text-[#1454b8]">COMPLIANCE WORKFLOW</p><h2 className="mt-2 text-3xl font-extrabold text-[#07184a]">Our Systematic Return Filing Methodology</h2></div><div className="grid gap-8 md:grid-cols-5">{filingSteps.map(([title, description], index) => <div key={title} className="fade-up text-center" style={{ animationDelay: `${index * 100}ms` }}><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-4 border-blue-100 bg-blue-50 font-bold text-[#1454b8]">0{index + 1}</div><h3 className="font-bold text-[#07184a]">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></div>)}</div><div className="mt-12 flex flex-col items-center justify-between gap-5 rounded-2xl bg-gradient-to-r from-[#003b8f] to-[#1454b8] p-8 text-white md:flex-row"><div><h2 className="text-2xl font-extrabold">Eliminate return filing friction forever.</h2><p className="mt-2 text-blue-100">Senior chartered accountants review and certify your statutory filings every single cycle.</p></div><a href="/signup" className="rounded-lg bg-white px-8 py-3 font-bold text-[#003b8f] transition hover:-translate-y-1">Get Started Today</a></div><div className="mt-8 grid grid-cols-2 gap-4 text-center text-xs font-semibold text-[#07184a] md:grid-cols-4"><span>♧ Senior CA Review</span><span>♧ Bank-Grade Data Security</span><span>◷ Zero-Penalty Guarantee</span><span>₹ Transparent Fee Schedule</span></div></div></section>
  </div>
    </PublicLayout>
  );
}

export function ComplianceServicePage() {
  const content = useContent('content_service_gst-compliance', {
    heroBadge: 'INDIRECT TAX GOVERNANCE',
    heroTitle: 'Continuous GST Compliance & Capital Risk Shield',
    heroSubtitle: 'Institutional oversight covering vendor tax compliance, real-time ITC matching, and calendar adherence to protect enterprise working capital.',
  });

  return (
    <PublicLayout
      meta={complianceMeta}
      jsonLd={serviceSchema(
        'GST Compliance & Dynamic 2B ITC Recovery',
        'Continuous purchase ledger audits, automated defaulting vendor tracking, and 100% eligible ITC recovery.',
        'GST Compliance',
        '/services/gst-compliance'
      )}
    >
      <div className="bg-slate-50">
    <section className="relative overflow-hidden bg-gradient-to-br from-[#eef5ff] via-white to-blue-50"><div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24"><div className="fade-up"><span className="inline-flex rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-[#004aad]">{content.heroBadge}</span><h1 className="mt-6 text-5xl font-extrabold leading-tight text-[#07184a]">{content.heroTitle}</h1><p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">{content.heroSubtitle}</p><div className="mt-8 flex flex-wrap gap-4"><a href="/signup" className="rounded-lg bg-[#003b8f] px-6 py-3 font-bold text-white transition hover:-translate-y-1">Get Started Today</a><a href="#compliance-process" className="rounded-lg border border-[#003b8f] px-6 py-3 font-bold text-[#003b8f]">How It Works</a></div><div className="mt-10 grid grid-cols-3 gap-4 text-sm font-semibold text-slate-700"><span>✓ Statutory Adherence<br /><small className="font-normal">Strict GST legal framework</small></span><span>◷ Proactive Calendar<br /><small className="font-normal">Scheduled filings</small></span><span>◎ Capital Protection<br /><small className="font-normal">Stop credit leakage</small></span></div></div><div className="fade-up hero-delay-2 relative rounded-3xl bg-[#003b8f] p-3 shadow-2xl transition hover:-translate-y-2"><img src="https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=1100&q=85" alt="GST compliance management" className="h-80 w-full rounded-2xl object-cover" /><div className="absolute -bottom-5 -left-5 rounded-2xl bg-[#1454b8] px-6 py-5 text-white shadow-xl"><p className="font-bold">Indirect Tax Governance</p><p className="mt-1 text-sm text-blue-100">Enterprise compliance management.</p></div></div></div></section>
    <section className="mx-auto max-w-7xl px-4 py-16"><div className="mb-10 text-center"><p className="text-sm font-bold text-[#1454b8]">GOVERNANCE AREAS</p><h2 className="mt-2 text-3xl font-extrabold text-[#07184a]">Core Pillars of Indirect Tax Governance</h2><div className="mx-auto mt-4 h-1 w-12 bg-[#1454b8]" /></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{complianceAreas.map(([title, description], index) => <div key={title} className="fade-up rounded-2xl border bg-white p-6 text-center shadow-sm transition hover:-translate-y-2 hover:shadow-xl" style={{ animationDelay: `${index * 80}ms` }}><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-xl text-[#1454b8]">◎</div><h3 className="font-bold text-[#07184a]">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></div>)}</div><div className="mt-8 rounded-xl bg-blue-50 p-5 text-center text-sm font-semibold text-[#1454b8]">✓ Prevent Disallowances. Safeguard Liquidity.<span className="ml-2 font-normal text-slate-600">Active monitoring catches defaulting vendors and unreconciled invoices before quarterly cutoff dates.</span></div></section>
    <section id="compliance-process" className="bg-white"><div className="mx-auto max-w-7xl px-4 py-16"><div className="mb-12 text-center"><p className="text-sm font-bold text-[#1454b8]">COMPLIANCE FRAMEWORK</p><h2 className="mt-2 text-3xl font-extrabold text-[#07184a]">Our Managed Compliance Methodology</h2></div><div className="grid gap-8 md:grid-cols-5">{complianceSteps.map(([title, description], index) => <div key={title} className="fade-up text-center" style={{ animationDelay: `${index * 100}ms` }}><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-4 border-blue-100 bg-blue-50 font-bold text-[#1454b8]">0{index + 1}</div><h3 className="font-bold text-[#07184a]">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></div>)}</div><div className="mt-12 text-center"><p className="text-sm font-bold text-[#1454b8]">INSTITUTIONAL INTEGRITY</p><h2 className="mt-2 text-2xl font-extrabold text-[#07184a]">Your Tax Position. Fully Defended.</h2><div className="mt-8 grid grid-cols-2 gap-5 text-sm font-semibold text-[#07184a] md:grid-cols-4"><span>♧ Practicing CAs<br /><small className="font-normal text-slate-600">Direct senior oversight</small></span><span>✓ Dynamic Notification Watch<br /><small className="font-normal text-slate-600">Continuous legal updates</small></span><span>◎ Algorithmic Reconciliation<br /><small className="font-normal text-slate-600">Zero error tolerance</small></span><span>♧ Confidential Protocols<br /><small className="font-normal text-slate-600">ISO-grade safeguards</small></span></div></div><div className="mt-12 flex flex-col items-center justify-between gap-5 rounded-2xl bg-gradient-to-r from-[#003b8f] to-[#1454b8] p-8 text-white md:flex-row"><div><h2 className="text-2xl font-extrabold">Maintain continuous tax governance effortlessly.</h2><p className="mt-2 text-blue-100">Let our indirect tax specialists oversee compliance while you focus on core operations.</p></div><a href="/signup" className="rounded-lg bg-white px-8 py-3 font-bold text-[#003b8f] transition hover:-translate-y-1">Get Started Today</a></div></div></section>
  </div>
    </PublicLayout>
  );
}

export function RefundServicePage() {
  const content = useContent('content_service_gst-refund', {
    heroBadge: 'CAPITAL RECOVERY SOLUTIONS',
    heroTitle: 'Expedited GST Refund Management & Recovery',
    heroSubtitle: 'Maximal capital recovery for exporters, inverted duty structures, and surplus cash ledgers with institutional CA verification and end-to-end follow-through.',
  });

  return (
    <PublicLayout
      meta={refundMeta}
      jsonLd={serviceSchema(
        'GST Refund Recovery Services',
        'Expedited GST refund assistance for exporters and inverted duty structures with statutory CA certification.',
        'GST Refund',
        '/services/gst-refund'
      )}
    >
      <div className="bg-slate-50">
    <section className="relative overflow-hidden bg-gradient-to-br from-[#eef5ff] via-white to-blue-50"><div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24"><div className="fade-up"><span className="inline-flex rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-[#004aad]">{content.heroBadge}</span><h1 className="mt-6 text-5xl font-extrabold leading-tight text-[#07184a]">{content.heroTitle}</h1><p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">{content.heroSubtitle}</p><div className="mt-8 flex flex-wrap gap-4"><a href="/signup" className="rounded-lg bg-[#003b8f] px-6 py-3 font-bold text-white transition hover:-translate-y-1">Check Your Refund Eligibility</a><a href="#refund-process" className="rounded-lg border border-[#003b8f] px-6 py-3 font-bold text-[#003b8f]">How It Works</a></div><div className="mt-10 grid grid-cols-3 gap-4 text-sm font-semibold text-slate-700"><span>⚡ Expedited Disbursement<br /><small className="font-normal">Structured application filing</small></span><span>✓ Statutory CA Certification<br /><small className="font-normal">Annexure & ledger audit</small></span><span>◎ 100% Eligible Recovery<br /><small className="font-normal">Zero unrecovered balance</small></span></div></div><div className="fade-up hero-delay-2 relative rounded-3xl bg-[#003b8f] p-3 shadow-2xl transition hover:-translate-y-2"><img src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1100&q=85" alt="GST refund assistance" className="h-80 w-full rounded-2xl object-cover" /><div className="absolute -bottom-5 -left-5 rounded-2xl bg-[#1454b8] px-6 py-5 text-white shadow-xl"><p className="font-bold">GST Refund Recovery</p><p className="mt-1 text-sm text-blue-100">Disbursed directly to bank.</p></div></div></div></section>
    <section className="mx-auto max-w-7xl px-4 py-16"><div className="mb-10 text-center"><p className="text-sm font-bold text-[#1454b8]">STATUTORY ELIGIBILITY</p><h2 className="mt-2 text-3xl font-extrabold text-[#07184a]">Qualifying Refund Scenarios & Portfolios</h2></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{refundEligibility.map(([title, description], index) => <div key={title} className="fade-up rounded-2xl border bg-white p-6 text-center shadow-sm transition hover:-translate-y-2 hover:shadow-xl" style={{ animationDelay: `${index * 80}ms` }}><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-xl text-[#1454b8]">◎</div><h3 className="font-bold text-[#07184a]">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></div>)}</div><div className="mt-8 rounded-xl bg-blue-50 p-5 text-center text-sm font-semibold text-[#1454b8]">✓ Release Trapped Working Capital.<span className="ml-2 font-normal text-slate-600">Our tax specialists structure, certify, and advocate your refund applications to secure swift administrative sanction.</span></div></section>
    <InteractiveDocumentChecklist
      title="Required Records for GST Refund Processing"
      subtitle="DOCUMENTATION DOSSIER"
      items={refundDocuments}
    />
    <section id="refund-process" className="mx-auto max-w-7xl px-4 py-16"><div className="mb-12 text-center"><p className="text-sm font-bold text-[#1454b8]">DISBURSEMENT WORKFLOW</p><h2 className="mt-2 text-3xl font-extrabold text-[#07184a]">Our End-to-End Refund Recovery Methodology</h2></div><div className="grid gap-8 md:grid-cols-5">{refundSteps.map(([title, description], index) => <div key={title} className="fade-up text-center" style={{ animationDelay: `${index * 100}ms` }}><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-4 border-blue-100 bg-blue-50 font-bold text-[#1454b8]">0{index + 1}</div><h3 className="font-bold text-[#07184a]">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></div>)}</div><div className="mt-12 flex flex-col items-center justify-between gap-5 rounded-2xl bg-gradient-to-r from-[#003b8f] to-[#1454b8] p-8 text-white md:flex-row"><div><h2 className="text-2xl font-extrabold">Accelerate your indirect tax refund claim today.</h2><p className="mt-2 text-blue-100">Ensure compliant documentation and speed up direct bank credit.</p></div><a href="/signup" className="rounded-lg bg-white px-8 py-3 font-bold text-[#003b8f] transition hover:-translate-y-1">Initiate Refund Assessment</a></div></section>
  </div>
    </PublicLayout>
  );
}

export function AuditServicePage() {
  return (
    <PublicLayout
      meta={auditMeta}
      jsonLd={serviceSchema(
        'GST Audit & Notice Defense Services',
        'Professional GST audit representation, scrutiny notice reply (ASMT-10/DRC-01), and certified GSTR-9C sign-off.',
        'GST Audit',
        '/services/gst-audit'
      )}
    >
      <div className="bg-slate-50">
    <section className="relative overflow-hidden bg-gradient-to-br from-[#eef5ff] via-white to-blue-50"><div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24"><div className="fade-up"><span className="inline-flex rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-[#004aad]">STATUTORY SCRUTINY & ASSESSMENT</span><h1 className="mt-6 text-5xl font-extrabold leading-tight text-[#07184a]">GST Audit, Assessment & <span className="text-[#1454b8]">Departmental Defense</span></h1><p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Rigorous year-end reconciliation (GSTR-9/9C), risk exposure audits, and strategic defense representation before adjudicating tax authorities.</p><div className="mt-8 flex flex-wrap gap-4"><a href="/contact" className="rounded-lg bg-[#003b8f] px-6 py-3 font-bold text-white transition hover:-translate-y-1">Book a Consultation</a><a href="#audit-process" className="rounded-lg border border-[#003b8f] px-6 py-3 font-bold text-[#003b8f]">How It Works</a></div><div className="mt-10 grid grid-cols-3 gap-4 text-sm font-semibold text-slate-700"><span>✓ Senior CA Representation<br /><small className="font-normal">Authorized advocacy</small></span><span>◎ Exposure Mitigation<br /><small className="font-normal">Defensible reconciliations</small></span><span>♧ ASMT & DRC Defense<br /><small className="font-normal">Comprehensive notice brief</small></span></div></div><div className="fade-up hero-delay-2 relative rounded-3xl bg-[#003b8f] p-3 shadow-2xl transition hover:-translate-y-2"><img src="https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=1100&q=85" alt="GST audit and assessment" className="h-80 w-full rounded-2xl object-cover" /><div className="absolute -bottom-5 -left-5 rounded-2xl bg-[#1454b8] px-6 py-5 text-white shadow-xl"><p className="font-bold">Audit & Notice Defense</p><p className="mt-1 text-sm text-blue-100">Senior CA representation.</p></div></div></div></section>
    <section className="mx-auto max-w-7xl px-4 py-16"><div className="mb-10 text-center"><p className="text-sm font-bold text-[#1454b8]">ASSESSMENT CATEGORIES</p><h2 className="mt-2 text-3xl font-extrabold text-[#07184a]">Statutory Audits & Scrutiny Proceedings Covered</h2><div className="mx-auto mt-4 h-1 w-12 bg-[#1454b8]" /></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{auditTypes.map(([title, description], index) => <div key={title} className="fade-up rounded-2xl border bg-white p-6 text-center shadow-sm transition hover:-translate-y-2 hover:shadow-xl" style={{ animationDelay: `${index * 80}ms` }}><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-xl text-[#1454b8]">◎</div><h3 className="font-bold text-[#07184a]">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></div>)}</div></section>
    <section className="bg-blue-50"><div className="mx-auto max-w-7xl px-4 py-12"><div className="mb-8 text-center"><p className="text-sm font-bold text-[#1454b8]">PRACTICE SCOPE</p><h2 className="mt-2 text-3xl font-extrabold text-[#07184a]">Comprehensive Audit & Notice Defense Solutions</h2></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{auditServices.map(([title, description], index) => <div key={title} className="fade-up rounded-xl bg-white p-5 shadow-sm" style={{ animationDelay: `${index * 70}ms` }}><h3 className="font-bold text-[#07184a]">{title}</h3><p className="mt-2 text-sm text-slate-600">{description}</p></div>)}</div></div></section>
    <InteractiveDocumentChecklist
      title="Statutory Records Required for Audit Review"
      subtitle="AUDIT DOSSIER"
      items={auditDocs}
    />
    <section id="audit-process" className="mx-auto max-w-7xl px-4 py-16"><div className="mb-12 text-center"><p className="text-sm font-bold text-[#1454b8]">DEFENSE WORKFLOW</p><h2 className="mt-2 text-3xl font-extrabold text-[#07184a]">Our Structured Audit & Notice Defense Process</h2></div><div className="grid gap-8 md:grid-cols-3 lg:grid-cols-6">{auditSteps.map(([title, description], index) => <div key={title} className="fade-up text-center" style={{ animationDelay: `${index * 90}ms` }}><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-4 border-blue-100 bg-blue-50 font-bold text-[#1454b8]">0{index + 1}</div><h3 className="font-bold text-[#07184a]">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></div>)}</div><div className="mt-12 flex flex-col items-center justify-between gap-5 rounded-2xl bg-gradient-to-r from-[#003b8f] to-[#1454b8] p-8 text-white md:flex-row"><div><h2 className="text-2xl font-extrabold">Defend your indirect tax positions with authority.</h2><p className="mt-2 text-blue-100">Senior chartered accountants evaluate departmental queries and draft airtight submissions.</p></div><a href="/contact" className="rounded-lg bg-white px-8 py-3 font-bold text-[#003b8f] transition hover:-translate-y-1">Schedule Defense Review</a></div></section>
  </div>
    </PublicLayout>
  );
}

export function AdvisoryServicePage() {
  return (
    <PublicLayout
      meta={advisoryMeta}
      jsonLd={serviceSchema(
        'GST Advisory Services & Tax Planning',
        'Strategic GST advisory and indirect tax planning to optimize tax liability, mitigate litigation risk, and resolve classification disputes.',
        'GST Advisory',
        '/services/gst-advisory'
      )}
    >
      <div className="bg-slate-50">
    <section className="relative overflow-hidden bg-gradient-to-br from-[#eef5ff] via-white to-blue-50"><div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24"><div className="fade-up"><p className="text-sm font-bold text-[#1454b8]">STRATEGIC TAX ADVISORY</p><h1 className="mt-5 text-5xl font-extrabold leading-tight text-[#07184a]">Strategic <span className="text-[#1454b8]">GST Advisory</span> & Regulatory Counsel</h1><h2 className="mt-4 text-2xl font-bold text-[#1454b8]">Proactive tax structuring, supply chain optimization, and dispute resolution.</h2><p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">Navigate the complexities of GST with senior CA counsel. We provide strategic guidance to structure operations, eliminate fiscal leakages, and defend contentious tax positions.</p><div className="mt-6 flex flex-wrap gap-5 text-sm font-semibold text-slate-700"><span>✓ Strategic Structuring</span><span>✓ Risk Mitigation</span><span>✓ Capital Optimization</span></div><a href="/contact" className="mt-8 inline-block rounded-lg bg-[#003b8f] px-6 py-3 font-bold text-white transition hover:-translate-y-1">Schedule a Consultation</a></div><div className="fade-up hero-delay-2 relative rounded-3xl bg-blue-100 p-8 shadow-xl transition hover:-translate-y-2"><div className="flex h-72 items-center justify-center text-8xl font-black tracking-tight text-[#1454b8]">GST</div><div className="absolute bottom-5 right-5 rounded-xl bg-white p-4 text-sm font-bold text-[#07184a] shadow-lg">TAX STRATEGY<br /><span className="font-normal text-slate-600">Plan. Comply. Scale.</span></div></div></div></section>
    <section className="mx-auto max-w-7xl px-4 py-16"><div className="mb-10 text-center"><p className="text-sm font-bold text-[#1454b8]">ENTERPRISE VALUE</p><h2 className="mt-2 text-3xl font-extrabold text-[#07184a]">Actionable Tax Intelligence. Protected Bottom Line.</h2><p className="mx-auto mt-3 max-w-2xl text-slate-600">Strategic tax advisory engineered to mitigate fiscal exposure, streamline cash flows, and unlock compounding operational savings.</p></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{advisoryBenefits.map(([title, description], index) => <div key={title} className="fade-up rounded-2xl border bg-white p-6 text-center shadow-sm transition hover:-translate-y-2 hover:shadow-xl" style={{ animationDelay: `${index * 90}ms` }}><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-xl text-[#1454b8]">◎</div><h3 className="font-bold text-[#07184a]">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></div>)}</div></section>
    <section className="bg-white"><div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-[1.2fr_.8fr]"><div><p className="text-sm font-bold text-[#1454b8]">PRACTICE CAPABILITIES</p><h2 className="mt-2 text-3xl font-extrabold text-[#07184a]">Specialized Indirect Tax Advisory Services</h2><div className="mt-8 grid gap-6 sm:grid-cols-2">{advisoryServices.map(([title, description], index) => <div key={title} className="fade-up" style={{ animationDelay: `${index * 80}ms` }}><h3 className="font-bold text-[#07184a]">◎ {title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></div>)}</div></div><div className="h-80 rounded-2xl bg-cover bg-center shadow-xl" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=85)' }} /></div></section>
    <section className="mx-auto max-w-7xl px-4 py-12"><div className="flex flex-col items-center justify-between gap-5 rounded-2xl bg-gradient-to-r from-[#003b8f] to-[#1454b8] p-8 text-white md:flex-row"><div><h2 className="text-2xl font-extrabold">Need strategic counsel on your corporate indirect tax structure?</h2><p className="mt-2 text-blue-100">Consult with senior indirect tax advisors today.</p></div><a href="/contact" className="rounded-lg bg-white px-8 py-3 font-bold text-[#003b8f] transition hover:-translate-y-1">Get in Touch →</a></div></section>
  </div>
    </PublicLayout>
  );
}

export function TdsTcsServicePage() {
  return (
    <PublicLayout
      meta={tdsTcsMeta}
      jsonLd={serviceSchema(
        'GST TDS & TCS Compliance Services (GSTR-7 & GSTR-8)',
        'Professional GST TDS (Section 51) and TCS (Section 52) filing services for government entities, PSUs, and e-commerce operators across India.',
        'GST TDS TCS',
        '/services/gst-tds-tcs'
      )}
    >
      <div className="bg-slate-50">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#eef5ff] via-white to-blue-50">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
            <div className="fade-up">
              <span className="inline-flex rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-[#004aad]">
                STATUTORY DEDUCTION & COLLECTION (SEC 51 / 52)
              </span>
              <h1 className="mt-6 text-5xl font-extrabold leading-tight text-[#07184a]">
                Precision <span className="text-[#1454b8]">GST TDS & TCS Compliance</span> Management
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                End-to-end statutory deduction (Section 51) and collection (Section 52) management, monthly GSTR-7 and GSTR-8 filings, and automated certificate generation for PSUs, government entities, and e-commerce platforms.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a href="/signup" className="rounded-lg bg-[#003b8f] px-6 py-3 font-bold text-white transition hover:-translate-y-1 hover:bg-[#1454b8]">
                  Get Started Today
                </a>
                <a href="#tds-process" className="rounded-lg border border-[#003b8f] px-6 py-3 font-bold text-[#003b8f] transition hover:bg-blue-50">
                  How It Works
                </a>
              </div>
              <div className="mt-10 grid grid-cols-3 gap-4 text-sm font-semibold text-slate-700">
                <span>⚡ On-Time GSTR-7 / 8<br /><small className="font-normal">Zero late fee exposure</small></span>
                <span>✓ GSTR-7A Issuance<br /><small className="font-normal">Instant digital certificates</small></span>
                <span>◎ 100% Reconciled<br /><small className="font-normal">Cash ledger credit matching</small></span>
              </div>
            </div>
            <div className="fade-up hero-delay-2 relative rounded-3xl bg-[#003b8f] p-3 shadow-2xl transition hover:-translate-y-2">
              <img src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1100&q=85" alt="GST TDS and TCS compliance" className="h-80 w-full rounded-2xl object-cover" />
              <div className="absolute -bottom-5 -left-5 rounded-2xl bg-[#1454b8] px-6 py-5 text-white shadow-xl">
                <p className="font-bold">GST TDS & TCS Services</p>
                <p className="mt-1 text-sm text-blue-100">Section 51 & 52 Statutory Compliance.</p>
              </div>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 py-16">
          <div className="mb-10 text-center">
            <p className="text-sm font-bold text-[#1454b8]">STATUTORY PRACTICE SCOPE</p>
            <h2 className="mt-2 text-3xl font-extrabold text-[#07184a]">Core GST TDS & TCS Management Capabilities</h2>
            <div className="mx-auto mt-4 h-1 w-12 bg-[#1454b8]" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tdsTcsFrameworks.map(([title, description], index) => (
              <div key={title} className="fade-up rounded-2xl border bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl" style={{ animationDelay: `${index * 80}ms` }}>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-xl text-[#1454b8]">◎</div>
                <h3 className="font-bold text-[#07184a]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </section>
        <div className="mx-auto grid max-w-7xl grid-cols-3 gap-3 rounded-xl bg-white px-4 py-4 text-center text-xs font-bold text-[#1454b8] shadow-sm">
          <span>◎ Section 51 (TDS) Compliance</span>
          <span>◷ Section 52 (TCS) Compliance</span>
          <span>♧ Automated GSTR-7A Issuance</span>
        </div>
        <InteractiveDocumentChecklist
          title="Records Required for TDS & TCS Filing"
          subtitle="COMPLIANCE DOSSIER"
          items={tdsTcsDocuments}
        />
        <section className="bg-white pb-16">
          <div className="mx-auto max-w-7xl px-4">
            <div id="tds-process" className="mb-12 text-center">
              <p className="text-sm font-bold text-[#1454b8]">COMPLIANCE WORKFLOW</p>
              <h2 className="mt-2 text-3xl font-extrabold text-[#07184a]">Our Systematic Filing & Certificate Issuance Process</h2>
            </div>
            <div className="grid gap-8 md:grid-cols-5">
              {tdsTcsSteps.map(([title, description], index) => (
                <div key={title} className="fade-up text-center" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-4 border-blue-100 bg-blue-50 font-bold text-[#1454b8]">0{index + 1}</div>
                  <h3 className="font-bold text-[#07184a]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                </div>
              ))}
            </div>
            <div className="mt-14 flex flex-col items-center justify-between gap-5 rounded-2xl bg-gradient-to-r from-[#003b8f] to-[#1454b8] p-8 text-white md:flex-row">
              <div>
                <h2 className="text-2xl font-extrabold">Ensure Seamless GST TDS & TCS Governance</h2>
                <p className="mt-2 text-blue-100">Let licensed Chartered Accountants handle deduction computations, return filings, and certificate dispatch.</p>
              </div>
              <a href="/signup" className="rounded-lg bg-white px-8 py-3 font-bold text-[#003b8f] transition hover:-translate-y-1">Get Started Today</a>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}

export { ServicesHubPage } from './ServicesHubPage';


const businessLicenses = [
  ['Shop & Establishment Registration', 'Mandatory registration for shops, commercial establishments, and businesses. Documents: Aadhaar, PAN, address proof, photo, rent agreement, business details. Benefits: legal recognition, avoid penalties, credibility. Timeline: 7–15 working days.'],
  ['Trade License', 'Local municipal license required to carry out business operations. Documents: shop certificate, rent agreement/NOC, property tax receipt, layout plan, identity proof, photo. Benefits: legal operation and avoids penalties. Timeline: 15–30 working days.'],
  ['FSSAI Registration & License', 'Food registration and licensing for food businesses. Documents: PAN/Aadhaar, address proof, food safety plan, photo, product list. Benefits: legal food business, customer trust, wider markets. Timeline: 7–15 working days.'],
  ['MSME / Udyam Registration', 'Register as an MSME and receive recognition, benefits, and subsidies. Documents: Aadhaar, PAN, address proof, bank details, mobile, email. Benefits: government benefits, easy credit, tender priority. Timeline: 1–2 working days.'],
  ['IEC – Import Export Code', 'Mandatory 10-digit code for businesses involved in import or export. Documents: PAN, Aadhaar, address proof, bank details, DSC. Benefits: import-export, global expansion, incentives. Timeline: 2–3 working days.'],
  ['Professional Tax Registration', 'State-level registration and compliance for professionals and businesses. Documents: PAN, address proof, Aadhaar, incorporation certificate. Benefits: legal compliance and smooth operations. Timeline: 7–15 working days.'],
  ['Digital Signature Certificate (DSC)', 'Secure online signatures for government transactions and e-filings. Documents: PAN, Aadhaar, photo, email, mobile. Benefits: secure filings, legal validity, time saving. Timeline: 1–2 working days.'],
  ['Startup India Registration', 'Recognition and benefits for eligible innovative startups. Documents: PAN, Aadhaar, incorporation deed, pitch deck, website. Benefits: tax benefits, funding support, recognition. Timeline: 3–5 working days.'],
];

export function BusinessLicensesPage() {
  const routes: Record<string, string> = {
    'Shop & Establishment Registration': '/services/business-licenses/shop-establishment',
    'Trade License': '/services/business-licenses/trade-license',
    'FSSAI Registration & License': '/services/business-licenses/fssai',
    'MSME / Udyam Registration': '/services/business-licenses/udyam',
    'IEC – Import Export Code': '/services/business-licenses/iec',
    'Professional Tax Registration': '/services/business-licenses/professional-tax',
    'Digital Signature Certificate (DSC)': '/services/business-licenses/dsc',
    'Startup India Registration': '/services/business-licenses/startup-india',
  };

  return (
    <PublicLayout meta={businessLicensesMeta}>
      <div className="bg-slate-50 py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: 'Services', path: '/services' }, { name: 'Business Licenses', path: '/services/business-licenses' }]} />

          <div className="text-center max-w-3xl mx-auto mt-6 mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200 px-3.5 py-1 rounded-full inline-block mb-3">
              Statutory Business Licenses
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Essential Licenses & Government Registrations
            </h1>
            <p className="text-slate-600 mt-4 text-base sm:text-lg">
              End-to-end licensing assistance for startups, traders, manufacturers, and professional service providers across India.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {businessLicenses.map(([title, description]) => (
              <a
                key={title}
                href={routes[title] ?? '/contact'}
                className="fintech-card p-6 flex flex-col justify-between group hover:border-blue-400"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4 group-hover:scale-105 transition-transform">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug mb-2">
                    {title}
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {description.split(' Documents:')[0]}
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                  <span>Learn Requirements →</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export function ProfessionalTaxPage() {
  const documents = ['PAN Card of business or individual', 'Business registration proof', 'Identity proof (Aadhaar / PAN)', 'Address proof (Aadhaar / utility bill)', 'Details of partners, directors or employees'];
  const steps = ['Check state applicability', 'Gather required documents', 'Apply online on the state portal', 'Authority review', 'Pay applicable fee', 'Receive PT registration certificate'];
  return <PublicLayout meta={professionalTaxMeta}><section className="bg-gradient-to-br from-[#eef5ff] via-white to-blue-50"><div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-2"><div><p className="text-sm font-bold text-[#1454b8]">BUSINESS LICENSES & CERTIFICATIONS</p><h1 className="mt-3 text-4xl font-extrabold text-[#07184a]">Professional Tax Registration</h1><p className="mt-4 text-slate-600">State-level registration and compliance for professionals and businesses.</p><a href="/contact" className="mt-6 inline-block rounded bg-[#1454b8] px-5 py-3 font-bold text-white">Get Started Now →</a></div><div className="rounded-3xl bg-blue-100 p-10 text-center text-8xl">📋</div></div></section><section className="mx-auto max-w-7xl space-y-4 px-4 py-12"><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">What is Professional Tax?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Professional Tax is a state-level tax on income from professions, employment, trade or business. Registration requirements, rates and filing dates differ by state.</p></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Who Should Register?</h2><div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3"><span>• Companies, firms and LLPs</span><span>• Proprietorships and partnerships</span><span>• Salaried employers</span><span>• Doctors, CAs, lawyers and consultants</span><span>• Businesses liable under state PT law</span></div></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Documents Required</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{documents.map((document) => <div key={document} className="rounded-lg bg-blue-50 p-3 text-sm text-slate-700">▣ {document}</div>)}</div></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Registration Process</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">{steps.map((step, index) => <div key={step} className="text-center"><div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-blue-100 font-bold text-[#1454b8]">{index + 1}</div><p className="mt-2 text-xs font-semibold text-slate-700">{step}</p></div>)}</div></article><div className="grid gap-4 md:grid-cols-3"><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Timeline</h2><p className="mt-2 text-sm text-slate-600">Typically 7–15 working days after submission and verification.</p></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Benefits</h2><p className="mt-2 text-sm text-slate-600">Maintains legal compliance, avoids penalties and supports smooth business operations.</p></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Fees</h2><p className="mt-2 text-sm text-slate-600">Professional Tax varies by state and applicable registration type.</p></article></div><div className="rounded-xl bg-[#063a8d] p-7 text-white"><h2 className="text-2xl font-bold">Ensure Professional Tax Compliance.</h2><p className="mt-2 text-blue-100">GSTBro can handle registration and ongoing compliance for your business.</p><a href="/contact" className="mt-4 inline-block rounded bg-white px-5 py-3 font-bold text-[#063a8d]">Get Started Now →</a></div></section></PublicLayout>;
}

export function DscPage() {
  const documents = ['PAN Card', 'Aadhaar Card', 'Passport size photograph', 'Email ID', 'Mobile number', 'Address proof (if required by certifying authority)'];
  const steps = ['Apply for DSC online with GSTBro', 'Document verification (KYC)', 'DSC application submitted', 'DSC issued by certifying authority', 'Use DSC to sign and e-verify documents'];
  return <PublicLayout meta={dscMeta}><section className="bg-gradient-to-br from-[#eef5ff] via-white to-blue-50"><div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-2"><div><p className="text-sm font-bold text-[#1454b8]">BUSINESS LICENSES & CERTIFICATIONS</p><h1 className="mt-3 text-4xl font-extrabold text-[#07184a]">Digital Signature Certificate (DSC)</h1><p className="mt-4 text-slate-600">Secure online signatures for government transactions and e-filings.</p><a href="/contact" className="mt-6 inline-block rounded bg-[#1454b8] px-5 py-3 font-bold text-white">Apply for DSC Now →</a></div><div className="rounded-3xl bg-blue-100 p-10 text-center text-8xl">🔒</div></div></section><section className="mx-auto max-w-7xl space-y-4 px-4 py-12"><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">What is Digital Signature Certificate (DSC)?</h2><p className="mt-2 text-sm leading-6 text-slate-600">A DSC is an electronic key that authenticates the identity of an individual or organization in online transactions. It is issued by certifying authorities licensed by the Government of India and is equivalent to a physical signature.</p></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Who Needs DSC?</h2><div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3"><span>• Directors of companies</span><span>• Chartered accountants</span><span>• Professionals using government portals</span><span>• Partners in LLP / firms</span><span>• Tax consultants</span></div></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Documents Required</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{documents.map((document) => <div key={document} className="rounded-lg bg-blue-50 p-3 text-sm text-slate-700">▣ {document}</div>)}</div></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">How DSC Works</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{steps.map((step, index) => <div key={step} className="text-center"><div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-blue-100 font-bold text-[#1454b8]">{index + 1}</div><p className="mt-2 text-xs font-semibold text-slate-700">{step}</p></div>)}</div></article><div className="grid gap-4 md:grid-cols-3"><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Validity</h2><p className="mt-2 text-sm text-slate-600">Available in 1 year, 2 years and 3 years validity options.</p></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Benefits of DSC</h2><p className="mt-2 text-sm text-slate-600">Legally valid signature, mandatory for many filings, better security, authenticity and integrity.</p></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Fees</h2><p className="mt-2 text-sm text-slate-600">Fees depend on certificate type and validity; generally starts from ₹1,199 onwards.</p></article></div><div className="rounded-xl bg-[#063a8d] p-7 text-white"><h2 className="text-2xl font-bold">Get Your Digital Signature Certificate Today!</h2><p className="mt-2 text-blue-100">Simplify online filings and stay compliant with GSTBro.</p><a href="/contact" className="mt-4 inline-block rounded bg-white px-5 py-3 font-bold text-[#063a8d]">Apply for DSC Now →</a></div></section></PublicLayout>;
}

export function StartupIndiaPage() {
  const documents = ['Certificate of incorporation / registration', 'PAN Card of company / LLP', 'Pitch deck / business plan', 'Brief write-up about products or services', 'Details of directors / partners', 'Other supporting documents (if any)'];
  const steps = ['Register on Startup India Portal', 'Fill Startup application form', 'Upload required documents', 'Self-certification by founder', 'Submit application for recognition', 'Receive recognition certificate'];
  return <PublicLayout meta={startupIndiaMeta}><section className="bg-gradient-to-br from-[#eef5ff] via-white to-blue-50"><div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-2"><div><p className="text-sm font-bold text-[#1454b8]">BUSINESS LICENSES & CERTIFICATIONS</p><h1 className="mt-3 text-4xl font-extrabold text-[#07184a]">Startup India Registration</h1><p className="mt-4 text-slate-600">Recognition and benefits for eligible innovative startups.</p><a href="/contact" className="mt-6 inline-block rounded bg-[#1454b8] px-5 py-3 font-bold text-white">Register Now →</a></div><div className="rounded-3xl bg-blue-100 p-10 text-center text-8xl">🚀</div></div></section><section className="mx-auto max-w-7xl space-y-4 px-4 py-12"><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">What is Startup India Registration?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Startup India is a Government of India initiative to build a strong ecosystem for nurturing innovation and startups. It provides recognition to eligible startups and offers various benefits, tax exemptions, funding opportunities and support.</p></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Who Can Apply?</h2><div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3"><span>• Private Limited Companies / LLPs</span><span>• Registered partnership firms</span><span>• Innovative products, services or processes</span><span>• Entities incorporated within 10 years</span><span>• Turnover not exceeding ₹100 crore</span></div></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Documents Required</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{documents.map((document) => <div key={document} className="rounded-lg bg-blue-50 p-3 text-sm text-slate-700">▣ {document}</div>)}</div></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Registration Process (100% Online)</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">{steps.map((step, index) => <div key={step} className="text-center"><div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-blue-100 font-bold text-[#1454b8]">{index + 1}</div><p className="mt-2 text-xs font-semibold text-slate-700">{step}</p></div>)}</div></article><div className="grid gap-4 md:grid-cols-3"><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Timeline</h2><p className="mt-2 text-sm text-slate-600">Typically 7–15 working days after successful submission.</p></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Benefits</h2><p className="mt-2 text-sm text-slate-600">Tax benefits, self-certification, funding access, government recognition and networking opportunities.</p></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Fees</h2><p className="mt-2 text-sm text-slate-600">There is no government fee for Startup India recognition. Professional fees apply.</p></article></div><div className="rounded-xl bg-[#063a8d] p-7 text-white"><h2 className="text-2xl font-bold">Ready to Get Startup India Recognition?</h2><p className="mt-2 text-blue-100">Get recognized and unlock growth opportunities for your startup.</p><a href="/contact" className="mt-4 inline-block rounded bg-white px-5 py-3 font-bold text-[#063a8d]">Register Now →</a></div></section></PublicLayout>;
}

export function IecPage() {
  const documents = ['PAN Card of business / proprietor / partner / director', 'Aadhaar Card of proprietor / partners / directors', 'Business or company registration certificate', 'Cancelled cheque / bank account proof', 'Digital Signature Certificate (DSC)', 'Passport-size photograph', 'Authorisation letter (if applicable)'];
  const steps = ['Register / login on portal', 'Fill IEC application form', 'Upload required documents', 'Pay application fee', 'DGFT verification', 'IEC code allotted'];
  return <PublicLayout meta={iecMeta}><section className="bg-gradient-to-br from-[#eef5ff] via-white to-blue-50"><div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-2"><div><p className="text-sm font-bold text-[#1454b8]">BUSINESS LICENSES & CERTIFICATIONS</p><h1 className="mt-3 text-4xl font-extrabold text-[#07184a]">IEC – Import Export Code</h1><p className="mt-4 text-slate-600">Mandatory 10-digit code for businesses involved in import or export to start international trade legally.</p><a href="/contact" className="mt-6 inline-block rounded bg-[#1454b8] px-5 py-3 font-bold text-white">Get Started Now →</a></div><div className="rounded-3xl bg-blue-100 p-10 text-center text-8xl">✈️</div></div></section><section className="mx-auto max-w-7xl space-y-4 px-4 py-12"><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">What is IEC?</h2><p className="mt-2 text-sm leading-6 text-slate-600">IEC (Import Export Code) is a 10-digit unique code issued by the Directorate General of Foreign Trade (DGFT), Ministry of Commerce & Industry. It is mandatory for businesses involved in import or export of goods or services from India.</p></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Who Needs IEC?</h2><div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2"><span>• Importers, traders, wholesalers and suppliers</span><span>• E-commerce sellers exporting goods</span><span>• Manufacturers and exporters</span><span>• Businesses receiving foreign payments</span><span>• Startups planning global trade</span></div></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Documents Required</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{documents.map((document) => <div key={document} className="rounded-lg bg-blue-50 p-3 text-sm text-slate-700">▣ {document}</div>)}</div></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Application Process (100% Online)</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">{steps.map((step, index) => <div key={step} className="text-center"><div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-blue-100 font-bold text-[#1454b8]">{index + 1}</div><p className="mt-2 text-xs font-semibold text-slate-700">{step}</p></div>)}</div></article><div className="grid gap-4 md:grid-cols-3"><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Timeline</h2><p className="mt-2 text-sm text-slate-600">Typically 1–3 working days after successful submission and verification.</p></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Benefits of IEC</h2><p className="mt-2 text-sm text-slate-600">Mandatory for trade, enables global opportunities, supports bank accounts, and builds credibility.</p></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Fees</h2><p className="mt-2 text-sm text-slate-600">Government IEC registration fee is ₹500 only (non-refundable).</p></article></div><div className="rounded-xl bg-[#063a8d] p-7 text-white"><h2 className="text-2xl font-bold">Ready to Get Your IEC Code?</h2><p className="mt-2 text-blue-100">Start your import/export journey with GSTBro. Quick, easy and hassle-free.</p><a href="/contact" className="mt-4 inline-block rounded bg-white px-5 py-3 font-bold text-[#063a8d]">Get Started Now →</a></div></section></PublicLayout>;
}

export function UdyamRegistrationPage() {
  const documents = ['Aadhaar Card of owner / director / partner', 'PAN Card of business / owner', 'Business / company registration certificate', 'Bank account details with IFSC code', 'Investment in plant & machinery / equipment details', 'Turnover details'];
  const steps = ['Visit the Udyam Registration Portal', 'Fill Aadhaar verification', 'Enter business, investment & turnover details', 'Self declaration & submit', 'Receive Udyam registration certificate'];
  return <PublicLayout meta={udyamMeta}><section className="bg-gradient-to-br from-[#eef5ff] via-white to-blue-50"><div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-2"><div><p className="text-sm font-bold text-[#1454b8]">BUSINESS LICENSES & CERTIFICATIONS</p><h1 className="mt-3 text-4xl font-extrabold text-[#07184a]">MSME / Udyam Registration</h1><p className="mt-4 text-slate-600">Register as an MSME and receive recognition, benefits and subsidies from the Government of India.</p><div className="mt-6 flex gap-3"><a href="/contact" className="rounded bg-[#1454b8] px-5 py-3 font-bold text-white">Register Now →</a><a href="/contact" className="rounded border border-[#1454b8] px-5 py-3 font-bold text-[#1454b8]">Talk to an Expert</a></div></div><div className="rounded-3xl bg-blue-100 p-10 text-center text-8xl">✅</div></div></section><section className="mx-auto max-w-7xl space-y-4 px-4 py-12"><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">What is MSME / Udyam Registration?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Udyam Registration is a Government of India initiative to promote and support Micro, Small and Medium Enterprises. It provides an MSME certificate and recognition along with access to credit, schemes, and subsidies.</p></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Who Can Apply?</h2><div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2"><span>• Micro, Small and Medium Enterprises</span><span>• One Person Companies (OPC)</span><span>• Proprietorships, Partnerships and LLPs</span><span>• Startups and new businesses</span><span>• Private Limited Companies</span><span>• Manufacturing and service businesses</span></div></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Documents Required</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{documents.map((document) => <div key={document} className="rounded-lg bg-blue-50 p-3 text-sm text-slate-700">▣ {document}</div>)}</div><p className="mt-3 text-xs text-slate-500">No documents need to be uploaded. Udyam is a self-declaration based registration.</p></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Registration Process (100% Online)</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{steps.map((step, index) => <div key={step} className="text-center"><div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-blue-100 font-bold text-[#1454b8]">{index + 1}</div><p className="mt-2 text-xs font-semibold text-slate-700">{step}</p></div>)}</div></article><div className="grid gap-4 md:grid-cols-3"><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Timeline</h2><p className="mt-2 text-sm text-slate-600">An instant process: certificate is issued immediately after successful submission.</p></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Benefits of Udyam Registration</h2><p className="mt-2 text-sm text-slate-600">Government recognition, loans and schemes, lower interest rates, tax benefits, and easier participation in tenders.</p></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Fees</h2><p className="mt-2 text-sm text-slate-600">There is no government fee for Udyam Registration. It is completely free.</p></article></div><div className="rounded-xl bg-[#063a8d] p-7 text-white"><h2 className="text-2xl font-bold">Ready to Register Your Business as MSME?</h2><p className="mt-2 text-blue-100">Get your Udyam Registration Certificate today and unlock numerous benefits.</p><a href="/contact" className="mt-4 inline-block rounded bg-white px-5 py-3 font-bold text-[#063a8d]">Register Now →</a></div></section></PublicLayout>;
}

export function FssaiLicensePage() {
  const documents = ['Passport size photograph', 'PAN Card / Aadhaar Card', 'Business address proof', 'Food safety management plan', 'List of food products', 'Rent agreement / NOC', 'Water test report (where applicable)', 'Certificate of incorporation / partnership deed'];
  const steps = ['Determine FSSAI registration type', 'Apply online on the FSSAI portal', 'Upload application and documents', 'Pay applicable fees', 'Authority verification', 'Receive FSSAI certificate / license'];
  return <PublicLayout meta={fssaiMeta}><section className="bg-gradient-to-br from-[#eef5ff] via-white to-blue-50"><div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-2"><div><p className="text-sm font-bold text-[#1454b8]">BUSINESS LICENSES & CERTIFICATIONS</p><h1 className="mt-3 text-4xl font-extrabold text-[#07184a]">FSSAI Registration & License</h1><p className="mt-4 text-slate-600">Food registration and licensing for food businesses to ensure food safety and build customer trust.</p><div className="mt-6 flex gap-3"><a href="/contact" className="rounded bg-[#1454b8] px-5 py-3 font-bold text-white">Get Started Now →</a><a href="/contact" className="rounded border border-[#1454b8] px-5 py-3 font-bold text-[#1454b8]">Talk to an Expert</a></div></div><div className="rounded-3xl bg-blue-100 p-10 text-center text-8xl">🥗</div></div></section><section className="mx-auto max-w-7xl space-y-4 px-4 py-12"><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">What is FSSAI Registration & License?</h2><p className="mt-2 text-sm leading-6 text-slate-600">FSSAI Registration or License is mandatory for all food businesses operating in India. It is issued by the Food Safety and Standards Authority of India (FSSAI) and ensures food quality, safety, and hygiene standards are maintained.</p></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Who Needs It?</h2><div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3"><span>• Restaurants, cafes and hotels</span><span>• Bakers, confectioners and sweet shops</span><span>• Food transport and logistics</span><span>• Food manufacturers and processors</span><span>• Retailers, wholesalers and distributors</span><span>• Cloud kitchens and delivery services</span></div></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Documents Required</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{documents.map((document) => <div key={document} className="rounded-lg bg-blue-50 p-3 text-sm text-slate-700">▣ {document}</div>)}</div></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Registration / Licensing Process</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">{steps.map((step, index) => <div key={step} className="text-center"><div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-blue-100 font-bold text-[#1454b8]">{index + 1}</div><p className="mt-2 text-xs font-semibold text-slate-700">{step}</p></div>)}</div></article><div className="grid gap-4 md:grid-cols-3"><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Timeline</h2><p className="mt-2 text-sm text-slate-600">FSSAI Registration: 7–10 working days. FSSAI License: 15–30 working days.</p></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Benefits</h2><p className="mt-2 text-sm text-slate-600">Legal compliance, customer trust, support for business growth, and required for FSSAI exports and tenders.</p></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Fees</h2><p className="mt-2 text-sm text-slate-600">Fees depend on registration or license type. Generally ranges from ₹100 to ₹7,500.</p></article></div><div className="rounded-xl bg-[#063a8d] p-7 text-white"><h2 className="text-2xl font-bold">Ready to Get FSSAI Registration or License?</h2><p className="mt-2 text-blue-100">Let GSTBro take care of the paperwork while you focus on your food business.</p><a href="/contact" className="mt-4 inline-block rounded bg-white px-5 py-3 font-bold text-[#063a8d]">Get Started Now →</a></div></section></PublicLayout>;
}

export function TradeLicensePage() {
  const documents = ['Application form', 'Proof of identity: Aadhaar Card / PAN Card', 'Address proof of business premises', 'Ownership / rent agreement / NOC', 'Passport size photograph', 'Layout plan / floor plan (if required)', 'Fire NOC (if applicable)', 'PAN card of business / owner'];
  const steps = ['Apply online / offline', 'Submit required documents', 'Verification by authority', 'Pay application fee', 'Receive trade license'];
  return <PublicLayout meta={tradeLicenseMeta}><section className="bg-gradient-to-br from-[#eef5ff] via-white to-blue-50"><div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-2"><div><p className="text-sm font-bold text-[#1454b8]">BUSINESS LICENSES & CERTIFICATIONS</p><h1 className="mt-3 text-4xl font-extrabold text-[#07184a]">Trade License</h1><p className="mt-4 text-slate-600">Local municipal license required to carry out business operations within the city or municipality limits.</p><div className="mt-6 flex gap-3"><a href="/contact" className="rounded bg-[#1454b8] px-5 py-3 font-bold text-white">Get Started Now →</a><a href="/contact" className="rounded border border-[#1454b8] px-5 py-3 font-bold text-[#1454b8]">Talk to an Expert</a></div></div><div className="rounded-3xl bg-blue-100 p-10 text-center text-8xl">🏬</div></div></section><section className="mx-auto max-w-7xl space-y-4 px-4 py-12"><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">What is a Trade License?</h2><p className="mt-2 text-sm leading-6 text-slate-600">A Trade License is a mandatory license issued by the local municipal authority that permits individuals or businesses to carry out specified commercial activities within local limits. It ensures compliance with local laws, safety standards, and health regulations.</p></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Who Needs It?</h2><div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2"><span>• Shops and retail stores</span><span>• Restaurants, cafes and hotels</span><span>• Commercial establishments</span><span>• Service providers and professionals</span><span>• Manufacturing units</span><span>• Any municipal business area</span></div></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Documents Required</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{documents.map((document) => <div key={document} className="rounded-lg bg-blue-50 p-3 text-sm text-slate-700">▣ {document}</div>)}</div></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Registration Process</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{steps.map((step, index) => <div key={step} className="text-center"><div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-blue-100 font-bold text-[#1454b8]">{index + 1}</div><p className="mt-2 text-xs font-semibold text-slate-700">{step}</p></div>)}</div></article><div className="grid gap-4 md:grid-cols-3"><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Timeline</h2><p className="mt-2 text-sm text-slate-600">Typically 15–30 working days depending on municipality and documents.</p></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Benefits</h2><p className="mt-2 text-sm text-slate-600">Legal permission, avoids penalties, enables business operations, and supports other registrations.</p></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Fees</h2><p className="mt-2 text-sm text-slate-600">Fees vary by business type, area, and municipal authority. Generally ₹500 to ₹5,000.</p></article></div><div className="rounded-xl bg-[#063a8d] p-7 text-white"><h2 className="text-2xl font-bold">Ready to Get Your Trade License?</h2><p className="mt-2 text-blue-100">Let GSTBro handle the paperwork while you focus on growing your business.</p><a href="/contact" className="mt-4 inline-block rounded bg-white px-5 py-3 font-bold text-[#063a8d]">Get Started Now →</a></div></section></PublicLayout>;
}

export function ShopEstablishmentPage() {
  const documents = ['Aadhaar Card of proprietor / director', 'PAN Card', 'Business address proof', 'Passport size photograph', 'Business proof / partnership deed', 'Identity proof of authorised signatory'];
  const steps = ['Information Collection', 'Document Verification', 'Application Filing', 'Verification by Authority', 'Certificate Issuance'];
  return <PublicLayout meta={shopEstablishmentMeta}><section className="bg-gradient-to-br from-[#eef5ff] via-white to-blue-50"><div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-2"><div><p className="text-sm font-bold text-[#1454b8]">LEGAL · MANDATORY · HASSLE-FREE</p><h1 className="mt-3 text-4xl font-extrabold leading-tight text-[#07184a]">Shop & Establishment Registration</h1><p className="mt-4 text-slate-600">Mandatory registration for shops, commercial establishments, and businesses under the Shops and Establishments Act.</p><div className="mt-6 flex gap-3"><a href="/contact" className="rounded bg-[#1454b8] px-5 py-3 font-bold text-white">Get Started Now →</a><a href="/contact" className="rounded border border-[#1454b8] px-5 py-3 font-bold text-[#1454b8]">Talk to an Expert</a></div></div><div className="rounded-3xl bg-blue-100 p-10 text-center text-8xl">🏪</div></div></section><section className="mx-auto max-w-7xl space-y-5 px-4 py-12"><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Overview</h2><p className="mt-3 text-sm leading-6 text-slate-600">Every shop, commercial establishment, or business operating within a state is required to obtain registration under the local Shops and Establishments Act. It regulates employment, working conditions, leave, wages, and other business requirements.</p></article><div className="grid gap-5 md:grid-cols-3"><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Who Needs It?</h2><ul className="mt-3 space-y-2 text-sm text-slate-600"><li>• Shops & retail stores</li><li>• Offices & commercial establishments</li><li>• Restaurants, hotels & cafes</li><li>• Startups and service providers</li></ul></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Benefits</h2><ul className="mt-3 space-y-2 text-sm text-slate-600"><li>✓ Legal recognition</li><li>✓ Avoid penalties</li><li>✓ Build customer trust</li><li>✓ Required for other registrations</li></ul></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Applicable Law</h2><p className="mt-3 text-sm leading-6 text-slate-600">Rules differ by state. Our team identifies the applicable state Act and files the correct application.</p></article></div><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Documents Required</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{documents.map((document) => <div key={document} className="rounded-lg bg-blue-50 p-3 text-sm text-slate-700">▣ {document}</div>)}</div></article><article className="rounded-xl border bg-white p-6"><h2 className="font-bold text-[#07184a]">Our Process</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{steps.map((step, index) => <div key={step} className="text-center"><div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-blue-100 font-bold text-[#1454b8]">{index + 1}</div><p className="mt-2 text-xs font-semibold text-slate-700">{step}</p></div>)}</div></article><div className="rounded-xl bg-[#063a8d] p-7 text-white"><h2 className="text-2xl font-bold">Stay Compliant. Stay Worry-Free.</h2><p className="mt-2 text-blue-100">Let GSTBro handle your Shop & Establishment Registration.</p><a href="/contact" className="mt-4 inline-block rounded bg-white px-5 py-3 font-bold text-[#063a8d]">Get Started Now →</a></div></section></PublicLayout>;
}

export function SimplePage({ meta, title, children }: { meta: typeof servicesMeta; title: string; children?: ReactNode }) {
  return (
    <PublicLayout meta={meta}>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">{title}</h1>
        {children}
      </div>
    </PublicLayout>
  );
}




