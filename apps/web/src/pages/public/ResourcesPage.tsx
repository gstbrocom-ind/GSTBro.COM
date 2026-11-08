import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PublicLayout } from '../../components/PublicLayout';
import { Breadcrumbs } from '../../components/seo/Breadcrumbs';
import { resourcesMeta } from '../../seo/pages/services.meta';
import { faqSchema } from '../../seo/schema/faq';
import { fadeUpVariants, staggerContainer, modalScaleVariants, transitions } from '../../lib/animations';

interface GuideDetail {
  title: string;
  category: 'Indirect Tax (GST)' | 'Inward Credit & IMS' | 'TDS & TCS (GST)' | 'Refunds & Litigation';
  description: string;
  badge?: string;
  sections: { title: string; content: string }[];
  checklist: string[];
}

const guidesData: Record<string, GuideDetail> = {
  'gst-rate-rationalization-guide': {
    title: 'GST Rate Overhaul: Dissolution of 12% & 28% and the New 40% Demerit Slab',
    category: 'Indirect Tax (GST)',
    badge: 'Council Overhaul 2025/2026',
    description: 'Comprehensive analysis of the structural rate rationalization: migration of items to 5% and 18%, and the new 40% ultra-luxury sin tax slab.',
    sections: [
      {
        title: 'Dissolution of the 12% and 28% Standard Slabs',
        content: 'Under the landmark rate rationalization spearheaded by the Group of Ministers (GoM) and the GST Council, India’s historical 4-tier structure (5%, 12%, 18%, 28%) was overhauled to remove classification disputes. The 12% slab was dissolved, migrating ~99% of everyday essentials, processed foods, and textiles down to 5%. Similarly, the 28% slab was dismantled for consumer electronics and kitchen appliances, reclassifying them under the standard 18% slab.',
      },
      {
        title: 'Introduction of the New 40% Ultra-Demerit / Sin Slab',
        content: 'To consolidate high tax rates and eliminate cascading cess structures, a unified 40% GST rate was established for designated ultra-luxury, sin, and demerit products. This applies to luxury motor vehicles, super-bikes exceeding 350cc, aerated/caffeinated beverages, pan masala, and tobacco preparations.',
      },
      {
        title: 'The Streamlined 3-Tier Rate Architecture',
        content: '• 0% (Nil / Exempt): Basic unbranded food, life healthcare, and educational services. • 5% (Merit / Everyday): Standard groceries, apparel, and basic utilities (absorbed 12% items). • 18% (Standard General): Core rate for IT, SaaS, telecom, industrial equipment, and consumer durables (absorbed 28% items). • 40% (Demerit / Ultra-Luxury): Sin goods and luxury transit.',
      },
    ],
    checklist: [
      'Update ERP master billing rates (Tally/Zoho/SAP) to reflect 5%, 18%, and the new 40% slab',
      'Verify inventory classification for processed foods migrated from 12% down to 5%',
      'Reclassify consumer durable goods and electronics from 28% down to 18%',
      'Apply the 40% statutory rate on luxury automobiles, super-bikes > 350cc, and aerated/tobacco items',
      'Audit outward tax invoices to prevent anti-profiteering inquiries and pass rate reduction benefits',
    ],
  },
  'gst-ims-guide': {
    title: 'GST Invoice Management System (IMS) & Recipient Action Protocol',
    category: 'Inward Credit & IMS',
    badge: 'Official GSTN 2025/2026',
    description: 'Statutory operating procedure for taking Accept, Reject, or Pending actions on supplier-uploaded invoices in IMS before GSTR-2B generation.',
    sections: [
      {
        title: 'Statutory Architecture of IMS',
        content: 'The Invoice Management System (IMS) is an official GSTN facility allowing recipient taxpayers to review, match, and take definitive action on invoices, credit notes, and debit notes filed by suppliers in their GSTR-1, GSTR-1A, or IFF. The actions taken directly determine the composition of Form GSTR-2B generated on the 14th of every month.',
      },
      {
        title: 'Action Matrix: Accept vs Reject vs Pending',
        content: '• ACCEPT: Invoice auto-flows into eligible ITC in GSTR-2B. • REJECT: Invoice is excluded from GSTR-2B; no ITC flows to GSTR-3B. The supplier can issue an amendment in their subsequent return. • PENDING: ITC is held in abeyance (e.g. goods in transit or pending physical verification); does not flow into current 2B and rolls over to next month IMS. • NO ACTION: Invoices left untouched automatically default to ACCEPTED on the 14th cutoff.',
      },
      {
        title: 'Credit Notes Treatment in IMS',
        content: 'Recipients must exercise caution on supplier Credit Notes in IMS. Accepting a Credit Note reduces the recipient ITC liability in GSTR-2B/3B. Rejecting an illegitimate Credit Note prevents unlawful reduction of the supplier output tax and shields the recipient from erroneous ITC reversals.',
      },
      {
        title: 'Re-computation & GSTR-3B Synchronization',
        content: 'Once GSTR-2B is generated on the 14th, Table 4 of GSTR-3B is auto-populated based on IMS actions. If any IMS actions are updated post-14th but before filing GSTR-3B, taxpayers must explicitly click "Re-compute 2B" on the portal to refresh the liability ledgers.',
      },
    ],
    checklist: [
      'Access the IMS dashboard on the GST portal between the 1st and 13th of every month',
      'Match vendor invoice entries against physical Goods Receipt Notes (GRN) or service milestone proofs',
      'Mark supplies with unreceived goods or disputed rates as "Pending" instead of "Accept"',
      'Reject duplicate, unauthorized, or erroneous invoices to prevent Section 73/74 scrutiny',
      'Audit supplier credit notes to ensure inward credit reversals are commercially verified',
      'Confirm that the finalized IMS status matches Form GSTR-2B auto-drafted on the 14th',
    ],
  },
  'gstr1a-amendment-guide': {
    title: 'Form GSTR-1A Outward Supplies Amendment Blueprint',
    category: 'Indirect Tax (GST)',
    badge: 'CBIC Notified Facility',
    description: 'Statutory facility introduced under CGST Rules allowing taxpayers to add or amend outward supply records after GSTR-1 but prior to filing GSTR-3B.',
    sections: [
      {
        title: 'Statutory Purpose & Legal Foundation',
        content: 'Form GSTR-1A was notified by CBIC to allow taxpayers to add, amend, or modify outward supply records after filing Form GSTR-1/IFF for a tax period, up until the filing of Form GSTR-3B for that same tax period. It eliminates the delay of waiting for the subsequent month return to rectify outward sales.',
      },
      {
        title: 'Scope of Permissible Amendments',
        content: 'Taxpayers can report omitted B2B invoices, rectify erroneous GSTINs, adjust taxable values or tax rates, modify Place of Supply (POS), and declare credit/debit notes. Any entry added or amended in GSTR-1A immediately updates the corresponding liability tables in Form GSTR-3B of the current month.',
      },
      {
        title: 'Recipient Interplay via IMS',
        content: 'Supplies added or modified through Form GSTR-1A flow instantaneously into the recipient IMS portal, allowing the buyer to review and accept them before their Form GSTR-2B is finalized for that period.',
      },
    ],
    checklist: [
      'Identify outward sales invoices omitted from the GSTR-1 filed on the 11th',
      'Verify typographical errors in customer GSTIN, invoice value, or POS before filing GSTR-3B',
      'Submit Form GSTR-1A prior to clicking "Compute Liability" in Form GSTR-3B',
      'Ensure revised outward liabilities correctly reflect in Table 3.1 of GSTR-3B',
      'Advise key corporate buyers to take corresponding "Accept" action in their IMS dashboard',
    ],
  },
  'gst-tds-tcs-guide': {
    title: 'GST TDS (Section 51) & TCS (Section 52) Compliance Dossier',
    category: 'TDS & TCS (GST)',
    badge: '53rd & 54th Council Updates',
    description: 'Statutory compliance matrix for 2% GST TDS on public procurement contracts and revised 0.5% GST TCS on e-commerce transactions.',
    sections: [
      {
        title: 'GST TDS under Section 51 (Public Sector & Metal Scrap)',
        content: 'Central/State Government departments, Local authorities, Governmental agencies, and notified PSUs must deduct 2% GST TDS (1% CGST + 1% SGST for intra-state, 2% IGST for inter-state) on taxable contracts exceeding ₹2,50,000 (excluding tax). Pursuant to the 54th GST Council, 2% TDS also applies on B2B supply of metal scrap (Chapters 72 to 81) to curb evasions in the secondary metal trade.',
      },
      {
        title: 'Section 51 Proviso: Location Exemption Rule',
        content: 'No TDS deduction is required where the location of the supplier and the place of supply are in a State/UT different from the registration State of the recipient (e.g. Supplier and POS in Maharashtra, but recipient DDO registered in Goa), as the supplier cannot lawfully avail credit of another State SGST.',
      },
      {
        title: 'GST TCS under Section 52 (0.5% Rate Reduction via Notif. 15/2024-CT)',
        content: 'Every Electronic Commerce Operator (ECO) facilitating supplies of goods or services must collect TCS on the net value of taxable supplies. Pursuant to the 53rd GST Council meeting and Notification No. 15/2024-Central Tax (effective 10th July 2024), the TCS rate was halved from 1% to 0.5% (0.25% CGST + 0.25% SGST, or 0.5% IGST) to unblock working capital for MSME sellers.',
      },
      {
        title: 'Filing Compliance (Forms GSTR-7 & GSTR-8)',
        content: '• Form GSTR-7 (GST TDS): Due by 10th of following month. Generates TDS Certificate in Form GSTR-7A. • Form GSTR-8 (GST TCS): Due by 10th of following month. Amounts auto-populate in the supplier Electronic Cash Ledger for tax payment or cash refund.',
      },
    ],
    checklist: [
      'Audit government supply contracts to verify if individual contract value exceeds ₹2.5 Lakhs net',
      'Verify supplier GSTIN and validate intra-state vs inter-state tax deduction rules',
      'Deposit deducted GST TDS on or before the 10th of the following month via Form GSTR-7',
      'For E-commerce operators, apply revised 0.5% statutory TCS rate (0.25% CGST + 0.25% SGST)',
      'Reconcile GSTR-8 gross supplies against credit notes and return cancellations',
      'Guide marketplace sellers to accept TDS/TCS credits on GST portal to fund cash ledger',
    ],
  },
  'gst-rcm-guide': {
    title: 'Reverse Charge Mechanism (RCM) & 54th Council Expansions',
    category: 'Indirect Tax (GST)',
    badge: '54th Council RCM',
    description: 'Comprehensive statutory guide to Section 9(3) & 9(4) reverse charge liabilities, commercial property renting, and cash ledger offset rules.',
    sections: [
      {
        title: '54th GST Council RCM Expansions',
        content: '• Commercial Property Renting: Renting of commercial property by an unregistered person to a registered person was brought under RCM u/s 9(3). • Metal Scrap: Supply of metal scrap by an unregistered person to a registered person was notified under Section 9(4) RCM to prevent revenue leakage.',
      },
      {
        title: 'Core Notified Services under Section 9(3)',
        content: '• Goods Transport Agency (GTA) services (5% RCM without ITC). • Legal services provided by an advocate / senior advocate to a business entity. • Services provided by a Director to a company/body corporate. • Security / Manpower supply provided by a non-corporate to a registered business.',
      },
      {
        title: 'Mandatory Cash Payment & Self-Invoicing',
        content: 'Under Section 49(4) read with Rule 85(4), tax payable under RCM MUST be discharged in hard cash through the Electronic Cash Ledger and CANNOT be settled using existing Input Tax Credit. The recipient must issue a Self-Invoice under Section 31(3)(f) and Payment Voucher under Section 31(3)(g). ITC can subsequently be availed in Table 4A(3) of GSTR-3B.',
      },
    ],
    checklist: [
      'Identify rent payments for commercial premises leased from unregistered landlords',
      'Verify consignment notes and GTA tax declarations (5% RCM vs 12% forward charge)',
      'Review legal professional fee vouchers for senior advocate RCM applicability',
      'Generate statutory Section 31(3)(f) Self-Invoices for all inward RCM transactions',
      'Discharge RCM tax exclusively through cash ledger in Table 3.1(d) of GSTR-3B',
      'Re-claim eligible RCM tax as Input Tax Credit in Table 4A(3) of the same month return',
    ],
  },
  'gst-sec128a-amnesty': {
    title: 'Section 128A Amnesty Scheme: Interest & Penalty Waiver',
    category: 'Refunds & Litigation',
    badge: 'GST Council 53rd/54th',
    description: 'Statutory conditional waiver of interest and penalty for tax demands issued under Section 73 for FY 2017-18, 2018-19, and 2019-20.',
    sections: [
      {
        title: 'Legislative Provision & Statutory Scope',
        content: 'Section 128A of the CGST Act provides a full waiver of statutory interest and penalties for demand notices or orders issued under Section 73 (non-fraudulent cases) for the financial years 2017-18, 2018-19, and 2019-20.',
      },
      {
        title: 'Eligible Notice & Order Categories',
        content: '• Show Cause Notices issued under Section 73(1) or statements u/s 73(3) where no order has been passed. • Orders passed under Section 73(9) where no appellate order has been passed. • Orders passed by Appellate Authority (Section 107) or Revisional Authority (Section 108). • Ineligible: Does NOT apply to demands under Section 74 (fraud/willful misstatement) or erroneous refunds.',
      },
      {
        title: 'Filing Procedure via Forms SPL-01 & SPL-02',
        content: 'Taxpayers must pay the pure basic tax demanded on or before the statutory deadline (March 31, 2025). Upon payment of the tax component, taxpayers submit an electronic application in Form GST SPL-01 (for notices) or Form GST SPL-02 (for orders) on the GST portal to conclude proceedings.',
      },
    ],
    checklist: [
      'Audit all pending DRC-01 notices and DRC-07 demand orders for FY 17-18, 18-19, and 19-20',
      'Verify that the demand was raised under Section 73 and NOT under Section 74 (fraud/suppression)',
      'Compute the pure principal tax demand excluding Section 50 interest and Section 122/125 penalties',
      'Discharge the basic tax liability via Form DRC-03 or Electronic Cash Ledger',
      'File Form GST SPL-01 or SPL-02 electronically with the jurisdictional proper officer',
      'Obtain formal concluding order in Form GST SPL-05 / SPL-06 closing the proceeding',
    ],
  },
  'gst-reg-checklist': {
    title: 'GST Registration Master Document Checklist & Biometric Protocol',
    category: 'Indirect Tax (GST)',
    badge: 'Rule 8 Biometric',
    description: 'Statutory documentation matrix for seamless GSTIN approval across all entity types, including nationwide Rule 8 biometric authentication.',
    sections: [
      {
        title: 'Individual / Proprietorship',
        content: 'PAN Card of Proprietor • Aadhaar Card (Biometric-linked) • Passport-size Photograph • Bank Account Proof (Cancelled Cheque or Bank Statement with name & IFSC) • Electricity Bill / Municipal Tax Receipt (< 2 months old) • Registered Rent Agreement & Landlord NOC where premises are leased.',
      },
      {
        title: 'Partnership Firm & LLP',
        content: 'PAN Card of Firm/LLP • Partnership Deed or LLP Agreement • Certificate of Incorporation (LLP) • PAN & Aadhaar of all Partners / Designated Partners • Photographs of all partners • Board Resolution or Authorization Letter • Proof of Principal Place of Business • Class-3 DSC of Authorized Signatory.',
      },
      {
        title: 'Private Limited & Public Limited Companies',
        content: 'Certificate of Incorporation (MCA) • Company PAN • Memorandum of Association (MOA) & Articles of Association (AOA) • Board Resolution authorizing signatory • PAN & Aadhaar of Managing Director / Directors • Utility Bill & Lease Agreement for Registered Office • Class-3 DSC of Authorized Director.',
      },
      {
        title: 'Rule 8 Biometric Authentication & Geo-Tagging',
        content: 'Following nationwide GST Council amendments, applicants identified through automated data analytics and risk rating are directed to GST Suvidha Kendras (GSK) for biometric Aadhaar authentication and photograph capture. Geo-tagging of business premises is mandatory.',
      },
    ],
    checklist: [
      'PAN and Aadhaar data match exactly in spelling and date of birth',
      'Electricity bill or property tax receipt is dated within the last 60 days',
      'Rent agreement specifically mentions authorization to conduct business',
      'Bank cancelled cheque clearly displays account number and IFS code',
      'Class-3 Digital Signature Certificate (DSC) configured for companies/LLPs',
      'Applicant available for biometric Aadhaar appointment if flagged under Rule 8',
    ],
  },
  'gstr1-guide': {
    title: 'GSTR-1 Outward Supplies Filing Blueprint & 30-Day IRP Rule',
    category: 'Indirect Tax (GST)',
    badge: '30-Day IRP Limit',
    description: 'Statutory guide for accurate invoice-level reporting of B2B, B2C, exports, credit notes, 6-digit HSN Table 12, and the 30-day e-invoicing window.',
    sections: [
      {
        title: 'Statutory Filing Deadlines',
        content: 'Monthly Filers (Turnover > ₹5 Cr or regular scheme): Filed by the 11th of the following month. QRMP Filers: Quarterly Form GSTR-1 by the 13th of the month following the quarter, with optional Invoice Furnishing Facility (IFF) by the 13th of Month 1 and 2.',
      },
      {
        title: 'Mandatory 30-Day Reporting Window on IRP Portals',
        content: 'Taxpayers with Aggregate Annual Turnover (AATO) >= ₹100 Crores cannot report invoices older than 30 days on IRP portals (einvoice1 to einvoice6). E-invoices must be generated synchronously within 30 days of the invoice date.',
      },
      {
        title: 'Mandatory HSN Code Reporting (Table 12)',
        content: 'Taxpayers with aggregate turnover up to ₹5 Crores must report minimum 4-digit HSN codes for all B2B supplies. Taxpayers with turnover exceeding ₹5 Crores must report minimum 6-digit HSN codes on all B2B and export invoices. Non-compliance attracts Section 125 penalties.',
      },
      {
        title: 'Table-by-Table Reporting Architecture',
        content: 'Table 4: B2B taxable outward supplies (Regular & Reverse Charge) • Table 5: B2C Large (Inter-state invoices > ₹2.5 Lakhs) • Table 6: Exports (WPAY & WOPAY) and SEZ supplies • Table 7: B2C Others (Net of credit/debit notes) • Table 8: Nil-rated, Exempted & Non-GST • Table 9: Amendments to prior invoices • Table 12: Mandatory HSN-level outward summary • Table 13: Document summary issued.',
      },
    ],
    checklist: [
      'Reconcile total outward sales register with accounting ERP (Tally/Zoho/SAP)',
      'Validate customer GSTIN active status on official portal',
      'Cross-check all E-Invoice IRNs generated against Table 4 entries',
      'Verify 4-digit (turnover < ₹5 Cr) or 6-digit (turnover > ₹5 Cr) HSN codes',
      'Ensure credit and debit notes are reported against original invoice references',
      'Ensure no e-invoice generation is delayed beyond the statutory 30-day limit',
    ],
  },
  'gstr3b-guide': {
    title: 'GSTR-3B Tax Computation, Rule 88B & DRC-01B/01C Scrutiny',
    category: 'Indirect Tax (GST)',
    badge: 'Rule 88B & 88C/D',
    description: 'Methodology for reconciling sales liabilities, claiming 4A(5) ITC, computing net cash interest u/s 50, and handling DRC-01B/DRC-01C notices.',
    sections: [
      {
        title: 'Core Table Disclosures & IMS Auto-Population',
        content: 'Table 3.1(a): Taxable outward supplies & net tax payable • Table 3.1(d): Inward supplies attracting Reverse Charge Mechanism (RCM) • Table 4(A): Eligible Input Tax Credit (Import of goods/services, RCM ITC 4A(3), all other purchases 4A(5) auto-drafted from IMS/2B) • Table 4(B): Ineligible & reversed ITC u/s 17(5) and Rule 42/43 • Table 4(C): Net Input Tax Credit available for tax offset.',
      },
      {
        title: 'Rule 88A Mathematical Tax Offset Sequencing',
        content: 'Integrated Tax (IGST) input credit MUST be fully utilized first against IGST liability, and remaining IGST credit can be utilized towards CGST and SGST in ANY proportion. Only after IGST credit is zero can CGST credit offset CGST and SGST credit offset SGST. CGST and SGST cannot cross-utilize.',
      },
      {
        title: 'Rule 88B Net Cash Interest Liability under Section 50(1)',
        content: 'Interest under Section 50(1) at 18% per annum is payable exclusively on the NET CASH LIABILITY (tax paid through Electronic Cash Ledger after exhausting available ITC) when returns are filed late. RCM liabilities under 3.1(d) must be paid in hard cash.',
      },
      {
        title: 'Rule 88C (DRC-01B) and Rule 88D (DRC-01C) Notices',
        content: 'System-generated notices are issued when: 1) Outward tax liability in GSTR-1 exceeds GSTR-3B by more than a specified percentage/amount (Rule 88C / Form DRC-01B), or 2) ITC availed in GSTR-3B exceeds GSTR-2B by more than a specified percentage/amount (Rule 88D / Form DRC-01C). Taxpayers must pay the differential or submit justification within 7 days.',
      },
    ],
    checklist: [
      'Match outward liability exactly with finalized Form GSTR-1 and GSTR-1A',
      'Cross-reference Table 4A(5) eligible ITC against latest Form GSTR-2B after IMS reconciliation',
      'Verify cash payment of Section 9(3) RCM liabilities before claiming in 4A(3)',
      'Reverse all blocked credits under Section 17(5) in Table 4B(1)',
      'Generate statutory challan (PMT-06) for any net cash shortfall by 20th',
      'Reply to any pending DRC-01B or DRC-01C automated inquiries within 7 statutory days',
    ],
  },
  'itc-2b-reconciliation': {
    title: 'GSTR-2B vs Books Inward Audit Protocol & Section 16(4) Defense',
    category: 'Inward Credit & IMS',
    badge: 'Section 16(4) Cutoff',
    description: 'Standard operating procedure for multi-point purchase matching, supplier delinquency tracking, 180-day payment rule, and Section 16(4) time-bar defense.',
    sections: [
      {
        title: 'Section 16(2)(aa) Statutory Mandate',
        content: 'Under Section 16(2)(aa) of the CGST Act, a taxpayer CANNOT claim Input Tax Credit on any invoice unless the supplier has reported the details in their GSTR-1/1A and it is reflected in the recipient auto-drafted Form GSTR-2B. Provisional credit claims are strictly prohibited.',
      },
      {
        title: 'Multi-Point Matching Criteria',
        content: 'A complete audit requires matching 5 distinct data points: 1) Supplier GSTIN, 2) Invoice/Debit Note Number, 3) Invoice Date, 4) Taxable Value, 5) Integrated, Central, and State Tax splits. Common ERP typos in invoice numbering (e.g. leading zeros, special characters) must be normalized.',
      },
      {
        title: 'Section 16(4) Statutory Cutoff & 180-Day Payment Rule',
        content: '• Section 16(4): ITC relating to any financial year must be claimed on or before the 30th November following the end of the financial year, or the date of filing the annual return (GSTR-9), whichever is earlier. • Rule 37: If the recipient fails to pay the supplier the value of supply along with tax within 180 days from the invoice date, the ITC availed must be reversed in GSTR-3B along with 18% statutory interest.',
      },
    ],
    checklist: [
      'Download Form GSTR-2B generated on the 14th of every month',
      'Run multi-point matching between ERP Purchase Register and 2B',
      'Generate automated supplier discrepancy report for delinquent vendors',
      'Ensure supplier invoice date is within the permissible Section 16(4) window (30th Nov cutoff)',
      'Document supplier proof of payment within 180 days to avoid Rule 37 reversal with interest',
    ],
  },
  'gstr9-annual-audit': {
    title: 'GSTR-9 & 9C Statutory Annual Audit Dossier & DRC-03 True-Up',
    category: 'Indirect Tax (GST)',
    badge: '₹2 Cr & ₹5 Cr Limits',
    description: 'True-up liability reconciliation and CA certification protocols between audited balance sheets, portal ledgers, and DRC-03 disclosures.',
    sections: [
      {
        title: 'Applicability & Statutory Thresholds',
        content: '• Form GSTR-9 (Annual Return): Mandatory for all regular registered taxpayers having aggregate annual turnover exceeding ₹2 Crores. • Form GSTR-9C (Reconciliation Statement): Mandatory self-certified reconciliation statement for taxpayers with aggregate annual turnover exceeding ₹5 Crores.',
      },
      {
        title: 'True-up Reconciliation Architecture',
        content: 'Table 4: Outward supplies and advances on which tax is payable • Table 5: Outward supplies on which tax is not payable • Table 6: Inward ITC declared in returns • Table 7: ITC reversed & ineligible • Table 8: Comprehensive comparison of ITC availed in GSTR-3B vs Form GSTR-2A/2B • Table 9: Tax paid vs liability true-up • Table 10 & 11: Amendments of previous financial year reported in subsequent year.',
      },
      {
        title: 'Handling Differential Liabilities (Form DRC-03)',
        content: 'Any tax liability discovered during the annual reconciliation that was not paid through monthly 3B returns must be discharged voluntarily via Form DRC-03 along with applicable interest under Section 50(1). Note: Additional uncredited ITC CANNOT be claimed through GSTR-9.',
      },
    ],
    checklist: [
      'Reconcile turnover declared in GSTR-9 with audited Profit & Loss statement',
      'Match total ITC claimed in GSTR-3B with Table 8A portal data',
      'Identify unreversed blocked credits under Section 17(5)',
      'Prepare HSN summary of outward supplies for Table 17',
      'Retain physical records and audit trails for 72 months u/s 36',
    ],
  },
  'refund-rfd01-guide': {
    title: 'Export & Inverted Duty Refund (RFD-01) Blueprint',
    category: 'Refunds & Litigation',
    badge: 'ICEGATE Sync',
    description: 'Procedural guidance for claiming unutilized ITC refunds on exports under LUT and inverted duty rate structures with ICEGATE sync.',
    sections: [
      {
        title: 'Eligible Statutory Categories',
        content: '1) Refund of unutilized ITC on zero-rated supplies (exports & SEZ) without payment of tax under Letter of Undertaking (LUT). 2) Refund on account of inverted duty structure where the rate of tax on inputs is higher than the rate of tax on output supplies. 3) Excess cash ledger balance refund.',
      },
      {
        title: 'Formula & Maximum Refund Ceiling',
        content: 'For Export of Goods/Services: Maximum Refund Amount = (Turnover of zero-rated supply of goods + Turnover of zero-rated supply of services) × Net ITC ÷ Adjusted Total Turnover. Goods export turnover is capped at 1.5 times the domestic market value.',
      },
      {
        title: 'Mandatory CA Verification & ICEGATE Sync',
        content: 'Filing requires certified Annexure-B invoice statements, Shipping Bill verification matched with ICEGATE, Foreign Inward Remittance Certificate (FIRC) / e-BRC linking for services, and Chartered Accountant certification in Form RFD-01 Annexure-2.',
      },
    ],
    checklist: [
      'Valid Letter of Undertaking (LUT) active on the portal for the financial year',
      'Shipping bills matched with ICEGATE and custom portal ledgers',
      'FIRCs / e-BRCs obtained from authorized dealer banks for services export',
      'Verify that all input invoices claimed for refund are reflected in GSTR-2B',
      'Bank account pre-validated on GST portal with correct PFMS linking',
    ],
  },
};

