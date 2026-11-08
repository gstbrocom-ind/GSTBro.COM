import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '../../components/PublicLayout';
import { privacyMeta, termsMeta } from '../../seo/pages/services.meta';
import { useContent } from '../../context/ContentContext';
import { apiFetch } from '../../lib/api';

export { ContactPage } from './ContactPage';
export { PricingPage } from './PricingPage';
export { ResourcesPage } from './ResourcesPage';
export { HowItWorksPage } from './HowItWorksPage';
export { AboutPage } from './AboutPage';
export { RefundPolicyPage } from './RefundPolicyPage';

const defaultTerms = `By using GSTBro services, you agree to provide accurate information and cooperate in the GST compliance process. Service fees are as quoted at the time of engagement.

GSTBro provides professional assistance with GST processes, return calculations, and representation before authorities. When documents are provided by the agreed monthly cutoff, our contractual 100% Zero-Penalty SLA applies.

GSTBro provides expert assistance with GST filings, but final administrative orders are issued by the Goods & Services Tax Department.`;

// ---------------------------------------------------------------------------
// DPDP-Compliant Privacy Notice
// ---------------------------------------------------------------------------

const dataCollectedRows = [
  { category: 'Account identity', examples: 'Full name, business name', purpose: 'Create and manage your account, identify you in service communications', basis: 'Contract', required: 'Yes' },
  { category: 'Contact details', examples: 'Email address, mobile number', purpose: 'Login, OTP verification, service notifications', basis: 'Contract', required: 'Yes' },
  { category: 'Business information', examples: 'GSTIN, PAN, state, business address', purpose: 'GST service delivery, invoice compliance', basis: 'Contract', required: 'Yes' },
  { category: 'Financial/banking', examples: 'Bank account, IFSC, UPI ID', purpose: 'Printed on your invoices (only if you add them)', basis: 'Contract', required: 'Optional' },
  { category: 'GST return data', examples: 'GSTR-1, GSTR-3B, ITC, sales, purchases', purpose: 'Return filing, ITC reconciliation', basis: 'Contract', required: 'Yes (for GST services)' },
  { category: 'Documents', examples: 'Files you upload (PDFs, spreadsheets)', purpose: 'Supporting your GST cases and compliance work', basis: 'Contract', required: 'Yes (for cases)' },
  { category: 'Invoice records', examples: 'Buyer name, GSTIN, address, phone, amounts', purpose: 'Generating compliant tax invoices', basis: 'Contract + Law', required: 'Yes (for invoicing)' },
  { category: 'Enquiry data', examples: 'Name, email, phone, company, message', purpose: 'Responding to your enquiry', basis: 'Consent', required: 'Required for enquiry' },
  { category: 'Technical data', examples: 'IP address, browser/device info', purpose: 'Security, fraud prevention, audit logging', basis: 'Legitimate interests (security)', required: 'Automatic' },
  { category: 'Branding assets', examples: 'Logo image, signature image', purpose: 'Printed on your invoices', basis: 'Contract', required: 'Optional' },
];

const sharingRows = [
  { recipient: 'Supabase', data: 'All account and service data', purpose: 'Database hosting', country: 'United States' },
  { recipient: 'Google (Drive)', data: 'Uploaded documents, folder metadata', purpose: 'Document storage and management', country: 'United States' },
  { recipient: 'Cloudinary', data: 'Logo and signature images', purpose: 'Image storage and delivery', country: 'United States' },
  { recipient: 'Resend', data: 'Email address, email content', purpose: 'Transactional emails (OTPs, notifications)', country: 'United States' },
  { recipient: '2Factor.in / apitxt.com', data: 'Mobile number', purpose: 'SMS OTP delivery', country: 'India' },
  { recipient: 'Cloudflare', data: 'IP address, browser fingerprint', purpose: 'Bot protection (Turnstile)', country: 'Global' },
  { recipient: 'Render', data: 'Server logs, environment', purpose: 'Application hosting', country: 'United States' },
];

function SectionHeading({ num, title }: { num: number; title: string }) {
  return (
    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-3">
      <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0">
        {num}
      </span>
      {title}
    </h2>
  );
}

