import { SocialLinks } from './SocialLinks';
import type { PublicSettings } from './types';

interface FooterProps {
  settings?: PublicSettings | null;
}

export function Footer({ settings }: FooterProps) {
  const siteName = settings?.siteName ?? 'GSTBro';
  const year = new Date().getFullYear();
  const contactEmail = settings?.contactEmail || 'hello@gstbro.com';
  const contactPhone = settings?.contactPhone || '+91 800 123 4567';
  const officeAddress = settings?.officeAddress || 'Plot No. 42, Cyber Towers Area, Hitech City, Madhapur, Hyderabad, Telangana 500081';
  const googleMapsUrl = settings?.googleMapsUrl || 'https://maps.google.com/?q=Cyber+Towers+Hitech+City+Hyderabad';
  const mapEmbedUrl = settings?.mapEmbedUrl || 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3806.314644503792!2d78.38084667595462!3d17.444634201150495!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb93dc8c5d69df%3A0x19688ebb557861c!2sCyber%20Towers!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin';

  return (
    <footer className="relative bg-slate-950 text-slate-400 border-t border-slate-800 selection:bg-blue-600 selection:text-white">
      {/* 1. PRE-FOOTER DIRECT CA CONSULTATION BANNER */}
      <div className="border-b border-slate-800/80 bg-gradient-to-b from-slate-900/60 to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-900/40 p-6 sm:p-8 rounded-3xl shadow-2xl transition-all duration-300 hover:border-blue-700/60 hover:shadow-blue-950/30">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-bold text-blue-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Senior Chartered Accountant Advisory Desk
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Have a pending GST notice or uncredited 2B tax credit?
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Connect directly with our senior CA team for a confidential 15-minute compliance health check and risk evaluation.
              </p>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('gstbro:open-strategy-call'));
                  }
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Book Free CA Consultation</span>
                <span className="text-sm font-normal">&rarr;</span>
              </button>
              {contactPhone && (
                <a
                  href={`tel:${contactPhone}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold text-xs sm:text-sm text-slate-200 bg-slate-900 hover:bg-slate-850 border border-slate-700/90 hover:scale-[1.01] active:scale-[0.98] transition-all text-center"
                >
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>{contactPhone}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN EXECUTIVE FOOTER GRID */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-8 mb-10">
          {/* Brand & Corporate Overview (Span 4) */}
          <div className="lg:col-span-4 space-y-4">
            <a href="/" className="inline-flex items-center gap-2.5 group focus:outline-hidden">
              <img
                src="/brand/gstbro-logo.png"
                alt="GSTBro"
                className="w-8 h-8 rounded-full object-contain shrink-0"
              />
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-white select-none leading-none">
                  GST<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Bro</span>
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 mt-0.5">
                  GST Tax Advisory
                </span>
              </div>
            </a>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              India&apos;s premier Chartered Accountant-supervised Indirect Tax and corporate compliance infrastructure. Delivering automated GSTR-1 &amp; 3B filing, 2B reconciliation, and notice defense for 2,500+ businesses.
            </p>

            <div className="space-y-2 pt-1 text-xs">
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a href={`mailto:${contactEmail}`} className="text-slate-300 hover:text-white transition-colors font-medium">
                  {contactEmail}
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-slate-400">Mon – Sat: 9:00 AM – 7:00 PM IST</span>
              </div>
            </div>

            {settings?.socialLinks && settings.socialLinks.length > 0 && (
              <div className="pt-2">
                <SocialLinks links={settings.socialLinks} siteName={siteName} className="text-slate-400" />
              </div>
            )}
          </div>

          {/* Quick Practice Areas (Span 2) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Practice Areas</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="/services/gst-returns" className="text-slate-400 hover:text-white transition-colors">
                  Monthly Returns (GSTR-1 &amp; 3B)
                </a>
              </li>
              <li>
                <a href="/services/gst-compliance" className="text-slate-400 hover:text-white transition-colors">
                  Dynamic 2B ITC Recovery
                </a>
              </li>
              <li>
                <a href="/services/gst-advisory" className="text-slate-400 hover:text-white transition-colors">
                  Department Notice Defense
                </a>
              </li>
              <li>
                <a href="/services/gst-registration" className="text-slate-400 hover:text-white transition-colors">
                  Statutory GST Registration
                </a>
              </li>
              <li>
                <a href="/services/gst-audit" className="text-slate-400 hover:text-white transition-colors">
                  Annual Audit (GSTR-9 &amp; 9C)
                </a>
              </li>
              <li>
                <a href="/services/gst-refund" className="text-slate-400 hover:text-white transition-colors">
                  Expedited GST Refunds
                </a>
              </li>
              <li>
                <a href="/services/gst-cancellation" className="text-slate-400 hover:text-white transition-colors">
                  GST Cancellation &amp; Surrender
                </a>
              </li>
              <li>
                <a href="/services/gst-tds-tcs" className="text-slate-400 hover:text-white transition-colors">
                  GST TDS &amp; TCS Compliance
                </a>
              </li>
              <li>
                <a href="/services/business-licenses" className="text-slate-400 hover:text-white transition-colors">
                  Business Licenses &amp; MSME
                </a>
              </li>
              <li>
                <a href="/services" className="text-blue-400 font-semibold hover:text-blue-300 transition-colors block pt-1">
                  All Practice Areas &rarr;
                </a>
              </li>
            </ul>
          </div>

          {/* Platform & Governance (Span 2) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Platform &amp; Legal</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="/about" className="text-slate-400 hover:text-white transition-colors">
                  About Us (Our Practice)
                </a>
              </li>
              <li>
                <a href="/pricing" className="text-slate-400 hover:text-white transition-colors">
                  Pricing &amp; Retainer Plans
                </a>
              </li>
              <li>
                <a href="/how-it-works" className="text-slate-400 hover:text-white transition-colors">
                  How It Works (5-Stage Flow)
                </a>
              </li>
              <li>
                <a href="/resources" className="text-slate-400 hover:text-white transition-colors">
                  GST Calculators &amp; HSN
                </a>
              </li>
              <li>
                <a href="/login" className="text-slate-400 hover:text-white transition-colors">
                  Login
                </a>
              </li>
              <li>
                <a href="/privacy" className="text-slate-400 hover:text-white transition-colors">
                  Privacy &amp; Data Security
                </a>
              </li>
              <li>
                <a href="/privacy/requests" className="text-slate-400 hover:text-white transition-colors">
                  Privacy Rights &amp; Requests
                </a>
              </li>
              <li>
                <a href="/terms" className="text-slate-400 hover:text-white transition-colors">
                  Terms of Service &amp; SLAs
                </a>
              </li>
              <li>
                <a href="/refund-policy" className="text-slate-400 hover:text-white transition-colors">
                  Refund &amp; Cancellation
                </a>
              </li>
            </ul>
          </div>

          {/* Sleek Location & Google Maps Card (Span 4) */}
          <div className="lg:col-span-4 bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4.5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">Office Location</h4>
              </div>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
              >
                <span>Open in Maps</span>
                <span>&rarr;</span>
              </a>
            </div>

            <div className="flex items-start gap-2 text-[11px] text-slate-300 leading-snug">
              <svg className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{officeAddress}</span>
            </div>

            {/* Embedded Google Maps Widget */}
            <div className="w-full h-36 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 relative shadow-inner">
              <iframe
                title="Office Location Map"
                src={mapEmbedUrl}
                className="w-full h-full border-0 grayscale-[20%] contrast-125 opacity-90 hover:opacity-100 transition-opacity"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>

        {/* 3. TRUST ACCREDITATION STRIP */}
        <div className="py-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-400 text-[11px]">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>ICAI Code of Ethics Adherent</span>
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>DPDP Act 2023 Compliant</span>
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>256-Bit TLS 1.3 Bank-Grade Security</span>
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Zero-Penalty Filing Warranty</span>
            </span>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-emerald-400">GSTN Sync Active</span>
          </div>
        </div>

        {/* 4. COPYRIGHT & REGULATORY DISCLAIMER */}
        <div className="pt-4 border-t border-slate-900 text-[11px] text-slate-500 space-y-1.5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>&copy; {year} {siteName} Technologies Private Limited. All rights reserved.</p>
            <p className="text-slate-500">ICAI Firm Registration &amp; Tax Representative Governance.</p>
          </div>
          <p className="text-[10px] text-slate-600 leading-relaxed">
            Disclaimer: GSTBro operates as an independent enterprise compliance technology and Chartered Accountancy advisory platform. All return filings, tax audits, and notice representations are executed by duly qualified Chartered Accountants in accordance with the Chartered Accountants Act, 1949 and applicable GST statutes.
          </p>
        </div>
      </div>
    </footer>
  );
}
