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

// ---------------------------------------------------------------------------
// Shared Reusable UI Components
// ---------------------------------------------------------------------------

export function ServiceFaqSection({
  title = 'Frequently Asked Questions',
  subtitle = 'EXPERT CLARIFICATIONS FROM PRACTICING CHARTERED ACCOUNTANTS',
  faqs,
}: {
  title?: string;
  subtitle?: string;
  faqs: { question: string; answer: string }[];
}) {
  return (
    <section className="bg-slate-50 py-16 border-t border-slate-200/80">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-wider text-[#1454b8]">{subtitle}</p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#07184a]">{title}</h2>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <details
              key={faq.question}
              className="group bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs transition-all duration-200 open:border-blue-400 open:shadow-md"
            >
              <summary className="flex items-center justify-between font-bold text-slate-900 cursor-pointer text-base select-none list-none">
                <span className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 text-xs font-black flex items-center justify-center shrink-0">
                    Q{i + 1}
                  </span>
                  <span className="text-left leading-snug">{faq.question}</span>
                </span>
                <span className="ml-4 shrink-0 text-slate-400 group-open:rotate-180 transition-transform duration-200">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <p className="mt-4 pt-3 border-t border-slate-100 text-sm leading-relaxed text-slate-600 pl-9 text-left">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function RelatedServicesSection({
  title = 'Interlinked Compliance & Licensing Practice Areas',
  items,
}: {
  title?: string;
  items: { title: string; desc: string; href: string }[];
}) {
  return (
    <section className="bg-white py-14 border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#1454b8]">RECOMMENDED SERVICES</p>
            <h2 className="mt-1 text-2xl font-extrabold text-[#07184a]">{title}</h2>
          </div>
          <a href="/services" className="text-xs font-bold text-blue-600 hover:text-blue-800 underline">
            View All Services &rarr;
          </a>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((srv) => (
            <a
              key={srv.href}
              href={srv.href}
              className="p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all flex flex-col justify-between group bg-slate-50/50"
            >
              <div>
                <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-base mb-2">
                  {srv.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">{srv.desc}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-blue-600">
                <span>Learn Details &rarr;</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

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

// ---------------------------------------------------------------------------
// Static Data & FAQ Collections
// ---------------------------------------------------------------------------

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
  ['PAN Card', 'Permanent Account Number of business/individual'],
  ['Aadhaar Card', 'Aadhaar of the proprietor/partners/directors'],
  ['Business Proof', 'Registration certificate, partnership deed, or MOA/AOA'],
  ['Digital Signature (DSC)', 'For authorized signatory'],
  ['Business Address Proof', 'Electricity bill, rent agreement, or property document'],
  ['Passport Size Photo', 'Recent photograph of proprietor/partners/directors'],
  ['Bank Account Details', 'Cancelled cheque or bank statement'],
  ['Email ID & Mobile Number', 'For OTP verification and communication'],
];

const registrationFaqs = [
  {
    question: 'Who is legally required to obtain GST registration in India?',
    answer: 'Any business selling goods with an aggregate annual turnover exceeding ₹40 Lakhs (₹20 Lakhs for special category states) or service providers exceeding ₹20 Lakhs (₹10 Lakhs in special states) must register. In addition, e-commerce sellers, inter-state suppliers, casual taxable persons, and non-resident taxable persons are required to register mandatorily regardless of turnover.',
  },
  {
    question: 'What is the processing timeline for obtaining a new GSTIN?',
    answer: 'After submitting Form GST REG-01 with verified Aadhaar biometric/OTP authentication, the GST department typically approves the application and issues the GSTIN certificate (Form GST REG-06) within 3 to 7 working days. If the officer issues a clarification query (Form GST REG-03), our team files a prompt response (Form GST REG-04) to secure swift approval.',
  },
  {
    question: 'Can I apply for voluntary GST registration if turnover is below the threshold?',
    answer: 'Yes. Under Section 25(3) of the CGST Act, any business can voluntarily apply for GST registration. Voluntary registration enables you to claim Input Tax Credit (ITC) on commercial purchases, sell products through e-commerce marketplaces, and execute inter-state commercial supplies legally.',
  },
  {
    question: 'What are the consequences of conducting commercial business without GSTIN?',
    answer: 'Operating without mandatory GSTIN attracts statutory penalties under Section 122 of the CGST Act equal to 100% of the tax due or ₹10,000, whichever is higher. Additionally, your corporate buyers cannot claim input tax credit on purchases made from you.',
  },
];

const returnTypes = [
  ['GSTR-1 (Outward Supplies)', 'Comprehensive reporting of outward taxable supplies, debit/credit notes, and B2B invoices.'],
  ['GSTR-3B (Summary Return & Tax Settlement)', 'Summary declaration of outward supplies, input tax credit claims, and net tax settlement.'],
  ['CMP-08 / GSTR-4 (Composition Levy)', 'Quarterly tax liability statement and annual return compilation for composition dealers.'],
  ['GSTR-9 (Annual Statutory Return)', 'Consolidated financial year-end return compiling aggregate turnover, taxes paid, and ITC.'],
  ['GSTR-9C (Reconciliation Statement)', 'CA-certified reconciliation statement harmonizing audited financial balance sheets with GST portal filings.'],
  ['GSTR-5, 6, 7 & 8 (Specialized Returns)', 'Statutory filings for non-residents, Input Service Distributors (ISD), TDS authorities, and e-commerce operators.'],
];

const returnDocuments = [
  ['Sales Register / Invoices', 'Itemized list of B2B, B2C, and export invoices with HSN codes and tax rates'],
  ['Purchase Register / Bills', 'Comprehensive inward bill register matching statutory books of accounts'],
  ['GSTR-2B Statement', 'Auto-drafted ITC statement downloaded directly from the GST portal'],
  ['Debit & Credit Notes', 'Record of commercial adjustments, discounts, and purchase/sales returns'],
  ['Bank Statements', 'Proof of net tax payment deposition and PMT-06 challan clearances'],
  ['E-Way Bill Logs', 'Consolidated monthly e-way bill generation and consignment records'],
];

const filingSteps = [
  ['Share Documents', 'Upload your sales and purchase records securely to the client portal.'],
  ['Review & Reconciliation', 'Senior CAs reconcile purchase registers against GSTR-2B to maximize legal ITC.'],
  ['Tax Optimization', 'Apply Rule 88A tax offset sequence to minimize cash outflow legally.'],
  ['File Returns', 'We file GSTR-1 and GSTR-3B on time before statutory cutoffs with ARN confirmation.'],
  ['Record Keeping', 'Filed returns, acknowledgment receipts, and computation ledgers archived securely.'],
];

const returnsFaqs = [
  {
    question: 'What is the operational difference between GSTR-1 and GSTR-3B?',
    answer: 'GSTR-1 is the statement of outward supplies (sales invoices, credit notes) filed by the 11th of each month (or 13th for QRMP quarterly filers). GSTR-3B is the monthly summary return where you report total sales, claim eligible Input Tax Credit cross-matched against auto-drafted GSTR-2B, and pay net taxes before the 20th.',
  },
  {
    question: 'What late fees apply if a GST return is filed past the deadline?',
    answer: 'For regular taxpayers with tax liability, late fees are ₹50 per day (₹25 CGST + ₹25 SGST) up to statutory maximums. For Nil returns, late fees are ₹20 per day. Additionally, 18% per annum interest applies to unpaid net tax liability under Section 50. Under GSTBro’s 100% Zero-Penalty SLA, we ensure your filings are submitted on time every cycle.',
  },
  {
    question: 'Can I claim Input Tax Credit if my supplier has not filed GSTR-1?',
    answer: 'Under Section 16(2)(aa) and Rule 36(4), credit is strictly restricted to invoices appearing in your auto-drafted GSTR-2B statement. If a supplier fails to file GSTR-1, the ITC cannot be claimed. GSTBro monitors non-compliant vendors and issues automated reminders to safeguard your working capital.',
  },
  {
    question: 'What is the QRMP scheme and who is eligible?',
    answer: 'The Quarterly Return Monthly Payment (QRMP) scheme allows registered taxpayers with aggregate annual turnover up to ₹5 Crore to file GSTR-1 and GSTR-3B quarterly while paying estimated taxes monthly via Form PMT-06 challans.',
  },
];

const cancellationDocuments = [
  ['Closing Stock Valuation Statement', 'Certified valuation of raw materials, work-in-progress, and finished stock on hand'],
  ['Capital Goods Purchase Records', 'Invoices of plant, machinery, and equipment for input tax credit settlement'],
  ['Bank Statement (Tax Settlement)', 'Bank proof showing clearance of statutory tax dues, interest, and challans'],
  ['Final Sales & Purchase Books', 'Complete financial year transaction ledgers up to the official date of cessation'],
  ['GSTIN Login Credentials / DSC', 'Digital Signature Certificate or authorized signatory mobile OTP for portal filing'],
  ['Proof of Business Closure / Transfer', 'Partnership dissolution deed, board resolution, or business transfer contract'],
];

const cancellationSteps = [
  ['Liability & Audit Check', 'Exhaustive audit of pending returns, tax liabilities, and credit reversals under Section 29.'],
  ['File Form GST REG-16', 'Submit voluntary cancellation application with reason of discontinuance within 30 days.'],
  ['Departmental Review', 'Liaison with jurisdictional tax officer to address queries or Form GST REG-17 notices.'],
  ['Order in Form GST REG-19', 'Receipt of formal cancellation order officially terminating active taxpayer obligations.'],
  ['File Form GSTR-10 (Final Return)', 'File statutory final return within 3 months to discharge all residual tax liabilities permanently.'],
];

const cancellationFaqs = [
  {
    question: 'Under what circumstances can GST registration be cancelled or surrendered?',
    answer: 'You can apply for voluntary cancellation when a business is discontinued, closed, sold, transferred, amalgamated, or when aggregate turnover falls below statutory threshold limits under Section 29 of the CGST Act.',
  },
  {
    question: 'What happens to closing inventory and capital goods upon GST cancellation?',
    answer: 'Under Section 29(5), taxpayers must pay an amount equivalent to the input tax credit availed on closing stock of raw materials, semi-finished goods, finished goods, and capital goods, or the output tax payable on such goods, whichever is higher.',
  },
  {
    question: 'What is Form GSTR-10 and when must it be filed?',
    answer: 'GSTR-10 is the Final Return that must be filed within 3 months of the date of cancellation or date of cancellation order, whichever is later. It provides a formal declaration of liabilities and stock settlements.',
  },
  {
    question: 'Can a cancelled GST registration be revoked?',
    answer: 'Yes. If your GSTIN was cancelled suo-motu by the tax department for non-filing of returns, you can apply for revocation using Form GST REG-21 within 30 to 90 days after clearing all overdue returns, taxes, interest, and late fees.',
  },
];

const complianceAreas = [
  ['Statutory Tax Registration', 'Initial onboarding, multi-state establishment, and dynamic amendment filings.'],
  ['Periodic Return Submissions', 'Error-free filing of GSTR-1, 3B, and CMP-08 backed by multi-level validation.'],
  ['Treasury & Tax Settlement', 'Accurate liability calculation, cash ledger utilization, and timely tax payments.'],
  ['Multi-tier ITC Reconciliation', 'Cross-matching purchase registers against GSTR-2B to block tax leakage.'],
  ['Statutory Record Retention', 'Archiving tax invoices, delivery challans, and ledgers in compliance with GST rules.'],
  ['Scrutiny & Assessment Defense', 'End-to-end representation and response drafting for departmental notices and audits.'],
];

const complianceDocuments = [
  ['Purchase Ledgers (ERP / Tally)', 'Full purchase records with invoice numbers, dates, and taxable values'],
  ['Auto-Drafted GSTR-2B JSON Files', 'Portal ledger statements for dynamic algorithmic reconciliation'],
  ['Vendor Master Database', 'Vendor names, GSTINs, state codes, and contact details for follow-ups'],
  ['Debit & Credit Note Registers', 'Adjustments to inward supply values and tax apportionments'],
  ['Inward E-Way Bills', 'Delivery logs for physical verification of supply arrival'],
  ['Reversal Statements (Rule 37 / 37A / 42 / 43)', 'Records of ineligible or proportional credits requiring statutory reversal'],
];

const complianceSteps = [
  ['Understand & Collect', 'We understand your business model and collect transaction ledgers securely.'],
  ['Review & Analyze', 'Our experts cross-match purchases against GSTR-2B to pinpoint compliance gaps.'],
  ['Comply & File', 'Timely filing of returns and settlement of taxes as per statutory deadlines.'],
  ['Reconcile & Verify', 'Continuous reconciliation of books with portal ledgers to eliminate discrepancies.'],
  ['Monitor & Support', 'Proactive alerts for rule amendments, circulars, and supplier defaults.'],
];

const complianceFaqs = [
  {
    question: 'Why is dynamic GSTR-2B reconciliation critical for Indian businesses?',
    answer: 'GSTR-2B is a static statement generated on the 14th of every month that establishes your legal entitlement to Input Tax Credit. Claiming excess ITC not in GSTR-2B triggers scrutiny notices (DRC-01C) and 18% interest, while failing to claim eligible ITC causes irreversible working capital loss under the statutory time limits of Section 16(4).',
  },
  {
    question: 'What is the time limit to claim pending Input Tax Credit for a financial year?',
    answer: 'Under Section 16(4) of the CGST Act, the deadline to claim missing ITC for any financial year is the 30th of November following the end of that financial year, or the date of filing the annual return (GSTR-9), whichever is earlier.',
  },
  {
    question: 'How does GSTBro protect businesses from defaulting vendors?',
    answer: 'Our algorithmic reconciliation automatically scans purchase ledgers against portal data, categorizing invoices into matched, missing, and mismatched buckets. We generate structured vendor follow-up notices so suppliers rectify omissions before monthly filing cutoffs.',
  },
  {
    question: 'What are the consequences of claiming ineligible ITC under Rule 37A?',
    answer: 'Under Rule 37A, if a supplier does not file GSTR-3B by 30th September of the following year, the recipient must reverse the ITC availed along with interest. GSTBro continuously flags non-filing vendors to avoid surprise reversals and penalties.',
  },
];

const refundEligibility = [
  ['Zero-Rated Export Supplies', 'Full refund of accumulated unutilized ITC on export of goods or services under LUT.'],
  ['Supplies to SEZ Units & Developers', 'Expedited recovery of taxes paid or accumulated ITC on supplies to Special Economic Zones.'],
  ['Deemed Export Transactions', 'Statutory refund facilitation for qualifying deemed export manufacturing supplies.'],
  ['Inverted Duty Tariff Structure', 'Refund of accumulated credit where the tax rate on inputs exceeds output supply rates.'],
  ['Excess Balance in Electronic Ledgers', 'Direct cash refund of excess payments or balance sitting in electronic cash ledgers.'],
  ['Pre-Deposit & Appellate Refunds', 'Recovery of pre-deposit amounts following favorable appellate orders or rulings.'],
];

const refundDocuments = [
  ['GST Return Filing', 'Copy of GSTR-1 and GSTR-3B for the claim period'],
  ['Invoices', 'Tax invoices of inputs, input services, and outward supplies'],
  ['Bank Statement', 'Proof of foreign inward remittance (FIRC / BRC) or tax payment'],
  ['B/L or E-way Bill', 'Shipping bills, bill of lading, and transport documents'],
  ['Export Documents', 'Letter of Undertaking (LUT) acknowledgment receipt and contracts'],
  ['ITC Statement', 'Comprehensive Input Tax Credit reconciliation statement'],
  ['CA Certificate (Annexure-A)', 'Statutory certification under Rule 89(2)(m) certifying non-unjust enrichment'],
  ['Form RFD-01 Application', 'Signed electronic refund application filed on the GST portal'],
];

const refundSteps = [
  ['Review & Eligibility Check', 'Analyze ledgers to determine valid refund categories and claimable amounts.'],
  ['Document Compilation', 'Prepare supporting schedules, export proofs, and CA certification annexures.'],
  ['Prepare & File Form RFD-01', 'Submit online application with ARN generation and upload documentation dossier.'],
  ['Departmental Liaison', 'Track acknowledgment in Form RFD-02 and handle clarification notices (RFD-08).'],
  ['Disbursement to Bank', 'Sanction order (RFD-06) issued and amount disbursed directly via PFMS to bank.'],
];

const refundFaqs = [
  {
    question: 'Who can claim a GST refund in India?',
    answer: 'Key refund categories include: 1) Exporters of goods or services under Letter of Undertaking (LUT) with accumulated unutilized ITC; 2) Exporters paying IGST claiming rebate; 3) Manufacturers under Inverted Duty Structure where input tax rates exceed output tax rates; 4) Excess balance in the Electronic Cash Ledger; and 5) Refunds on supplies to SEZ developers/units.',
  },
  {
    question: 'What is the statutory time limit for filing a GST refund application?',
    answer: 'Under Section 54(1) of the CGST Act, refund claims must be submitted in Form RFD-01 within 2 years from the "relevant date" (e.g., shipping bill date for export of goods, bank realization certificate date for export of services, or tax payment date).',
  },
  {
    question: 'How is a GST refund disbursed to the business?',
    answer: 'Once Form RFD-01 is verified and sanctioned via Form RFD-06, the refund amount is credited directly to the taxpayer’s validated bank account via PFMS (Public Financial Management System) along with electronic payment advice (RFD-05).',
  },
  {
    question: 'Is interest payable by the government on delayed GST refunds?',
    answer: 'Yes. Under Section 56 of the CGST Act, if a sanctioned refund is not disbursed within 60 days from the date of receipt of the application, interest at 6% per annum is payable from the 61st day until actual disbursement.',
  },
];

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

const auditDocs = [
  ['GSTR-1, GSTR-3B, GSTR-9/9C', 'Consolidated annual returns and monthly filings across years'],
  ['Sales & Purchase Registers', 'Itemized transaction journals supporting financial statements'],
  ['Tax Invoices & Credit Notes', 'Primary commercial documentation for verified transactions'],
  ['E-Way Bills & E-Invoices', 'Electronic compliance proof matching logistics records'],
  ['Books of Accounts & Ledgers', 'Audited balance sheets, profit & loss statements, and trial balances'],
  ['ITC Register & Reconciliations', 'Purchase-to-2B reconciliation statements and reversal computations'],
  ['Bank Statements', 'Official bank statements showing consideration and tax receipts'],
  ['Department Notices / Orders', 'Copies of Form ASMT-10, DRC-01, SCNs, or summons received'],
];

const auditSteps = [
  ['Initial Assessment', 'Review notice allegations, return filings, and discrepancy computations thoroughly.'],
  ['Document Collection', 'Compile sales/purchase registers, e-invoices, and tax payment challans.'],
  ['Reconciliation & Analysis', 'Perform cross-ledger reconciliation to substantiate disputed credits or turnovers.'],
  ['Legal Reply Drafting', 'Senior CAs draft Form ASMT-11 or DRC-06 response citing statutory provisions and precedents.'],
  ['Representation & Hearing', 'Authorized representation before the adjudicating tax officer at personal hearings.'],
  ['Order & Compliance Closure', 'Obtain formal order (Form ASMT-12 or DRC-07) and ensure compliance closure.'],
];

const auditFaqs = [
  {
    question: 'What should I do upon receiving Form ASMT-10 from the GST department?',
    answer: 'Form ASMT-10 is a scrutiny notice pointing out discrepancies between GSTR-1, GSTR-3B, GSTR-2B, and e-way bills. You must file a detailed explanation in Form ASMT-11 within 30 days. GSTBro’s senior CAs audit the discrepancy, prepare reconciliations, and draft a legally defensible reply to prevent escalation to Form DRC-01 (Show Cause Notice).',
  },
  {
    question: 'What is the difference between Section 73 and Section 74 notices?',
    answer: 'Section 73 applies to tax unpaid, short paid, or ITC wrongly availed for reasons other than fraud, willful misstatement, or suppression of facts (lower penalty, often waived if paid before SCN). Section 74 applies to cases involving fraud or intentional suppression, attracting harsh 100% penalties and extended 5-year limitation periods.',
  },
  {
    question: 'Who is required to file Form GSTR-9 and GSTR-9C?',
    answer: 'GSTR-9 is mandatory for regular taxpayers with aggregate turnover exceeding ₹2 Crore in a financial year. GSTR-9C is a self-certified reconciliation statement required for taxpayers with turnover exceeding ₹5 Crore.',
  },
  {
    question: 'Can GSTBro represent my company during departmental personal hearings?',
    answer: 'Yes. Our senior practicing Chartered Accountants are authorized under Section 116 of the CGST Act to represent businesses in personal hearings before Adjudicating Officers, Joint Commissioners, and the First Appellate Authority.',
  },
];

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

const advisoryDocs = [
  ['Commercial Agreements & MSAs', 'Master service agreements, vendor contracts, and client proposals'],
  ['Corporate Hierarchy Chart', 'Operating business model, subsidiaries, branches, and related entity structures'],
  ['Sample Invoices & Tariff Descriptions', 'Customer billing samples for HSN/SAC classification analysis'],
  ['Past Filings & Assessment Records', 'Historical GSTR-1, 3B, and 9 returns for compliance health check'],
  ['Cross-Border Contracts & Remittances', 'Export agreements and foreign remittance proofs for international tax advice'],
];

const advisoryFaqs = [
  {
    question: 'What areas do GSTBro’s strategic tax advisory services cover?',
    answer: 'Our senior Chartered Accountants advise on corporate restructuring, supply chain indirect tax optimization, classification and HSN code determination, cross-border software/SaaS export taxation, place of supply disputes, and Advance Ruling (AAR) applications.',
  },
  {
    question: 'How can strategic tax structuring legally reduce indirect tax liabilities?',
    answer: 'By analyzing commercial contracts, identifying eligible exemptions, optimizing input tax credits on capital goods, utilizing correct reverse charge mechanisms (RCM), and avoiding inverted duty traps, businesses can reduce tax friction and accelerate working capital.',
  },
  {
    question: 'What is an Authority for Advance Ruling (AAR)?',
    answer: 'An Advance Ruling provides statutory certainty on tax classification, applicable rates, or taxability of a proposed transaction, binding both the applicant and jurisdictional tax authorities.',
  },
  {
    question: 'How does GST apply to cross-border IT, SaaS, and consulting exports?',
    answer: 'Services exported outside India qualify as zero-rated supplies under Section 16 of the IGST Act provided: 1) the supplier is in India, 2) recipient is outside India, 3) place of supply is outside India, and 4) payment is received in convertible foreign exchange. We help you structure contracts to meet all conditions.',
  },
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

const tdsTcsFaqs = [
  {
    question: 'Who is required to deduct GST TDS under Section 51?',
    answer: 'Central and State Government departments, local authorities, governmental agencies, and notified PSUs must deduct 2% GST TDS (1% CGST + 1% SGST, or 2% IGST) on payments made to suppliers for taxable contracts where total contract value exceeds ₹2,50,000 (excluding taxes).',
  },
  {
    question: 'Who is required to collect GST TCS under Section 52?',
    answer: 'Every electronic commerce operator (such as Amazon, Flipkart, or custom marketplace platforms) must collect 1% TCS (0.5% CGST + 0.5% SGST, or 1% IGST) on the net value of taxable supplies made through their portal by registered third-party sellers.',
  },
  {
    question: 'When must GSTR-7 and GSTR-8 returns be filed?',
    answer: 'Deductors must file Form GSTR-7 by the 10th of the month following deduction and issue Form GSTR-7A certificates. E-commerce operators must file Form GSTR-8 by the 10th of the following month.',
  },
  {
    question: 'How do suppliers / deductees receive credit for deducted GST TDS?',
    answer: 'Once the deductor files Form GSTR-7, the deducted amount is auto-populated in the supplier’s "TDS and TCS Credit Received" table on the GST portal. Upon acceptance, the credit is immediately transferred to the supplier’s Electronic Cash Ledger for tax payment or refund.',
  },
];

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

const businessLicensesFaqs = [
  {
    question: 'Which statutory licenses does a new business need before operating in India?',
    answer: 'Depending on your industry and location, essential licenses include Shop & Establishment registration for commercial offices, municipal Trade License, FSSAI for food-related businesses, Udyam MSME for government benefits, Import Export Code (IEC) for international trade, and Professional Tax enrollment.',
  },
  {
    question: 'Can GSTBro handle multiple state business licenses simultaneously?',
    answer: 'Yes. Our specialized compliance team handles state-specific filings across all Indian states and Union Territories, providing centralized documentation tracking and milestone notifications via your client portal.',
  },
  {
    question: 'What is the advantage of registering under MSME / Udyam?',
    answer: 'Udyam registration provides access to collateral-free bank loans under CGTMSE, priority sector lending, lower patent/trademark filing fees, protection against delayed commercial payments under the MSMED Act, and government tender exemptions.',
  },
];

// ---------------------------------------------------------------------------
// 1. GST Registration Page
// ---------------------------------------------------------------------------

export function RegistrationServicePage() {
  const content = useContent('content_service_gst-registration', {
    heroBadge: 'STATUTORY TAX ONBOARDING',
    heroTitle: 'Fast Online GST Registration with Senior CA Verification',
    heroSubtitle:
      'Accelerate indirect tax readiness with end-to-end statutory drafting, jurisdictional liaison, complete document vetting, and zero-rejection guarantee.',
  });

  return (
    <PublicLayout
      meta={registrationMeta}
      jsonLd={[
        serviceSchema(
          'Statutory GST Registration Services',
          'Professional GST registration services for businesses across India with complete document vetting and zero rejection guarantee.',
          'GST Registration',
          '/services/gst-registration'
        ),
        faqSchema(registrationFaqs),
      ]}
    >
      <div className="bg-slate-50">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#eef5ff] via-white to-blue-50">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
            <Breadcrumbs items={[{ name: 'Services', path: '/services' }, { name: 'GST Registration', path: '/services/gst-registration' }]} />
          </div>
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 lg:grid-cols-2 lg:py-20">
            <div className="fade-up">
              <span className="inline-flex rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-[#004aad]">
                {content.heroBadge}
              </span>
              <h1 className="mt-6 text-4xl sm:text-5xl font-extrabold leading-tight text-[#07184a]">
                {content.heroTitle}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">{content.heroSubtitle}</p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a href="/signup" className="rounded-lg bg-[#003b8f] px-6 py-3 font-bold text-white transition hover:-translate-y-1 hover:bg-[#1454b8]">
                  Get Started Today
                </a>
                <a href="#process" className="rounded-lg border border-[#003b8f] px-6 py-3 font-bold text-[#003b8f] transition hover:bg-blue-50">
                  How It Works
                </a>
              </div>
              <div className="mt-10 grid grid-cols-3 gap-4 text-sm font-semibold text-slate-700">
                <span>♙ Senior CA Oversight<br /><small className="font-normal">End-to-end statutory review</small></span>
                <span>⚡ Fast-Track 3–5 Day SLA<br /><small className="font-normal">Quick & error-free filing</small></span>
                <span>✓ 100% Audit-Ready<br /><small className="font-normal">Strict GST law compliance</small></span>
              </div>
            </div>
            <div className="fade-up hero-delay-2 relative rounded-3xl bg-[#003b8f] p-3 shadow-2xl transition duration-500 hover:-translate-y-2">
              <img
                src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1100&q=85"
                alt="GST registration assistance"
                loading="lazy"
                decoding="async"
                className="h-80 w-full rounded-2xl object-cover"
              />
              <div className="absolute -bottom-5 -left-5 rounded-2xl bg-[#1454b8] px-6 py-5 text-white shadow-xl">
                <p className="font-bold">Statutory Tax Onboarding</p>
                <p className="mt-1 text-sm text-blue-100">Fast. Accurate. Fully Compliant.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16">
          <div className="mb-10 text-center">
            <p className="text-sm font-bold text-[#1454b8]">REGULATORY FRAMEWORKS</p>
            <h2 className="mt-2 text-3xl font-extrabold text-[#07184a]">Supported Business Structures & Categories</h2>
            <div className="mx-auto mt-4 h-1 w-12 bg-[#1454b8]" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {registrationTypes.map(([title, description], index) => (
              <div
                key={title}
                className="fade-up rounded-2xl border bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-xl text-[#1454b8]">◎</div>
                <h3 className="font-bold text-[#07184a]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mx-auto grid max-w-7xl grid-cols-3 gap-3 rounded-xl bg-white px-4 py-4 text-center text-xs font-bold text-[#1454b8] shadow-sm">
          <span>◎ 100% Online Execution</span>
          <span>◷ 3–5 Working Days SLA</span>
          <span>♧ Senior CA Consultation</span>
        </div>

        <InteractiveDocumentChecklist
          title="Documents Required for Entity Registration"
          subtitle="STATUTORY COMPLIANCE CHECKLIST"
          items={registrationDocuments}
        />

        <section id="process" className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-12 text-center">
              <p className="text-sm font-bold text-[#1454b8]">REGISTRATION WORKFLOW</p>
              <h2 className="mt-2 text-3xl font-extrabold text-[#07184a]">5-Step Fast-Track Registration Methodology</h2>
            </div>
            <div className="grid gap-8 md:grid-cols-5">
              {[
                ['Document Collection', 'Secure upload of PAN, Aadhaar, and address documents to our client portal.'],
                ['Statutory Review', 'Practicing CA verifies business proof and identifies correct HSN/SAC codes.'],
                ['Form REG-01 Filing', 'Drafting and portal submission with Aadhaar biometric authentication.'],
                ['Department Liaison', 'Proactive follow-up and prompt filing of replies to Form REG-03 queries.'],
                ['GSTIN Certificate', 'Official Form GST REG-06 certificate issued with full login credentials.'],
              ].map(([stepTitle, stepDesc], index) => (
                <div key={stepTitle} className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-4 border-blue-100 bg-blue-50 font-bold text-[#1454b8]">
                    0{index + 1}
                  </div>
                  <h3 className="font-bold text-[#07184a]">{stepTitle}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{stepDesc}</p>
                </div>
              ))}
            </div>

            <div className="mt-14 flex flex-col items-center justify-between gap-5 rounded-2xl bg-gradient-to-r from-[#003b8f] to-[#1454b8] p-8 text-white md:flex-row">
              <div>
                <h2 className="text-2xl font-extrabold">Let senior tax consultants structure your GST onboarding</h2>
                <p className="mt-2 text-blue-100">Establish a compliant indirect tax footprint with complete audit readiness from day one.</p>
              </div>
              <a href="/signup" className="rounded-lg bg-white px-8 py-3 font-bold text-[#003b8f] transition hover:-translate-y-1">
                Get Started Today
              </a>
            </div>
          </div>
        </section>

        <ServiceFaqSection faqs={registrationFaqs} />

        <RelatedServicesSection
          items={[
            { title: 'Monthly GST Return Filing', desc: 'Timely filing of GSTR-1 & GSTR-3B with Rule 88A tax optimization.', href: '/services/gst-returns' },
            { title: 'Dynamic 2B ITC Recovery', desc: 'Automated reconciliation cross-matching purchases against 2B statements.', href: '/services/gst-compliance' },
            { title: 'MSME / Udyam Registration', desc: 'Complimentary government recognition unlocking priority sector lending.', href: '/services/business-licenses/udyam' },
          ]}
        />
      </div>
    </PublicLayout>
  );
}

// ---------------------------------------------------------------------------
// 2. GST Return Filing Page
// ---------------------------------------------------------------------------

export function ReturnsServicePage() {
  const content = useContent('content_service_gst-returns', {
    heroBadge: 'STATUTORY TAX FILINGS',
    heroTitle: 'Precision GST Return Filing & Automated GSTR-2B Matching',
    heroSubtitle:
      'Multi-tier invoice matching, automated credit verification, and timely submissions to eliminate late fees, interest, and departmental notices.',
  });

  return (
    <PublicLayout
      meta={returnsMeta}
      jsonLd={[
        serviceSchema(
          'GST Return Filing Services (GSTR-1 & 3B)',
          'Timely and accurate monthly & quarterly GST return filing services with Rule 88A tax offset optimization and CA certification.',
          'GST Return Filing',
          '/services/gst-returns'
        ),
        faqSchema(returnsFaqs),
      ]}
    >
      <div className="bg-slate-50">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#eef5ff] via-white to-blue-50">
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
            <Breadcrumbs items={[{ name: 'Services', path: '/services' }, { name: 'GST Returns', path: '/services/gst-returns' }]} />
          </div>
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 lg:grid-cols-2 lg:py-20">
            <div className="fade-up">
              <span className="inline-flex rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-[#004aad]">
                {content.heroBadge}
              </span>
              <h1 className="mt-6 text-4xl sm:text-5xl font-extrabold leading-tight text-[#07184a]">
                {content.heroTitle}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">{content.heroSubtitle}</p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a href="/signup" className="rounded-lg bg-[#003b8f] px-6 py-3 font-bold text-white transition hover:-translate-y-1">
                  Get Started Today
                </a>
                <a href="#filing-process" className="rounded-lg border border-[#003b8f] px-6 py-3 font-bold text-[#003b8f]">
                  How It Works
                </a>
              </div>
              <div className="mt-10 grid grid-cols-3 gap-4 text-sm font-semibold text-slate-700">
                <span>◷ On-Time Filing SLA<br /><small className="font-normal">Zero late fee exposure</small></span>
                <span>◎ 100% Multi-tier Match<br /><small className="font-normal">Automated reconciliation</small></span>
                <span>✓ Audit Protection<br /><small className="font-normal">Defensible filings</small></span>
              </div>
            </div>
            <div className="fade-up hero-delay-2 relative rounded-3xl bg-[#003b8f] p-3 shadow-2xl transition hover:-translate-y-2">
              <img
                src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1100&q=85"
                alt="GST return filing"
                loading="lazy"
                decoding="async"
                className="h-80 w-full rounded-2xl object-cover"
              />
              <div className="absolute -bottom-5 -left-5 rounded-2xl bg-[#1454b8] px-6 py-5 text-white shadow-xl">
                <p className="font-bold">Statutory Return Filing</p>
                <p className="mt-1 text-sm text-blue-100">Timely. Reconciled. Defensible.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16">
          <div className="mb-10 text-center">
            <p className="text-sm font-bold text-[#1454b8]">STATUTORY RETURN CATEGORIES</p>
            <h2 className="mt-2 text-3xl font-extrabold text-[#07184a]">Comprehensive Return Coverage Across Schedules</h2>
            <div className="mx-auto mt-4 h-1 w-12 bg-[#1454b8]" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {returnTypes.map(([title, description], index) => (
              <div
                key={title}
                className="fade-up rounded-2xl border bg-white p-6 text-center shadow-sm transition hover:-translate-y-2 hover:shadow-xl"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-xl text-[#1454b8]">◎</div>
                <h3 className="font-bold text-[#07184a]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <InteractiveDocumentChecklist
          title="Records Required for Monthly Return Filing"
          subtitle="TAX FILING DOSSIER"
          items={returnDocuments}
        />

        <section id="filing-process" className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16">
            <div className="mb-12 text-center">
              <p className="text-sm font-bold text-[#1454b8]">COMPLIANCE WORKFLOW</p>
              <h2 className="mt-2 text-3xl font-extrabold text-[#07184a]">Our Systematic Return Filing Methodology</h2>
            </div>
            <div className="grid gap-8 md:grid-cols-5">
              {filingSteps.map(([title, description], index) => (
                <div key={title} className="fade-up text-center" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-4 border-blue-100 bg-blue-50 font-bold text-[#1454b8]">
                    0{index + 1}
                  </div>
                  <h3 className="font-bold text-[#07184a]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                </div>
              ))}
            </div>
            <div className="mt-12 flex flex-col items-center justify-between gap-5 rounded-2xl bg-gradient-to-r from-[#003b8f] to-[#1454b8] p-8 text-white md:flex-row">
              <div>
                <h2 className="text-2xl font-extrabold">Eliminate return filing friction forever.</h2>
                <p className="mt-2 text-blue-100">Senior chartered accountants review and certify your statutory filings every single cycle.</p>
              </div>
              <a href="/signup" className="rounded-lg bg-white px-8 py-3 font-bold text-[#003b8f] transition hover:-translate-y-1">
                Get Started Today
              </a>
            </div>
          </div>
        </section>

        <ServiceFaqSection faqs={returnsFaqs} />

        <RelatedServicesSection
          items={[
            { title: 'Dynamic 2B ITC Recovery', desc: 'Continuous invoice matching to catch defaulting suppliers and save cash.', href: '/services/gst-compliance' },
            { title: 'Annual Audit (GSTR-9 & 9C)', desc: 'Consolidated fiscal true-up and CA reconciliation certification.', href: '/services/gst-audit' },
            { title: 'GST Cancellation & Surrender', desc: 'Legally exit inactive entities and clear pending tax liabilities.', href: '/services/gst-cancellation' },
          ]}
        />
      </div>
    </PublicLayout>
  );
}

// ---------------------------------------------------------------------------
// 3. GST Cancellation Page
// ---------------------------------------------------------------------------

export function CancellationServicePage() {
  return (
    <PublicLayout
      meta={cancellationMeta}
      jsonLd={[
        serviceSchema(
          'GST Cancellation & Registration Surrender Services',
          'Complete GST registration cancellation, final return (GSTR-10) filing, and revocation defense by practicing Chartered Accountants.',
          'GST Cancellation',
          '/services/gst-cancellation'
        ),
        faqSchema(cancellationFaqs),
      ]}
    >
      <div className="bg-slate-50">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#eef5ff] via-white to-blue-50">
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
            <Breadcrumbs items={[{ name: 'Services', path: '/services' }, { name: 'GST Cancellation', path: '/services/gst-cancellation' }]} />
          </div>
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 lg:grid-cols-2 lg:py-20">
            <div className="fade-up">
              <span className="inline-flex rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-[#004aad]">
                STATUTORY REGISTRATION SURRENDER
              </span>
              <h1 className="mt-6 text-4xl sm:text-5xl font-extrabold leading-tight text-[#07184a]">
                Complete GST Registration Cancellation &amp; Surrender
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                End-to-end statutory surrender under Section 29, tax liability settlement, Form GST REG-16 filing, and GSTR-10 Final Return closure supervised by senior CAs.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a href="/contact" className="rounded-lg bg-[#003b8f] px-6 py-3 font-bold text-white transition hover:-translate-y-1 hover:bg-[#1454b8]">
                  Consult Cancellation CA
                </a>
                <a href="#cancellation-process" className="rounded-lg border border-[#003b8f] px-6 py-3 font-bold text-[#003b8f] transition hover:bg-blue-50">
                  Surrender Process
                </a>
              </div>
              <div className="mt-10 grid grid-cols-3 gap-4 text-sm font-semibold text-slate-700">
                <span>✓ 100% Tax Clearance<br /><small className="font-normal">Zero latent liability</small></span>
                <span>⚡ Form REG-16 Filing<br /><small className="font-normal">Fast departmental review</small></span>
                <span>♧ GSTR-10 Sign-Off<br /><small className="font-normal">Permanent compliance closure</small></span>
              </div>
            </div>
            <div className="fade-up hero-delay-2 relative rounded-3xl bg-[#003b8f] p-3 shadow-2xl transition hover:-translate-y-2">
              <img
                src="https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1100&q=85"
                alt="GST cancellation services"
                loading="lazy"
                decoding="async"
                className="h-80 w-full rounded-2xl object-cover"
              />
              <div className="absolute -bottom-5 -left-5 rounded-2xl bg-[#1454b8] px-6 py-5 text-white shadow-xl">
                <p className="font-bold">Clean Statutory Exit</p>
                <p className="mt-1 text-sm text-blue-100">Permanent release from recurring filings.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16">
          <div className="mb-10 text-center">
            <p className="text-sm font-bold text-[#1454b8]">ELIGIBILITY CRITERIA</p>
            <h2 className="mt-2 text-3xl font-extrabold text-[#07184a]">Qualifying Grounds for Voluntary Cancellation</h2>
            <div className="mx-auto mt-4 h-1 w-12 bg-[#1454b8]" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Business Discontinuation', 'Complete closure or cessation of business operations across all commercial units.'],
              ['Turnover Below Threshold', 'Aggregate annual turnover permanently falling below the mandatory ₹40L / ₹20L limits.'],
              ['Transfer, Merger & Amalgamation', 'Transfer of business as a going concern, merger into another entity, or change in constitution.'],
              ['Sole Proprietor Demise', 'Closure and transfer of business assets upon the demise of the individual proprietor.'],
              ['Revocation of Suo-Motu Order', 'Defense and restoration of GSTINs cancelled by tax officers for temporary return non-filing.'],
              ['Conversion of Entity Type', 'Transition from sole proprietorship to LLP or Private Limited Company requiring new GSTIN.'],
            ].map(([title, desc], idx) => (
              <div key={title} className="rounded-2xl border bg-white p-6 shadow-sm hover:shadow-lg transition-all" style={{ animationDelay: `${idx * 70}ms` }}>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 font-bold">✓</div>
                <h3 className="font-bold text-[#07184a] text-base">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <InteractiveDocumentChecklist
          title="Required Records for GST Surrender Processing"
          subtitle="SURRENDER DOSSIER"
          items={cancellationDocuments}
        />

        <section id="cancellation-process" className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-12 text-center">
              <p className="text-sm font-bold text-[#1454b8]">STEP-BY-STEP PROCESS</p>
              <h2 className="mt-2 text-3xl font-extrabold text-[#07184a]">5-Stage Seamless Surrender Workflow</h2>
            </div>
            <div className="grid gap-8 md:grid-cols-5">
              {cancellationSteps.map(([title, desc], idx) => (
                <div key={title} className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-4 border-blue-100 bg-blue-50 font-bold text-[#1454b8]">
                    0{idx + 1}
                  </div>
                  <h3 className="font-bold text-[#07184a] text-sm">{title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">{desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-14 flex flex-col items-center justify-between gap-5 rounded-2xl bg-gradient-to-r from-[#003b8f] to-[#1454b8] p-8 text-white md:flex-row">
              <div>
                <h2 className="text-2xl font-extrabold">Ready to surrender your inactive GST registration?</h2>
                <p className="mt-2 text-blue-100">Stop recurring monthly late fees and close your indirect tax obligations securely.</p>
              </div>
              <a href="/contact" className="rounded-lg bg-white px-8 py-3 font-bold text-[#003b8f] transition hover:-translate-y-1">
                Initiate Surrender
              </a>
            </div>
          </div>
        </section>

        <ServiceFaqSection faqs={cancellationFaqs} />

        <RelatedServicesSection
          items={[
            { title: 'GST Return Filing', desc: 'Clear all pending monthly returns prior to formal cancellation.', href: '/services/gst-returns' },
            { title: 'GST Audit & Assessment', desc: 'Reconcile historical ledgers and resolve pending tax scrutiny notices.', href: '/services/gst-audit' },
            { title: 'Statutory GST Registration', desc: 'Onboard a newly incorporated business entity with zero delays.', href: '/services/gst-registration' },
          ]}
        />
      </div>
    </PublicLayout>
  );
}

// ---------------------------------------------------------------------------
// 4. GST Compliance Page
// ---------------------------------------------------------------------------

export function ComplianceServicePage() {
  const content = useContent('content_service_gst-compliance', {
    heroBadge: 'INDIRECT TAX GOVERNANCE',
    heroTitle: 'End-to-End GST Compliance & Automated Input Tax Credit Recovery',
    heroSubtitle:
      'Institutional oversight covering vendor tax compliance, real-time 2B ITC matching, and calendar adherence to protect enterprise working capital.',
  });

  return (
    <PublicLayout
      meta={complianceMeta}
      jsonLd={[
        serviceSchema(
          'GST Compliance & Dynamic 2B ITC Recovery',
          'Continuous purchase ledger audits, automated defaulting vendor tracking, and 100% eligible ITC recovery.',
          'GST Compliance',
          '/services/gst-compliance'
        ),
        faqSchema(complianceFaqs),
      ]}
    >
      <div className="bg-slate-50">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#eef5ff] via-white to-blue-50">
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
            <Breadcrumbs items={[{ name: 'Services', path: '/services' }, { name: 'GST Compliance', path: '/services/gst-compliance' }]} />
          </div>
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 lg:grid-cols-2 lg:py-20">
            <div className="fade-up">
              <span className="inline-flex rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-[#004aad]">
                {content.heroBadge}
              </span>
              <h1 className="mt-6 text-4xl sm:text-5xl font-extrabold leading-tight text-[#07184a]">
                {content.heroTitle}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">{content.heroSubtitle}</p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a href="/signup" className="rounded-lg bg-[#003b8f] px-6 py-3 font-bold text-white transition hover:-translate-y-1">
                  Get Started Today
                </a>
                <a href="#compliance-process" className="rounded-lg border border-[#003b8f] px-6 py-3 font-bold text-[#003b8f]">
                  How It Works
                </a>
              </div>
              <div className="mt-10 grid grid-cols-3 gap-4 text-sm font-semibold text-slate-700">
                <span>✓ Statutory Adherence<br /><small className="font-normal">Strict GST legal framework</small></span>
                <span>◷ Proactive Calendar<br /><small className="font-normal">Scheduled filings</small></span>
                <span>◎ Capital Protection<br /><small className="font-normal">Stop credit leakage</small></span>
              </div>
            </div>
            <div className="fade-up hero-delay-2 relative rounded-3xl bg-[#003b8f] p-3 shadow-2xl transition hover:-translate-y-2">
              <img
                src="https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=1100&q=85"
                alt="GST compliance management"
                loading="lazy"
                decoding="async"
                className="h-80 w-full rounded-2xl object-cover"
              />
              <div className="absolute -bottom-5 -left-5 rounded-2xl bg-[#1454b8] px-6 py-5 text-white shadow-xl">
                <p className="font-bold">Indirect Tax Governance</p>
                <p className="mt-1 text-sm text-blue-100">Enterprise compliance management.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16">
          <div className="mb-10 text-center">
            <p className="text-sm font-bold text-[#1454b8]">GOVERNANCE AREAS</p>
            <h2 className="mt-2 text-3xl font-extrabold text-[#07184a]">Core Pillars of Indirect Tax Governance</h2>
            <div className="mx-auto mt-4 h-1 w-12 bg-[#1454b8]" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {complianceAreas.map(([title, description], index) => (
              <div
                key={title}
                className="fade-up rounded-2xl border bg-white p-6 text-center shadow-sm transition hover:-translate-y-2 hover:shadow-xl"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-xl text-[#1454b8]">◎</div>
                <h3 className="font-bold text-[#07184a]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <InteractiveDocumentChecklist
          title="Data Required for Continuous Compliance Audits"
          subtitle="COMPLIANCE AUDIT DOSSIER"
          items={complianceDocuments}
        />

        <section id="compliance-process" className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-12 text-center">
              <p className="text-sm font-bold text-[#1454b8]">COMPLIANCE FRAMEWORK</p>
              <h2 className="mt-2 text-3xl font-extrabold text-[#07184a]">Our Managed Compliance Methodology</h2>
            </div>
            <div className="grid gap-8 md:grid-cols-5">
              {complianceSteps.map(([title, description], index) => (
                <div key={title} className="fade-up text-center" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-4 border-blue-100 bg-blue-50 font-bold text-[#1454b8]">
                    0{index + 1}
                  </div>
                  <h3 className="font-bold text-[#07184a]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                </div>
              ))}
            </div>

            <div className="mt-12 flex flex-col items-center justify-between gap-5 rounded-2xl bg-gradient-to-r from-[#003b8f] to-[#1454b8] p-8 text-white md:flex-row">
              <div>
                <h2 className="text-2xl font-extrabold">Maintain continuous tax governance effortlessly.</h2>
                <p className="mt-2 text-blue-100">Let our indirect tax specialists oversee compliance while you focus on core operations.</p>
              </div>
              <a href="/signup" className="rounded-lg bg-white px-8 py-3 font-bold text-[#003b8f] transition hover:-translate-y-1">
                Get Started Today
              </a>
            </div>
          </div>
        </section>

        <ServiceFaqSection faqs={complianceFaqs} />

        <RelatedServicesSection
          items={[
            { title: 'GST Return Filing (GSTR-1 & 3B)', desc: 'Monthly return submissions backed by reconciled ledgers.', href: '/services/gst-returns' },
            { title: 'GST Audit & Assessment Defense', desc: 'Pre-audit readiness reviews and representation for ASMT-10 notices.', href: '/services/gst-audit' },
            { title: 'Strategic GST Advisory', desc: 'Tax planning and commercial structuring by senior Chartered Accountants.', href: '/services/gst-advisory' },
          ]}
        />
      </div>
    </PublicLayout>
  );
}

// ---------------------------------------------------------------------------
// 5. GST Refund Page
// ---------------------------------------------------------------------------

export function RefundServicePage() {
  const content = useContent('content_service_gst-refund', {
    heroBadge: 'CAPITAL RECOVERY SOLUTIONS',
    heroTitle: 'Expedited GST Refund Management & Capital Recovery',
    heroSubtitle:
      'Maximal capital recovery for exporters, inverted duty structures, and surplus cash ledgers with institutional CA verification and end-to-end follow-through.',
  });

  return (
    <PublicLayout
      meta={refundMeta}
      jsonLd={[
        serviceSchema(
          'GST Refund Recovery Services',
          'Expedited GST refund assistance for exporters and inverted duty structures with statutory CA certification.',
          'GST Refund',
          '/services/gst-refund'
        ),
        faqSchema(refundFaqs),
      ]}
    >
      <div className="bg-slate-50">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#eef5ff] via-white to-blue-50">
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
            <Breadcrumbs items={[{ name: 'Services', path: '/services' }, { name: 'GST Refund', path: '/services/gst-refund' }]} />
          </div>
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 lg:grid-cols-2 lg:py-20">
            <div className="fade-up">
              <span className="inline-flex rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-[#004aad]">
                {content.heroBadge}
              </span>
              <h1 className="mt-6 text-4xl sm:text-5xl font-extrabold leading-tight text-[#07184a]">
                {content.heroTitle}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">{content.heroSubtitle}</p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a href="/signup" className="rounded-lg bg-[#003b8f] px-6 py-3 font-bold text-white transition hover:-translate-y-1">
                  Check Your Refund Eligibility
                </a>
                <a href="#refund-process" className="rounded-lg border border-[#003b8f] px-6 py-3 font-bold text-[#003b8f]">
                  How It Works
                </a>
              </div>
              <div className="mt-10 grid grid-cols-3 gap-4 text-sm font-semibold text-slate-700">
                <span>⚡ Expedited Disbursement<br /><small className="font-normal">Structured application filing</small></span>
                <span>✓ Statutory CA Certification<br /><small className="font-normal">Annexure & ledger audit</small></span>
                <span>◎ 100% Eligible Recovery<br /><small className="font-normal">Zero unrecovered balance</small></span>
              </div>
            </div>
            <div className="fade-up hero-delay-2 relative rounded-3xl bg-[#003b8f] p-3 shadow-2xl transition hover:-translate-y-2">
              <img
                src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1100&q=85"
                alt="GST refund assistance"
                loading="lazy"
                decoding="async"
                className="h-80 w-full rounded-2xl object-cover"
              />
              <div className="absolute -bottom-5 -left-5 rounded-2xl bg-[#1454b8] px-6 py-5 text-white shadow-xl">
                <p className="font-bold">GST Refund Recovery</p>
                <p className="mt-1 text-sm text-blue-100">Disbursed directly to bank.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16">
          <div className="mb-10 text-center">
            <p className="text-sm font-bold text-[#1454b8]">STATUTORY ELIGIBILITY</p>
            <h2 className="mt-2 text-3xl font-extrabold text-[#07184a]">Qualifying Refund Scenarios & Portfolios</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {refundEligibility.map(([title, description], index) => (
              <div
                key={title}
                className="fade-up rounded-2xl border bg-white p-6 text-center shadow-sm transition hover:-translate-y-2 hover:shadow-xl"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-xl text-[#1454b8]">◎</div>
                <h3 className="font-bold text-[#07184a]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <InteractiveDocumentChecklist
          title="Required Records for GST Refund Processing"
          subtitle="DOCUMENTATION DOSSIER"
          items={refundDocuments}
        />

        <section id="refund-process" className="mx-auto max-w-7xl px-4 py-16">
          <div className="mb-12 text-center">
            <p className="text-sm font-bold text-[#1454b8]">DISBURSEMENT WORKFLOW</p>
            <h2 className="mt-2 text-3xl font-extrabold text-[#07184a]">Our End-to-End Refund Recovery Methodology</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-5">
            {refundSteps.map(([title, description], index) => (
              <div key={title} className="fade-up text-center" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-4 border-blue-100 bg-blue-50 font-bold text-[#1454b8]">
                  0{index + 1}
                </div>
                <h3 className="font-bold text-[#07184a]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-5 rounded-2xl bg-gradient-to-r from-[#003b8f] to-[#1454b8] p-8 text-white md:flex-row">
            <div>
              <h2 className="text-2xl font-extrabold">Accelerate your indirect tax refund claim today.</h2>
              <p className="mt-2 text-blue-100">Ensure compliant documentation and speed up direct bank credit.</p>
            </div>
            <a href="/signup" className="rounded-lg bg-white px-8 py-3 font-bold text-[#003b8f] transition hover:-translate-y-1">
              Initiate Refund Assessment
            </a>
          </div>
        </section>

        <ServiceFaqSection faqs={refundFaqs} />

        <RelatedServicesSection
          items={[
            { title: 'Import Export Code (IEC)', desc: 'Mandatory 10-digit DGFT code for international trade and exporters.', href: '/services/business-licenses/iec' },
            { title: 'GST Advisory Services', desc: 'Cross-border place of supply rules and zero-rated export structuring.', href: '/services/gst-advisory' },
            { title: 'GST Return Filing', desc: 'Monthly reporting of export invoices and shipping bills in GSTR-1.', href: '/services/gst-returns' },
          ]}
        />
      </div>
    </PublicLayout>
  );
}

// ---------------------------------------------------------------------------
// 6. GST Audit & Notice Defense Page
// ---------------------------------------------------------------------------

export function AuditServicePage() {
  return (
    <PublicLayout
      meta={auditMeta}
      jsonLd={[
        serviceSchema(
          'GST Audit & Notice Defense Services',
          'Professional GST audit representation, scrutiny notice reply (ASMT-10/DRC-01), and certified GSTR-9C sign-off.',
          'GST Audit',
          '/services/gst-audit'
        ),
        faqSchema(auditFaqs),
      ]}
    >
      <div className="bg-slate-50">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#eef5ff] via-white to-blue-50">
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
            <Breadcrumbs items={[{ name: 'Services', path: '/services' }, { name: 'GST Audit & Defense', path: '/services/gst-audit' }]} />
          </div>
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 lg:grid-cols-2 lg:py-20">
            <div className="fade-up">
              <span className="inline-flex rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-[#004aad]">
                STATUTORY SCRUTINY &amp; ASSESSMENT
              </span>
              <h1 className="mt-6 text-4xl sm:text-5xl font-extrabold leading-tight text-[#07184a]">
                GST Audit, Assessment &amp; <span className="text-[#1454b8]">Departmental Defense</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                Rigorous year-end reconciliation (GSTR-9/9C), risk exposure audits, and strategic defense representation before adjudicating tax authorities.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a href="/contact" className="rounded-lg bg-[#003b8f] px-6 py-3 font-bold text-white transition hover:-translate-y-1">
                  Book a Consultation
                </a>
                <a href="#audit-process" className="rounded-lg border border-[#003b8f] px-6 py-3 font-bold text-[#003b8f]">
                  How It Works
                </a>
              </div>
              <div className="mt-10 grid grid-cols-3 gap-4 text-sm font-semibold text-slate-700">
                <span>✓ Senior CA Representation<br /><small className="font-normal">Authorized advocacy</small></span>
                <span>◎ Exposure Mitigation<br /><small className="font-normal">Defensible reconciliations</small></span>
                <span>♧ ASMT &amp; DRC Defense<br /><small className="font-normal">Comprehensive notice brief</small></span>
              </div>
            </div>
            <div className="fade-up hero-delay-2 relative rounded-3xl bg-[#003b8f] p-3 shadow-2xl transition hover:-translate-y-2">
              <img
                src="https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=1100&q=85"
                alt="GST audit and assessment"
                loading="lazy"
                decoding="async"
                className="h-80 w-full rounded-2xl object-cover"
              />
              <div className="absolute -bottom-5 -left-5 rounded-2xl bg-[#1454b8] px-6 py-5 text-white shadow-xl">
                <p className="font-bold">Audit &amp; Notice Defense</p>
                <p className="mt-1 text-sm text-blue-100">Senior CA representation.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16">
          <div className="mb-10 text-center">
            <p className="text-sm font-bold text-[#1454b8]">ASSESSMENT CATEGORIES</p>
            <h2 className="mt-2 text-3xl font-extrabold text-[#07184a]">Statutory Audits &amp; Scrutiny Proceedings Covered</h2>
            <div className="mx-auto mt-4 h-1 w-12 bg-[#1454b8]" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {auditTypes.map(([title, description], index) => (
              <div
                key={title}
                className="fade-up rounded-2xl border bg-white p-6 text-center shadow-sm transition hover:-translate-y-2 hover:shadow-xl"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-xl text-[#1454b8]">◎</div>
                <h3 className="font-bold text-[#07184a]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <InteractiveDocumentChecklist
          title="Statutory Records Required for Audit Review"
          subtitle="AUDIT DOSSIER"
          items={auditDocs}
        />

        <section id="audit-process" className="mx-auto max-w-7xl px-4 py-16">
          <div className="mb-12 text-center">
            <p className="text-sm font-bold text-[#1454b8]">DEFENSE WORKFLOW</p>
            <h2 className="mt-2 text-3xl font-extrabold text-[#07184a]">Our Structured Audit &amp; Notice Defense Process</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3 lg:grid-cols-6">
            {auditSteps.map(([title, description], index) => (
              <div key={title} className="fade-up text-center" style={{ animationDelay: `${index * 90}ms` }}>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-4 border-blue-100 bg-blue-50 font-bold text-[#1454b8]">
                  0{index + 1}
                </div>
                <h3 className="font-bold text-[#07184a] text-sm">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-5 rounded-2xl bg-gradient-to-r from-[#003b8f] to-[#1454b8] p-8 text-white md:flex-row">
            <div>
              <h2 className="text-2xl font-extrabold">Defend your indirect tax positions with authority.</h2>
              <p className="mt-2 text-blue-100">Senior chartered accountants evaluate departmental queries and draft airtight submissions.</p>
            </div>
            <a href="/contact" className="rounded-lg bg-white px-8 py-3 font-bold text-[#003b8f] transition hover:-translate-y-1">
              Schedule Defense Review
            </a>
          </div>
        </section>

        <ServiceFaqSection faqs={auditFaqs} />

        <RelatedServicesSection
          items={[
            { title: 'GST Advisory Services', desc: 'Advance rulings, legal tax opinions, and supply chain structuring.', href: '/services/gst-advisory' },
            { title: 'Dynamic 2B ITC Recovery', desc: 'Reconcile purchase books against portal data to stop demand notices.', href: '/services/gst-compliance' },
            { title: 'GST Return Filing', desc: 'Timely and defensible GSTR-1, 3B, and annual GSTR-9 filings.', href: '/services/gst-returns' },
          ]}
        />
      </div>
    </PublicLayout>
  );
}

// ---------------------------------------------------------------------------
// 7. GST Advisory Page
// ---------------------------------------------------------------------------

export function AdvisoryServicePage() {
  return (
    <PublicLayout
      meta={advisoryMeta}
      jsonLd={[
        serviceSchema(
          'GST Advisory Services & Tax Planning',
          'Strategic GST advisory and indirect tax planning to optimize tax liability, mitigate litigation risk, and resolve classification disputes.',
          'GST Advisory',
          '/services/gst-advisory'
        ),
        faqSchema(advisoryFaqs),
      ]}
    >
      <div className="bg-slate-50">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#eef5ff] via-white to-blue-50">
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
            <Breadcrumbs items={[{ name: 'Services', path: '/services' }, { name: 'GST Advisory', path: '/services/gst-advisory' }]} />
          </div>
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 lg:grid-cols-2 lg:py-20">
            <div className="fade-up">
              <p className="text-sm font-bold text-[#1454b8]">STRATEGIC TAX ADVISORY</p>
              <h1 className="mt-5 text-4xl sm:text-5xl font-extrabold leading-tight text-[#07184a]">
                Strategic <span className="text-[#1454b8]">GST Advisory</span> &amp; Regulatory Counsel
              </h1>
              <h2 className="mt-4 text-xl sm:text-2xl font-bold text-[#1454b8]">
                Proactive tax structuring, supply chain optimization, and dispute resolution.
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
                Navigate the complexities of GST with senior CA counsel. We provide strategic guidance to structure operations, eliminate fiscal leakages, and defend contentious tax positions.
              </p>
              <div className="mt-6 flex flex-wrap gap-5 text-sm font-semibold text-slate-700">
                <span>✓ Strategic Structuring</span>
                <span>✓ Risk Mitigation</span>
                <span>✓ Capital Optimization</span>
              </div>
              <a href="/contact" className="mt-8 inline-block rounded-lg bg-[#003b8f] px-6 py-3 font-bold text-white transition hover:-translate-y-1">
                Schedule a Consultation
              </a>
            </div>
            <div className="fade-up hero-delay-2 relative rounded-3xl bg-blue-100 p-8 shadow-xl transition hover:-translate-y-2">
              <div className="flex h-72 items-center justify-center text-8xl font-black tracking-tight text-[#1454b8]">GST</div>
              <div className="absolute bottom-5 right-5 rounded-xl bg-white p-4 text-sm font-bold text-[#07184a] shadow-lg">
                TAX STRATEGY<br />
                <span className="font-normal text-slate-600">Plan. Comply. Scale.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16">
          <div className="mb-10 text-center">
            <p className="text-sm font-bold text-[#1454b8]">ENTERPRISE VALUE</p>
            <h2 className="mt-2 text-3xl font-extrabold text-[#07184a]">Actionable Tax Intelligence. Protected Bottom Line.</h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">
              Strategic tax advisory engineered to mitigate fiscal exposure, streamline cash flows, and unlock compounding operational savings.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {advisoryBenefits.map(([title, description], index) => (
              <div
                key={title}
                className="fade-up rounded-2xl border bg-white p-6 text-center shadow-sm transition hover:-translate-y-2 hover:shadow-xl"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-xl text-[#1454b8]">◎</div>
                <h3 className="font-bold text-[#07184a]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <InteractiveDocumentChecklist
          title="Information Dossier for Strategic Tax Opinions"
          subtitle="ADVISORY CHECKLIST"
          items={advisoryDocs}
        />

        <section className="bg-white">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-[1.2fr_.8fr]">
            <div>
              <p className="text-sm font-bold text-[#1454b8]">PRACTICE CAPABILITIES</p>
              <h2 className="mt-2 text-3xl font-extrabold text-[#07184a]">Specialized Indirect Tax Advisory Services</h2>
              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                {advisoryServices.map(([title, description], index) => (
                  <div key={title} className="fade-up" style={{ animationDelay: `${index * 80}ms` }}>
                    <h3 className="font-bold text-[#07184a]">◎ {title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div
              className="h-80 rounded-2xl bg-cover bg-center shadow-xl"
              style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=85)' }}
            />
          </div>
        </section>

        <ServiceFaqSection faqs={advisoryFaqs} />

        <RelatedServicesSection
          items={[
            { title: 'GST Audit & Assessment', desc: 'Statutory ASMT-10 notice replies and certified GSTR-9C sign-offs.', href: '/services/gst-audit' },
            { title: 'Startup India Recognition', desc: 'Unlock 3-year Section 80-IAC tax exemption and angel tax holiday.', href: '/services/business-licenses/startup-india' },
            { title: 'GST Compliance Services', desc: 'Ongoing indirect tax health checks and 2B ITC protection.', href: '/services/gst-compliance' },
          ]}
        />
      </div>
    </PublicLayout>
  );
}

// ---------------------------------------------------------------------------
// 8. GST TDS & TCS Page
// ---------------------------------------------------------------------------

export function TdsTcsServicePage() {
  return (
    <PublicLayout
      meta={tdsTcsMeta}
      jsonLd={[
        serviceSchema(
          'GST TDS & TCS Compliance Services (GSTR-7 & GSTR-8)',
          'Professional GST TDS (Section 51) and TCS (Section 52) filing services for government entities, PSUs, and e-commerce operators across India.',
          'GST TDS TCS',
          '/services/gst-tds-tcs'
        ),
        faqSchema(tdsTcsFaqs),
      ]}
    >
      <div className="bg-slate-50">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#eef5ff] via-white to-blue-50">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
            <Breadcrumbs items={[{ name: 'Services', path: '/services' }, { name: 'GST TDS & TCS', path: '/services/gst-tds-tcs' }]} />
          </div>
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 lg:grid-cols-2 lg:py-20">
            <div className="fade-up">
              <span className="inline-flex rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-[#004aad]">
                STATUTORY DEDUCTION &amp; COLLECTION (SEC 51 / 52)
              </span>
              <h1 className="mt-6 text-4xl sm:text-5xl font-extrabold leading-tight text-[#07184a]">
                Precision <span className="text-[#1454b8]">GST TDS &amp; TCS Compliance</span> Management
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
              <img
                src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1100&q=85"
                alt="GST TDS and TCS compliance"
                loading="lazy"
                decoding="async"
                className="h-80 w-full rounded-2xl object-cover"
              />
              <div className="absolute -bottom-5 -left-5 rounded-2xl bg-[#1454b8] px-6 py-5 text-white shadow-xl">
                <p className="font-bold">GST TDS &amp; TCS Services</p>
                <p className="mt-1 text-sm text-blue-100">Section 51 &amp; 52 Statutory Compliance.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16">
          <div className="mb-10 text-center">
            <p className="text-sm font-bold text-[#1454b8]">STATUTORY PRACTICE SCOPE</p>
            <h2 className="mt-2 text-3xl font-extrabold text-[#07184a]">Core GST TDS &amp; TCS Management Capabilities</h2>
            <div className="mx-auto mt-4 h-1 w-12 bg-[#1454b8]" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tdsTcsFrameworks.map(([title, description], index) => (
              <div
                key={title}
                className="fade-up rounded-2xl border bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-xl text-[#1454b8]">◎</div>
                <h3 className="font-bold text-[#07184a]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <InteractiveDocumentChecklist
          title="Records Required for TDS &amp; TCS Filing"
          subtitle="COMPLIANCE DOSSIER"
          items={tdsTcsDocuments}
        />

        <section className="bg-white pb-16">
          <div className="mx-auto max-w-7xl px-4">
            <div id="tds-process" className="mb-12 text-center">
              <p className="text-sm font-bold text-[#1454b8]">COMPLIANCE WORKFLOW</p>
              <h2 className="mt-2 text-3xl font-extrabold text-[#07184a]">Our Systematic Filing &amp; Certificate Issuance Process</h2>
            </div>
            <div className="grid gap-8 md:grid-cols-5">
              {tdsTcsSteps.map(([title, description], index) => (
                <div key={title} className="fade-up text-center" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-4 border-blue-100 bg-blue-50 font-bold text-[#1454b8]">
                    0{index + 1}
                  </div>
                  <h3 className="font-bold text-[#07184a]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                </div>
              ))}
            </div>
            <div className="mt-14 flex flex-col items-center justify-between gap-5 rounded-2xl bg-gradient-to-r from-[#003b8f] to-[#1454b8] p-8 text-white md:flex-row">
              <div>
                <h2 className="text-2xl font-extrabold">Ensure Seamless GST TDS &amp; TCS Governance</h2>
                <p className="mt-2 text-blue-100">Let licensed Chartered Accountants handle deduction computations, return filings, and certificate dispatch.</p>
              </div>
              <a href="/signup" className="rounded-lg bg-white px-8 py-3 font-bold text-[#003b8f] transition hover:-translate-y-1">
                Get Started Today
              </a>
            </div>
          </div>
        </section>

        <ServiceFaqSection faqs={tdsTcsFaqs} />

        <RelatedServicesSection
          items={[
            { title: 'Monthly GST Return Filing', desc: 'Timely filing of GSTR-1 and GSTR-3B with multi-tier reconciliation.', href: '/services/gst-returns' },
            { title: 'Statutory GST Registration', desc: 'Register as Tax Deductor (Sec 51) or Tax Collector (Sec 52).', href: '/services/gst-registration' },
            { title: 'Digital Signature Certificate (DSC)', desc: 'Class-3 DSC for authorized signers filing portal returns.', href: '/services/business-licenses/dsc' },
          ]}
        />
      </div>
    </PublicLayout>
  );
}

// ---------------------------------------------------------------------------
// 9. Business Licenses Hub
// ---------------------------------------------------------------------------

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
    <PublicLayout
      meta={businessLicensesMeta}
      jsonLd={[
        serviceSchema(
          'Business Licenses & Statutory Registrations India',
          'End-to-end statutory commercial licensing in India covering Shop Act, Trade License, FSSAI, Udyam MSME, IEC, Professional Tax, DSC & Startup India.',
          'Business Licensing',
          '/services/business-licenses'
        ),
        faqSchema(businessLicensesFaqs),
      ]}
    >
      <div className="bg-slate-50 py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: 'Services', path: '/services' }, { name: 'Business Licenses', path: '/services/business-licenses' }]} />

          <div className="text-center max-w-3xl mx-auto mt-6 mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200 px-3.5 py-1 rounded-full inline-block mb-3">
              Statutory Business Licenses
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Essential Licenses &amp; Government Registrations
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
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z" />
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

          <div className="mt-16">
            <ServiceFaqSection faqs={businessLicensesFaqs} />
          </div>

          <div className="mt-12">
            <RelatedServicesSection
              items={[
                { title: 'Statutory GST Registration', desc: 'Fast-track GSTIN issuance for new commercial ventures.', href: '/services/gst-registration' },
                { title: 'Monthly GST Return Filing', desc: 'Zero-penalty GSTR-1 and GSTR-3B filing retainers.', href: '/services/gst-returns' },
                { title: 'Corporate GST Advisory', desc: 'Expert tax structuring and legal counsel by senior CAs.', href: '/services/gst-advisory' },
              ]}
            />
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

// ---------------------------------------------------------------------------
// 10. Individual Business License Pages
// ---------------------------------------------------------------------------

export function ShopEstablishmentPage() {
  const documents = [
    ['Aadhaar Card', 'Identity proof of proprietor or managing director'],
    ['PAN Card', 'Permanent Account Number of entity or owner'],
    ['Business Address Proof', 'Electricity bill, municipal tax receipt, or property ownership deed'],
    ['Rent Agreement & NOC', 'No-Objection Certificate from premises owner if rented'],
    ['Passport Size Photographs', 'Recent photographs of applicants and authorized signers'],
    ['Business Incorporation Proof', 'Partnership deed, Certificate of Incorporation, or MSME registration'],
  ];
  const steps = ['Information Collection', 'Document Verification', 'Application Filing on State Portal', 'Departmental Verification', 'Certificate Issuance'];
  const faqs = [
    { question: 'Who needs a Shop & Establishment Act registration?', answer: 'Every shop, commercial office, restaurant, hotel, theatre, or commercial service establishment operating within an Indian state must obtain this license within 30 days of opening.' },
    { question: 'Is the Shop Act registration valid for life or does it expire?', answer: 'Validity depends on the specific state Act. In many states (such as Maharashtra Gumasta), registration is granted with lifetime validity, while in others it requires periodic renewal every 1 to 5 years.' },
    { question: 'What is the processing timeline for a Shop & Establishment license?', answer: 'Typically 7 to 15 working days after successful submission of verified address and identity documents on the respective state labour department portal.' },
  ];

  return (
    <PublicLayout
      meta={shopEstablishmentMeta}
      jsonLd={[
        serviceSchema('Shop & Establishment Act Registration Online India', 'Apply for Shop and Establishment Registration online across all Indian states with 100% compliant documentation.', 'Shop Act License', '/services/business-licenses/shop-establishment'),
        faqSchema(faqs),
      ]}
    >
      <section className="bg-gradient-to-br from-[#eef5ff] via-white to-blue-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
          <Breadcrumbs items={[{ name: 'Services', path: '/services' }, { name: 'Business Licenses', path: '/services/business-licenses' }, { name: 'Shop & Establishment', path: '/services/business-licenses/shop-establishment' }]} />
        </div>
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold text-[#1454b8]">LEGAL · MANDATORY · HASSLE-FREE</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight text-[#07184a]">Shop &amp; Establishment Registration</h1>
            <p className="mt-4 text-slate-600">Mandatory registration for shops, commercial establishments, and offices under the state Shops and Establishments Act.</p>
            <div className="mt-6 flex gap-3">
              <a href="/contact" className="rounded bg-[#1454b8] px-5 py-3 font-bold text-white">Get Started Now →</a>
              <a href="/contact" className="rounded border border-[#1454b8] px-5 py-3 font-bold text-[#1454b8]">Talk to an Expert</a>
            </div>
          </div>
          <div className="rounded-3xl bg-blue-100 p-10 text-center text-8xl">🏪</div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl space-y-5 px-4 py-12">
        <article className="rounded-xl border bg-white p-6">
          <h2 className="font-bold text-[#07184a]">Overview</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">Every shop, commercial establishment, or business operating within a state is required to obtain registration under the local Shops and Establishments Act. It regulates working conditions, employee welfare, leave, and serves as foundational proof of commercial existence.</p>
        </article>
        <InteractiveDocumentChecklist title="Documents Required for Shop Act Registration" subtitle="DOCUMENT CHECKLIST" items={documents} />
        <article className="rounded-xl border bg-white p-6">
          <h2 className="font-bold text-[#07184a]">Our Process</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step, index) => (
              <div key={step} className="text-center">
                <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-blue-100 font-bold text-[#1454b8]">{index + 1}</div>
                <p className="mt-2 text-xs font-semibold text-slate-700">{step}</p>
              </div>
            ))}
          </div>
        </article>
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border bg-white p-6">
            <h2 className="font-bold text-[#07184a]">Timeline</h2>
            <p className="mt-2 text-sm text-slate-600">Typically 7–15 working days depending on state municipal processing.</p>
          </article>
          <article className="rounded-xl border bg-white p-6">
            <h2 className="font-bold text-[#07184a]">Benefits</h2>
            <p className="mt-2 text-sm text-slate-600">Essential for bank account opening, statutory compliance, and avoidance of local labour department fines.</p>
          </article>
          <article className="rounded-xl border bg-white p-6">
            <h2 className="font-bold text-[#07184a]">Fees</h2>
            <p className="mt-2 text-sm text-slate-600">Government fees depend on number of employees and state schedule. Transparent professional CA fees apply.</p>
          </article>
        </div>
        <div className="rounded-xl bg-[#063a8d] p-7 text-white">
          <h2 className="text-2xl font-bold">Stay Compliant. Stay Worry-Free.</h2>
          <p className="mt-2 text-blue-100">Let GSTBro handle your Shop &amp; Establishment Registration from start to finish.</p>
          <a href="/contact" className="mt-4 inline-block rounded bg-white px-5 py-3 font-bold text-[#063a8d]">Get Started Now →</a>
        </div>
      </section>
      <ServiceFaqSection faqs={faqs} />
      <RelatedServicesSection
        items={[
          { title: 'Statutory GST Registration', desc: 'Fast online GSTIN registration with document vetting.', href: '/services/gst-registration' },
          { title: 'Trade License Approval', desc: 'Municipal permission for retail and commercial premises.', href: '/services/business-licenses/trade-license' },
          { title: 'Professional Tax Enrollment', desc: 'State employer PT registration (PTEC and PTRC).', href: '/services/business-licenses/professional-tax' },
        ]}
      />
    </PublicLayout>
  );
}

export function TradeLicensePage() {
  const documents = [
    ['Identity Proof', 'Aadhaar Card or PAN Card of applicant/directors'],
    ['Premises Address Proof', 'Property tax receipt, electricity bill, or water bill'],
    ['Rent Agreement & NOC', 'Valid lease contract and owner No-Objection Certificate'],
    ['Premises Floor Plan', 'Blueprint or layout diagram of commercial establishment'],
    ['Fire NOC (If Required)', 'Fire department clearance for restaurants and manufacturing units'],
    ['Business Proof', 'Certificate of Incorporation, partnership deed, or Gumasta license'],
  ];
  const steps = ['Application Filing', 'Document Submission', 'Municipal Inspection', 'Challan Deposition', 'Trade License Issuance'];
  const faqs = [
    { question: 'What is a municipal Trade License and who issues it?', answer: 'A Trade License is permission issued by the local Municipal Corporation or municipal council authorizing you to conduct specific commercial, manufacturing, or trading activities in a designated locality.' },
    { question: 'Is a Trade License different from GST registration?', answer: 'Yes. GST registration is a central and state indirect tax identifier for tax payment, while a Trade License is local municipal permission ensuring your business location satisfies health, fire, and sanitation regulations.' },
    { question: 'What is the validity of a Trade License?', answer: 'Trade licenses are typically issued on an annual basis (valid from April 1 to March 31) and require annual renewal before statutory municipal cutoff dates.' },
  ];

  return (
    <PublicLayout
      meta={tradeLicenseMeta}
      jsonLd={[
        serviceSchema('Trade License Registration & Municipal Approval', 'Get your municipal Trade License online with GSTBro. Comprehensive document verification and municipal liaison.', 'Trade License', '/services/business-licenses/trade-license'),
        faqSchema(faqs),
      ]}
    >
      <section className="bg-gradient-to-br from-[#eef5ff] via-white to-blue-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
          <Breadcrumbs items={[{ name: 'Services', path: '/services' }, { name: 'Business Licenses', path: '/services/business-licenses' }, { name: 'Trade License', path: '/services/business-licenses/trade-license' }]} />
        </div>
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold text-[#1454b8]">BUSINESS LICENSES &amp; CERTIFICATIONS</p>
            <h1 className="mt-3 text-4xl font-extrabold text-[#07184a]">Trade License</h1>
            <p className="mt-4 text-slate-600">Local municipal license required to carry out commercial business operations within the city or municipality limits.</p>
            <div className="mt-6 flex gap-3">
              <a href="/contact" className="rounded bg-[#1454b8] px-5 py-3 font-bold text-white">Get Started Now →</a>
              <a href="/contact" className="rounded border border-[#1454b8] px-5 py-3 font-bold text-[#1454b8]">Talk to an Expert</a>
            </div>
          </div>
          <div className="rounded-3xl bg-blue-100 p-10 text-center text-8xl">🏬</div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-12">
        <article className="rounded-xl border bg-white p-6">
          <h2 className="font-bold text-[#07184a]">What is a Trade License?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">A Trade License is a mandatory license issued by the local municipal authority that permits individuals or businesses to carry out specified commercial activities within local limits. It ensures compliance with local laws, safety standards, and health regulations.</p>
        </article>
        <InteractiveDocumentChecklist title="Documents Required for Trade License" subtitle="DOCUMENTATION" items={documents} />
        <article className="rounded-xl border bg-white p-6">
          <h2 className="font-bold text-[#07184a]">Registration Process</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step, index) => (
              <div key={step} className="text-center">
                <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-blue-100 font-bold text-[#1454b8]">{index + 1}</div>
                <p className="mt-2 text-xs font-semibold text-slate-700">{step}</p>
              </div>
            ))}
          </div>
        </article>
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border bg-white p-6">
            <h2 className="font-bold text-[#07184a]">Timeline</h2>
            <p className="mt-2 text-sm text-slate-600">Typically 15–30 working days depending on municipality and physical inspection requirements.</p>
          </article>
          <article className="rounded-xl border bg-white p-6">
            <h2 className="font-bold text-[#07184a]">Benefits</h2>
            <p className="mt-2 text-sm text-slate-600">Legal authorization to trade, prevents municipal closure notices, and builds consumer credibility.</p>
          </article>
          <article className="rounded-xl border bg-white p-6">
            <h2 className="font-bold text-[#07184a]">Fees</h2>
            <p className="mt-2 text-sm text-slate-600">Fees vary by business activity, carpet area, and municipal corporation schedule.</p>
          </article>
        </div>
        <div className="rounded-xl bg-[#063a8d] p-7 text-white">
          <h2 className="text-2xl font-bold">Ready to Get Your Trade License?</h2>
          <p className="mt-2 text-blue-100">Let GSTBro handle the paperwork and municipal liaison while you focus on operations.</p>
          <a href="/contact" className="mt-4 inline-block rounded bg-white px-5 py-3 font-bold text-[#063a8d]">Get Started Now →</a>
        </div>
      </section>
      <ServiceFaqSection faqs={faqs} />
      <RelatedServicesSection
        items={[
          { title: 'Shop & Establishment Registration', desc: 'Labour department license for commercial establishments.', href: '/services/business-licenses/shop-establishment' },
          { title: 'FSSAI Food License', desc: 'Mandatory central and state licensing for food operators.', href: '/services/business-licenses/fssai' },
          { title: 'Statutory GST Registration', desc: 'Fast online GSTIN issuance with zero rejection guarantee.', href: '/services/gst-registration' },
        ]}
      />
    </PublicLayout>
  );
}

export function FssaiLicensePage() {
  const documents = [
    ['Identity & Address Proof', 'Aadhaar Card, PAN Card, or voter ID of proprietor/partners/directors'],
    ['Business Premises Proof', 'Electricity bill, rent agreement with NOC, or property tax receipt'],
    ['Food Safety Management Plan', 'Self-declaration or FSMS plan detailing hygiene standards'],
    ['Food Category Roster', 'Comprehensive list of food products, packaged items, or menu'],
    ['Water Quality Test Report', 'Bacteriological water testing report for food manufacturing units'],
    ['Partnership Deed / COI', 'Constitutional documents for corporate or partnership entities'],
  ];
  const steps = ['Determine License Tier', 'Application Preparation', 'Online FoSCoS Submission', 'Authority Verification', 'Certificate Issuance'];
  const faqs = [
    { question: 'What is the difference between FSSAI Registration, State License, and Central License?', answer: 'FSSAI Basic Registration is for petty food businesses with annual turnover under ₹12 Lakhs. FSSAI State License is for medium food businesses with turnover between ₹12 Lakhs and ₹20 Crores. FSSAI Central License is mandatory for large manufacturers, importers, and businesses with turnover above ₹20 Crores or operating in multiple states.' },
    { question: 'Who is required to obtain FSSAI license in India?', answer: 'Every Food Business Operator (FBO)—including restaurants, cloud kitchens, cafes, food manufacturers, distributors, cold storage units, transporters, and online food aggregators—must obtain FSSAI license before commencing operations.' },
    { question: 'What is the validity period of an FSSAI license?', answer: 'FSSAI licenses and registrations can be obtained for a validity period ranging from 1 to 5 years, chosen at the time of application.' },
  ];

  return (
    <PublicLayout
      meta={fssaiMeta}
      jsonLd={[
        serviceSchema('FSSAI Food License & Registration Online India', 'Complete FSSAI food business registration and state or central licensing for restaurants and food businesses.', 'FSSAI License', '/services/business-licenses/fssai'),
        faqSchema(faqs),
      ]}
    >
      <section className="bg-gradient-to-br from-[#eef5ff] via-white to-blue-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
          <Breadcrumbs items={[{ name: 'Services', path: '/services' }, { name: 'Business Licenses', path: '/services/business-licenses' }, { name: 'FSSAI Food License', path: '/services/business-licenses/fssai' }]} />
        </div>
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold text-[#1454b8]">BUSINESS LICENSES &amp; CERTIFICATIONS</p>
            <h1 className="mt-3 text-4xl font-extrabold text-[#07184a]">FSSAI Registration &amp; License</h1>
            <p className="mt-4 text-slate-600">Food registration and licensing for food businesses to ensure regulatory safety, food hygiene, and customer trust.</p>
            <div className="mt-6 flex gap-3">
              <a href="/contact" className="rounded bg-[#1454b8] px-5 py-3 font-bold text-white">Get Started Now →</a>
              <a href="/contact" className="rounded border border-[#1454b8] px-5 py-3 font-bold text-[#1454b8]">Talk to an Expert</a>
            </div>
          </div>
          <div className="rounded-3xl bg-blue-100 p-10 text-center text-8xl">🥗</div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-12">
        <article className="rounded-xl border bg-white p-6">
          <h2 className="font-bold text-[#07184a]">What is FSSAI Registration &amp; License?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">FSSAI Registration or License is mandatory for all food businesses operating in India. Issued by the Food Safety and Standards Authority of India (FSSAI), it ensures food safety and hygiene standards are maintained.</p>
        </article>
        <InteractiveDocumentChecklist title="Documents Required for FSSAI License" subtitle="FOOD SAFETY DOSSIER" items={documents} />
        <article className="rounded-xl border bg-white p-6">
          <h2 className="font-bold text-[#07184a]">Registration / Licensing Process</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step, index) => (
              <div key={step} className="text-center">
                <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-blue-100 font-bold text-[#1454b8]">{index + 1}</div>
                <p className="mt-2 text-xs font-semibold text-slate-700">{step}</p>
              </div>
            ))}
          </div>
        </article>
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border bg-white p-6">
            <h2 className="font-bold text-[#07184a]">Timeline</h2>
            <p className="mt-2 text-sm text-slate-600">FSSAI Basic: 7–10 working days. FSSAI State or Central License: 15–30 working days.</p>
          </article>
          <article className="rounded-xl border bg-white p-6">
            <h2 className="font-bold text-[#07184a]">Benefits</h2>
            <p className="mt-2 text-sm text-slate-600">Mandatory for Swiggy/Zomato listing, legal compliance, customer confidence, and export credibility.</p>
          </article>
          <article className="rounded-xl border bg-white p-6">
            <h2 className="font-bold text-[#07184a]">Fees</h2>
            <p className="mt-2 text-sm text-slate-600">Government fees range from ₹100/yr (Basic) to ₹2,000–₹5,000/yr (State). Professional fees apply.</p>
          </article>
        </div>
        <div className="rounded-xl bg-[#063a8d] p-7 text-white">
          <h2 className="text-2xl font-bold">Ready to Get FSSAI Registration or License?</h2>
          <p className="mt-2 text-blue-100">Let GSTBro take care of the paperwork while you focus on your food business.</p>
          <a href="/contact" className="mt-4 inline-block rounded bg-white px-5 py-3 font-bold text-[#063a8d]">Get Started Now →</a>
        </div>
      </section>
      <ServiceFaqSection faqs={faqs} />
      <RelatedServicesSection
        items={[
          { title: 'Trade License Approval', desc: 'Municipal permission for restaurants and cafes.', href: '/services/business-licenses/trade-license' },
          { title: 'Statutory GST Registration', desc: 'Fast GSTIN issuance for restaurants and cloud kitchens.', href: '/services/gst-registration' },
          { title: 'MSME / Udyam Registration', desc: 'Government subsidies and credit support for food units.', href: '/services/business-licenses/udyam' },
        ]}
      />
    </PublicLayout>
  );
}

export function UdyamRegistrationPage() {
  const documents = [
    ['Aadhaar Card', 'Aadhaar of proprietor, managing partner, or authorized director'],
    ['PAN Card', 'Permanent Account Number of business or individual owner'],
    ['Bank Details', 'Bank account number and IFSC code of the business account'],
    ['Investment Data', 'Historical plant & machinery / equipment cost values'],
    ['Turnover Data', 'Past financial year turnover figures from ITR or books'],
  ];
  const steps = ['Aadhaar Authentication', 'Business Profile Entry', 'Investment & Turnover Self-Declaration', 'Application Submission', 'Instant Udyam Certificate'];
  const faqs = [
    { question: 'What is MSME / Udyam registration?', answer: 'Udyam Registration is the official Government of India portal for classifying Micro, Small, and Medium Enterprises under the MSMED Act, granting eligibility for statutory benefits and priority bank lending.' },
    { question: 'What are the turnover and investment thresholds for MSME classification?', answer: 'Micro: Investment up to ₹1 Crore and Turnover up to ₹5 Crore. Small: Investment up to ₹10 Crore and Turnover up to ₹50 Crore. Medium: Investment up to ₹50 Crore and Turnover up to ₹250 Crore.' },
    { question: 'Is there any government fee for Udyam registration?', answer: 'No. The Government of India does not levy any government application fee for Udyam registration. Professional assistance fees apply for consultation, document verification, and filing.' },
  ];

  return (
    <PublicLayout
      meta={udyamMeta}
      jsonLd={[
        serviceSchema('MSME Udyam Registration Online (Govt Subsidies)', 'Fast MSME / Udyam registration for small businesses, startups and manufacturers with expert guidance.', 'Udyam MSME', '/services/business-licenses/udyam'),
        faqSchema(faqs),
      ]}
    >
      <section className="bg-gradient-to-br from-[#eef5ff] via-white to-blue-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
          <Breadcrumbs items={[{ name: 'Services', path: '/services' }, { name: 'Business Licenses', path: '/services/business-licenses' }, { name: 'MSME Udyam', path: '/services/business-licenses/udyam' }]} />
        </div>
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold text-[#1454b8]">BUSINESS LICENSES &amp; CERTIFICATIONS</p>
            <h1 className="mt-3 text-4xl font-extrabold text-[#07184a]">MSME / Udyam Registration</h1>
            <p className="mt-4 text-slate-600">Register as an MSME and receive recognition, priority credit benefits, and subsidies from the Government of India.</p>
            <div className="mt-6 flex gap-3">
              <a href="/contact" className="rounded bg-[#1454b8] px-5 py-3 font-bold text-white">Register Now →</a>
              <a href="/contact" className="rounded border border-[#1454b8] px-5 py-3 font-bold text-[#1454b8]">Talk to an Expert</a>
            </div>
          </div>
          <div className="rounded-3xl bg-blue-100 p-10 text-center text-8xl">✅</div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-12">
        <article className="rounded-xl border bg-white p-6">
          <h2 className="font-bold text-[#07184a]">What is MSME / Udyam Registration?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Udyam Registration is a Government of India initiative to promote and support Micro, Small and Medium Enterprises. It provides an official MSME certificate along with access to collateral-free credit, subsidies, and protection against delayed commercial payments.</p>
        </article>
        <InteractiveDocumentChecklist title="Documents Required for Udyam Registration" subtitle="SELF-DECLARATION REQUIREMENTS" items={documents} />
        <article className="rounded-xl border bg-white p-6">
          <h2 className="font-bold text-[#07184a]">Registration Process (100% Online)</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step, index) => (
              <div key={step} className="text-center">
                <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-blue-100 font-bold text-[#1454b8]">{index + 1}</div>
                <p className="mt-2 text-xs font-semibold text-slate-700">{step}</p>
              </div>
            ))}
          </div>
        </article>
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border bg-white p-6">
            <h2 className="font-bold text-[#07184a]">Timeline</h2>
            <p className="mt-2 text-sm text-slate-600">Typically 1–2 working days after Aadhaar OTP verification.</p>
          </article>
          <article className="rounded-xl border bg-white p-6">
            <h2 className="font-bold text-[#07184a]">Benefits</h2>
            <p className="mt-2 text-sm text-slate-600">Priority lending interest subsidies, delayed payment protection (45 days rule), and public tender fee waivers.</p>
          </article>
          <article className="rounded-xl border bg-white p-6">
            <h2 className="font-bold text-[#07184a]">Fees</h2>
            <p className="mt-2 text-sm text-slate-600">Government fee is ₹0. Modest professional drafting and advisory fees apply.</p>
          </article>
        </div>
        <div className="rounded-xl bg-[#063a8d] p-7 text-white">
          <h2 className="text-2xl font-bold">Ready to Register Your Business as MSME?</h2>
          <p className="mt-2 text-blue-100">Get your Udyam Registration Certificate today and unlock numerous central government benefits.</p>
          <a href="/contact" className="mt-4 inline-block rounded bg-white px-5 py-3 font-bold text-[#063a8d]">Register Now →</a>
        </div>
      </section>
      <ServiceFaqSection faqs={faqs} />
      <RelatedServicesSection
        items={[
          { title: 'Statutory GST Registration', desc: 'Complimentary GSTIN registration for MSME businesses.', href: '/services/gst-registration' },
          { title: 'Startup India Recognition', desc: 'DPIIT certificate unlocking 3-year income tax holiday.', href: '/services/business-licenses/startup-india' },
          { title: 'Import Export Code (IEC)', desc: '10-digit DGFT trade code for global expansion.', href: '/services/business-licenses/iec' },
        ]}
      />
    </PublicLayout>
  );
}

export function IecPage() {
  const documents = [
    ['PAN Card', 'Permanent Account Number of business entity or proprietor'],
    ['Aadhaar Card', 'Identity proof of proprietor, partners, or directors'],
    ['Bank Proof', 'Cancelled cheque or bank certificate showing business account name and IFSC'],
    ['Business Proof', 'Certificate of Incorporation, partnership deed, or GSTIN certificate'],
    ['Digital Signature (DSC)', 'Class-3 DSC or Aadhaar OTP of authorized signatory'],
  ];
  const steps = ['DGFT User Profile Setup', 'Form ANF-2A Preparation', 'Document Upload', 'Application Fee Payment', 'Instant IEC Issuance'];
  const faqs = [
    { question: 'What is an Import Export Code (IEC)?', answer: 'The Import Export Code (IEC) is a 10-digit identification code issued by the Directorate General of Foreign Trade (DGFT), Ministry of Commerce & Industry. It is mandatory for commercial import and export of goods and services from India.' },
    { question: 'Is annual renewal required for an IEC code?', answer: 'An IEC code has lifetime validity; however, under foreign trade policy regulations, every IEC holder must confirm or update their IEC details electronically on the DGFT portal annually between April and June.' },
    { question: 'Do service exporters need an Import Export Code?', answer: 'Yes. Service exporters receiving foreign remittances need an IEC to avail export benefits under foreign trade schemes and claim GST zero-rated export refunds without paying IGST.' },
  ];

  return (
    <PublicLayout
      meta={iecMeta}
      jsonLd={[
        serviceSchema('Import Export Code (IEC) Registration Online DGFT', 'Mandatory 10-digit Import Export Code (IEC) registration from DGFT for global trade and e-commerce exporters.', 'IEC Code', '/services/business-licenses/iec'),
        faqSchema(faqs),
      ]}
    >
      <section className="bg-gradient-to-br from-[#eef5ff] via-white to-blue-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
          <Breadcrumbs items={[{ name: 'Services', path: '/services' }, { name: 'Business Licenses', path: '/services/business-licenses' }, { name: 'IEC Registration', path: '/services/business-licenses/iec' }]} />
        </div>
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold text-[#1454b8]">BUSINESS LICENSES &amp; CERTIFICATIONS</p>
            <h1 className="mt-3 text-4xl font-extrabold text-[#07184a]">IEC – Import Export Code</h1>
            <p className="mt-4 text-slate-600">Mandatory 10-digit code issued by DGFT for businesses involved in international import or export of goods or services.</p>
            <div className="mt-6 flex gap-3">
              <a href="/contact" className="rounded bg-[#1454b8] px-5 py-3 font-bold text-white">Get Started Now →</a>
              <a href="/contact" className="rounded border border-[#1454b8] px-5 py-3 font-bold text-[#1454b8]">Talk to an Expert</a>
            </div>
          </div>
          <div className="rounded-3xl bg-blue-100 p-10 text-center text-8xl">✈️</div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-12">
        <article className="rounded-xl border bg-white p-6">
          <h2 className="font-bold text-[#07184a]">What is IEC?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">IEC (Import Export Code) is a 10-digit unique code issued by the Directorate General of Foreign Trade (DGFT), Ministry of Commerce &amp; Industry. It is mandatory for businesses involved in import or export of goods or services from India.</p>
        </article>
        <InteractiveDocumentChecklist title="Documents Required for IEC Code" subtitle="DGFT DOSSIER" items={documents} />
        <article className="rounded-xl border bg-white p-6">
          <h2 className="font-bold text-[#07184a]">Application Process (100% Online)</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step, index) => (
              <div key={step} className="text-center">
                <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-blue-100 font-bold text-[#1454b8]">{index + 1}</div>
                <p className="mt-2 text-xs font-semibold text-slate-700">{step}</p>
              </div>
            ))}
          </div>
        </article>
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border bg-white p-6">
            <h2 className="font-bold text-[#07184a]">Timeline</h2>
            <p className="mt-2 text-sm text-slate-600">Typically 1–3 working days after online submission and payment.</p>
          </article>
          <article className="rounded-xl border bg-white p-6">
            <h2 className="font-bold text-[#07184a]">Benefits</h2>
            <p className="mt-2 text-sm text-slate-600">Enables global cross-border transactions, customs clearances, and zero-rated GST export refunds.</p>
          </article>
          <article className="rounded-xl border bg-white p-6">
            <h2 className="font-bold text-[#07184a]">Fees</h2>
            <p className="mt-2 text-sm text-slate-600">Statutory DGFT government registration fee is ₹500 only.</p>
          </article>
        </div>
        <div className="rounded-xl bg-[#063a8d] p-7 text-white">
          <h2 className="text-2xl font-bold">Ready to Get Your IEC Code?</h2>
          <p className="mt-2 text-blue-100">Start your import/export journey with GSTBro. Quick, easy and fully assisted.</p>
          <a href="/contact" className="mt-4 inline-block rounded bg-white px-5 py-3 font-bold text-[#063a8d]">Get Started Now →</a>
        </div>
      </section>
      <ServiceFaqSection faqs={faqs} />
      <RelatedServicesSection
        items={[
          { title: 'GST Refund for Exporters', desc: 'Accelerate zero-rated export refund claims under LUT.', href: '/services/gst-refund' },
          { title: 'Class 3 Digital Signature (DSC)', desc: 'Required for DGFT portal signing and customs clearance.', href: '/services/business-licenses/dsc' },
          { title: 'Statutory GST Registration', desc: 'Mandatory GSTIN registration for exporters and global traders.', href: '/services/gst-registration' },
        ]}
      />
    </PublicLayout>
  );
}

export function ProfessionalTaxPage() {
  const documents = [
    ['PAN Card', 'Permanent Account Number of business and owners'],
    ['Business Proof', 'Certificate of Incorporation, partnership deed, or GSTIN'],
    ['Identity Proof', 'Aadhaar Card or PAN of partners/directors/proprietor'],
    ['Address Proof', 'Electricity bill, property tax receipt, or lease agreement'],
    ['Employee Details', 'Salary register and employee count for PTRC registration'],
  ];
  const steps = ['Check State Law', 'Document Gathering', 'Online Portal Submission', 'Authority Verification', 'Certificate Issuance'];
  const faqs = [
    { question: 'What is the difference between PTEC and PTRC?', answer: 'PTEC (Professional Tax Enrollment Certificate) is paid by the business entity, directors, or self-employed professionals on their own trade or profession. PTRC (Professional Tax Registration Certificate) is mandatory for employers to deduct professional tax from employee salaries and deposit it monthly with the state government.' },
    { question: 'Is Professional Tax applicable in all Indian states?', answer: 'No. Professional Tax is levied by state legislation. States like Maharashtra, Karnataka, Telangana, West Bengal, Tamil Nadu, Andhra Pradesh, and Gujarat enforce PT, while states like Delhi, Rajasthan, and Haryana do not levy professional tax.' },
    { question: 'What is the maximum statutory cap for Professional Tax in India?', answer: 'Under Article 276 of the Constitution of India, the total amount payable in respect of any one person to a state government by way of professional tax cannot exceed ₹2,500 per annum.' },
  ];

  return (
    <PublicLayout
      meta={professionalTaxMeta}
      jsonLd={[
        serviceSchema('Professional Tax Registration & PT Return Filing', 'State-wise Professional Tax (PT) employer registration and enrollment certificate (PTEC & PTRC) with expert support.', 'Professional Tax', '/services/business-licenses/professional-tax'),
        faqSchema(faqs),
      ]}
    >
      <section className="bg-gradient-to-br from-[#eef5ff] via-white to-blue-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
          <Breadcrumbs items={[{ name: 'Services', path: '/services' }, { name: 'Business Licenses', path: '/services/business-licenses' }, { name: 'Professional Tax', path: '/services/business-licenses/professional-tax' }]} />
        </div>
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold text-[#1454b8]">BUSINESS LICENSES &amp; CERTIFICATIONS</p>
            <h1 className="mt-3 text-4xl font-extrabold text-[#07184a]">Professional Tax Registration</h1>
            <p className="mt-4 text-slate-600">State-level registration (PTEC &amp; PTRC) and monthly compliance for professionals, employers, and corporate entities.</p>
            <div className="mt-6 flex gap-3">
              <a href="/contact" className="rounded bg-[#1454b8] px-5 py-3 font-bold text-white">Get Started Now →</a>
              <a href="/contact" className="rounded border border-[#1454b8] px-5 py-3 font-bold text-[#1454b8]">Talk to an Expert</a>
            </div>
          </div>
          <div className="rounded-3xl bg-blue-100 p-10 text-center text-8xl">📋</div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-12">
        <article className="rounded-xl border bg-white p-6">
          <h2 className="font-bold text-[#07184a]">What is Professional Tax?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Professional Tax is a state-level tax on income from professions, employment, trade or business. Registration requirements, slab rates, and monthly return filing dates differ by state jurisdiction.</p>
        </article>
        <InteractiveDocumentChecklist title="Documents Required for Professional Tax" subtitle="STATE COMPLIANCE DOSSIER" items={documents} />
        <article className="rounded-xl border bg-white p-6">
          <h2 className="font-bold text-[#07184a]">Registration Process</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step, index) => (
              <div key={step} className="text-center">
                <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-blue-100 font-bold text-[#1454b8]">{index + 1}</div>
                <p className="mt-2 text-xs font-semibold text-slate-700">{step}</p>
              </div>
            ))}
          </div>
        </article>
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border bg-white p-6">
            <h2 className="font-bold text-[#07184a]">Timeline</h2>
            <p className="mt-2 text-sm text-slate-600">Typically 7–15 working days after online application submission.</p>
          </article>
          <article className="rounded-xl border bg-white p-6">
            <h2 className="font-bold text-[#07184a]">Benefits</h2>
            <p className="mt-2 text-sm text-slate-600">Ensures statutory employer payroll compliance and avoids punitive state interest and notices.</p>
          </article>
          <article className="rounded-xl border bg-white p-6">
            <h2 className="font-bold text-[#07184a]">Fees</h2>
            <p className="mt-2 text-sm text-slate-600">Varies by state slab rates and employee count. Transparent professional fees apply.</p>
          </article>
        </div>
        <div className="rounded-xl bg-[#063a8d] p-7 text-white">
          <h2 className="text-2xl font-bold">Ensure Professional Tax Compliance</h2>
          <p className="mt-2 text-blue-100">GSTBro handles state enrollment, employee deduction calculation, and ongoing return filings.</p>
          <a href="/contact" className="mt-4 inline-block rounded bg-white px-5 py-3 font-bold text-[#063a8d]">Get Started Now →</a>
        </div>
      </section>
      <ServiceFaqSection faqs={faqs} />
      <RelatedServicesSection
        items={[
          { title: 'Shop & Establishment Registration', desc: 'Commercial office license under state labour law.', href: '/services/business-licenses/shop-establishment' },
          { title: 'Monthly GST Return Filing', desc: 'Systematic GSTR-1 and GSTR-3B filings with zero late fees.', href: '/services/gst-returns' },
          { title: 'Statutory GST Registration', desc: 'Fast online GSTIN issuance with zero rejection guarantee.', href: '/services/gst-registration' },
        ]}
      />
    </PublicLayout>
  );
}

export function DscPage() {
  const documents = [
    ['PAN Card', 'Permanent Account Number of the applicant for identity verification'],
    ['Aadhaar Card', 'Aadhaar for paperless eKYC verification and OTP signing'],
    ['Passport Size Photograph', 'Recent high-resolution color photograph of applicant'],
    ['Email ID & Mobile Number', 'Active email and phone number for video verification verification'],
    ['Company Proof (If Org DSC)', 'Board resolution and Certificate of Incorporation for organizational certificates'],
  ];
  const steps = ['Online Application Form', 'Video KYC & OTP Verification', 'Certifying Authority Approval', 'Cryptographic USB Token Provisioning', 'Ready for E-Filing'];
  const faqs = [
    { question: 'What is a Class 3 Digital Signature Certificate (DSC)?', answer: 'A Class 3 DSC is the highest level of cryptographic digital signing certificate recognized under the Information Technology Act, 2000. It is mandatory for company directors, authorized signatories filing GST/MCA returns, income tax filings, and participation in e-tenders.' },
    { question: 'What is the difference between an Individual DSC and an Organization DSC?', answer: 'An Individual DSC is issued in the personal name of a director or professional for personal filings. An Organization DSC includes both the individual’s name and the company’s legal name, required for authorized corporate submissions.' },
    { question: 'How long does it take to issue a DSC with GSTBro?', answer: 'Once video verification and Aadhaar OTP verification are completed, the certifying authority typically approves and issues the DSC within 1 to 2 working days.' },
  ];

  return (
    <PublicLayout
      meta={dscMeta}
      jsonLd={[
        serviceSchema('Digital Signature Certificate (Class 3 DSC) Online', 'Class 3 Digital Signature Certificate (DSC) issuance for company directors and authorized signatories with rapid KYC.', 'Digital Signature DSC', '/services/business-licenses/dsc'),
        faqSchema(faqs),
      ]}
    >
      <section className="bg-gradient-to-br from-[#eef5ff] via-white to-blue-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
          <Breadcrumbs items={[{ name: 'Services', path: '/services' }, { name: 'Business Licenses', path: '/services/business-licenses' }, { name: 'Class 3 DSC', path: '/services/business-licenses/dsc' }]} />
        </div>
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold text-[#1454b8]">BUSINESS LICENSES &amp; CERTIFICATIONS</p>
            <h1 className="mt-3 text-4xl font-extrabold text-[#07184a]">Digital Signature Certificate (DSC)</h1>
            <p className="mt-4 text-slate-600">Secure Class-3 cryptographic digital signatures for MCA, GST portal, income tax, and government e-tenders.</p>
            <div className="mt-6 flex gap-3">
              <a href="/contact" className="rounded bg-[#1454b8] px-5 py-3 font-bold text-white">Apply for DSC Now →</a>
              <a href="/contact" className="rounded border border-[#1454b8] px-5 py-3 font-bold text-[#1454b8]">Talk to an Expert</a>
            </div>
          </div>
          <div className="rounded-3xl bg-blue-100 p-10 text-center text-8xl">🔒</div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-12">
        <article className="rounded-xl border bg-white p-6">
          <h2 className="font-bold text-[#07184a]">What is Digital Signature Certificate (DSC)?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">A DSC is an electronic key that authenticates the identity of an individual or organization in online transactions. Issued by licensed Certifying Authorities under the IT Act, 2000, it carries full legal validity equivalent to a handwritten physical signature.</p>
        </article>
        <InteractiveDocumentChecklist title="Documents Required for DSC Issuance" subtitle="KYC REQUIREMENTS" items={documents} />
        <article className="rounded-xl border bg-white p-6">
          <h2 className="font-bold text-[#07184a]">How DSC Issuance Works</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step, index) => (
              <div key={step} className="text-center">
                <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-blue-100 font-bold text-[#1454b8]">{index + 1}</div>
                <p className="mt-2 text-xs font-semibold text-slate-700">{step}</p>
              </div>
            ))}
          </div>
        </article>
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border bg-white p-6">
            <h2 className="font-bold text-[#07184a]">Validity</h2>
            <p className="mt-2 text-sm text-slate-600">Available in 1-year, 2-year, and 3-year validity options with secure cryptographic USB token.</p>
          </article>
          <article className="rounded-xl border bg-white p-6">
            <h2 className="font-bold text-[#07184a]">Benefits of DSC</h2>
            <p className="mt-2 text-sm text-slate-600">Legally mandatory for company filings, enhanced document authenticity, and fraud protection.</p>
          </article>
          <article className="rounded-xl border bg-white p-6">
            <h2 className="font-bold text-[#07184a]">Fees</h2>
            <p className="mt-2 text-sm text-slate-600">Transparent pricing starting from ₹1,199 including USB cryptographic e-token.</p>
          </article>
        </div>
        <div className="rounded-xl bg-[#063a8d] p-7 text-white">
          <h2 className="text-2xl font-bold">Get Your Digital Signature Certificate Today</h2>
          <p className="mt-2 text-blue-100">Simplify statutory filings and secure corporate compliance with GSTBro.</p>
          <a href="/contact" className="mt-4 inline-block rounded bg-white px-5 py-3 font-bold text-[#063a8d]">Apply for DSC Now →</a>
        </div>
      </section>
      <ServiceFaqSection faqs={faqs} />
      <RelatedServicesSection
        items={[
          { title: 'Statutory GST Registration', desc: 'Fast GSTIN onboarding requiring director DSC.', href: '/services/gst-registration' },
          { title: 'GST Return Filing (GSTR-1 & 3B)', desc: 'E-sign monthly returns with Class-3 DSC.', href: '/services/gst-returns' },
          { title: 'Import Export Code (IEC)', desc: 'DGFT portal filings authenticated via DSC.', href: '/services/business-licenses/iec' },
        ]}
      />
    </PublicLayout>
  );
}

export function StartupIndiaPage() {
  const documents = [
    ['Certificate of Incorporation / Registration', 'COI of Private Limited Company or LLP registration deed'],
    ['PAN Card of Entity', 'Permanent Account Number issued to the corporate entity'],
    ['Pitch Deck & Business Plan', 'Executive presentation explaining the innovative product, service, or process'],
    ['Product / Service Write-Up', 'Detailed note on market scalability, innovation, and employment generation potential'],
    ['Website / App URL', 'Active website or mobile application prototype demonstrating the business'],
    ['Patents / Trademarks (If Any)', 'Intellectual property registration or application acknowledgment'],
  ];
  const steps = ['Portal User Registration', 'Application Form Submission', 'Upload Innovation Pitch Deck', 'Self-Certification by Founder', 'DPIIT Evaluation', 'Recognition Certificate Issuance'];
  const faqs = [
    { question: 'What is Startup India DPIIT recognition?', answer: 'DPIIT Recognition is certification issued by the Department for Promotion of Industry and Internal Trade, Ministry of Commerce and Industry, officially recognizing an eligible entity as a startup to access tax exemptions, angel tax relief, and government tender preferences.' },
    { question: 'What is the Section 80-IAC 3-year tax holiday under Startup India?', answer: 'Recognized startups incorporated after April 1, 2016 can apply for 100% deduction of profits (income tax holiday) for 3 consecutive financial years out of their first 10 years of incorporation under Section 80-IAC of the Income Tax Act, subject to approval by the Inter-Ministerial Board (IMB).' },
    { question: 'What are the eligibility criteria for a startup to be recognized by DPIIT?', answer: 'The entity must be a Private Limited Company or LLP, incorporated for less than 10 years, have an annual turnover not exceeding ₹100 Crore in any financial year since incorporation, and be working towards innovation, development, or commercialization of new products, processes, or services.' },
  ];

  return (
    <PublicLayout
      meta={startupIndiaMeta}
      jsonLd={[
        serviceSchema('Startup India DPIIT Recognition & Tax Exemption', 'Apply for Startup India DPIIT recognition to unlock 3-year Section 80-IAC tax holiday and angel tax relief.', 'Startup India', '/services/business-licenses/startup-india'),
        faqSchema(faqs),
      ]}
    >
      <section className="bg-gradient-to-br from-[#eef5ff] via-white to-blue-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
          <Breadcrumbs items={[{ name: 'Services', path: '/services' }, { name: 'Business Licenses', path: '/services/business-licenses' }, { name: 'Startup India', path: '/services/business-licenses/startup-india' }]} />
        </div>
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold text-[#1454b8]">BUSINESS LICENSES &amp; CERTIFICATIONS</p>
            <h1 className="mt-3 text-4xl font-extrabold text-[#07184a]">Startup India Registration</h1>
            <p className="mt-4 text-slate-600">DPIIT recognition, Section 80-IAC 3-year tax exemption, and angel tax relief for innovative Indian ventures.</p>
            <div className="mt-6 flex gap-3">
              <a href="/contact" className="rounded bg-[#1454b8] px-5 py-3 font-bold text-white">Register Now →</a>
              <a href="/contact" className="rounded border border-[#1454b8] px-5 py-3 font-bold text-[#1454b8]">Talk to an Expert</a>
            </div>
          </div>
          <div className="rounded-3xl bg-blue-100 p-10 text-center text-8xl">🚀</div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-12">
        <article className="rounded-xl border bg-white p-6">
          <h2 className="font-bold text-[#07184a]">What is Startup India Registration?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Startup India is a flagship Government of India initiative to nurture innovation and startups. It provides official recognition from DPIIT and opens doors to funding support, intellectual property fee rebates, and Section 80-IAC tax holidays.</p>
        </article>
        <InteractiveDocumentChecklist title="Documents Required for Startup India" subtitle="DPIIT APPLICATION DOSSIER" items={documents} />
        <article className="rounded-xl border bg-white p-6">
          <h2 className="font-bold text-[#07184a]">Registration Process (100% Online)</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {steps.map((step, index) => (
              <div key={step} className="text-center">
                <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-blue-100 font-bold text-[#1454b8]">{index + 1}</div>
                <p className="mt-2 text-xs font-semibold text-slate-700">{step}</p>
              </div>
            ))}
          </div>
        </article>
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border bg-white p-6">
            <h2 className="font-bold text-[#07184a]">Timeline</h2>
            <p className="mt-2 text-sm text-slate-600">Typically 7–15 working days after successful application submission and pitch deck review.</p>
          </article>
          <article className="rounded-xl border bg-white p-6">
            <h2 className="font-bold text-[#07184a]">Benefits</h2>
            <p className="mt-2 text-sm text-slate-600">Section 80-IAC tax exemption eligibility, 80% rebate on patent filings, self-certification under labour laws, and tender exemptions.</p>
          </article>
          <article className="rounded-xl border bg-white p-6">
            <h2 className="font-bold text-[#07184a]">Fees</h2>
            <p className="mt-2 text-sm text-slate-600">Government fee for DPIIT recognition is ₹0. Professional documentation and advisory fees apply.</p>
          </article>
        </div>
        <div className="rounded-xl bg-[#063a8d] p-7 text-white">
          <h2 className="text-2xl font-bold">Ready to Get Startup India Recognition?</h2>
          <p className="mt-2 text-blue-100">Get recognized and unlock game-changing tax and funding benefits for your venture.</p>
          <a href="/contact" className="mt-4 inline-block rounded bg-white px-5 py-3 font-bold text-[#063a8d]">Register Now →</a>
        </div>
      </section>
      <ServiceFaqSection faqs={faqs} />
      <RelatedServicesSection
        items={[
          { title: 'Strategic GST Advisory', desc: 'Corporate tax planning and indirect tax structuring for startups.', href: '/services/gst-advisory' },
          { title: 'MSME / Udyam Registration', desc: 'Central MSME recognition unlocking priority lending.', href: '/services/business-licenses/udyam' },
          { title: 'Statutory GST Registration', desc: 'Fast online GSTIN registration with senior CA review.', href: '/services/gst-registration' },
        ]}
      />
    </PublicLayout>
  );
}

// Backward compatibility export for ServiceDetailPage & SimplePage
export function ServiceDetailPage({ type }: { type: 'registration' | 'returns' | 'cancellation' }) {
  if (type === 'registration') return <RegistrationServicePage />;
  if (type === 'returns') return <ReturnsServicePage />;
  return <CancellationServicePage />;
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

export { ServicesHubPage } from './ServicesHubPage';
