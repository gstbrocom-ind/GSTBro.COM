/**
 * GSTBro Statutory CA Document Generator
 * Produces ICAI SA 210 Engagement Letters, Previous Auditor NOCs, and Onboarding Kits.
 */

export interface DocumentGenerationContext {
  firmName: string;
  firmAddress?: string | null;
  firmEmail?: string | null;
  firmPhone?: string | null;
  partnerName: string;
  membershipNumber?: string | null;
  membershipType?: 'FCA' | 'ACA' | string | null;
  copNumber?: string | null;
  partnerDesignation?: string | null;
  clientTradeName: string;
  clientLegalName?: string;
  clientContactPerson: string;
  clientGstin?: string;
  clientPan?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientAddress?: string;
  state?: string;
  constitutionType?: string;
  services: string[];
  monthlyRetainerFee: number;
  welcomeCode?: string;
  clientPortalUrl?: string;
  driveFolderUrl?: string;
  previousAuditorName?: string;
  date?: string;
}

export interface GeneratedDocumentKit {
  sa210EngagementLetter: string;
  previousAuditorNocLetter: string;
  kycChecklistDoc: string;
  roadmap90Days: string;
  taxAuthorityAuthorizationLetter: string;
  whatsappWelcomeDraft: string;
  emailWelcomeDraft: {
    subject: string;
    body: string;
  };
}

