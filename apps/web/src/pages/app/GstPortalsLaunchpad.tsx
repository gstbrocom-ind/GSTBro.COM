import React from 'react';

interface PortalItem {
  id: string;
  name: string;
  category: 'GST' | 'E-WAY' | 'E-INVOICE' | 'DIRECT TAX' | 'CUSTOMS';
  url: string;
  description: string;
  badge: string;
  icon: string;
  color: string;
  actions: string[];
}

const PORTALS: PortalItem[] = [
  {
    id: 'gst-portal',
    name: 'Official GST Portal',
    category: 'GST',
    url: 'https://services.gst.gov.in',
    description: 'Statutory portal for GST returns (GSTR-1, GSTR-3B, GSTR-9), Challan PMT-06 generation, and registration amendments.',
    badge: 'Primary Compliance',
    icon: '🏛️',
    color: '#2563eb',
    actions: ['File Returns', 'Create Challan', 'Check Ledger', 'Annual Return GSTR-9'],
  },
  {
    id: 'eway-portal',
    name: 'e-Way Bill System',
    category: 'E-WAY',
    url: 'https://ewaybillgst.gov.in',
    description: 'Mandatory electronic way bill portal for consignment movements exceeding ₹50,000 inter-state and specified intra-state limits.',
    badge: 'Consignment Transit',
    icon: '🚛',
    color: '#059669',
    actions: ['Generate e-Way Bill', 'Update Part-B Vehicle', 'Reject e-Way Bill', 'Consolidated EWB'],
  },
  {
    id: 'einvoice-portal',
    name: 'e-Invoice Portal (IRP)',
    category: 'E-INVOICE',
    url: 'https://einvoice1.gst.gov.in',
    description: 'Invoice Registration Portal for B2B e-invoicing, IRN generation, digital signing, and QR-code validation.',
    badge: 'Mandatory for B2B > ₹5Cr',
    icon: '⚡',
    color: '#7c3aed',
    actions: ['Generate IRN', 'Cancel IRN (within 24h)', 'Verify Signed Invoice', 'Bulk Upload Tool'],
  },
  {
    id: 'income-tax-portal',
    name: 'Income Tax e-Filing (ITR / AIS)',
    category: 'DIRECT TAX',
    url: 'https://www.incometax.gov.in',
    description: 'Direct tax portal for AIS / TIS turnover reconciliation with GST returns, Form 26AS, advance tax, and corporate tax returns.',
    badge: 'Tax Reconciliation',
    icon: '📋',
    color: '#d97706',
    actions: ['View AIS / TIS', 'Reconcile Form 26AS', 'Advance Tax Payment', 'Verify ITR'],
  },
  {
    id: 'icegate-portal',
    name: 'ICEGATE (Customs & Import ITC)',
    category: 'CUSTOMS',
    url: 'https://www.icegate.gov.in',
    description: 'Indian Customs Electronic Gateway for Bill of Entry (BOE) import tracking and verifying IGST paid on imports reflected in GSTR-2B.',
    badge: 'Import ITC & Customs',
    icon: '🚢',
    color: '#0284c7',
    actions: ['Track Bill of Entry', 'Verify Import IGST', 'Duty Payment', 'E-Sanchit Upload'],
  },
  {
    id: 'traces-portal',
    name: 'TRACES Portal (TDS / TCS)',
    category: 'DIRECT TAX',
    url: 'https://contents.tdscpc.gov.in',
    description: 'TDS Reconciliation Analysis and Correction Enabling System for Form 16/16A, 26Q, and Section 194Q TDS / 206C(1H) TCS validation.',
    badge: 'TDS / TCS Compliance',
    icon: '📊',
    color: '#475569',
    actions: ['Download Form 16A', 'Justification Reports', 'Challan Status', 'Conso File'],
  },
];

export function GstPortalsLaunchpad({ clientGstin }: { clientGstin?: string | null }) {
  const [copied, setCopied] = React.useState(false);

  const copyGstin = () => {
    if (!clientGstin) return;
    navigator.clipboard.writeText(clientGstin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              Government Statutory Portals Gateway
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">Direct Statutory Launchpad</h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Quickly launch all Indian government tax, logistics, and compliance portals. Your filings, notices, and acknowledgments are monitored and preserved by your assigned GST Bro team.
            </p>
          </div>

          {clientGstin && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 flex items-center gap-3">
              <div>
                <span className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider block">Your Active GSTIN</span>
                <span className="font-mono text-sm font-bold text-white tracking-wider">{clientGstin}</span>
              </div>
              <button
                onClick={copyGstin}
                className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold transition"
                title="Copy GSTIN for portal login"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid of Portals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {PORTALS.map((portal) => (
          <div
            key={portal.id}
            className="bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl p-2 rounded-lg bg-slate-100">{portal.icon}</span>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{portal.name}</h3>
                    <span className="text-[11px] font-semibold text-slate-500">{portal.category}</span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {portal.badge}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-4">{portal.description}</p>

              <div className="mb-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Key Actions
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {portal.actions.map((act) => (
                    <span
                      key={act}
                      className="text-[11px] bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md"
                    >
                      {act}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                {new URL(portal.url).hostname}
              </span>
              <a
                href={portal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-blue-600 transition shadow-sm"
              >
                Open Portal
                <span className="text-xs">↗</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Team Note */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 flex items-start gap-3">
        <span className="text-blue-600 text-lg">💡</span>
        <div className="text-xs text-blue-900">
          <strong>Team Managed Compliance Notice:</strong> You do not need to worry about missing deadlines or filing errors. Your assigned GST Bro team handles all return computations, challan preparations, and reconciliations. When you file or make payments via the government portals, your dashboard automatically updates via our sync system.
        </div>
      </div>
    </div>
  );
}