const portalShortcuts = [
  { name: 'Official GSTN Portal', url: 'https://www.gst.gov.in/', tag: 'GST Filing & Core', category: 'GSTN', desc: 'Main government portal for return submission, electronic cash ledger payments, and registrations.' },
  { name: 'CBIC Tax Information', url: 'https://taxinformation.cbic.gov.in/', tag: 'Indirect Tax Law', category: 'CBIC', desc: 'Central indirect tax acts, notifications, circulars, and rate schedules.' },
  { name: 'E-Invoice System (IRP NIC)', url: 'https://einvoice1.gst.gov.in/', tag: 'B2B Invoicing', category: 'IRP', desc: 'Invoice Registration Portal for B2B e-invoices, QR codes & 30-day reporting window.' },
  { name: 'E-Way Bill System', url: 'https://ewaybillgst.gov.in/', tag: 'Goods Transit', category: 'EWB', desc: 'Electronic way bills generation and tracking for consignments > ₹50,000.' },
  { name: 'ICEGATE Customs Gateway', url: 'https://www.icegate.gov.in/', tag: 'Export & Customs', category: 'ICEGATE', desc: 'Indian Customs electronic gateway for shipping bills and automated IGST export refunds.' },
  { name: 'MSME Udyam Registration', url: 'https://udyamregistration.gov.in/', tag: 'Enterprise Setup', category: 'MSME', desc: 'Official government portal for micro, small, and medium enterprise certification.' },
];

