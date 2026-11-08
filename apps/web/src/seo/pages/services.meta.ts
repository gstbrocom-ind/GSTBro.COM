import type { SeoMeta } from '@gst/ui';
import { SITE_URL, TITLE_TEMPLATE, DEFAULT_OG_IMAGE } from '../meta.config';

const base = (title: string, description: string, path: string, keywords?: string): SeoMeta => ({
  title: TITLE_TEMPLATE(title),
  description,
  keywords,
  canonical: `${SITE_URL}${path}`,
  robots: 'index, follow',
  ogTitle: TITLE_TEMPLATE(title),
  ogDescription: description,
  ogImage: DEFAULT_OG_IMAGE,
  ogUrl: `${SITE_URL}${path}`,
});

export const servicesMeta = base(
  'GST Services & Compliance Solutions India',
  'Comprehensive GST solutions by practicing Chartered Accountants. Turnkey GST registration, GSTR-1 & 3B return filing, 2B ITC recovery, and notice defense across India.',
  '/services',
  'gst services, gst consultant, gst compliance services, gst filing services india, gst practitioner'
);

export const registrationMeta = base(
  'GST Registration Online India — Fast New GSTIN Registration',
  'Apply for GST registration online in India. Expert CA-assisted application, complete document verification, zero-rejection guarantee, and official GSTIN issuance in 3–5 working days.',
  '/services/gst-registration',
  'gst registration online, new gst registration, gst registration consultant, apply for gst, gstin online apply, gst registration india'
);

export const returnsMeta = base(
  'GST Return Filing Services — GSTR-1, GSTR-3B & Annual Filing',
  'Timely and accurate monthly & quarterly GST return filing services. Automated GSTR-2B reconciliation, Rule 88A tax offset optimization, zero late fees, and CA certification.',
  '/services/gst-returns',
  'gst return filing, gstr-1 filing, gstr-3b filing, gst filing services, gstr 9 annual return, quarterly gst filing, gst returns online'
);

export const cancellationMeta = base(
  'GST Cancellation & Registration Surrender Services',
  'Hassle-free GST cancellation and surrender services with complete compliance verification. GSTBro handles final returns (GSTR-10), tax liability settlement, and revocation of cancellation.',
  '/services/gst-cancellation',
  'gst cancellation, cancel gst registration, gst surrender, gstr-10 final return, revocation of gst cancellation'
);

export const complianceMeta = base(
  'GST Compliance Services — Dynamic 2B ITC Reconciliation',
  'Complete GST compliance management for Indian enterprises. Continuous purchase ledger audits, automated defaulting vendor tracking, and 100% eligible ITC recovery.',
  '/services/gst-compliance',
  'gst compliance services, gst compliance consultant, 2b itc reconciliation, gst health check, avoid gst penalties'
);

export const refundMeta = base(
  'GST Refund Services — Export & Inverted Duty Refund Claims',
  'Fast and compliant GST refund assistance for exporters, inverted tax structures, and excess cash ledgers. Full CA audit, documentation preparation, and swift bank disbursement.',
  '/services/gst-refund',
  'gst refund services, gst refund consultant, gst refund claim, lut export refund, inverted duty refund gst'
);

export const auditMeta = base(
  'GST Audit, Assessment & Notice Defense (ASMT-10 & DRC-01)',
  'Professional GST audit and departmental notice representation by senior Chartered Accountants. Expert drafting for Form ASMT-10, DRC-01 demand notices, and certified GSTR-9C sign-off.',
  '/services/gst-audit',
  'gst audit services, gst assessment, gst notice reply, asmt-10 reply, drc-01 defense, gstr-9c audit certification'
);

export const advisoryMeta = base(
  'GST Advisory Services & Tax Planning by Senior CAs',
  'Strategic GST advisory and indirect tax planning to optimize tax liability, mitigate litigation risk, resolve classification disputes, and support cross-border transaction compliance.',
  '/services/gst-advisory',
  'gst advisory services, gst consultant, gst tax planning, indirect tax advisory india, gst legal consultation'
);

export const tdsTcsMeta = base(
  'GST TDS & TCS Compliance Services (GSTR-7 & GSTR-8)',
  'Professional GST TDS (Section 51) and TCS (Section 52) filing services for government entities, PSUs, and e-commerce operators across India. Error-free GSTR-7 and GSTR-8 filing with CA certification.',
  '/services/gst-tds-tcs',
  'gst tds compliance, gst tcs compliance, gstr-7 filing, gstr-8 filing, section 51 gst, section 52 gst, e-commerce tcs india'
);

export const businessLicensesMeta = base(
  'Business Licenses & Registrations India',
  'End-to-end statutory business licensing services in India. Fast support for Shop Act, Trade License, FSSAI, Udyam MSME, IEC, Professional Tax, DSC & Startup India.',
  '/services/business-licenses',
  'business licenses india, commercial permits, company registrations, fssai, udyam, trade license, shop establishment, startup india, iec dgft'
);

export const shopEstablishmentMeta = base(
  'Shop and Establishment Act Registration Online',
  'Apply for Shop and Establishment Registration online across all Indian states. 100% compliant documentation, fast government approval, and zero penalty guarantee.',
  '/services/business-licenses/shop-establishment',
  'shop and establishment registration, shop act license, gumasta license, commercial establishment registration, retail store permit'
);

export const tradeLicenseMeta = base(
  'Trade License Registration & Municipal Approval',
  'Get your municipal Trade License online with GSTBro. Comprehensive document verification, municipal liaison, and fast issuance for commercial retail & manufacturing.',
  '/services/business-licenses/trade-license',
  'trade license online, municipal trade license, commercial trading permit, municipal corporation license, business trade certificate'
);