export function PrivacyPage() {
  const [noticeVersion, setNoticeVersion] = useState<{ version: string; effectiveDate: string } | null>(null);

  useEffect(() => {
    apiFetch<{ version: string; effectiveDate: string }>('/api/privacy/notice-version')
      .then(setNoticeVersion)
      .catch(() => setNoticeVersion({ version: '1.0.0', effectiveDate: '1 January 2027' }));
  }, []);

  return (
    <PublicLayout meta={privacyMeta}>
      {/* Hero */}
      <section className="bg-slate-950 text-white pt-12 pb-14 sm:pt-16 sm:pb-16 border-b border-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-[11px] font-bold text-blue-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            DPDP Act, 2023 Compliant
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">Privacy Notice</h1>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            How GSTBro collects, uses, shares, and protects your personal data under the Digital Personal Data Protection Act, 2023.
          </p>
          {noticeVersion && (
            <p className="text-xs text-slate-500 pt-1">
              Version {noticeVersion.version} &bull; Effective: {noticeVersion.effectiveDate}
            </p>
          )}
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">

        {/* Quick links bar */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-xs text-blue-800 flex flex-wrap gap-3 items-center">
          <span className="font-semibold">Quick links:</span>
          <a href="#data-collected" className="underline hover:text-blue-600">Data We Collect</a>
          <a href="#sharing" className="underline hover:text-blue-600">How We Share</a>
          <a href="#your-rights" className="underline hover:text-blue-600">Your Rights</a>
          <a href="#grievance" className="underline hover:text-blue-600">Grievance Contact</a>
          <Link to="/privacy/requests" className="ml-auto font-bold text-blue-700 hover:text-blue-900 underline">
            Submit a Privacy Request →
          </Link>
        </div>

        {/* Section 1 — Who We Are */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <SectionHeading num={1} title="Who We Are (Data Fiduciary)" />
          <p className="text-sm text-slate-700 leading-relaxed">
            GSTBro is a GST compliance and services platform operated in India. For questions about this notice or our privacy practices, contact us at{' '}
            <a href="mailto:privacy@gstbro.com" className="text-blue-600 underline hover:text-blue-800">privacy@gstbro.com</a>.
          </p>
        </section>

        {/* Section 2 — Data We Collect */}
        <section id="data-collected" className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <SectionHeading num={2} title="Personal Data We Collect" />
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="p-3 font-semibold text-slate-700">Category</th>
                  <th className="p-3 font-semibold text-slate-700">Examples</th>
                  <th className="p-3 font-semibold text-slate-700">Purpose</th>
                  <th className="p-3 font-semibold text-slate-700">Required?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dataCollectedRows.map((r) => (
                  <tr key={r.category}>
                    <td className="p-3 font-medium text-slate-900">{r.category}</td>
                    <td className="p-3 text-slate-600">{r.examples}</td>
                    <td className="p-3 text-slate-600">{r.purpose}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.required.startsWith('Yes') ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {r.required}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3 — How We Share */}
        <section id="sharing" className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <SectionHeading num={3} title="How We Share Data (Data Processors)" />
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="p-3 font-semibold text-slate-700">Recipient</th>
                  <th className="p-3 font-semibold text-slate-700">Data Shared</th>
                  <th className="p-3 font-semibold text-slate-700">Purpose</th>
                  <th className="p-3 font-semibold text-slate-700">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sharingRows.map((r) => (
                  <tr key={r.recipient}>
                    <td className="p-3 font-medium text-slate-900">{r.recipient}</td>
                    <td className="p-3 text-slate-600">{r.data}</td>
                    <td className="p-3 text-slate-600">{r.purpose}</td>
                    <td className="p-3 text-slate-600">{r.country}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 4 — Cross-Border Transfers */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <SectionHeading num={4} title="Cross-Border Data Transfers" />
          <p className="text-sm text-slate-700 leading-relaxed">
            Some of our service providers store and process data in the United States and other countries. We ensure that all cross-border transfers comply with the DPDP Act and that appropriate safeguards are in place.
          </p>
        </section>

        {/* Section 5 — Security */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <SectionHeading num={5} title="Security Safeguards" />
          <p className="text-sm text-slate-700 leading-relaxed">
            We implement strict technical and organizational measures to protect your personal data, including 256-bit TLS encryption in transit, AES encryption at rest, Row Level Security in databases, and multi-factor authentication for team access.
          </p>
        </section>

        {/* Section 6 — Retention */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <SectionHeading num={6} title="Retention" />
          <ul className="list-disc list-inside text-sm text-slate-700 space-y-1.5 leading-relaxed">
            <li>Account profile information is anonymized within 30 days of an erasure request.</li>
            <li>GST return records, tax invoices, and case dossiers are retained in accordance with statutory GST law (minimum 72 months from the annual return due date).</li>
            <li>Audit logs and access records are securely archived for security compliance.</li>
            <li>OTP records expire and are deleted automatically within 7 days.</li>
          </ul>
        </section>

        {/* Section 7 — Your Rights */}
        <section id="your-rights" className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <SectionHeading num={7} title="Your Rights" />
          <p className="text-sm text-slate-700 leading-relaxed mb-4">Under the DPDP Act, you have the right to:</p>
          <div className="grid sm:grid-cols-2 gap-3 mb-5">
            {[
              { icon: '📋', right: 'Access', desc: 'Request a summary of personal data we hold about you' },
              { icon: '✏️', right: 'Correction', desc: 'Request correction of inaccurate or incomplete data' },
              { icon: '🗑️', right: 'Erasure', desc: 'Request deletion of your personal data (subject to legal retention requirements)' },
              { icon: '↩️', right: 'Withdraw consent', desc: 'Withdraw consent for optional processing at any time' },
              { icon: '⚖️', right: 'Grievance', desc: 'Raise a complaint about how we handle your data' },
              { icon: '👤', right: 'Nomination', desc: 'Nominate another person to exercise your rights on your behalf' },
            ].map(({ icon, right, desc }) => (
              <div key={right} className="flex gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50">
                <span className="text-lg shrink-0">{icon}</span>
                <div>
                  <strong className="text-xs text-slate-900 block">{right}</strong>
                  <span className="text-xs text-slate-600 leading-relaxed">{desc}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
            <Link
              to="/privacy/requests"
              className="inline-flex items-center gap-1.5 font-bold text-blue-700 hover:text-blue-900 underline"
            >
              Submit a Privacy Request →
            </Link>
          </div>
        </section>

        {/* Section 8 — Grievance */}
        <section id="grievance" className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <SectionHeading num={8} title="Grievance & Escalation" />
          <div className="text-sm text-slate-700 leading-relaxed space-y-3">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="font-bold text-slate-900 mb-1">Privacy Officer / Grievance Contact:</p>
              <p>Email: <a href="mailto:privacy@gstbro.com" className="text-blue-600 underline hover:text-blue-800">privacy@gstbro.com</a></p>
              <p className="text-xs text-slate-500 mt-1">We acknowledge all privacy grievances within 48 hours.</p>
            </div>
          </div>
        </section>

        {/* Section 9 — Cookies */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <SectionHeading num={9} title="Cookies & Analytics" />
          <p className="text-sm text-slate-700 leading-relaxed">
            GSTBro uses essential session cookies and Cloudflare Turnstile for bot prevention. Analytics measurement operates in privacy-friendly anonymized mode and respects user consent choices.
          </p>
        </section>

        {/* Version footer */}
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 text-center text-xs text-slate-600">
          {noticeVersion
            ? <>Version {noticeVersion.version} &bull; Effective: {noticeVersion.effectiveDate}</>
            : 'Version 1.0.0 • Effective: 1 January 2027'
          }
          <span className="mx-2 text-slate-300">|</span>
          <Link to="/privacy/requests" className="text-blue-600 underline hover:text-blue-800 font-semibold">
            Submit a Privacy Request
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}

export function TermsPage() {
  const content = useContent('content_terms_body', defaultTerms);
  return (
    <PublicLayout meta={termsMeta}>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl sm:text-4xl font-black mb-6 text-slate-900 tracking-tight">Terms of Service</h1>
        <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-xs whitespace-pre-line text-sm sm:text-base leading-relaxed text-slate-700">
          {content}
        </div>
      </div>
    </PublicLayout>
  );
}