const statutorySearchTools = [
  { name: 'Verify Taxpayer GSTIN', url: 'https://services.gst.gov.in/services/searchtp', tag: 'GST Verification', category: 'GSTN', desc: 'Validate active GSTIN status, legal name, jurisdiction, and return filing history.' },
  { name: 'HSN / SAC Code Directory', url: 'https://services.gst.gov.in/services/searchhsnsac', tag: 'Tariff Directory', category: 'CBIC', desc: 'Official government directory for 4, 6, and 8-digit tariff classifications.' },
  { name: 'Verify E-Invoice QR & IRN', url: 'https://einvoice1.gst.gov.in/Others/QRCodeVerify', tag: 'E-Invoice Authenticity', category: 'IRP', desc: 'Official utility to verify signed QR codes and digital signatures on B2B invoices.' },
  { name: 'Track GST Application ARN', url: 'https://services.gst.gov.in/services/arnstatus', tag: 'Status Tracking', category: 'GSTN', desc: 'Real-time tracking of registration, core amendment, and refund ARN numbers.' },
  { name: 'Check Filing Frequency Status', url: 'https://services.gst.gov.in/services/searchtpbypan', tag: 'PAN-to-GSTIN', category: 'GSTN', desc: 'Find all GSTIN registrations and return filing frequencies linked to a PAN.' },
  { name: 'GST State Codes & Officer Directory', url: 'https://einvoice6.gst.gov.in/content/kb/tools/', tag: 'Jurisdiction', category: 'CBIC', desc: 'Official two-digit state code directory (01-38) and jurisdictional tax commissionerates.' },
];