export function generateCaOnboardingDocKit(ctx: DocumentGenerationContext): GeneratedDocumentKit {
  const today = ctx.date || new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const firmName = ctx.firmName || 'Chartered Accountants & Tax Advisors';
  const firmAddress = ctx.firmAddress || 'Chartered Accountants Practice Office';
  const partnerName = ctx.partnerName || 'Managing Partner';
  const clientName = ctx.clientLegalName || ctx.clientTradeName || 'M/s Valued Client';
  const clientPerson = ctx.clientContactPerson || 'The Managing Director / Proprietor';
  const gstin = ctx.clientGstin || 'Unregistered / Under Application';
  const pan = ctx.clientPan || 'As per records';
  const fee = ctx.monthlyRetainerFee.toLocaleString('en-IN');
  const portalUrl = ctx.clientPortalUrl || 'https://gstbro.com/login';
  const welcomeCode = ctx.welcomeCode || 'GST-PRO-INVITE';
  const previousAuditor = ctx.previousAuditorName || 'The Previous Statutory Auditor / Tax Consultant';

  // 1. ICAI SA 210 Compliant Engagement Letter
  const sa210EngagementLetter = `# ENGAGEMENT LETTER FOR PROFESSIONAL GST & TAX COMPLIANCE SERVICES
*(In Accordance with Standards on Auditing SA 210 Issued by The Institute of Chartered Accountants of India - ICAI)*

**Date:** ${today}

**To,**  
**The Management / Board of Directors**  
**${clientName}**  
**Attention:** ${clientPerson}  
**Address:** ${ctx.clientAddress || 'Client Registered Address'}  
**GSTIN:** \`${gstin}\` | **PAN:** \`${pan}\`

---

### Dear Sir / Madam,

#### 1. APPOINTMENT & OBJECTIVE OF THE ENGAGEMENT
You have requested that we, **${firmName}**, Chartered Accountants, accept the engagement as your Indirect Tax Advisors & Statutory GST Compliance Counsel for the financial year commencing from ${today}. 

We are pleased to confirm our acceptance and our mutual understanding of this engagement by means of this letter, structured strictly in accordance with Standard on Auditing (SA) 210 *"Agreeing the Terms of Audit & Compliance Engagements"*.

#### 2. SCOPE OF SERVICES
Our professional services shall comprise:
1. **Monthly Outward Supplies Compliance (Form GSTR-1):** Review of sales ledgers, e-invoices, and electronic filing by statutory cutoffs (11th/13th of each succeeding month).
2. **Monthly Summary Tax Liability & ITC Offset (Form GSTR-3B):** Determination of monthly output liability, eligible input tax credit verification, and electronic filing by the 20th of each month.
3. **Automated Continuous GSTR-2B Input Tax Credit Reconciliation:** Continuous matching of inward supplies against Supplier GSTR-1 filings to protect 100% of Input Tax Credit under Section 16(2)(aa) of the CGST Act, 2017.
4. **Advisory on Scrutiny Notices & Departmental Communications:** Review and preparation of statutory responses to electronic intimations (Form DRC-01B, DRC-01C, ASMT-10).
5. **Annual Reconciliations:** Preparatory computation for Form GSTR-9 (Annual Return) and GSTR-9C (Reconciliation Statement).

#### 3. RESPONSIBILITIES OF THE MANAGEMENT
The compliance is conducted on the fundamental premise that Management acknowledges and understands its statutory responsibilities:
- Ensuring the accuracy, completeness, and genuineness of source books, purchase bills, e-way bills, and bank statements uploaded to the GSTBro workspace.
- Uploading complete transaction records for each tax period by or before the **5th of the succeeding month**.
- Timely deposit of net cash tax liabilities to the electronic cash ledger prior to the GSTR-3B statutory filing deadline.

#### 4. PROFESSIONAL FEES & BILLING TERMS
- **Agreed Monthly Retainer Fee:** **₹${fee}/- (Rupees ${fee} Only)** plus statutory GST @ 18%.
- Invoices will be raised monthly and are payable within 7 business days from the date of submission.

#### 5. CONFIDENTIALITY & DATA PROTECTION (DPDP ACT 2023)
In compliance with the ICAI Code of Ethics and the Digital Personal Data Protection (DPDP) Act, 2023, all accounting records, customer lists, and financial statements uploaded to our workspace are held in strict professional confidence with end-to-end encrypted storage.

---

**Confirmed and Accepted on Behalf of ${clientName}:**

_____________________________________  
**Authorized Signatory / Managing Director**  
Date:  

**For ${firmName}**  
*Chartered Accountants*  

_____________________________________  
**${partnerName}**, ${ctx.membershipType || 'Chartered Accountant'}${ctx.partnerDesignation ? ` (${ctx.partnerDesignation})` : ''}  
Membership No.: ${ctx.membershipNumber || '[ICAI M.No.]'}${ctx.copNumber ? ` | COP No.: ${ctx.copNumber}` : ''}  
`;

  // 2. Previous Auditor NOC Draft (Clause 8, Part I, First Schedule, CA Act 1949)
  const previousAuditorNocLetter = `# PROFESSIONAL COURTESY & STATUTORY NOC INTIMATION
*(Pursuant to Clause (8) of Part I of the First Schedule to the Chartered Accountants Act, 1949)*

**Date:** ${today}  
**Mode:** Registered Post with A/D / Speed Post / Email Confirmation  

**To,**  
**${previousAuditor}**  
Chartered Accountants  

### Sub: Intimation of Intention to Accept Professional Tax & GST Services for **${clientName}** (GSTIN: \`${gstin}\`)

Dear Colleague in Practice,

We have been approached by the management of **${clientName}** to take over their indirect tax compliance, monthly GST filings, and allied tax operations.

In compliance with Clause (8) of Part I of the First Schedule to the Chartered Accountants Act, 1949, and the Code of Ethics issued by the Institute of Chartered Accountants of India (ICAI), we hereby communicate with you prior to formally commencing the professional work.

We kindly request you to inform us within **seven (7) days** from the receipt of this letter if there is any professional objection or ethical reason on your part regarding our acceptance of this engagement.

Furthermore, please confirm whether there are any undisputed statutory professional fees outstanding from the said client.

Thanking you,  
Yours faithfully,  

**For ${firmName}**  
*Chartered Accountants*  

_____________________________________  
**${partnerName}**, ${ctx.partnerDesignation || 'Partner'}  
Membership No: ${ctx.membershipNumber || '[ICAI M.No.]'}${ctx.copNumber ? ` | COP No: ${ctx.copNumber}` : ''}  
Contact: ${ctx.firmEmail || '[Practice Email]'} | ${ctx.firmPhone || '[Practice Phone]'}  
`;

  // 3. KYC Checklist & DPDP Consent Document
  const kycChecklistDoc = `# STATUTORY KYC & DPDP 2023 COMPLIANCE ONBOARDING CHECKLIST
**Entity:** ${clientName} | **GSTIN:** \`${gstin}\` | **Date:** ${today}

### Mandatory Identity & Regulatory Dossier:
- [ ] **Certificate of Registration (Form GST REG-06)** with all Annexures (A & B)
- [ ] **PAN Card of Entity** and Principal Promoters / Directors
- [ ] **Aadhaar / Passport / Voter ID** of Managing Partner / Authorized Director
- [ ] **Proof of Principal Place of Business** (Electricity Bill + Registered Rent Agreement / NOC / Ownership Deed)
- [ ] **Cancelled Cheque / Bank Statement** of primary business operating bank account
- [ ] **Constitutional Documents:** Memorandum & Articles of Association (Pvt Ltd) / Partnership Deed (Firm)
- [ ] **Board Resolution / Letter of Authorization** appointing Authorized Signatory on GST Portal
- [ ] **Digital Signature Certificate (DSC) / EVC Verification Details**

### DPDP Act 2023 Consent Undertaking:
The client hereby explicitly consents to the collection, processing, and retention of business transaction documents solely for statutory tax representation, return filing, and legal dispute defense as per ICAI and statutory retention schedules.
`;

  // 4. Client Onboarding & First 90-Day Roadmap
  const roadmap90Days = `# CLIENT SUCCESS & FIRST 90-DAY COMPLIANCE ROADMAP
**Client:** ${clientName} | **Practice:** ${firmName}

### Phase 1: Days 1–15 (Onboarding & Reconciliation Baseline)
- ✅ Welcome code issuance and Client Portal access activated.
- ✅ Past 12 months GSTR-1 vs GSTR-3B vs GSTR-2B discrepancy audit conducted.
- ✅ Google Drive automated folder structure synced for monthly billing data.
- ✅ Vendor communication list prepared for missing ITC invoices.

### Phase 2: Days 16–45 (Execution & Cycle Stabilization)
- 📌 Regularized monthly filing cycle: GSTR-1 by the 11th, GSTR-3B by the 20th.
- 📌 Automated weekly GSTR-2B reconciliation reports dispatched to client's finance desk.
- 📌 Elimination of blocked Input Tax Credit under Section 17(5).

### Phase 3: Days 46–90 (Tax Health Optimization & Strategic Review)
- 🚀 Quarterly partner-level review with management.
- 🚀 Working capital optimization via prompt GST refund filing (if export / inverted duty).
- 🚀 Complete statutory defense archive established on secure cloud.
`;

  // 5. Tax Authority Representation Authorization Letter
  const taxAuthorityAuthorizationLetter = `# LETTER OF AUTHORIZATION FOR TAX & STATUTORY REPRESENTATION
*(To be printed on the Client's Letterhead)*

**Date:** ${today}

**To,**  
**The Proper Officer / Deputy Commissioner of Commercial Taxes**  
GST Department, ${ctx.state || 'India'}  

### Sub: Authorization to represent in all GST & Indirect Tax matters for GSTIN: \`${gstin}\`

We, **${clientName}**, having our principal place of business at ${ctx.clientAddress || 'Registered Office Address'}, hereby authorize:

**${firmName}**, Chartered Accountants  
Represented by **${partnerName}** (ICAI M.No.: ${ctx.membershipNumber || '[M.No.]'})  

to act as our lawful Authorized Representatives under Section 116 of the Central Goods and Services Tax Act, 2017. They are authorized to appear, inspect records, prepare and submit statutory returns, make representations, produce documents, and attend personal hearings on our behalf before the GST Authorities.

All actions taken by our said Authorized Representatives shall be deemed to be ratified and confirmed by us.

**For ${clientName}**  

_____________________________________  
**Authorized Signatory**  
(With Company Seal)  
`;

  // 6. WhatsApp & Email Welcome Drafts
  const whatsappWelcomeDraft = `Namaste ${clientPerson} Ji 🙏,

Welcome to *${firmName}*! We are delighted to formally partner with *${clientName}* for your end-to-end GST compliance and statutory advisory.

🚀 *Your GSTBro Client Portal is Ready:*
🔗 Access Link: ${portalUrl}
🎟️ Welcome / Practice Code: *${welcomeCode}*

📁 *Dedicated Tax Document Drive:*
${ctx.driveFolderUrl ? `Google Drive: ${ctx.driveFolderUrl}` : 'Your secure document cloud folder is being linked.'}

Please share your sales & purchase data by the 5th of each month. For any queries, our CA compliance desk is at your service!

Warm regards,  
*${partnerName}*  
${firmName}`;

  const emailWelcomeDraft = {
    subject: `Welcome to ${firmName} — Onboarding Kit & Client Portal Access for ${clientName}`,
    body: `Dear ${clientPerson},

We are pleased to welcome ${clientName} to ${firmName}. 

We have established your dedicated practice workspace on GSTBro:
- Client Portal Login: ${portalUrl}
- Practice Welcome Code: ${welcomeCode}
${ctx.driveFolderUrl ? `- Dedicated Google Drive Folder: ${ctx.driveFolderUrl}` : ''}

Attached to this welcome package:
1. ICAI SA 210 Engagement Letter
2. KYC & Document Checklist
3. First 90-Days Compliance Roadmap

Please feel free to reach out to our team whenever you need assistance.

Warm regards,
${partnerName}
${firmName}
Phone: ${ctx.firmPhone || ''} | Email: ${ctx.firmEmail || ''}`,
  };

  return {
    sa210EngagementLetter,
    previousAuditorNocLetter,
    kycChecklistDoc,
    roadmap90Days,
    taxAuthorityAuthorizationLetter,
    whatsappWelcomeDraft,
    emailWelcomeDraft,
  };
}