export const fssaiMeta = base(
  'FSSAI Food License & Registration Online',
  'Complete FSSAI food business registration and state/central licensing for restaurants, cloud kitchens, manufacturers & retailers. Fast 7-day turnaround.',
  '/services/business-licenses/fssai',
  'fssai registration, food license online, fssai certificate, cloud kitchen license, food business operator fbo, fssai state license'
);

export const udyamMeta = base(
  'MSME Udyam Registration Online (Govt Benefits & Subsidies)',
  'Fast MSME / Udyam registration for small businesses, startups and manufacturers. Unlock government subsidies, priority bank lending, and tender exemptions.',
  '/services/business-licenses/udyam',
  'udyam registration, msme registration online, udyam certificate, micro small medium enterprises, msme loan benefits'
);

export const iecMeta = base(
  'Import Export Code (IEC) Registration with DGFT',
  'Mandatory 10-digit Import Export Code (IEC) registration from DGFT for global trade and e-commerce exporters. Issued in 1-3 working days.',
  '/services/business-licenses/iec',
  'iec registration, import export code online, dgft iec code, export license india, customs clearance iec, international trade permit'
);

export const professionalTaxMeta = base(
  'Professional Tax Registration & PT Return Filing',
  'State-wise Professional Tax (PT) employer registration and enrollment certificate (PTEC & PTRC). Avoid penalty notices with managed compliance.',
  '/services/business-licenses/professional-tax',
  'professional tax registration, pt registration online, ptrc ptec, state professional tax, pt return filing india'
);

export const dscMeta = base(
  'Digital Signature Certificate (Class 3 DSC) Online',
  'Class 3 Digital Signature Certificate (DSC) issuance for company directors, authorized signatories, MCA filings, and GST portal access.',
  '/services/business-licenses/dsc',
  'class 3 dsc, digital signature certificate online, dsc for gst, director digital signature'
);

export const startupIndiaMeta = base(
  'Startup India DPIIT Recognition & Tax Exemption',
  'Apply for Startup India DPIIT recognition to unlock 3-year Section 80-IAC tax holiday, Angel Tax exemption, and public procurement preferences.',
  '/services/business-licenses/startup-india',
  'startup india recognition, dpiit certificate, section 80-iac tax holiday, angel tax exemption'
);

export const pricingMeta = base(
  'Pricing & Retainer Plans — Transparent GST Retainers',
  'Clear and predictable GST retainer pricing for Indian businesses. Choose between Foundational, Growth Shield, and Corporate plans with 100% Zero-Penalty SLA.',
  '/pricing',
  'gst filing pricing, gst retainer plans, gst consultant fees, chartered accountant charges'
);

export const howItWorksMeta = base(
  'How It Works — 5-Stage Zero Friction GST Filing Flow',
  'Discover GSTBro’s streamlined compliance workflow: Data Ingestion, Reconciliation, Tax Optimization, Senior CA Review, and Official Filing.',
  '/how-it-works',
  'how gstbro works, gst filing process, automated gst reconciliation flow'
);

export const resourcesMeta = base(
  'GST Resources, Free Calculators & Statutory Guides',
  'Free GST calculator, late fee calculator, HSN code finder, rate rationalization blueprints, and step-by-step compliance checklists for Indian taxpayers.',
  '/resources',
  'gst calculator, gst late fee calculator, hsn code search, gst guides, gst rate slabs'
);

export const contactMeta = base(
  'Contact Senior Chartered Accountant Advisory Desk',
  'Connect directly with practicing Chartered Accountants for confidential GST consultation, notice assessment, or urgent filing assistance.',
  '/contact',
  'contact gstbro, gst helpline, consult ca online, gst phone number, gst emergency notice help'
);

export const aboutMeta = base(
  'About Us — India’s Institutional GST Compliance Platform',
  'Learn about GSTBro — our mission, ICAI Chartered Accountant supervision, technology-driven reconciliation, and commitment to zero-penalty compliance for Indian businesses.',
  '/about',
  'about gstbro, gst consultants india, chartered accountant gst team, indirect tax advisory, gst compliance company'
);

export const refundPolicyMeta = base(
  'Refund & Cancellation Policy — 100% Zero-Penalty SLA',
  'GSTBro Refund and Cancellation Policy: Learn about our contractual 100% Zero-Penalty SLA, service cancellation timelines, and refund eligibility for tax advisory engagements.',
  '/refund-policy',
  'gstbro refund policy, cancellation policy, service fee refund, zero penalty sla'
);

export const loginMeta = base(
  'Client Portal Login',
  'Login to your secure GSTBro client portal to view return filings, track ITC reconciliations, and collaborate with your assigned Chartered Accountant.',
  '/login',
  'gstbro login, gst client portal, gstbro sign in'
);

export const signupMeta = base(
  'Sign Up — Onboard with GSTBro',
  'Create your GSTBro account to access automated GST return filing, 2B ITC reconciliation, and turnkey statutory licensing with senior CA oversight.',
  '/signup',
  'gstbro signup, gstbro register, create gstbro account'
);

export const privacyMeta = base(
  'Privacy Notice — DPDP Act, 2023 Compliant',
  'GSTBro privacy notice: How we collect, use, and protect your personal and business data under the Digital Personal Data Protection Act, 2023.',
  '/privacy'
);

export const termsMeta = base(
  'Terms of Service & SLAs',
  'GSTBro terms of service — the legal agreement governing use of our GST compliance infrastructure, client responsibilities, and SLA guarantees.',
  '/terms'
);