const faqs = [
  {
    question: 'Why were the 12% and 28% GST slabs overhauled, and what is the new 40% rate?',
    answer: 'Under the Rate Rationalisation Group of Ministers (GoM) and GST Council overhaul, the 12% and 28% slabs were restructured to simplify indirect taxation and eliminate classification litigation. Roughly 99% of items in the 12% slab (processed foods, daily essentials, standard textiles) moved down to the 5% merit slab. Around 90% of items in the 28% slab (consumer electronics, kitchen appliances) moved down to the 18% standard slab. Concurrently, a special 40% tax slab was established specifically for demerit, sin, and ultra-luxury goods (luxury motor cars, super-bikes > 350cc, aerated/caffeinated drinks, pan masala, and tobacco) replacing previous complicated cess combinations.',
  },
  {
    question: 'How are GST late fees capped under Section 47 per Notification No. 19/2021-CT?',
    answer: 'Under Section 47 rationalization: 1) For Nil Returns (zero tax liability & zero outward supplies): Late fee is ₹20/day (₹10 CGST + ₹10 SGST) capped at a statutory maximum of ₹500 (₹250 CGST + ₹250 SGST). 2) For regular returns with tax liability: Late fee is ₹50/day (₹25 CGST + ₹25 SGST) capped based on aggregate turnover in preceding FY: Turnover up to ₹1.5 Cr is capped at ₹2,000; Turnover between ₹1.5 Cr and ₹5 Cr is capped at ₹5,000; Turnover exceeding ₹5 Cr is capped at ₹10,000.',
  },
  {
    question: 'How is interest calculated under Section 50(1) vs Section 50(3) of the CGST Act?',
    answer: 'Under Section 50(1) read with Rule 88B, interest is charged at 18% per annum strictly on the NET CASH LIABILITY (tax paid through Electronic Cash Ledger via PMT-06 after utilizing available electronic credit ledger balance) from the day after the statutory due date until payment. In contrast, under Section 50(3), where Input Tax Credit (ITC) has been wrongly availed AND utilized, interest is charged at the higher rate of 24% per annum.',
  },
  {
    question: 'What are the statutory rules and rates for GST TDS under Section 51 (Form GSTR-7)?',
    answer: 'Under Section 51 of the CGST Act, Government departments, Local authorities, and notified PSUs must deduct 2% GST TDS (1% CGST + 1% SGST for intra-state, or 2% IGST for inter-state) on taxable contracts exceeding ₹2,50,000 (excluding GST). Pursuant to the 54th GST Council, 2% TDS also applies on B2B supply of metal scrap (Chapters 72 to 81). GST TDS must be deposited by the 10th of the following month via Form GSTR-7, and credits auto-flow into the vendor’s Electronic Cash Ledger.',
  },
  {
    question: 'What is the revised GST TCS rate under Section 52 for E-Commerce Operators (Notification 15/2024-CT)?',
    answer: 'Pursuant to the 53rd GST Council meeting and CBIC Notification No. 15/2024-Central Tax (effective 10th July 2024), the GST TCS rate collected by E-Commerce Operators (ECOs like Amazon, Flipkart, Swiggy) was reduced from 1% to 0.5% (0.25% CGST + 0.25% SGST for intra-state, or 0.5% IGST for inter-state) on the net value of taxable supplies. This was done to prevent liquidity blockage for online sellers.',
  },
  {
    question: 'What is the newly introduced GST Invoice Management System (IMS) and how does it affect ITC?',
    answer: 'The Invoice Management System (IMS) is an official GSTN facility allowing recipient taxpayers to review, Accept, Reject, or mark as Pending all inward invoices uploaded by suppliers in their GSTR-1/1A/IFF. Only "Accepted" or unacted invoices (which default to accepted) flow into the static Form GSTR-2B generated on the 14th of each month. Invoices marked "Rejected" do not flow into GSTR-2B, protecting buyers from erroneous or fraudulent ITC claims.',
  },
  {
    question: 'What is Form GSTR-1A and when can a taxpayer use it before filing GSTR-3B?',
    answer: 'Form GSTR-1A is an outward supplies amendment facility introduced under the CGST Rules. It allows taxpayers to add, amend, or modify sales records (B2B, B2C, credit/debit notes) after filing Form GSTR-1 for a month, up until the filing of Form GSTR-3B for that same tax period. Liabilities declared in GSTR-1A auto-populate into Table 3.1 of that month’s GSTR-3B.',
  },
  {
    question: 'How did the 54th GST Council expand the Reverse Charge Mechanism (RCM) to commercial renting and metal scrap?',
    answer: 'At the 54th GST Council meeting: 1) Renting of commercial property by any unregistered person to a registered person was brought under RCM u/s 9(3). 2) Supply of metal scrap by an unregistered person to a registered person was placed under Section 9(4) RCM. Tax under RCM must be paid in hard cash through the Electronic Cash Ledger and cannot be offset against existing ITC.',
  },
  {
    question: 'What is the Section 128A Amnesty scheme for waiving GST interest and penalties?',
    answer: 'Section 128A was introduced pursuant to the 53rd and 54th GST Council meetings to provide a conditional waiver of statutory interest and penalties for demand notices or orders issued under Section 73 (non-fraud cases) for FY 2017-18, 2018-19, and 2019-20. Taxpayers can avail of the waiver by paying the basic principal tax amount in full by the statutory cutoff (March 31, 2025) and filing Form GST SPL-01 or SPL-02.',
  },
  {
    question: 'What is the mandatory 30-day E-Invoicing reporting restriction on IRP portals?',
    answer: 'As per CBIC and GSTN directives, taxpayers with Aggregate Annual Turnover (AATO) of ₹100 Crores or more are prohibited from reporting invoices older than 30 days on Invoice Registration Portals (IRP). E-Invoices, credit notes, and debit notes must be reported on the IRP within 30 days of the document date; otherwise, the portal will reject IRN generation.',
  },
];

export function ResourcesPage() {
  const [selectedGuideKey, setSelectedGuideKey] = useState<string | null>(null);
  const [calculatorMode, setCalculatorMode] = useState<'standard' | 'latefee' | 'tds_tcs'>('standard');
  const [guideCategoryFilter, setGuideCategoryFilter] = useState<string>('All');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // ==========================================
  // 1. FORWARD & REVERSE GST CALCULATOR STATE
  // ==========================================
  const [amount, setAmount] = useState<number>(100000);
  const [gstRate, setGstRate] = useState<number>(18);
  const [isCustomGstRate, setIsCustomGstRate] = useState<boolean>(false);
  const [customGstRate, setCustomGstRate] = useState<number>(18);
  const [chargeMechanism, setChargeMechanism] = useState<'fcm' | 'rcm'>('fcm');
  const [rcmCategory, setRcmCategory] = useState<string>('commercial_rent');
  const [taxMode, setTaxMode] = useState<'exclusive' | 'inclusive'>('exclusive');
  const [supplyType, setSupplyType] = useState<'intra' | 'inter'>('intra');
  const [hasCess, setHasCess] = useState<boolean>(false);
  const [cessRate, setCessRate] = useState<number>(0);

  // ==========================================
  // 2. LATE FEE & SECTION 50 INTEREST STATE (CAPPED)
  // ==========================================
  const [taxLiability, setTaxLiability] = useState<number>(25000);
  const [delayDays, setDelayDays] = useState<number>(60);
  const [lateFeeCategory, setLateFeeCategory] = useState<'nil' | 'under_1_5cr' | 'between_1_5_and_5cr' | 'above_5cr'>('under_1_5cr');
  const [interestSection, setInterestSection] = useState<'sec50_1' | 'sec50_3'>('sec50_1');

  // ==========================================
  // 3. GST TDS & TCS CALCULATOR STATE (SEC 51 & 52)
  // ==========================================
  const [tdsTcsMode, setTdsTcsMode] = useState<'tds_sec51' | 'tcs_sec52'>('tds_sec51');
  // GST TDS (Section 51)
  const [tdsContractValue, setTdsContractValue] = useState<number>(350000);
  const [tdsCategory, setTdsCategory] = useState<'standard' | 'metal_scrap'>('standard');
  const [tdsJurisdiction, setTdsJurisdiction] = useState<'intra' | 'inter' | 'exempt_pos'>('intra');
  // GST TCS (Section 52)
  const [tcsGrossSupplies, setTcsGrossSupplies] = useState<number>(500000);
  const [tcsReturns, setTcsReturns] = useState<number>(25000);
  const [tcsJurisdiction, setTcsJurisdiction] = useState<'intra' | 'inter'>('intra');

  // ==========================================
  // 1. GST Calculations (Forward & Reverse)
  // ==========================================
  const effectiveGstRate = isCustomGstRate ? customGstRate : gstRate;
  const effectiveCessRate = hasCess ? cessRate : 0;
  const totalTaxPercentage = effectiveGstRate + effectiveCessRate;

  const taxableValue = useMemo(() => {
    if (taxMode === 'inclusive') {
      return (amount * 100) / (100 + totalTaxPercentage);
    }
    return amount;
  }, [amount, taxMode, totalTaxPercentage]);

  const calculatedGst = (taxableValue * effectiveGstRate) / 100;
  const calculatedCess = (taxableValue * effectiveCessRate) / 100;
  const grossTotal = taxMode === 'inclusive' ? amount : taxableValue + calculatedGst + calculatedCess;

  const cgstAmount = supplyType === 'intra' ? calculatedGst / 2 : 0;
  const sgstAmount = supplyType === 'intra' ? calculatedGst / 2 : 0;
  const igstAmount = supplyType === 'inter' ? calculatedGst : 0;

  // Rate Rationalization Context Banner
  const isSlashedLegacyRate = gstRate === 12 || gstRate === 28;
  const isNewFortyPercentSlab = gstRate === 40;

  // ==========================================
  // 2. Late Fee Math with Section 47 Caps
  // ==========================================
  const { dailyRate, maxCapCombined, capLabel, capCitation } = useMemo(() => {
    switch (lateFeeCategory) {
      case 'nil':
        return {
          dailyRate: 20, // ₹10 CGST + ₹10 SGST
          maxCapCombined: 500, // ₹250 CGST + ₹250 SGST
          capLabel: 'Nil Return (Zero Liability / Nil Outward Supplies)',
          capCitation: 'Notification No. 19/2021-CT: Max cap ₹500 (₹250 CGST + ₹250 SGST)',
        };
      case 'under_1_5cr':
        return {
          dailyRate: 50, // ₹25 CGST + ₹25 SGST
          maxCapCombined: 2000, // ₹1,000 CGST + ₹1,000 SGST
          capLabel: 'Turnover up to ₹1.5 Crores in preceding FY',
          capCitation: 'Notification No. 19/2021-CT: Max cap ₹2,000 (₹1,000 CGST + ₹1,000 SGST)',
        };
      case 'between_1_5_and_5cr':
        return {
          dailyRate: 50, // ₹25 CGST + ₹25 SGST
          maxCapCombined: 5000, // ₹2,500 CGST + ₹2,500 SGST
          capLabel: 'Turnover ₹1.5 Cr to ₹5 Crores in preceding FY',
          capCitation: 'Notification No. 19/2021-CT: Max cap ₹5,000 (₹2,500 CGST + ₹2,500 SGST)',
        };
      case 'above_5cr':
        return {
          dailyRate: 50, // ₹25 CGST + ₹25 SGST
          maxCapCombined: 10000, // ₹5,000 CGST + ₹5,000 SGST
          capLabel: 'Turnover exceeding ₹5 Crores in preceding FY',
          capCitation: 'Section 47 CGST Act: Max cap ₹10,000 (₹5,000 CGST + ₹5,000 SGST)',
        };
      default:
        return {
          dailyRate: 50,
          maxCapCombined: 10000,
          capLabel: 'Standard Cap',
          capCitation: '',
        };
    }
  }, [lateFeeCategory]);

  const uncappedLateFee = delayDays * dailyRate;
  const effectiveLateFee = Math.min(uncappedLateFee, maxCapCombined);
  const isCapHit = uncappedLateFee > maxCapCombined;
  const capSavings = Math.max(0, uncappedLateFee - maxCapCombined);
  const cgstLateFee = effectiveLateFee / 2;
  const sgstLateFee = effectiveLateFee / 2;

  // Section 50 Interest (18% for 50(1) net cash; 24% for 50(3) wrong ITC utilized)
  const interestRate = interestSection === 'sec50_3' ? 24 : 18;
  const calculatedInterest = (taxLiability * (interestRate / 100) * delayDays) / 365;
  const totalPenaltyExposure = effectiveLateFee + calculatedInterest;

  // ==========================================
  // 3. GST TDS & TCS Math (Section 51 & 52)
  // ==========================================
  // GST TDS (Section 51)
  const isTdsExemptValue = tdsCategory === 'standard' && tdsContractValue <= 250000;
  const isTdsExemptPos = tdsJurisdiction === 'exempt_pos';
  const isTdsApplicable = !isTdsExemptValue && !isTdsExemptPos;
  const tdsRatePercent = isTdsApplicable ? 2 : 0;
  const calculatedGstTds = isTdsApplicable ? (tdsContractValue * 2) / 100 : 0;
  const tdsCgst = tdsJurisdiction === 'intra' && isTdsApplicable ? calculatedGstTds / 2 : 0;
  const tdsSgst = tdsJurisdiction === 'intra' && isTdsApplicable ? calculatedGstTds / 2 : 0;
  const tdsIgst = tdsJurisdiction === 'inter' && isTdsApplicable ? calculatedGstTds : 0;
  const netSupplierRemittance = tdsContractValue - calculatedGstTds;

  // GST TCS (Section 52) - 0.5% rate under Notification 15/2024-CT
  const netTcsTaxableSupplies = Math.max(0, tcsGrossSupplies - tcsReturns);
  const tcsRatePercent = 0.5; // 0.25% CGST + 0.25% SGST / 0.5% IGST
  const calculatedGstTcs = (netTcsTaxableSupplies * 0.5) / 100;
  const tcsCgst = tcsJurisdiction === 'intra' ? calculatedGstTcs / 2 : 0;
  const tcsSgst = tcsJurisdiction === 'intra' ? calculatedGstTcs / 2 : 0;
  const tcsIgst = tcsJurisdiction === 'inter' ? calculatedGstTcs : 0;
  const netSellerPayout = netTcsTaxableSupplies - calculatedGstTcs;

  // Filtered Guides
  const filteredGuides = useMemo(() => {
    return Object.entries(guidesData).filter(([_, guide]) => {
      if (guideCategoryFilter === 'All') return true;
      return guide.category === guideCategoryFilter;
    });
  }, [guideCategoryFilter]);

  const selectedGuide = selectedGuideKey ? guidesData[selectedGuideKey] : null;

  const toggleChecklist = (itemKey: string) => {
    setCheckedItems((prev) => ({ ...prev, [itemKey]: !prev[itemKey] }));
  };

  const selectAllChecklist = () => {
    if (!selectedGuideKey || !selectedGuide) return;
    const updates: Record<string, boolean> = {};
    selectedGuide.checklist.forEach((_, idx) => {
      updates[`${selectedGuideKey}-${idx}`] = true;
    });
    setCheckedItems((prev) => ({ ...prev, ...updates }));
  };

  const clearAllChecklist = () => {
    if (!selectedGuideKey || !selectedGuide) return;
    const updates: Record<string, boolean> = {};
    selectedGuide.checklist.forEach((_, idx) => {
      updates[`${selectedGuideKey}-${idx}`] = false;
    });
    setCheckedItems((prev) => ({ ...prev, ...updates }));
  };

  return (
    <PublicLayout meta={resourcesMeta} jsonLd={faqSchema(faqs)}>
      {/* 1. HERO SECTION */}
      <section className="relative bg-slate-950 text-white pt-10 pb-14 sm:pt-16 sm:pb-20 overflow-hidden border-b border-slate-900">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-blue-600/15 blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: 'Resources & Compliance Suite', path: '/resources' }]} />

          <div className="text-center max-w-3xl mx-auto mt-6 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-bold text-blue-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Statutory GST Suite: Rate Overhaul (5%, 18% &amp; New 40% Slab)
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              GST Calculators, Rates, TDS/TCS &amp;{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-300">
                Statutory Blueprints.
              </span>
            </h1>

            <p className="text-xs sm:text-sm lg:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Chartered Accountant-engineered indirect tax compliance hub. Updated with the streamlined 3-tier rate structure (dissolution of 12% &amp; 28%, new 40% demerit slab), Section 47 capped late fees, Section 50 interest, and GST TDS (Sec 51) &amp; TCS (Sec 52).
            </p>

            {/* Quick Navigation Anchor Pills */}
            <div className="pt-3 flex flex-wrap items-center justify-center gap-2">
              <a href="#calculators" className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white hover:border-blue-500 transition-colors touch-target">
                🧮 GST Calculators
              </a>
              <a href="#guides" className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white hover:border-blue-500 transition-colors touch-target">
                📋 CA Blueprints
              </a>
              <a href="#portals" className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white hover:border-blue-500 transition-colors touch-target">
                🏛️ Official Portals
              </a>
              <a href="#verification" className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white hover:border-blue-500 transition-colors touch-target">
                🔍 Verification Tools
              </a>
              <a href="#faqs" className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white hover:border-blue-500 transition-colors touch-target">
                💡 Statutory FAQs
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 2. INTERACTIVE CALCULATOR SUITE */}
      <section id="calculators" className="py-12 sm:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full inline-block mb-2">
              Institutional Financial Tools
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              Live Statutory GST Calculators
            </h2>
            <p className="text-slate-600 mt-2 text-xs sm:text-sm">
              Updated with the streamlined 5%, 18% and new 40% demerit slabs, Notification 19/2021-CT late fee caps, and Notification 15/2024-CT 0.5% GST TCS rates.
            </p>

            {/* Mode Switcher */}
            <div className="inline-flex p-1 rounded-2xl bg-white border border-slate-200 shadow-xs mt-6 gap-1 flex-wrap justify-center max-w-full">
              <button
                type="button"
                onClick={() => setCalculatorMode('standard')}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                  calculatorMode === 'standard'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Forward &amp; Reverse GST (+ 40% Slab)
              </button>
              <button
                type="button"
                onClick={() => setCalculatorMode('latefee')}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                  calculatorMode === 'latefee'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sec 47 Late Fee (Capped) &amp; Sec 50 Interest
              </button>
              <button
                type="button"
                onClick={() => setCalculatorMode('tds_tcs')}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                  calculatorMode === 'tds_tcs'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                GST TDS (Sec 51) &amp; TCS (Sec 52)
              </button>
            </div>
          </div>

          {/* Calculator Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 lg:p-10 shadow-xl overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={calculatorMode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {/* CALCULATOR 1: FORWARD & REVERSE GST */}
            {calculatorMode === 'standard' && (
              <div className="space-y-6 sm:space-y-8">
                {/* Mechanism Selector */}
                <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                      Charging Mechanism
                    </span>
                    <span className="text-xs text-blue-950 font-medium">
                      {chargeMechanism === 'fcm'
                        ? 'Forward Charge Mechanism (FCM): Supplier collects tax & discharges liability.'
                        : 'Reverse Charge Mechanism (RCM): Recipient discharges tax in cash under Section 9(3)/9(4).'}
                    </span>
                  </div>
                  <div className="flex rounded-xl border border-blue-200 p-1 bg-white shrink-0">
                    <button
                      type="button"
                      onClick={() => setChargeMechanism('fcm')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer min-h-[36px] ${
                        chargeMechanism === 'fcm' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Forward Charge (FCM)
                    </button>
                    <button
                      type="button"
                      onClick={() => setChargeMechanism('rcm')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer min-h-[36px] ${
                        chargeMechanism === 'rcm' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Reverse Charge (RCM)
                    </button>
                  </div>
                </div>

                {chargeMechanism === 'rcm' && (
                  <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-xs text-amber-900">
                      <span className="font-bold block">54th GST Council RCM Scope:</span>
                      Select notified category below to apply statutory tax rules.
                    </div>
                    <select
                      value={rcmCategory}
                      onChange={(e) => {
                        setRcmCategory(e.target.value);
                        if (e.target.value === 'commercial_rent') setGstRate(18);
                        if (e.target.value === 'metal_scrap') setGstRate(18);
                        if (e.target.value === 'gta') setGstRate(5);
                        if (e.target.value === 'legal') setGstRate(18);
                      }}
                      className="px-3 py-2 rounded-lg border border-amber-300 bg-white text-xs font-bold text-amber-950 outline-hidden min-h-[40px]"
                    >
                      <option value="commercial_rent">Commercial Property Renting by Unregistered to Registered (18%)</option>
                      <option value="metal_scrap">Metal Scrap Supply by Unregistered Person (18%)</option>
                      <option value="gta">Goods Transport Agency (GTA) Services (5%)</option>
                      <option value="legal">Legal Services by Advocates / Senior Advocates (18%)</option>
                      <option value="security">Security / Manpower Supply by Non-Corporate (18%)</option>
                      <option value="director">Director Remuneration / Independent Director Fees (18%)</option>
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Base Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 font-mono text-base font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      GST Rate (Overhaul Slabs)
                    </label>
                    <select
                      value={isCustomGstRate ? 'custom' : gstRate}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setIsCustomGstRate(true);
                        } else {
                          setIsCustomGstRate(false);
                          setGstRate(Number(e.target.value));
                        }
                      }}
                      className="w-full px-3 py-3 rounded-xl border border-slate-300 font-bold bg-white text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden min-h-[44px]"
                    >
                      <optgroup label="Active Rationalized Slabs">
                        <option value={0}>0% — Exempt / Nil-Rated (Staples, Healthcare)</option>
                        <option value={5}>5% — Standard Merit (Groceries, Absorbed 12% Items)</option>
                        <option value={18}>18% — Standard General (Services, SaaS, Absorbed 28% Items)</option>
                        <option value={40}>40% — NEW Demerit Slab (Luxury Cars, Aerated/Tobacco)</option>
                      </optgroup>
                      <optgroup label="Special Statutory Slabs">
                        <option value={0.1}>0.1% — Merchant Exports (Notif 40/2017)</option>
                        <option value={0.25}>0.25% — Rough Diamonds &amp; Gems</option>
                        <option value={1.5}>1.5% — Affordable Housing Scheme</option>
                        <option value={3}>3% — Gold, Silver &amp; Precious Bullion</option>
                        <option value={6}>6% — Brick Kilns Special Composition</option>
                        <option value={7.5}>7.5% — Hotel Dining with ITC</option>
                      </optgroup>
                      <optgroup label="Legacy Slashed Slabs (Historical Audits)">
                        <option value={12}>12% — [Legacy Slashed] (Migrated down to 5%)</option>
                        <option value={28}>28% — [Legacy Slashed] (Migrated to 18% / 40%)</option>
                      </optgroup>
                      <option value="custom">Custom Rate %...</option>
                    </select>

                    {isCustomGstRate && (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          value={customGstRate}
                          onChange={(e) => setCustomGstRate(Math.max(0, Number(e.target.value)))}
                          placeholder="Rate %"
                          className="w-24 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold font-mono outline-hidden min-h-[36px]"
                        />
                        <span className="text-xs text-slate-500 font-semibold">% Custom GST</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Supply Nature
                    </label>
                    <div className="flex rounded-xl border border-slate-300 p-1 bg-slate-50 min-h-[44px]">
                      <button
                        type="button"
                        onClick={() => setSupplyType('intra')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          supplyType === 'intra' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'
                        }`}
                      >
                        Intra (CGST+SGST)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSupplyType('inter')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          supplyType === 'inter' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'
                        }`}
                      >
                        Inter (IGST)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Computation Mode
                    </label>
                    <div className="flex rounded-xl border border-slate-300 p-1 bg-slate-50 min-h-[44px]">
                      <button
                        type="button"
                        onClick={() => setTaxMode('exclusive')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          taxMode === 'exclusive' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'
                        }`}
                      >
                        + GST (Exclusive)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaxMode('inclusive')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          taxMode === 'inclusive' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'
                        }`}
                      >
                        Reverse (Inclusive)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Rate Rationalization Banner */}
                {isNewFortyPercentSlab && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-start gap-2.5">
                    <span className="text-base">🔥</span>
                    <div>
                      <strong className="font-bold block text-amber-900">
                        NEW 40% SPECIAL DEMERIT SLAB
                      </strong>
                      <span>
                        Created under the Rate Rationalisation GoM / Council recommendations for luxury automobiles, super-bikes (&gt; 350cc), caffeinated/aerated beverages, pan masala, and tobacco products, replacing former 28% + high cess structures.
                      </span>
                    </div>
                  </div>
                )}

                {isSlashedLegacyRate && (
                  <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-300 text-xs text-slate-700 flex items-start gap-2.5">
                    <span className="text-base">ℹ️</span>
                    <div>
                      <strong className="font-bold block text-slate-900">
                        Rate Overhaul Notice: {gstRate}% Slab Phased Out
                      </strong>
                      <span>
                        The {gstRate}% slab has been dissolved under the rate rationalization overhaul. Items previously at 12% migrated to 5%, and items at 28% migrated to 18% (with sin/luxury goods moving to 40%). Retained here for historical return audits and prior period true-ups.
                      </span>
                    </div>
                  </div>
                )}

                {/* Compensation Cess Row */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="cessToggle"
                      checked={hasCess}
                      onChange={(e) => setHasCess(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="cessToggle" className="text-xs font-bold text-slate-800 cursor-pointer">
                      Include GST Compensation Cess (Automobiles, Tobacco, Aerated Waters, Coal)
                    </label>
                  </div>

                  {hasCess && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600">Cess Rate:</span>
                      <select
                        value={cessRate}
                        onChange={(e) => setCessRate(Number(e.target.value))}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-white outline-hidden min-h-[36px]"
                      >
                        <option value={1}>1% (Small Petrol Cars &lt; 1200cc)</option>
                        <option value={3}>3% (Small Diesel Cars &lt; 1500cc)</option>
                        <option value={12}>12% (Mid-size Passenger Vehicles)</option>
                        <option value={15}>15% (Large Luxury Motor Vehicles)</option>
                        <option value={22}>22% (Large SUVs &gt; 1500cc)</option>
                        <option value={160}>160% (Specified Pan Masala)</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Results Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-4 border-t border-slate-100">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Taxable Base</span>
                    <strong className="text-lg sm:text-2xl font-black text-slate-900 font-mono mt-1 block">
                      ₹{taxableValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </strong>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Net pre-tax invoice amount</span>
                  </div>

                  <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100">
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                      Total GST ({effectiveGstRate}%)
                    </span>
                    <strong className="text-lg sm:text-2xl font-black text-blue-600 font-mono mt-1 block">
                      ₹{calculatedGst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </strong>
                    <span className="text-[10px] text-blue-600/80 mt-0.5 block truncate">
                      {supplyType === 'intra'
                        ? `CGST ₹${cgstAmount.toFixed(1)} + SGST ₹${sgstAmount.toFixed(1)}`
                        : `IGST ₹${igstAmount.toFixed(1)}`}
                    </span>
                  </div>

                  <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                      Compensation Cess ({effectiveCessRate}%)
                    </span>
                    <strong className="text-lg sm:text-2xl font-black text-amber-700 font-mono mt-1 block">
                      ₹{calculatedCess.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </strong>
                    <span className="text-[10px] text-amber-600 mt-0.5 block">
                      {hasCess ? 'Levied under GST Cess Act' : 'Zero Cess applied'}
                    </span>
                  </div>

                  <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Grand Invoice Total</span>
                    <strong className="text-lg sm:text-2xl font-black text-emerald-600 font-mono mt-1 block">
                      ₹{grossTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </strong>
                    <span className="text-[10px] text-emerald-600/80 mt-0.5 block">Base + GST + Cess</span>
                  </div>
                </div>

                <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-blue-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span>
                    ℹ️ <strong>Statutory Note:</strong> {chargeMechanism === 'rcm'
                      ? 'RCM tax under Table 3.1(d) must be paid strictly in CASH and cannot be offset against ITC. Recipient issues Self-Invoice u/s 31(3)(f).'
                      : 'Mandatory 6-digit HSN codes apply to businesses with turnover > ₹5 Crores; 4-digit for turnover up to ₹5 Crores.'}
                  </span>
                  <a href="#guides" className="text-blue-700 font-bold hover:underline shrink-0">
                    {chargeMechanism === 'rcm' ? 'View RCM Blueprint →' : 'View Rate Overhaul Guide →'}
                  </a>
                </div>
              </div>
            )}

            {/* CALCULATOR 2: LATE FEES (RATIONALIZED CAPPING) & SECTION 50 INTEREST */}
            {calculatorMode === 'latefee' && (
              <div className="space-y-6 sm:space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Net Cash Tax Liability (₹)
                    </label>
                    <input
                      type="number"
                      value={taxLiability}
                      onChange={(e) => setTaxLiability(Math.max(0, Number(e.target.value)))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 font-mono text-base font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden min-h-[44px]"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Paid via PMT-06 cash ledger (Rule 88B)</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Days Delayed Past Cutoff
                    </label>
                    <input
                      type="number"
                      value={delayDays}
                      onChange={(e) => setDelayDays(Math.max(0, Number(e.target.value)))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 font-mono text-base font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden min-h-[44px]"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Calculated from 20th statutory due date</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Return Scheme &amp; Turnover Cap
                    </label>
                    <select
                      value={lateFeeCategory}
                      onChange={(e) =>
                        setLateFeeCategory(
                          e.target.value as 'nil' | 'under_1_5cr' | 'between_1_5_and_5cr' | 'above_5cr'
                        )
                      }
                      className="w-full px-3 py-3 rounded-xl border border-slate-300 font-bold bg-white text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden min-h-[44px]"
                    >
                      <option value="nil">Nil Return (₹20/day, Max Cap ₹500)</option>
                      <option value="under_1_5cr">Turnover &le; ₹1.5 Cr (₹50/day, Max Cap ₹2,000)</option>
                      <option value="between_1_5_and_5cr">Turnover ₹1.5 Cr to ₹5 Cr (₹50/day, Max Cap ₹5,000)</option>
                      <option value="above_5cr">Turnover &gt; ₹5 Cr (₹50/day, Max Cap ₹10,000)</option>
                    </select>
                    <span className="text-[10px] text-blue-600 font-medium mt-1 block">Notification No. 19/2021-Central Tax</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Section 50 Interest Type
                    </label>
                    <div className="flex rounded-xl border border-slate-300 p-1 bg-slate-50 min-h-[44px]">
                      <button
                        type="button"
                        onClick={() => setInterestSection('sec50_1')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          interestSection === 'sec50_1' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'
                        }`}
                      >
                        Sec 50(1) @ 18%
                      </button>
                      <button
                        type="button"
                        onClick={() => setInterestSection('sec50_3')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          interestSection === 'sec50_3' ? 'bg-white shadow-xs text-red-600' : 'text-slate-500'
                        }`}
                      >
                        Sec 50(3) @ 24%
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {interestSection === 'sec50_1' ? 'Delayed cash tax (Rule 88B)' : 'Ineligible ITC availed & utilized'}
                    </span>
                  </div>
                </div>

                {/* Results Matrix with Statutory Cap Badge */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                  <div className="bg-amber-50/60 p-4 sm:p-5 rounded-2xl border border-amber-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                        Section 50 Interest ({interestRate}% p.a.)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                        {interestSection === 'sec50_1' ? 'Net Cash' : 'Ineligible ITC'}
                      </span>
                    </div>
                    <strong className="text-xl sm:text-2xl font-black text-amber-600 font-mono mt-1.5 block">
                      ₹{calculatedInterest.toFixed(2)}
                    </strong>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      (₹{taxLiability.toLocaleString('en-IN')} &times; {interestRate}% &times; {delayDays} days) / 365
                    </span>
                  </div>

                  <div className="bg-red-50/60 p-4 sm:p-5 rounded-2xl border border-red-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">
                        Section 47 Late Fee (Capped)
                      </span>
                      {isCapHit && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Cap Active
                        </span>
                      )}
                    </div>
                    <strong className="text-xl sm:text-2xl font-black text-red-600 font-mono mt-1.5 block">
                      ₹{effectiveLateFee.toLocaleString('en-IN')}
                    </strong>
                    <span className="text-[10px] text-slate-600 mt-1 block">
                      CGST ₹{cgstLateFee.toLocaleString('en-IN')} + SGST ₹{sgstLateFee.toLocaleString('en-IN')}
                    </span>
                    {isCapHit && (
                      <span className="text-[10px] text-emerald-700 font-bold mt-1 block">
                        🎉 Statutory cap saved ₹{capSavings.toLocaleString('en-IN')} (Uncapped: ₹{uncappedLateFee.toLocaleString('en-IN')})
                      </span>
                    )}
                  </div>

                  <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Total Penalty &amp; Interest Exposure
                    </span>
                    <strong className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1.5 block">
                      ₹{totalPenaltyExposure.toFixed(2)}
                    </strong>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Prevented by GSTBro Automated Return Filing SLA
                    </span>
                  </div>
                </div>

                {/* Statutory Reference Banner */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block">
                      📜 Statutory Provision: {capCitation}
                    </span>
                    <p className="text-slate-600 mt-0.5">
                      Category: <strong>{capLabel}</strong>. Section 47 late fee is payable strictly through Electronic Cash Ledger and cannot be discharged using ITC.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedGuideKey('gst-sec128a-amnesty')}
                    className="px-3.5 py-1.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-500 shrink-0 cursor-pointer min-h-[36px]"
                  >
                    Check Section 128A Waiver →
                  </button>
                </div>
              </div>
            )}

            {/* CALCULATOR 3: GST TDS (SECTION 51) & GST TCS (SECTION 52) */}
            {calculatorMode === 'tds_tcs' && (
              <div className="space-y-6 sm:space-y-8">
                {/* Mode Toggle: TDS Sec 51 vs TCS Sec 52 */}
                <div className="p-1 rounded-2xl bg-slate-100 border border-slate-200 flex max-w-md mx-auto">
                  <button
                    type="button"
                    onClick={() => setTdsTcsMode('tds_sec51')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer min-h-[40px] ${
                      tdsTcsMode === 'tds_sec51' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    GST TDS (Section 51)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTdsTcsMode('tcs_sec52')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer min-h-[40px] ${
                      tdsTcsMode === 'tcs_sec52' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    GST TCS (Section 52 - E-Commerce)
                  </button>
                </div>

                {/* SUB-MODE 1: GST TDS (SECTION 51) */}
                {tdsTcsMode === 'tds_sec51' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          GST TDS Category
                        </label>
                        <select
                          value={tdsCategory}
                          onChange={(e) => setTdsCategory(e.target.value as 'standard' | 'metal_scrap')}
                          className="w-full px-3 py-3 rounded-xl border border-slate-300 font-bold bg-white text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden min-h-[44px]"
                        >
                          <option value="standard">Govt / PSU Contract (&gt; ₹2.5L value)</option>
                          <option value="metal_scrap">B2B Metal Scrap Supply (54th Council)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Total Contract / Invoice Value (₹)
                        </label>
                        <input
                          type="number"
                          value={tdsContractValue}
                          onChange={(e) => setTdsContractValue(Math.max(0, Number(e.target.value)))}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 font-mono text-base font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden min-h-[44px]"
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">Excluding CGST, SGST &amp; IGST</span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Supply Location &amp; POS
                        </label>
                        <select
                          value={tdsJurisdiction}
                          onChange={(e) => setTdsJurisdiction(e.target.value as 'intra' | 'inter' | 'exempt_pos')}
                          className="w-full px-3 py-3 rounded-xl border border-slate-300 font-bold bg-white text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden min-h-[44px]"
                        >
                          <option value="intra">Intra-State (1% CGST + 1% SGST = 2%)</option>
                          <option value="inter">Inter-State (2% IGST)</option>
                          <option value="exempt_pos">Exempt (Supplier &amp; POS in State A, DDO in State B)</option>
                        </select>
                      </div>
                    </div>

                    {/* Exemption Notice if below threshold or exempt POS */}
                    {isTdsExemptValue && (
                      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
                        ⚠️ <strong>Exemption Active:</strong> Under Section 51(1), no GST TDS is deductible if the total value of supply under a contract does not exceed ₹2,50,000.
                      </div>
                    )}
                    {isTdsExemptPos && (
                      <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 font-medium">
                        ℹ️ <strong>Location Exemption Active:</strong> Under Section 51 proviso, no deduction is made when location of supplier and place of supply are in a different State from the recipient DDO.
                      </div>
                    )}

                    {/* Results Matrix */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-4 border-t border-slate-100">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Contract Value</span>
                        <strong className="text-lg sm:text-2xl font-black text-slate-900 font-mono mt-1 block">
                          ₹{tdsContractValue.toLocaleString('en-IN')}
                        </strong>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">Net pre-tax value</span>
                      </div>

                      <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100">
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                          GST TDS ({tdsRatePercent}%)
                        </span>
                        <strong className="text-lg sm:text-2xl font-black text-blue-600 font-mono mt-1 block">
                          ₹{calculatedGstTds.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </strong>
                        <span className="text-[10px] text-blue-600/80 mt-0.5 block truncate">
                          {tdsJurisdiction === 'intra'
                            ? `CGST ₹${tdsCgst.toFixed(1)} + SGST ₹${tdsSgst.toFixed(1)}`
                            : tdsJurisdiction === 'inter'
                            ? `IGST ₹${tdsIgst.toFixed(1)}`
                            : 'Nil (Exempt)'}
                        </span>
                      </div>

                      <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Net Remittance to Vendor</span>
                        <strong className="text-lg sm:text-2xl font-black text-emerald-600 font-mono mt-1 block">
                          ₹{netSupplierRemittance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </strong>
                        <span className="text-[10px] text-emerald-600/80 mt-0.5 block">Contract Value less GST TDS</span>
                      </div>

                      <div className="bg-slate-900 text-white p-4 rounded-2xl">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Statutory Return &amp; Cutoff</span>
                        <strong className="text-base sm:text-xl font-black text-emerald-400 font-mono mt-1 block">
                          Form GSTR-7
                        </strong>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">10th of next month (Cert: GSTR-7A)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUB-MODE 2: GST TCS (SECTION 52 - E-COMMERCE) */}
                {tdsTcsMode === 'tcs_sec52' && (
                  <div className="space-y-6">
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-emerald-900 uppercase tracking-wider text-[11px] block">
                          📢 Revised TCS Rate: Notification No. 15/2024-Central Tax
                        </span>
                        <p className="text-emerald-800 mt-0.5">
                          Pursuant to the 53rd GST Council, the statutory GST TCS rate was reduced from <strong>1% to 0.5%</strong> (0.25% CGST + 0.25% SGST, or 0.5% IGST) effective from 10th July 2024.
                        </p>
                      </div>
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-200 text-emerald-900 border border-emerald-400 shrink-0">
                        Current 0.5%
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Gross Supplies via ECO (₹)
                        </label>
                        <input
                          type="number"
                          value={tcsGrossSupplies}
                          onChange={(e) => setTcsGrossSupplies(Math.max(0, Number(e.target.value)))}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 font-mono text-base font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden min-h-[44px]"
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">Total taxable orders facilitated</span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Returns / Cancellations (₹)
                        </label>
                        <input
                          type="number"
                          value={tcsReturns}
                          onChange={(e) => setTcsReturns(Math.max(0, Number(e.target.value)))}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 font-mono text-base font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden min-h-[44px]"
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">Deducted from gross supplies</span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Supply Jurisdiction
                        </label>
                        <div className="flex rounded-xl border border-slate-300 p-1 bg-slate-50 min-h-[44px]">
                          <button
                            type="button"
                            onClick={() => setTcsJurisdiction('intra')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                              tcsJurisdiction === 'intra' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'
                            }`}
                          >
                            Intra (0.25%+0.25%)
                          </button>
                          <button
                            type="button"
                            onClick={() => setTcsJurisdiction('inter')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                              tcsJurisdiction === 'inter' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'
                            }`}
                          >
                            Inter (0.5% IGST)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* TCS Results Matrix */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-4 border-t border-slate-100">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Net Taxable Supplies</span>
                        <strong className="text-lg sm:text-2xl font-black text-slate-900 font-mono mt-1 block">
                          ₹{netTcsTaxableSupplies.toLocaleString('en-IN')}
                        </strong>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">Gross minus returns</span>
                      </div>

                      <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100">
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                          GST TCS ({tcsRatePercent}%)
                        </span>
                        <strong className="text-lg sm:text-2xl font-black text-blue-600 font-mono mt-1 block">
                          ₹{calculatedGstTcs.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </strong>
                        <span className="text-[10px] text-blue-600/80 mt-0.5 block truncate">
                          {tcsJurisdiction === 'intra'
                            ? `CGST ₹${tcsCgst.toFixed(1)} + SGST ₹${tcsSgst.toFixed(1)}`
                            : `IGST ₹${tcsIgst.toFixed(1)}`}
                        </span>
                      </div>

                      <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Net Remittance to Seller</span>
                        <strong className="text-lg sm:text-2xl font-black text-emerald-600 font-mono mt-1 block">
                          ₹{netSellerPayout.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </strong>
                        <span className="text-[10px] text-emerald-600/80 mt-0.5 block">Payout post TCS deduction</span>
                      </div>

                      <div className="bg-slate-900 text-white p-4 rounded-2xl">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Statutory Return &amp; Cutoff</span>
                        <strong className="text-base sm:text-xl font-black text-emerald-400 font-mono mt-1 block">
                          Form GSTR-8
                        </strong>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">10th of next month (ECO obligation)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* 3. STATUTORY BLUEPRINTS & CA-AUTHORED GUIDES */}
      <section id="guides" className="py-12 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full inline-block mb-2">
              Statutory Blueprints
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              CA-Authored Compliance Dossiers
            </h2>
            <p className="text-slate-600 mt-2 text-xs sm:text-sm lg:text-base leading-relaxed">
              Updated for FY 2025-26 &amp; FY 2026-27. Click any dossier to view full statutory disclosures, common departmental notice triggers, and actionable checklists.
            </p>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
              {['All', 'Indirect Tax (GST)', 'Inward Credit & IMS', 'TDS & TCS (GST)', 'Refunds & Litigation'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setGuideCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[36px] ${
                    guideCategoryFilter === cat
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
          >
            {filteredGuides.map(([key, guide]) => (
              <motion.div
                key={key}
                variants={fadeUpVariants}
                whileHover={{ y: -4, transition: transitions.springHover }}
                className="bg-slate-50 border border-slate-200/90 rounded-3xl p-6 sm:p-7 flex flex-col justify-between hover:border-blue-400 hover:shadow-lg transition-all group cursor-pointer"
                onClick={() => setSelectedGuideKey(key)}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 truncate">
                      {guide.category}
                    </span>
                    {guide.badge && (
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {guide.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm sm:base font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                    {guide.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {guide.description}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>{guide.checklist.length} Statutory Checks</span>
                  <span className="text-blue-600 font-bold group-hover:translate-x-1 transition-transform">
                    Open Blueprint ➔
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 4. OFFICIAL PORTAL GATEWAY */}
      <section id="portals" className="py-12 sm:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full inline-block mb-2">
              Government Integrations
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              Official Portals &amp; Tax Infrastructure
            </h2>
            <p className="text-slate-600 mt-2 text-xs sm:text-sm">
              Direct access to government indirect tax infrastructure across GSTN, CBIC, IRP, and ICEGATE systems.
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
          >
            {portalShortcuts.map((portal) => (
              <motion.a
                key={portal.name}
                variants={fadeUpVariants}
                whileHover={{ y: -4, transition: transitions.springHover }}
                href={portal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all group block"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                      {portal.category}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {portal.tag}
                    </span>
                  </div>
                  <span className="text-slate-300 group-hover:text-blue-600 transition-colors text-sm">↗</span>
                </div>
                <strong className="block text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors mt-2">
                  {portal.name}
                </strong>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  {portal.desc}
                </p>
              </motion.a>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 5. OFFICIAL VERIFICATION TOOLS */}
      <section id="verification" className="py-12 sm:py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full inline-block mb-2">
              Statutory Utilities
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Direct GST Verification Tools
            </h2>
            <p className="text-slate-600 mt-2 text-xs sm:text-sm">
              Verify taxpayer GSTIN credentials, search 6-digit tariff HSN codes, and validate signed E-Invoice QR codes.
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
          >
            {statutorySearchTools.map((tool) => (
              <motion.a
                key={tool.name}
                variants={fadeUpVariants}
                whileHover={{ y: -3, transition: transitions.springHover }}
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-50 p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:bg-white hover:shadow-md transition-all group block"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {tool.tag}
                  </span>
                  <span className="text-slate-400 group-hover:text-blue-600 transition-colors text-xs font-bold">Launch Tool ↗</span>
                </div>
                <strong className="block text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {tool.name}
                </strong>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {tool.desc}
                </p>
              </motion.a>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 6. STATUTORY FAQS ACCORDION */}
      <section id="faqs" className="py-12 sm:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full inline-block mb-2">
              Statutory Knowledge
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              Frequently Asked Compliance Questions
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Authoritative answers covering recent GST Council meetings, CBIC notifications, and statutory filing procedures.
            </p>
          </div>

          <div className="space-y-3.5">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="group border border-slate-200 rounded-2xl bg-white open:shadow-xs transition-all p-4 sm:p-5"
              >
                <summary className="font-bold text-xs sm:text-sm text-slate-900 cursor-pointer flex items-center justify-between list-none min-h-[36px]">
                  <span className="pr-3 leading-snug">{faq.question}</span>
                  <span className="text-slate-400 group-open:rotate-180 transition-transform text-xs font-mono shrink-0">
                    ▼
                  </span>
                </summary>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 7. MODAL: DETAILED STATUTORY BLUEPRINT VIEWER */}
      <AnimatePresence>
        {selectedGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            onClick={() => setSelectedGuideKey(null)}
          >
            <motion.div
              variants={modalScaleVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-5 sm:p-8 shadow-2xl border border-slate-200 space-y-5 sm:space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                      {selectedGuide.category}
                    </span>
                    {selectedGuide.badge && (
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {selectedGuide.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg sm:text-2xl font-black text-slate-900 mt-2">
                    {selectedGuide.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                    {selectedGuide.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedGuideKey(null)}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 text-lg font-bold shrink-0 cursor-pointer min-h-[36px]"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3.5">
                {selectedGuide.sections.map((sec, idx) => (
                  <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-1.5">
                      {sec.title}
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {sec.content}
                    </p>
                  </div>
                ))}
              </div>

              <div className="bg-emerald-50/80 border border-emerald-200 p-4 sm:p-6 rounded-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                      Statutory Execution Checklist (Interactive)
                    </h4>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Tap any item to tick/untick and track compliance verification on your mobile device
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      {selectedGuide.checklist.filter((_, idx) => checkedItems[`${selectedGuideKey}-${idx}`]).length} / {selectedGuide.checklist.length} Verified
                    </span>
                    <button
                      type="button"
                      onClick={selectAllChecklist}
                      className="text-[11px] font-bold text-emerald-800 hover:text-emerald-900 underline px-1 py-0.5 cursor-pointer touch-target"
                    >
                      Select All
                    </button>
                    <span className="text-emerald-400">|</span>
                    <button
                      type="button"
                      onClick={clearAllChecklist}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline px-1 py-0.5 cursor-pointer touch-target"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-emerald-950">
                  {selectedGuide.checklist.map((item, idx) => {
                    const itemKey = `${selectedGuideKey}-${idx}`;
                    const isChecked = !!checkedItems[itemKey];
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleChecklist(itemKey)}
                        className={`touch-checkbox-item ${isChecked ? 'checked !bg-emerald-100/90 !border-emerald-400 shadow-xs' : '!bg-white !border-emerald-200'}`}
                        role="checkbox"
                        aria-checked={isChecked}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            toggleChecklist(itemKey);
                          }
                        }}
                      >
                        <div className={`touch-checkbox-box ${isChecked ? '!bg-emerald-600 !border-emerald-600' : '!border-emerald-400'}`}>
                          {isChecked && (
                            <svg className="w-3.5 h-3.5 text-white stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className={`leading-relaxed text-slate-800 select-none ${isChecked ? 'font-semibold text-emerald-950 line-through decoration-emerald-600/50' : ''}`}>
                          {item}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <span className="text-xs text-slate-500 font-medium">
                  Verified by ICAI-accredited Chartered Accountants
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedGuideKey(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer min-h-[40px]"
                  >
                    Close Dossier
                  </button>
                  <a
                    href="/contact"
                    className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-500 shadow-md transition-all cursor-pointer min-h-[40px] flex items-center justify-center"
                  >
                    Speak to Assigned CA ➔
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 8. PRE-FOOTER DIRECT CA CONSULTATION BANNER */}
      <section className="py-12 sm:py-20 bg-slate-950 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5 sm:space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-bold text-blue-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Senior Chartered Accountant Consultation Desk
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Have a Specific Tax Calculation, IMS Dispute or Departmental Notice?
          </h2>

          <p className="text-xs sm:text-sm lg:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Our senior Chartered Accountants can examine your invoice registers in IMS, reconcile uncredited 2B ITC, verify RCM commercial rent liabilities, or draft formal legal replies to Section 73/74 notices.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <a
              href="/contact"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-600/30 transition-all cursor-pointer min-h-[44px]"
            >
              <span>Schedule Free 15-Min CA Diagnostic</span>
              <span>➔</span>
            </a>
            <a
              href="/pricing"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-xl font-semibold text-xs sm:text-sm text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-all text-center min-h-[44px]"
            >
              View Transparent Retainer Plans
            </a>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

export default ResourcesPage;
