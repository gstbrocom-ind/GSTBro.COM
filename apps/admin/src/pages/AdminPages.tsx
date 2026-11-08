import { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, getToken } from '../lib/api';
import { adminPath } from '../lib/routes';

type LeadSummary = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  service_type: string;
  created_at: string;
};

type DueDate = {
  id: string;
  title: string;
  description?: string | null;
  due_date: string;
  category: string;
};

type ClientSummary = {
  id: string;
  name: string;
  email: string;
  business_name?: string | null;
  gstin?: string | null;
  state?: string | null;
  driveFolderUrl?: string;
};

type ClientDocument = {
  id: string;
  category: string;
  file_name: string;
  drive_web_view_link?: string | null;
  uploaded_at: string;
};

type GstData = {
  id?: string;
  period: string;
  itc: Record<string, unknown>;
  sales: Record<string, unknown>;
  purchases: Record<string, unknown>;
  gstr1: Record<string, unknown>;
  gstr3b: Record<string, unknown>;
};

export const STATUTORY_REQUIREMENTS_LIST = [
  { key: 'GSTR-1', label: 'GSTR-1 (Monthly Outward Supplies)', tag: 'GST' },
  { key: 'GSTR-3B', label: 'GSTR-3B (Monthly Summary & Tax Payment)', tag: 'GST' },
  { key: 'TDS_DEPOSIT', label: 'TDS / TCS Deposit (Challan 281)', tag: 'TDS' },
  { key: 'TDS_RETURNS', label: 'TDS Quarterly Statements (24Q / 26Q / 27EQ)', tag: 'TDS' },
  { key: 'GST_TDS_TCS', label: 'GST TDS & TCS (GSTR-7 & GSTR-8)', tag: 'GST TDS' },
  { key: 'QRMP_SCHEME', label: 'QRMP Scheme (IFF & PMT-06)', tag: 'QRMP' },
  { key: 'COMPOSITION', label: 'Composition Scheme (CMP-08)', tag: 'COMPOSITION' },
  { key: 'ADVANCE_TAX', label: 'Advance Income Tax Instalments', tag: 'INCOME TAX' },
  { key: 'ANNUAL_RETURNS', label: 'Annual Returns & Reconciliation (GSTR-9 / 9C)', tag: 'ANNUAL' },
];

// Reusable Statutory Deadline Ribbon
export function DueDateRibbon({ dueDates }: { dueDates: DueDate[] }) {
  if (!dueDates.length) return null;

  return (
    <div className="mb-6 bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
          Statutory Deadlines — Next Filing Windows
        </h3>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
        {dueDates.map((dueDate) => {
          const due = new Date(dueDate.due_date);
          const diffDays = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          const isUrgent = diffDays >= 0 && diffDays <= 5;

          return (
            <div
              key={dueDate.id}
              className={`flex-shrink-0 w-60 bg-white rounded-lg p-3 border transition-all ${
                isUrgent ? 'border-amber-400 shadow-sm' : 'border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                  {dueDate.category}
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    diffDays < 0
                      ? 'bg-rose-100 text-rose-700'
                      : isUrgent
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {diffDays < 0 ? 'Passed' : diffDays === 0 ? 'Due Today' : `${diffDays}d left`}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-800 truncate" title={dueDate.title}>
                {dueDate.title}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Due: {due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 1. DASHBOARD PAGE
// -------------------------------------------------------------
export function DashboardPage() {
  const [stats, setStats] = useState({ leads: 0, clients: 0, team: 0 });
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [recentLeads, setRecentLeads] = useState<LeadSummary[]>([]);
  const [dueDates, setDueDates] = useState<DueDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'clients' | 'leads'>('clients');

  useEffect(() => {
    Promise.all([
      api<{ leads: LeadSummary[] }>('/api/admin/leads')
        .then((data) => {
          setRecentLeads(data.leads.slice(0, 5));
          setStats((curr) => ({ ...curr, leads: data.leads.filter((l) => l.status === 'NEW').length }));
        })
        .catch(() => {}),
      api<{ clients: ClientSummary[] }>('/api/admin/clients')
        .then((data) => {
          setClients(data.clients);
          setStats((curr) => ({ ...curr, clients: data.clients.length }));
        })
        .catch(() => {}),
      api<{ team: { role: string }[] }>('/api/admin/team')
        .then((data) => setStats((curr) => ({ ...curr, team: data.team.filter((m) => m.role === 'TEAM').length })))
        .catch(() => {}),
      api<{ dueDates: DueDate[] }>('/api/due-dates')
        .then((data) => setDueDates(data.dueDates))
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Operations Dashboard</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Active Console
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            GST Filing & Practice Management Overview • {todayFormatted}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={adminPath('/clients')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5v14" />
            </svg>
            Add Client
          </Link>
          <Link
            to={adminPath('/fees')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            Create Invoice
          </Link>
        </div>
      </div>

      {/* Team Compliance Suite Action Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-2xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md border border-indigo-900/50">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase tracking-wider border border-blue-400/20 mb-2">
            <span>⚡</span> Modern Compliance Workbench
          </div>
          <h2 className="text-base font-bold text-white">Dedicated Team Filing Desk & Client Communicator</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Upload GSTR-1 & 3B PDFs/JSONs, calculate multi-period Opening ITC carry-forwards, record RCM cash challans, and coordinate with clients in real time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/team"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-md flex items-center gap-1.5"
          >
            <span>🚀</span> Open Team Workbench (/team)
          </a>
          <Link
            to={adminPath('/messages')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            <span>💬</span> Client Communications
          </Link>
        </div>
      </div>

      {/* Website Customizer & SEO Control Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-sky-950 to-slate-900 rounded-2xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md border border-sky-800/40">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-bold uppercase tracking-wider border border-sky-400/20 mb-2">
            <span>🌐</span> Website CMS & SEO Control
          </div>
          <h2 className="text-base font-bold text-white">Public Website Customizer & Page SEO Meta Manager</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Edit announcement alerts, hero headlines, proof counters, brand contact points, and fine-tune SEO meta tags for all 27 indexed webpages with instant Save & Apply.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={adminPath('/settings/content')}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition shadow-md flex items-center gap-1.5"
          >
            <span>📝</span> Full Website CMS
          </Link>
          <Link
            to={adminPath('/settings/site')}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            <span>✏️</span> Brand & Hero
          </Link>
          <Link
            to={adminPath('/settings/seo')}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            <span>🔍</span> SEO (27 Pages)
          </Link>
          <a
            href={typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:5173/' : '/'}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition flex items-center gap-1"
          >
            View Live ↗
          </a>
        </div>
      </div>

      {/* Statutory Due Date Ribbon (if active) */}
      <DueDateRibbon dueDates={dueDates} />

      {/* 4 Professional KPI Metric Cards with Accent Tops */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 border-t-2 border-t-indigo-600 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Taxpayers</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
                <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
                <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{stats.clients}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                100% Active
              </span>
              <span className="text-[11px] text-slate-400">GSTIN entities</span>
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 border-t-2 border-t-blue-600 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Inward Inquiries</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{stats.leads}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200/60">
                {stats.leads} Unassigned
              </span>
              <span className="text-[11px] text-slate-400">Prospective leads</span>
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 border-t-2 border-t-emerald-600 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Staff Specialists</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{stats.team}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                Staff Ready
              </span>
              <span className="text-[11px] text-slate-400">Assigned clerks</span>
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 border-t-2 border-t-amber-500 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Compliance Deadlines</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <rect width="18" height="18" x="3" y="4" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{dueDates.length}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200/60">
                Filing Cycle
              </span>
              <span className="text-[11px] text-slate-400">Active cutoffs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout (65% / 35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Data Table Viewport (65%) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Tabs Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab('clients')}
                className={`text-xs font-bold pb-1 transition-all ${
                  activeTab === 'clients'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                Taxpayer Accounts ({clients.length})
              </button>
              <button
                onClick={() => setActiveTab('leads')}
                className={`text-xs font-bold pb-1 transition-all flex items-center gap-1.5 ${
                  activeTab === 'leads'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <span>Inward Leads ({recentLeads.length})</span>
                {stats.leads > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-600 text-white">
                    {stats.leads}
                  </span>
                )}
              </button>
            </div>

            <Link
              to={activeTab === 'clients' ? adminPath('/clients') : adminPath('/leads')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              View All →
            </Link>
          </div>

          {/* Client Portfolio Tab Content */}
          {activeTab === 'clients' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Taxpayer / Legal Entity</th>
                    <th className="py-3 px-4">GSTIN Identifier</th>
                    <th className="py-3 px-4">State</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clients.slice(0, 6).map((client) => (
                    <tr key={client.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">
                              {client.business_name || client.name}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">{client.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                          {client.gstin ?? 'Pending GSTIN'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {client.state ?? 'Telangana'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={adminPath(`/clients/${client.id}`)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition inline-flex items-center gap-1"
                        >
                          Workspace →
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {clients.length === 0 && !loading && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400">
                        No clients registered yet. Click "+ Add Client" to onboard.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Inward Leads Tab Content */}
          {activeTab === 'leads' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Service</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-semibold text-slate-900">{lead.name}</p>
                          <p className="text-[11px] text-slate-400">{lead.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {lead.service_type ?? 'GST Advisory'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                          {lead.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={adminPath('/leads')}
                          className="text-xs font-semibold text-blue-600 hover:underline"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {recentLeads.length === 0 && !loading && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400">
                        No inward inquiries pending review.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Statutory Filing Timetable & Quick Actions (35%) */}
        <div className="space-y-5">
          {/* Statutory Filing Timetable */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Statutory Timetable
              </h2>
              <span className="text-[10px] text-blue-600 font-semibold">Monthly Calendar</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">GSTR-1 Monthly</p>
                  <p className="text-[10px] text-slate-400">Outward B2B/B2C supplies</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                  11th of Month
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">GSTR-7 & 8 TDS/TCS</p>
                  <p className="text-[10px] text-slate-400">Section 51 & 52 deductions</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                  10th of Month
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">GSTR-3B Challan</p>
                  <p className="text-[10px] text-slate-400">Monthly summary tax payment</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800">
                  20th of Month
                </span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                to={adminPath('/due-dates')}
                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                Manage Deadlines Calendar →
              </Link>
            </div>
          </div>

          {/* Fast Operational Shortcuts */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 pb-2 border-b border-slate-100">
              Operations Shortcuts
            </h2>

            <div className="divide-y divide-slate-100">
              <Link
                to={adminPath('/clients')}
                className="py-2 flex items-center justify-between text-xs text-slate-700 hover:text-blue-600 transition group"
              >
                <span className="font-medium">Onboard New Taxpayer Account</span>
                <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>

              <Link
                to={adminPath('/fees')}
                className="py-2 flex items-center justify-between text-xs text-slate-700 hover:text-blue-600 transition group"
              >
                <span className="font-medium">Issue Client Fee Invoice</span>
                <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>

              <Link
                to={adminPath('/drive')}
                className="py-2 flex items-center justify-between text-xs text-slate-700 hover:text-blue-600 transition group"
              >
                <span className="font-medium">Google Drive Cloud File Vault</span>
                <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>

              <Link
                to={adminPath('/team')}
                className="py-2 flex items-center justify-between text-xs text-slate-700 hover:text-blue-600 transition group"
              >
                <span className="font-medium">Staff & Permissions Directory</span>
                <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 2. TEAM DASHBOARD PAGE
// -------------------------------------------------------------
export function TeamDashboardPage() {
  useEffect(() => {
    window.location.href = '/team';
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-500 gap-2">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs font-medium">Redirecting to Practice Workbench...</p>
    </div>
  );
}

// -------------------------------------------------------------
// 3. LEADS MANAGEMENT PAGE
// -------------------------------------------------------------
export function LeadsPage() {
  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    api<{ leads: LeadSummary[] }>('/api/admin/leads').then((data) => setLeads(data.leads));
  }, []);

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await api(`/api/admin/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setLeads((prev) => prev.map((lead) => (lead.id === id ? { ...lead, status } : lead)));
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        lead.name.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q) ||
        (lead.phone && lead.phone.toLowerCase().includes(q)) ||
        (lead.service_type && lead.service_type.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [leads, statusFilter, search]);

  const counts = useMemo(() => {
    return {
      all: leads.length,
      new: leads.filter((l) => l.status === 'NEW').length,
      contacted: leads.filter((l) => l.status === 'CONTACTED').length,
      converted: leads.filter((l) => l.status === 'CONVERTED').length,
      closed: leads.filter((l) => l.status === 'CLOSED').length,
    };
  }, [leads]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Inward Inquiries</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage and qualify inbound service requests</p>
        </div>
        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'ALL', label: 'All', count: counts.all },
          { key: 'NEW', label: 'New', count: counts.new },
          { key: 'CONTACTED', label: 'Contacted', count: counts.contacted },
          { key: 'CONVERTED', label: 'Converted', count: counts.converted },
          { key: 'CLOSED', label: 'Closed', count: counts.closed },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              statusFilter === tab.key
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                statusFilter === tab.key ? 'bg-slate-800 text-blue-300' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Workflow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{lead.name}</p>
                        <p className="text-slate-400 text-[11px]">{lead.email}</p>
                        {lead.phone && <p className="text-slate-400 text-[10px]">{lead.phone}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      {lead.service_type ?? 'GST Service'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px]">
                    {lead.created_at
                      ? new Date(lead.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })
                      : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block font-bold text-[10px] px-2 py-0.5 rounded ${
                        lead.status === 'NEW'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                          : lead.status === 'CONTACTED'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                          : lead.status === 'CONVERTED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <select
                      value={lead.status}
                      disabled={updatingId === lead.id}
                      onChange={(e) => updateStatus(lead.id, e.target.value)}
                      className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="NEW">New</option>
                      <option value="CONTACTED">Contacted</option>
                      <option value="CONVERTED">Converted</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </td>
                </tr>
              ))}

              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    No inquiries found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 4. CLIENTS PORTFOLIO PAGE
// -------------------------------------------------------------
export function ClientsPage() {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [team, setTeam] = useState<{ id: string; name: string }[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    api<{ clients: ClientSummary[] }>('/api/admin/clients').then((data) => setClients(data.clients));
    api<{ team: typeof team }>('/api/admin/team').then((data) => setTeam(data.team)).catch(() => {});
    api<{ assignments: { client_user_id: string; team_user_id: string }[] }>('/api/admin/assignments')
      .then((data) =>
        setAssignments(
          Object.fromEntries(data.assignments.map((a) => [a.client_user_id, a.team_user_id]))
        )
      )
      .catch(() => {});
  }, []);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const createDriveFolder = async (clientId: string) => {
    try {
      await api(`/api/admin/clients/${clientId}/drive-folder`, { method: 'POST', body: JSON.stringify({}) });
      showStatus('Google Drive folder created successfully');
    } catch (err) {
      showStatus(err instanceof Error ? err.message : 'Failed to create Drive folder', 'error');
    }
  };

  const assignTeam = async (clientId: string, teamUserId: string) => {
    try {
      await api('/api/admin/assignments', { method: 'POST', body: JSON.stringify({ teamUserId, clientUserId: clientId }) });
      setAssignments((current) => ({ ...current, [clientId]: teamUserId }));
      showStatus('Assigned staff specialist saved');
    } catch (error) {
      showStatus(error instanceof Error ? error.message : 'Failed to assign client', 'error');
    }
  };

  const deleteClient = async (clientId: string, name: string) => {
    if (!window.confirm(`Delete ${name}? This permanently removes the account.`)) return;
    try {
      await api(`/api/admin/clients/${clientId}`, { method: 'DELETE' });
      setClients((current) => current.filter((client) => client.id !== clientId));
      showStatus('Client account deleted');
    } catch (error) {
      showStatus(error instanceof Error ? error.message : 'Failed to delete client', 'error');
    }
  };

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.business_name && c.business_name.toLowerCase().includes(q)) ||
        c.email.toLowerCase().includes(q) ||
        (c.gstin && c.gstin.toLowerCase().includes(q))
      );
    });
  }, [clients, search]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Client Accounts Portfolio</h1>
          <p className="text-xs text-slate-500 mt-0.5">{clients.length} active registered tax entities</p>
        </div>
        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Search clients or GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
          />
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {statusMessage.text}
        </div>
      )}

      {/* Clients Card List */}
      <div className="space-y-3">
        {filteredClients.map((client) => {
          const assignedId = assignments[client.id] ?? '';
          return (
            <div
              key={client.id}
              className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:border-slate-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={adminPath(`/clients/${client.id}`)}
                      className="text-sm font-bold text-slate-900 hover:text-blue-600 transition"
                    >
                      {client.business_name || client.name}
                    </Link>
                    {client.business_name && (
                      <span className="text-[11px] text-slate-400">({client.name})</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{client.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono font-medium bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                      {client.gstin ?? 'No GSTIN'}
                    </span>
                    {client.state && (
                      <span className="text-[10px] text-slate-400">State: {client.state}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                <Link
                  to={adminPath(`/clients/${client.id}`)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                >
                  Workspace
                </Link>

                <button
                  onClick={() => createDriveFolder(client.id)}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition inline-flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  Drive
                </button>

                <div className="flex items-center gap-1">
                  <select
                    value={assignedId}
                    onChange={(e) => setAssignments((curr) => ({ ...curr, [client.id]: e.target.value }))}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Assign Specialist...</option>
                    {team.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={!assignments[client.id] || assignments[client.id] === assignedId}
                    onClick={() => assignTeam(client.id, assignments[client.id])}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 transition"
                  >
                    Save
                  </button>
                </div>

                <button
                  onClick={() => deleteClient(client.id, client.name)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                  title="Delete Client"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}

        {filteredClients.length === 0 && (
          <div className="bg-white p-10 rounded-xl border border-slate-200/80 text-center">
            <p className="text-xs font-semibold text-slate-700">No client accounts found</p>
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 5. CLIENT WORKSPACE (EXECUTIVE ADMIN WORKBENCH)
// -------------------------------------------------------------
export function ClientWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [assignedTeamId, setAssignedTeamId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'returns' | 'documents' | 'compliance' | 'messages' | 'activity'>('overview');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Period management
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // GST Return editing state
  const [gstForm, setGstForm] = useState({
    taxableSales: 0,
    igstSales: 0,
    cgstSales: 0,
    sgstSales: 0,
    totalOutputTax: 0,
    cashTaxPaid: 0,
    itcTotal: 0,
    itcIgst: 0,
    itcCgst: 0,
    itcSgst: 0,
    gstr1Arn: '',
    gstr1Date: '',
    gstr3bArn: '',
    gstr3bDate: '',
  });
  const [savingGst, setSavingGst] = useState(false);

  // Messages state
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Activity audit state for this client
  const [clientLogs, setClientLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Document upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('SALES');
  const [uploadFy, setUploadFy] = useState('2025-26');
  const [uploadMonth, setUploadMonth] = useState('03');
  const [customFileName, setCustomFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Client Statutory Requirements State
  const [clientRequirements, setClientRequirements] = useState<string[]>(['GSTR-1', 'GSTR-3B', 'TDS_DEPOSIT', 'ANNUAL_RETURNS']);
  const [savingReqs, setSavingReqs] = useState(false);
  const [reqsSavedStatus, setReqsSavedStatus] = useState(false);

  // Statutory Due Date Inline Editing State
  const [editingDeadlineId, setEditingDeadlineId] = useState<string | null>(null);
  const [editingDeadlineDate, setEditingDeadlineDate] = useState<string>('');
  const [savingDeadlineDate, setSavingDeadlineDate] = useState(false);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const loadWorkspace = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [wsData, teamRes, assignRes] = await Promise.all([
        api<any>(`/api/clients/${id}/workspace`),
        api<{ team: any[] }>('/api/admin/team').catch(() => ({ team: [] })),
        api<{ assignments: { client_user_id: string; team_user_id: string }[] }>('/api/admin/assignments').catch(() => ({ assignments: [] })),
      ]);

      setData(wsData);
      setTeamMembers(teamRes.team || []);

      const currentAssign = assignRes.assignments?.find((a) => a.client_user_id === id);
      if (currentAssign) {
        setAssignedTeamId(currentAssign.team_user_id);
      }

      // Sync statutory filing requirements for this client
      if (Array.isArray(wsData.client?.applicableRequirements)) {
        setClientRequirements(wsData.client.applicableRequirements);
      } else {
        setClientRequirements(['GSTR-1', 'GSTR-3B', 'TDS_DEPOSIT', 'ANNUAL_RETURNS']);
      }

      // If client has GST data rows, default to the latest period
      if (wsData.gstData && wsData.gstData.length > 0) {
        const latestPeriod = wsData.gstData[0].period;
        setSelectedPeriod(latestPeriod);
      }
    } catch (err) {
      showStatus(err instanceof Error ? err.message : 'Failed to load client workspace', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, [id]);

  // Sync GST Form with selected period
  useEffect(() => {
    if (!data?.gstData) return;
    const periodRow = data.gstData.find((r: any) => r.period === selectedPeriod);
    const sales = periodRow?.sales || {};
    const itc = periodRow?.itc || {};
    const gstr1 = periodRow?.gstr1 || {};
    const gstr3b = periodRow?.gstr3b || {};

    setGstForm({
      taxableSales: sales.taxableSales || 0,
      igstSales: sales.igst || 0,
      cgstSales: sales.cgst || 0,
      sgstSales: sales.sgst || 0,
      totalOutputTax: sales.outputTax || 0,
      cashTaxPaid: sales.cashTaxPaid || 0,
      itcTotal: itc.totalItc || 0,
      itcIgst: itc.igst || 0,
      itcCgst: itc.cgst || 0,
      itcSgst: itc.sgst || 0,
      gstr1Arn: gstr1.arn || '',
      gstr1Date: gstr1.arnDate || '',
      gstr3bArn: gstr3b.arn || '',
      gstr3bDate: gstr3b.arnDate || '',
    });
  }, [selectedPeriod, data]);

  // Fetch client messages when messages tab is activated
  const loadClientMessages = async () => {
    if (!id) return;
    setLoadingMessages(true);
    try {
      const res = await api<any>(`/api/admin/conversations/${id}`);
      setMessages(res.messages || []);
    } catch {
      showStatus('Unable to load communications', 'error');
    } finally {
      setLoadingMessages(false);
    }
  };

  // Fetch client activity logs when activity tab is activated
  const loadClientActivityLogs = async () => {
    if (!id) return;
    setLoadingLogs(true);
    try {
      const res = await api<any>(`/api/admin/activity-logs?clientUserId=${id}&limit=50`);
      setClientLogs(res.logs || []);
    } catch {
      showStatus('Unable to load client activity log', 'error');
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'messages') loadClientMessages();
    if (activeTab === 'activity') loadClientActivityLogs();
  }, [activeTab, id]);

  const handleSaveGstData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSavingGst(true);
    try {
      await api(`/api/clients/${id}/gst-data/${selectedPeriod}`, {
        method: 'PUT',
        body: JSON.stringify({
          sales: {
            taxableSales: Number(gstForm.taxableSales) || 0,
            igst: Number(gstForm.igstSales) || 0,
            cgst: Number(gstForm.cgstSales) || 0,
            sgst: Number(gstForm.sgstSales) || 0,
            outputTax: Number(gstForm.totalOutputTax) || (Number(gstForm.igstSales) + Number(gstForm.cgstSales) + Number(gstForm.sgstSales)) || 0,
            cashTaxPaid: Number(gstForm.cashTaxPaid) || 0,
          },
          itc: {
            totalItc: Number(gstForm.itcTotal) || (Number(gstForm.itcIgst) + Number(gstForm.itcCgst) + Number(gstForm.itcSgst)) || 0,
            igst: Number(gstForm.itcIgst) || 0,
            cgst: Number(gstForm.itcCgst) || 0,
            sgst: Number(gstForm.itcSgst) || 0,
          },
          gstr1: {
            arn: gstForm.gstr1Arn.trim(),
            arnDate: gstForm.gstr1Date.trim(),
            taxableSales: Number(gstForm.taxableSales) || 0,
            totalTax: Number(gstForm.totalOutputTax) || 0,
          },
          gstr3b: {
            arn: gstForm.gstr3bArn.trim(),
            arnDate: gstForm.gstr3bDate.trim(),
            outwardTaxable: Number(gstForm.taxableSales) || 0,
            outwardTotalTax: Number(gstForm.totalOutputTax) || 0,
            cashPaid: Number(gstForm.cashTaxPaid) || 0,
          },
        }),
      });

      showStatus(`GST Return details updated for period ${selectedPeriod}`);
      await loadWorkspace();
    } catch (err) {
      showStatus(err instanceof Error ? err.message : 'Failed to save GST return', 'error');
    } finally {
      setSavingGst(false);
    }
  };

  const handleSaveAssignment = async () => {
    if (!id || !assignedTeamId) return;
    try {
      await api('/api/admin/assignments', {
        method: 'POST',
        body: JSON.stringify({ teamUserId: assignedTeamId, clientUserId: id }),
      });
      showStatus('Team specialist assigned successfully');
    } catch (err) {
      showStatus(err instanceof Error ? err.message : 'Failed to update assignment', 'error');
    }
  };

  const handleCreateDriveFolder = async () => {
    if (!id) return;
    try {
      await api(`/api/admin/clients/${id}/drive-folder`, { method: 'POST', body: JSON.stringify({}) });
      showStatus('Google Drive Client Folder created');
      await loadWorkspace();
    } catch (err) {
      showStatus(err instanceof Error ? err.message : 'Failed to create Drive folder', 'error');
    }
  };

  const handleSendAdminMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !messageText.trim() || sendingMsg) return;
    setSendingMsg(true);
    try {
      const res = await api<any>(`/api/admin/conversations/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: messageText.trim() }),
      });
      if (res.message) {
        setMessages((prev) => [...prev, res.message]);
        setMessageText('');
        showStatus('Message sent as Admin');
      }
    } catch (err) {
      showStatus(err instanceof Error ? err.message : 'Failed to dispatch message', 'error');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this message as Admin?')) return;
    try {
      await api(`/api/admin/messages/${msgId}`, { method: 'DELETE' });
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      showStatus('Message purged');
    } catch (err) {
      showStatus(err instanceof Error ? err.message : 'Failed to purge message', 'error');
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedFile || uploadingDoc) return;
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('category', uploadCategory);
      if (uploadCategory === 'SALES' || uploadCategory === 'PURCHASES') {
        formData.append('financialYear', uploadFy);
        formData.append('month', uploadMonth);
      }
      if (customFileName.trim()) {
        formData.append('customFileName', customFileName.trim());
      }

      await api(`/api/clients/${id}/documents`, {
        method: 'POST',
        body: formData,
      });

      showStatus('Document uploaded to Google Drive');
      setShowUploadModal(false);
      setSelectedFile(null);
      setCustomFileName('');
      await loadWorkspace();
    } catch (err) {
      showStatus(err instanceof Error ? err.message : 'Failed to upload document', 'error');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleToggleComplianceDeadline = async (deadlineKey: string, currentCompleted: boolean) => {
    if (!id) return;
    try {
      await api(`/api/clients/${id}/compliance`, {
        method: 'POST',
        body: JSON.stringify({
          period: selectedPeriod,
          deadlineKey,
          completed: !currentCompleted,
          applicableRequirements: clientRequirements,
        }),
      });
      showStatus(`Updated deadline status for ${selectedPeriod}`);
      await loadWorkspace();
    } catch (err) {
      showStatus(err instanceof Error ? err.message : 'Failed to update compliance', 'error');
    }
  };

  const handleToggleReq = (key: string) => {
    setClientRequirements((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSelectAllReqs = () => {
    setClientRequirements(STATUTORY_REQUIREMENTS_LIST.map((r) => r.key));
  };

  const handleUnselectAllReqs = () => {
    setClientRequirements([]);
  };

  const handleResetDefaultReqs = () => {
    setClientRequirements(['GSTR-1', 'GSTR-3B']);
  };

  const handleSaveClientReqs = async () => {
    if (!id || savingReqs) return;
    setSavingReqs(true);
    try {
      await api(`/api/clients/${id}/compliance`, {
        method: 'POST',
        body: JSON.stringify({
          period: selectedPeriod,
          applicableRequirements: clientRequirements,
        }),
      });
      setReqsSavedStatus(true);
      setTimeout(() => setReqsSavedStatus(false), 3500);
      showStatus('Client statutory filing requirements saved successfully!');
      await loadWorkspace();
    } catch (err) {
      showStatus(err instanceof Error ? err.message : 'Failed to save requirements', 'error');
    } finally {
      setSavingReqs(false);
    }
  };

  const handleStartEditDeadlineDate = (item: any) => {
    setEditingDeadlineId(item.id);
    setEditingDeadlineDate(item.due_date ? item.due_date.substring(0, 10) : '');
  };

  const handleCancelEditDeadlineDate = () => {
    setEditingDeadlineId(null);
    setEditingDeadlineDate('');
  };

  const handleSaveDeadlineDate = async (deadlineId: string) => {
    if (!editingDeadlineDate || savingDeadlineDate) return;
    setSavingDeadlineDate(true);
    try {
      await api(`/api/admin/due-dates/${deadlineId}`, {
        method: 'PATCH',
        body: JSON.stringify({ dueDate: editingDeadlineDate }),
      });
      showStatus('Statutory due date updated successfully!');
      setEditingDeadlineId(null);
      await loadWorkspace();
    } catch (err) {
      showStatus(err instanceof Error ? err.message : 'Failed to update due date', 'error');
    } finally {
      setSavingDeadlineDate(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 gap-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold tracking-wide">Loading Executive Admin Client Workspace...</p>
      </div>
    );
  }

  const client = data?.client || {};
  const currentGstRow = data?.gstData?.find((r: any) => r.period === selectedPeriod);
  const completedDeadlinesForPeriod = data?.completedByPeriod?.[selectedPeriod] || [];

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Return Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <Link
            to={adminPath('/clients')}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-bold transition flex items-center gap-1"
          >
            ← Back to Accounts
          </Link>
          <div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase border border-indigo-200/60">
              <span>🛡️</span> Admin Client Console
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              {client.business_name || client.name}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {data?.driveFolderUrl ? (
            <a
              href={data.driveFolderUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition inline-flex items-center gap-1.5 shadow-2xs"
            >
              <span>📁</span> Drive Vault
            </a>
          ) : (
            <button
              onClick={handleCreateDriveFolder}
              className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition inline-flex items-center gap-1"
            >
              <span>📁</span> Provision Drive
            </button>
          )}

          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
            <select
              value={assignedTeamId}
              onChange={(e) => setAssignedTeamId(e.target.value)}
              className="text-xs bg-transparent border-0 px-2 py-1 text-slate-700 font-medium focus:outline-none"
            >
              <option value="">Assign Specialist...</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.email})
                </option>
              ))}
            </select>
            <button
              onClick={handleSaveAssignment}
              disabled={!assignedTeamId}
              className="px-2.5 py-1 text-[11px] font-bold rounded bg-slate-900 text-white hover:bg-slate-800 transition disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{statusMessage.type === 'success' ? '✓' : '⚠️'}</span>
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="font-bold opacity-60 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Client Identity Header Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Taxpayer / Entity</p>
            <p className="text-sm font-bold text-white mt-0.5">{client.business_name || client.name}</p>
            <p className="text-slate-400 text-[11px] mt-0.5">Proprietor: {client.name}</p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">GSTIN Identifier</p>
            <p className="font-mono text-xs font-bold text-cyan-300 mt-0.5 bg-slate-800/80 px-2 py-1 rounded inline-block">
              {client.gstin || 'GSTIN Pending / Unregistered'}
            </p>
            <p className="text-slate-400 text-[11px] mt-1">State: {client.state || 'Telangana'}</p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Direct Contact</p>
            <p className="text-white font-medium mt-0.5 truncate">{client.email}</p>
            <p className="text-slate-400 text-[11px] mt-0.5">{client.phone || 'No phone recorded'}</p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Practice Assignment</p>
            <p className="text-emerald-400 font-bold mt-0.5 flex items-center gap-1">
              <span>👤</span> {data?.assignedTeam?.name || 'Unassigned Direct Account'}
            </p>
            <p className="text-slate-400 text-[10px] mt-0.5">{data?.assignedTeam?.email || 'Admin Managed'}</p>
          </div>
        </div>
      </div>

      {/* Navigation Tab Bar & Period Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-wrap gap-1">
          {[
            { key: 'overview', label: '📊 Financial Overview' },
            { key: 'returns', label: '📑 GST Returns & Filings' },
            { key: 'documents', label: '📁 Document Vault' },
            { key: 'compliance', label: '⚡ Statutory Compliance' },
            { key: 'messages', label: '💬 Admin Messages' },
            { key: 'activity', label: '📜 Activity Audit Log' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab.key
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tax Period:</span>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {['2026-03', '2026-02', '2026-01', '2025-12', '2025-11', '2025-10', '2025-09', '2025-08', '2025-07', '2025-06', '2025-05', '2025-04'].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. OVERVIEW TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Taxable Turnover</p>
              <p className="text-xl font-black text-slate-900 font-mono">
                ₹{(gstForm.taxableSales || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-slate-400">Period {selectedPeriod}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Output Tax</p>
              <p className="text-xl font-black text-blue-700 font-mono">
                ₹{(gstForm.totalOutputTax || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-slate-400">IGST + CGST + SGST</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ITC Claimed</p>
              <p className="text-xl font-black text-emerald-700 font-mono">
                ₹{(gstForm.itcTotal || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-slate-400">Eligible Input Tax Credit</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cash Tax Paid</p>
              <p className="text-xl font-black text-indigo-700 font-mono">
                ₹{(gstForm.cashTaxPaid || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-slate-400">PMT-06 Challan Payment</p>
            </div>
          </div>

          {/* Filing Status Matrix */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Statutory Filing Status — Period {selectedPeriod}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">GSTR-1 Outward Return</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      gstForm.gstr1Arn ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {gstForm.gstr1Arn ? 'FILED' : 'PENDING'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono">
                  ARN: {gstForm.gstr1Arn || 'Not yet filed'}
                </p>
                {gstForm.gstr1Date && (
                  <p className="text-[11px] text-slate-400">Filing Date: {gstForm.gstr1Date}</p>
                )}
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">GSTR-3B Monthly Summary</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      gstForm.gstr3bArn ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {gstForm.gstr3bArn ? 'FILED' : 'PENDING'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono">
                  ARN: {gstForm.gstr3bArn || 'Not yet filed'}
                </p>
                {gstForm.gstr3bDate && (
                  <p className="text-[11px] text-slate-400">Filing Date: {gstForm.gstr3bDate}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. GST RETURNS & FILINGS TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'returns' && (
        <form onSubmit={handleSaveGstData} className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">GST Return Data Management</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Executive editor for taxable turnover, tax liability, ITC ledger, and ARN filing references for period {selectedPeriod}.
              </p>
            </div>
            <button
              type="submit"
              disabled={savingGst}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>💾</span> {savingGst ? 'Saving...' : 'Save GST Return'}
            </button>
          </div>

          {/* Section 1: Sales & Outward Tax */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span>📈</span> 1. Outward Supplies & Tax Liability (Sales)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Taxable Turnover (₹)</label>
                <input
                  type="number"
                  value={gstForm.taxableSales}
                  onChange={(e) => setGstForm({ ...gstForm, taxableSales: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">IGST Liability (₹)</label>
                <input
                  type="number"
                  value={gstForm.igstSales}
                  onChange={(e) => setGstForm({ ...gstForm, igstSales: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">CGST Liability (₹)</label>
                <input
                  type="number"
                  value={gstForm.cgstSales}
                  onChange={(e) => setGstForm({ ...gstForm, cgstSales: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">SGST Liability (₹)</label>
                <input
                  type="number"
                  value={gstForm.sgstSales}
                  onChange={(e) => setGstForm({ ...gstForm, sgstSales: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Input Tax Credit */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span>📥</span> 2. Input Tax Credit (ITC Claimed)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Total Eligible ITC (₹)</label>
                <input
                  type="number"
                  value={gstForm.itcTotal}
                  onChange={(e) => setGstForm({ ...gstForm, itcTotal: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 font-mono focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">IGST ITC (₹)</label>
                <input
                  type="number"
                  value={gstForm.itcIgst}
                  onChange={(e) => setGstForm({ ...gstForm, itcIgst: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">CGST ITC (₹)</label>
                <input
                  type="number"
                  value={gstForm.itcCgst}
                  onChange={(e) => setGstForm({ ...gstForm, itcCgst: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">SGST ITC (₹)</label>
                <input
                  type="number"
                  value={gstForm.itcSgst}
                  onChange={(e) => setGstForm({ ...gstForm, itcSgst: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Statutory ARNs & Dates */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span>📑</span> 3. Return Filing ARNs & Challans
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">GSTR-1 ARN</label>
                <input
                  type="text"
                  placeholder="AA3603..."
                  value={gstForm.gstr1Arn}
                  onChange={(e) => setGstForm({ ...gstForm, gstr1Arn: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">GSTR-1 Filing Date</label>
                <input
                  type="date"
                  value={gstForm.gstr1Date}
                  onChange={(e) => setGstForm({ ...gstForm, gstr1Date: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">GSTR-3B ARN</label>
                <input
                  type="text"
                  placeholder="AA3603..."
                  value={gstForm.gstr3bArn}
                  onChange={(e) => setGstForm({ ...gstForm, gstr3bArn: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">GSTR-3B Filing Date</label>
                <input
                  type="date"
                  value={gstForm.gstr3bDate}
                  onChange={(e) => setGstForm({ ...gstForm, gstr3bDate: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. DOCUMENT VAULT TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Google Drive Document Vault</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Direct statutory files, registers, and invoices stored in Google Drive.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs"
              >
                <span>📤</span> Upload Document
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Document / File Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Uploaded At</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data?.documents || []).map((doc: any) => (
                    <tr key={doc.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                        <span>📄</span>
                        <span className="truncate max-w-sm">{doc.file_name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {doc.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(doc.uploaded_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {doc.drive_web_view_link && (
                          <a
                            href={doc.drive_web_view_link}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs transition inline-flex items-center gap-1"
                          >
                            👁️ View
                          </a>
                        )}
                        {doc.drive_download_link && (
                          <a
                            href={doc.drive_download_link}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-xs transition inline-flex items-center gap-1"
                          >
                            ⬇️ Download
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}

                  {(!data?.documents || data.documents.length === 0) && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400">
                        No documents stored in vault yet. Click "+ Upload Document" to sync files.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. STATUTORY COMPLIANCE TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'compliance' && (
        <div className="space-y-5">
          {/* Section 1: Client Statutory Filing Requirements */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>⚙️</span> Client Statutory Filing Requirements
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select which statutory filings apply to <b>{client.business_name || client.name || 'this client'}</b>. Selected returns dictate what the client sees and must comply with in their Client Portal.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveClientReqs}
                  disabled={savingReqs}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  {savingReqs ? (
                    'Saving Requirements...'
                  ) : reqsSavedStatus ? (
                    <><span>✓</span> Requirements Saved!</>
                  ) : (
                    <><span>💾</span> Save Client Requirements</>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 text-xs">
              <span className="text-slate-600 font-semibold text-[11px]">
                Quick Selection: ({clientRequirements.length} / {STATUTORY_REQUIREMENTS_LIST.length} Active)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectAllReqs}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-blue-700 transition"
                >
                  ✓ Select All
                </button>
                <button
                  type="button"
                  onClick={handleUnselectAllReqs}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-rose-700 transition"
                >
                  ✕ Unselect All
                </button>
                <button
                  type="button"
                  onClick={handleResetDefaultReqs}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition"
                >
                  Standard GST Defaults (GSTR-1 &amp; 3B)
                </button>
              </div>
            </div>

            {/* Filing Requirements Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {STATUTORY_REQUIREMENTS_LIST.map((req) => {
                const isChecked = clientRequirements.includes(req.key);
                return (
                  <div
                    key={req.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleToggleReq(req.key)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        handleToggleReq(req.key);
                      }
                    }}
                    className={`p-3 rounded-xl border text-xs cursor-pointer select-none flex items-start gap-2.5 transition ${
                      isChecked
                        ? 'border-blue-500 bg-blue-50/60 text-blue-900 shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToggleReq(req.key);
                      }}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            isChecked ? 'bg-blue-200/80 text-blue-900' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {req.tag}
                        </span>
                        <span className="font-bold text-slate-900">{req.label}</span>
                      </div>
                      <span className="text-[11px] block mt-1 opacity-80">
                        {isChecked ? 'Enabled for this client' : 'Excluded / Not applicable'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Statutory Deadlines Checklist & Date Adjustments */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
            <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>📅</span> Statutory Deadlines Checklist &amp; Date Adjustments
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track statutory completion for period <b>{selectedPeriod}</b> or modify government-extended due dates directly.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                Period: {selectedPeriod}
              </span>
            </div>

            <div className="space-y-3">
              {(data?.dueDates || []).map((deadline: any) => {
                const isCompleted = completedDeadlinesForPeriod.includes(deadline.deadline_key || deadline.title);
                const isEditingThisDate = editingDeadlineId === deadline.id;

                return (
                  <div
                    key={deadline.id}
                    className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isCompleted ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isCompleted}
                        onChange={() => handleToggleComplianceDeadline(deadline.deadline_key || deadline.title, isCompleted)}
                        className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`text-xs font-bold ${isCompleted ? 'text-emerald-900' : 'text-slate-900'}`}>
                            {deadline.title}
                          </p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            {deadline.category}
                          </span>
                        </div>
                        {deadline.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5">{deadline.description}</p>
                        )}

                        {/* Inline Due Date Display and Editing */}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {isEditingThisDate ? (
                            <div className="flex items-center gap-1.5 bg-blue-50/80 p-1.5 rounded-lg border border-blue-200 animate-in fade-in">
                              <span className="text-[11px] font-bold text-blue-900">Due Date:</span>
                              <input
                                type="date"
                                value={editingDeadlineDate}
                                onChange={(e) => setEditingDeadlineDate(e.target.value)}
                                className="px-2 py-1 text-xs rounded border border-blue-300 bg-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveDeadlineDate(deadline.id)}
                                disabled={savingDeadlineDate}
                                className="px-2.5 py-1 text-[11px] font-bold rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition"
                              >
                                {savingDeadlineDate ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEditDeadlineDate}
                                className="px-2 py-1 text-[11px] font-semibold rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200 font-mono">
                                Cutoff: {deadline.due_date}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleStartEditDeadlineDate(deadline)}
                                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                              >
                                <span>✏️</span> Change Date
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          isCompleted ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isCompleted ? '✓ COMPLETED' : 'PENDING'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {(!data?.dueDates || data.dueDates.length === 0) && (
                <div className="text-center py-8 text-xs text-slate-400">
                  No statutory deadlines found for this period. Use the Statutory Compliance Calendar to schedule or auto-generate deadlines.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. ADMIN DIRECT MESSAGES TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'messages' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col h-[650px]">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>🛡️</span> Official Admin Communications Console
              </h2>
              <p className="text-[11px] text-slate-500">
                Messages sent from this portal are officially dispatched to the client under the <b>🛡️ GSTBro Admin</b> authority badge.
              </p>
            </div>
            <button
              onClick={loadClientMessages}
              className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded font-semibold text-slate-700 hover:bg-slate-50"
            >
              🔄 Refresh
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/20">
            {loadingMessages && (
              <div className="text-center py-12 text-xs text-slate-400">Loading conversation history...</div>
            )}

            {!loadingMessages && !messages.length && (
              <div className="text-center py-16 text-slate-400 space-y-2">
                <span className="text-3xl block">💬</span>
                <p className="text-xs font-semibold text-slate-700">No messages in this correspondence thread</p>
                <p className="text-[11px] text-slate-400">Type a message below to send an official notice to the client.</p>
              </div>
            )}

            {messages.map((m: any) => {
              const isClient = m.sender_user_id === id || m.sender_role === 'CLIENT';
              const isAdmin = m.sender_role === 'ADMIN';

              return (
                <div key={m.id} className={`flex flex-col ${isClient ? 'items-start' : 'items-end'} group`}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[10px] font-bold">
                      {isClient ? (
                        <span className="text-slate-700">👤 {client.business_name || client.name} (Client)</span>
                      ) : isAdmin ? (
                        <span className="text-indigo-800 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded text-[9px]">
                          🛡️ GSTBro Admin
                        </span>
                      ) : (
                        <span className="text-blue-700">👤 Assigned Team ({m.sender_name || 'Staff'})</span>
                      )}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {new Date(m.created_at).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 max-w-[85%]">
                    {isClient && (
                      <button
                        onClick={() => handleDeleteMessage(m.id)}
                        title="Purge Message"
                        className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition text-xs"
                      >
                        🗑️
                      </button>
                    )}

                    <div
                      className={`rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed ${
                        isClient
                          ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                          : isAdmin
                          ? 'bg-indigo-950 text-white border border-indigo-800 rounded-tr-xs shadow-sm'
                          : 'bg-blue-600 text-white rounded-tr-xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.message}</p>
                    </div>

                    {!isClient && (
                      <button
                        onClick={() => handleDeleteMessage(m.id)}
                        title="Purge Message"
                        className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition text-xs"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Admin Message Dispatch Box */}
          <form onSubmit={handleSendAdminMessage} className="p-3 border-t border-slate-200 bg-white flex gap-2 items-center">
            <input
              type="text"
              placeholder="Write official response to client as Admin..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-600"
            />
            <button
              type="submit"
              disabled={!messageText.trim() || sendingMsg}
              className="px-4 py-2 bg-indigo-950 hover:bg-indigo-900 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-40 flex items-center gap-1.5"
            >
              <span>🛡️</span> {sendingMsg ? 'Dispatching...' : 'Send as Admin'}
            </button>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. CLIENT ACTIVITY AUDIT LOG TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden space-y-4 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Client Access & Modification Trail</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Immutable record of who looked at or modified this client's profile, returns, documents, or settings.
              </p>
            </div>
            <button
              onClick={loadClientActivityLogs}
              className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded font-semibold text-slate-700 hover:bg-slate-50"
            >
              🔄 Refresh Log
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Actor & Role</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Action Description</th>
                  <th className="py-2.5 px-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientLogs.map((log: any) => {
                  const isAdmin = log.actor_role === 'ADMIN';
                  const isLooked = log.action_category === 'LOOKED';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-2.5 px-3 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              isAdmin ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isAdmin ? '🛡️ ADMIN' : '👥 TEAM'}
                          </span>
                          <span className="font-semibold text-slate-800">{log.actor_name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            isLooked ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isLooked ? '👁️ LOOKED' : '✏️ CHANGED'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{log.description}</td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">{log.ip_address || '—'}</td>
                    </tr>
                  );
                })}

                {!loadingLogs && !clientLogs.length && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      No activity events recorded yet for this client.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleUploadDocument} className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Upload Document to Google Drive Vault</h3>
              <button type="button" onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Document Category</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800"
                >
                  <option value="SALES">Sales Register (Sales / Invoices)</option>
                  <option value="PURCHASES">Purchase Register (Purchases / Expenses)</option>
                  <option value="GSTR1">GSTR-1 Filed Return</option>
                  <option value="GSTR3B">GSTR-3B Filed Return</option>
                  <option value="ITC">ITC & 2B Ledger</option>
                  <option value="CLIENT_DOCS">KYC / Client Business Docs</option>
                </select>
              </div>

              {(uploadCategory === 'SALES' || uploadCategory === 'PURCHASES') && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Financial Year</label>
                    <select
                      value={uploadFy}
                      onChange={(e) => setUploadFy(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800"
                    >
                      <option value="2026-27">2026-27</option>
                      <option value="2025-26">2025-26</option>
                      <option value="2024-25">2024-25</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Month</label>
                    <select
                      value={uploadMonth}
                      onChange={(e) => setUploadMonth(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800"
                    >
                      {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map((m) => (
                        <option key={m} value={m}>
                          Month {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Custom File Label (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. March 2026 Outward B2B Invoices"
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select File (PDF, Excel, Images up to 25MB)</label>
                <input
                  type="file"
                  required
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedFile || uploadingDoc}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition disabled:opacity-40"
              >
                {uploadingDoc ? 'Uploading...' : 'Upload File'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 6. STATUTORY DUE DATES PAGE
// -------------------------------------------------------------
export function DueDatesPage() {
  const [dueDates, setDueDates] = useState<DueDate[]>([]);
  const [form, setForm] = useState({ title: '', category: 'GST', dueDate: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [editingItem, setEditingItem] = useState<DueDate | null>(null);
  const [editForm, setEditForm] = useState({ title: '', category: 'GST', dueDate: '', description: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Automatic Statutory Deadline Generator State
  const [autoGenYear, setAutoGenYear] = useState<number>(new Date().getFullYear());
  const [autoGenMonth, setAutoGenMonth] = useState<number>(new Date().getMonth() + 1);
  const [autoGenOverwrite, setAutoGenOverwrite] = useState<boolean>(false);
  const [generatingDeadlines, setGeneratingDeadlines] = useState<boolean>(false);

  const load = () => {
    setLoading(true);
    return api<{ dueDates: DueDate[] }>('/api/due-dates')
      .then((data) => setDueDates(data.dueDates))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const showMsg = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3500);
  };

  const addDueDate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/api/admin/due-dates', { method: 'POST', body: JSON.stringify(form) });
      setForm({ title: '', category: 'GST', dueDate: '', description: '' });
      await load();
      showMsg('Statutory deadline scheduled successfully.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add deadline');
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (item: DueDate) => {
    setEditingItem(item);
    setEditForm({
      title: item.title,
      category: item.category,
      dueDate: item.due_date ? item.due_date.substring(0, 10) : '',
      description: item.description || '',
    });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setEditSaving(true);
    try {
      await api(`/api/admin/due-dates/${editingItem.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editForm.title,
          category: editForm.category,
          dueDate: editForm.dueDate,
          description: editForm.description,
        }),
      });
      setEditingItem(null);
      await load();
      showMsg('Statutory deadline updated successfully.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update due date');
    } finally {
      setEditSaving(false);
    }
  };

  const deleteDueDate = async (id: string) => {
    if (!confirm('Are you sure you want to remove this compliance deadline?')) return;
    try {
      await api(`/api/admin/due-dates/${id}`, { method: 'DELETE' });
      await load();
      showMsg('Deadline removed from compliance calendar.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete deadline');
    }
  };

  const handleSyncOfficial = async () => {
    if (!confirm('This will load/refresh all official statutory GST and TDS/TCS due dates. Continue?')) return;
    setSyncing(true);
    try {
      const res = await api<{ dueDates: DueDate[] }>('/api/admin/due-dates/reset-defaults', { method: 'POST' });
      setDueDates(res.dueDates);
      showMsg('Official GST & TDS/TCS statutory deadlines synchronized successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to sync official dates');
    } finally {
      setSyncing(false);
    }
  };

  const handleAutoGenerateDeadlines = async () => {
    setGeneratingDeadlines(true);
    try {
      const res = await api<{ message: string; generatedCount: number; dueDates: DueDate[] }>(
        '/api/admin/due-dates/generate-month',
        {
          method: 'POST',
          body: JSON.stringify({
            year: Number(autoGenYear),
            month: Number(autoGenMonth),
            overwrite: autoGenOverwrite,
          }),
        }
      );
      await load();
      showMsg(res.message || `Statutory deadlines automatically generated for ${autoGenYear}-${String(autoGenMonth).padStart(2, '0')}!`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate statutory deadlines');
    } finally {
      setGeneratingDeadlines(false);
    }
  };

  const filteredDueDates = useMemo(() => {
    return dueDates.filter((d) => {
      const matchSearch =
        !search ||
        d.title.toLowerCase().includes(search.toLowerCase()) ||
        d.category.toLowerCase().includes(search.toLowerCase()) ||
        (d.description && d.description.toLowerCase().includes(search.toLowerCase()));

      const matchCat =
        categoryFilter === 'ALL' ||
        (categoryFilter === 'GST' && (d.category.includes('GST') || d.category === 'GST' || d.category.startsWith('GSTR'))) ||
        (categoryFilter === 'TDS_TCS' && (d.category.includes('TDS') || d.category.includes('TCS'))) ||
        (categoryFilter === 'INCOME_TAX' && d.category === 'INCOME_TAX') ||
        (categoryFilter === 'ANNUAL' && d.category === 'ANNUAL') ||
        d.category === categoryFilter;

      return matchSearch && matchCat;
    });
  }, [dueDates, search, categoryFilter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Statutory Compliance Calendar</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Official GST & TDS/TCS statutory cutoff dates, fully manageable and editable by Admin
          </p>
        </div>

        <button
          type="button"
          onClick={handleSyncOfficial}
          disabled={syncing}
          className="px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50 self-start sm:self-center"
        >
          <span>⚡</span> {syncing ? 'Loading Official Dates...' : 'Sync Official GST & TDS/TCS Dates'}
        </button>
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center justify-between animate-in fade-in">
          <span>✓ {actionMessage}</span>
          <button type="button" onClick={() => setActionMessage(null)} className="text-emerald-600 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* ⚡ Automatic Statutory Deadline Generator Card */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-lg border border-blue-800/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <h2 className="text-sm font-extrabold tracking-wide uppercase text-cyan-300">
                ⚡ Automatic Statutory Deadline Updater &amp; Generator
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Auto-generate all statutory CBIC &amp; CBDT filing windows for any target period according to official statutory rules (GSTR-1 on 11th, GSTR-3B on 20th, TDS/TCS Challan on 7th, CMP-08 on 18th, QRMP IFF on 13th &amp; PMT-06 on 25th, Advance Tax on 15th, Annual Returns on 31st Dec).
            </p>
          </div>

          <div className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-lg border border-white/10 text-[11px] font-mono text-cyan-200">
            <span>CBIC / CBDT Baseline</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white/5 p-3.5 rounded-xl border border-white/10 items-end">
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">Target Month</label>
            <select
              value={autoGenMonth}
              onChange={(e) => setAutoGenMonth(parseInt(e.target.value, 10))}
              className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-white font-medium focus:outline-none focus:border-cyan-400"
            >
              {[
                { m: 1, name: 'January (01)' },
                { m: 2, name: 'February (02)' },
                { m: 3, name: 'March (03)' },
                { m: 4, name: 'April (04)' },
                { m: 5, name: 'May (05)' },
                { m: 6, name: 'June (06)' },
                { m: 7, name: 'July (07)' },
                { m: 8, name: 'August (08)' },
                { m: 9, name: 'September (09)' },
                { m: 10, name: 'October (10)' },
                { m: 11, name: 'November (11)' },
                { m: 12, name: 'December (12)' },
              ].map(({ m, name }) => (
                <option key={m} value={m} className="bg-slate-900 text-white">
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">Target Year</label>
            <select
              value={autoGenYear}
              onChange={(e) => setAutoGenYear(parseInt(e.target.value, 10))}
              className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-white font-medium focus:outline-none focus:border-cyan-400"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y} className="bg-slate-900 text-white">
                  Year {y}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pb-2">
            <input
              type="checkbox"
              id="autoGenOverwrite"
              checked={autoGenOverwrite}
              onChange={(e) => setAutoGenOverwrite(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-slate-800 border-slate-700 cursor-pointer"
            />
            <label htmlFor="autoGenOverwrite" className="text-xs text-slate-200 cursor-pointer select-none">
              Overwrite / Reset existing for month
            </label>
          </div>

          <div>
            <button
              type="button"
              onClick={handleAutoGenerateDeadlines}
              disabled={generatingDeadlines}
              className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold transition shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <span>⚡</span> {generatingDeadlines ? 'Generating Deadlines...' : 'Auto-Generate & Sync'}
            </button>
          </div>
        </div>
      </div>

      {/* Add New Deadline Form */}
      <form onSubmit={addDueDate} className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Add / Schedule Statutory Deadline (Custom)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <input
            required
            placeholder="Title (e.g. GSTR-3B Monthly)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
          >
            <option value="GST">GST General (CMP-08, PMT-06, ISD)</option>
            <option value="GSTR-1">GSTR-1 Outward Supplies</option>
            <option value="GSTR-3B">GSTR-3B Summary Return</option>
            <option value="GST TDS">GST TDS (GSTR-7)</option>
            <option value="GST TCS">GST TCS (GSTR-8)</option>
            <option value="TDS">Income Tax TDS (24Q, 26Q, 16A)</option>
            <option value="TCS">Income Tax TCS (27EQ)</option>
            <option value="TDS/TCS">TDS/TCS Challan 281</option>
            <option value="INCOME_TAX">Advance Tax / Income Tax</option>
            <option value="ANNUAL">Annual Returns (GSTR-9/9C)</option>
            <option value="ROC">ROC / MCA Corporate</option>
          </select>
          <input
            required
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <input
            placeholder="Description or statutory rule"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50 shadow-sm"
          >
            {saving ? 'Scheduling...' : '+ Schedule Deadline'}
          </button>
        </div>
      </form>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition ${
              categoryFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-2xs font-bold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Deadlines ({dueDates.length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('GST')}
            className={`px-3 py-1.5 rounded-lg transition ${
              categoryFilter === 'GST'
                ? 'bg-blue-600 text-white shadow-2xs font-bold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            GST Filings
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('TDS_TCS')}
            className={`px-3 py-1.5 rounded-lg transition ${
              categoryFilter === 'TDS_TCS'
                ? 'bg-blue-600 text-white shadow-2xs font-bold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            TDS / TCS
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('INCOME_TAX')}
            className={`px-3 py-1.5 rounded-lg transition ${
              categoryFilter === 'INCOME_TAX'
                ? 'bg-blue-600 text-white shadow-2xs font-bold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Advance Tax
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('ANNUAL')}
            className={`px-3 py-1.5 rounded-lg transition ${
              categoryFilter === 'ANNUAL'
                ? 'bg-blue-600 text-white shadow-2xs font-bold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Annual (GSTR-9/9C)
          </button>
        </div>

        <input
          type="text"
          placeholder="Filter by title or note..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full sm:w-56"
        />
      </div>

      {/* Deadlines List */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden divide-y divide-slate-100">
        {filteredDueDates.map((d) => {
          const due = new Date(d.due_date);
          const diffDays = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

          return (
            <div key={d.id} className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/60 transition">
              <div className="flex items-center gap-3">
                <div className="w-12 text-center p-2 rounded-xl bg-slate-100 border border-slate-200/80 flex-shrink-0">
                  <span className="block text-[9px] uppercase font-bold text-slate-500">
                    {due.toLocaleDateString('en-IN', { month: 'short' })}
                  </span>
                  <span className="block text-sm font-extrabold text-slate-900 leading-tight">
                    {due.getDate()}
                  </span>
                  <span className="block text-[8px] text-slate-400 font-mono">
                    {due.getFullYear()}
                  </span>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {d.category}
                    </span>
                    <h3 className="text-xs font-bold text-slate-900">{d.title}</h3>
                  </div>
                  {d.description && <p className="text-[11px] text-slate-500 mt-1 max-w-xl">{d.description}</p>}
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-end md:self-center">
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    diffDays < 0
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : diffDays === 0
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold animate-pulse'
                      : diffDays <= 5
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {diffDays < 0 ? 'Passed' : diffDays === 0 ? 'Due Today' : `${diffDays} days left`}
                </span>

                <button
                  type="button"
                  onClick={() => handleEditClick(d)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  title="Edit deadline"
                >
                  ✏️ Edit
                </button>

                <button
                  type="button"
                  onClick={() => deleteDueDate(d.id)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition"
                  title="Delete deadline"
                >
                  🗑️
                </button>
              </div>
            </div>
          );
        })}

        {filteredDueDates.length === 0 && (
          <div className="p-10 text-center text-slate-400 text-xs">
            {loading ? 'Loading compliance deadlines...' : 'No compliance due dates found.'}
          </div>
        )}
      </div>

      {/* Edit Deadline Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xl w-full max-w-md space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Edit Statutory Deadline</h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={saveEdit} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Title</label>
                <input
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Category</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
                  >
                    <option value="GST">GST General</option>
                    <option value="GSTR-1">GSTR-1 Outward</option>
                    <option value="GSTR-3B">GSTR-3B Summary</option>
                    <option value="GST TDS">GST TDS (GSTR-7)</option>
                    <option value="GST TCS">GST TCS (GSTR-8)</option>
                    <option value="TDS">Income Tax TDS</option>
                    <option value="TCS">Income Tax TCS</option>
                    <option value="TDS/TCS">TDS/TCS Challan 281</option>
                    <option value="INCOME_TAX">Advance Tax</option>
                    <option value="ANNUAL">Annual Returns</option>
                    <option value="ROC">ROC / MCA Corporate</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Due Date</label>
                  <input
                    required
                    type="date"
                    value={editForm.dueDate}
                    onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Description / Notes</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Statutory filing rules or extension notes"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50 shadow-sm"
                >
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 7. CLIENT FEES & INVOICE MANAGEMENT
// -------------------------------------------------------------
export function FeesPage() {
  const [clients, setClients] = useState<{ id: string; name: string; business_name?: string }[]>([]);
  const [form, setForm] = useState({
    clientUserId: '',
    invoiceNumber: '',
    description: '',
    amount: '',
    gstAmount: '',
    dueDate: '',
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<{ clients: typeof clients }>('/api/admin/clients').then((data) => setClients(data.clients));
  }, []);

  const handleAmountChange = (amt: string) => {
    const numeric = parseFloat(amt);
    const gst = !isNaN(numeric) ? (numeric * 0.18).toFixed(2) : '';
    setForm((f) => ({ ...f, amount: amt, gstAmount: gst }));
  };

  const createInvoice = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      await api('/api/admin/fees', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
          gstAmount: Number(form.gstAmount || 0),
        }),
      });
      setForm({ clientUserId: '', invoiceNumber: '', description: '', amount: '', gstAmount: '', dueDate: '' });
      setMessage('Fee invoice created successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to create fee invoice');
    } finally {
      setLoading(false);
    }
  };

  const totalCalculated = (parseFloat(form.amount) || 0) + (parseFloat(form.gstAmount) || 0);

  return (
    <div className="space-y-5">
      <div className="pb-1">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Billing & Invoicing</h1>
        <p className="text-xs text-slate-500 mt-0.5">Issue compliance invoices directly to client portals</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <form
          onSubmit={createInvoice}
          className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-3.5"
        >
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Issue Fee Invoice</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Select Client</label>
              <select
                required
                value={form.clientUserId}
                onChange={(e) => setForm({ ...form, clientUserId: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Choose Client Entity...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.business_name ?? c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Invoice Number</label>
              <input
                required
                placeholder="INV-2026-001"
                value={form.invoiceNumber}
                onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Scope of Service</label>
              <input
                required
                placeholder="Monthly GSTR-1, GSTR-3B filing retainer"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Base Fee (₹)</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                placeholder="2500"
                value={form.amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">18% GST (CGST + SGST)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="450"
                value={form.gstAmount}
                onChange={(e) => setForm({ ...form, gstAmount: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Due Date</label>
              <input
                required
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {message && (
            <p className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 p-2 rounded-lg">
              {message}
            </p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Issuing...' : 'Create Invoice'}
            </button>
          </div>
        </form>

        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Preview</span>
            <h3 className="text-sm font-bold text-slate-900 mt-0.5">Tax Invoice Summary</h3>

            <div className="space-y-2 mt-4 text-xs divide-y divide-slate-100">
              <div className="flex justify-between py-1.5 text-slate-500">
                <span>Base Value</span>
                <span className="font-mono font-medium">₹{(parseFloat(form.amount) || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-slate-500">
                <span>CGST (9%)</span>
                <span className="font-mono font-medium">₹{((parseFloat(form.gstAmount) || 0) / 2).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-slate-500">
                <span>SGST (9%)</span>
                <span className="font-mono font-medium">₹{((parseFloat(form.gstAmount) || 0) / 2).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 text-slate-900 font-bold text-sm">
                <span>Total Amount</span>
                <span className="font-mono text-blue-600">₹{totalCalculated.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-[10px] text-slate-400 mt-4">
            Voucher notifications are automatically synced with client dashboard accounts.
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 8. TEAM MEMBERS & ROLES
// -------------------------------------------------------------
export function TeamPage() {
  const [team, setTeam] = useState<
    { id: string; name: string; email: string; phone?: string | null; role: string; must_reset_password?: boolean }[]
  >([]);
  const [form, setForm] = useState({ email: '', name: '', phone: '', password: '', createDriveFolder: true });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<{ team: typeof team }>('/api/admin/team').then((data) => setTeam(data.team));
  }, []);

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api('/api/admin/team', { method: 'POST', body: JSON.stringify(form) });
      setForm({ email: '', name: '', phone: '', password: '', createDriveFolder: true });
      const data = await api<{ team: typeof team }>('/api/admin/team');
      setTeam(data.team);
      alert('Team member added successfully');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to add team member');
    } finally {
      setLoading(false);
    }
  };

  const editMember = async (member: (typeof team)[number]) => {
    const name = window.prompt('Team member name', member.name);
    if (!name) return;
    const phone = window.prompt('Phone number', member.phone ?? '') ?? '';
    const email = window.prompt('Email address', member.email);
    if (!email) return;
    try {
      const result = await api<{ user: typeof member }>(`/api/admin/team/${member.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, email, phone }),
      });
      setTeam((current) => current.map((item) => (item.id === member.id ? { ...item, ...result.user } : item)));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update team member');
    }
  };

  const deleteMember = async (member: (typeof team)[number]) => {
    if (member.role !== 'TEAM') {
      alert('The admin account cannot be deleted.');
      return;
    }
    if (!window.confirm(`Delete ${member.name}?`)) return;
    try {
      await api(`/api/admin/team/${member.id}`, { method: 'DELETE' });
      setTeam((current) => current.filter((item) => item.id !== member.id));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete member');
    }
  };

  const createTeamDriveFolder = async (member: (typeof team)[number]) => {
    try {
      const result = await api<{ alreadyExists?: boolean }>(`/api/admin/team/${member.id}/drive-folder`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      alert(result.alreadyExists ? 'Drive folder already exists' : 'Drive folder created successfully');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create Drive folder');
    }
  };

  return (
    <div className="space-y-5">
      <div className="pb-1">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Staff & Team Personnel</h1>
        <p className="text-xs text-slate-500 mt-0.5">Manage CA specialists, clerks, and permissions</p>
      </div>

      <form onSubmit={addMember} className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Add Team Member</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <input
            placeholder="Full Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <input
            type="email"
            placeholder="Work Email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <input
            placeholder="Phone Number"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <input
            type="password"
            placeholder="Initial Password (min 8 chars)"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={form.createDriveFolder}
              onChange={(e) => setForm({ ...form, createDriveFolder: e.target.checked })}
              className="rounded text-blue-600"
            />
            Create Google Drive staff folder
          </label>

          <button
            type="submit"
            disabled={loading}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50 shadow-sm"
          >
            {loading ? 'Creating...' : 'Add Member'}
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {team.map((member) => (
          <div
            key={member.id}
            className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                    member.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {member.role === 'ADMIN' ? 'Super Admin' : 'CA Specialist'}
                </span>
                {member.must_reset_password && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700">
                    Reset Required
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-slate-900 truncate">{member.name}</h3>
                  <p className="text-[11px] text-slate-400 truncate">{member.email}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => createTeamDriveFolder(member)}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
              >
                Drive Folder
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => editMember(member)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Edit
                </button>
                {member.role === 'TEAM' && (
                  <button
                    onClick={() => deleteMember(member)}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 9. CASES MANAGEMENT
// -------------------------------------------------------------
export function CasesPage() {
  const [cases, setCases] = useState<
    { id: string; service_type: string; status: string; users: { name: string } }[]
  >([]);

  useEffect(() => {
    api<{ cases: typeof cases }>('/api/cases').then((data) => setCases(data.cases));
  }, []);

  return (
    <div className="space-y-5">
      <div className="pb-1">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Compliance Cases</h1>
        <p className="text-xs text-slate-500 mt-0.5">Live service orders and notice reply cases</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm divide-y divide-slate-100">
        {cases.map((c) => (
          <div key={c.id} className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-900">{c.users?.name ?? 'Client'}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{c.service_type}</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
              {c.status}
            </span>
          </div>
        ))}

        {cases.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-400">No active cases registered.</div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 10. GOOGLE DRIVE MANAGER
// -------------------------------------------------------------
export function DrivePage() {
  const [folders, setFolders] = useState<
    { id: string; drive_folder_url: string; owner_type: string; is_shortcut: boolean; users: { name: string; email?: string } }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<{ id: string; name: string } | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchFolders = () => {
    setLoading(true);
    api<{ folders: typeof folders }>('/api/admin/drive/folders')
      .then((data) => setFolders(data.folders || []))
      .catch((err) => setNotification({ type: 'error', message: err.message || 'Failed to load Drive vaults' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  const handleDeleteVault = async (id: string) => {
    setDeletingId(id);
    try {
      await api(`/api/admin/drive/folders/${id}`, { method: 'DELETE' });
      setFolders((prev) => prev.filter((f) => f.id !== id));
      setConfirmDeleteFolder(null);
      setNotification({ type: 'success', message: 'Google Drive file vault successfully removed.' });
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to delete file vault.' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Google Drive File Vaults</h1>
          <p className="text-xs text-slate-500 mt-0.5">Cloud directories and compliance repositories for clients and teams</p>
        </div>
        <button
          onClick={fetchFolders}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Vaults
        </button>
      </div>

      {notification && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between ${
            notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-3">✕</button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-lg">⚠️</div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Drive File Vault?</h3>
                <p className="text-xs text-slate-500">This will permanently unlink and remove the vault directory.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
              Are you sure you want to delete the file vault for <span className="font-bold text-slate-900">{confirmDeleteFolder.name}</span>?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteFolder(null)}
                disabled={Boolean(deletingId)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteVault(confirmDeleteFolder.id)}
                disabled={Boolean(deletingId)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-1.5 shadow-xs"
              >
                {deletingId ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                      <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" className="opacity-75" />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Confirm & Delete Vault'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {folders.map((folder) => (
          <div
            key={folder.id}
            className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  folder.owner_type === 'CLIENT' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {folder.owner_type}
                </span>
                {folder.is_shortcut && (
                  <span className="text-[9px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded">Shortcut</span>
                )}
              </div>
              <h3 className="text-xs font-bold text-slate-900">{folder.users?.name || 'Unnamed Directory'}</h3>
              {folder.users?.email && (
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{folder.users.email}</p>
              )}
              <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                <span>📁</span> Google Cloud Directory
              </p>
            </div>

            <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center gap-2">
              <a
                href={folder.drive_folder_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                </svg>
                Open
              </a>

              <button
                type="button"
                onClick={() => setConfirmDeleteFolder({ id: folder.id, name: folder.users?.name || 'Directory' })}
                disabled={deletingId === folder.id}
                className="inline-flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition"
                title="Delete Google Drive file vault"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        ))}

        {!loading && folders.length === 0 && (
          <div className="col-span-full bg-white p-10 rounded-xl border border-slate-200/80 text-center">
            <p className="text-xs font-semibold text-slate-600">No Drive file vaults synchronized yet.</p>
            <p className="text-[11px] text-slate-400 mt-1">Folders are created automatically when team members or clients are added.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 10. CLIENT COMMUNICATIONS (ADMIN OVERSIGHT & AUDIT)
// -------------------------------------------------------------
interface AdminConversation {
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientGstin: string | null;
  assignedTeam: { id: string; name: string; email: string } | null;
  totalMessages: number;
  latestMessage: { id: string; message: string; sender_user_id: string; created_at: string } | null;
}

interface ThreadMessage {
  id: string;
  message: string;
  sender_user_id: string;
  sender_role?: string;
  sender_name?: string;
  created_at: string;
  read_at?: string | null;
}

export function ClientCommunicationsPage() {
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);
  const [selectedClient, setSelectedClient] = useState<AdminConversation | null>(null);
  const [search, setSearch] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const fetchConversations = async () => {
    try {
      const data = await api<{ conversations: AdminConversation[] }>('/api/admin/conversations');
      setConversations(data.conversations || []);
      if (!selectedClientId && data.conversations.length > 0) {
        setSelectedClientId(data.conversations[0].clientId);
      }
    } catch {
      setStatusMsg({ text: 'Unable to load conversations list', type: 'error' });
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const loadThread = async (clientId: string) => {
    setSelectedClientId(clientId);
    setLoadingThread(true);
    try {
      const data = await api<{
        client: { id: string; name: string; business_name?: string; email: string; gstin?: string };
        assignedTeam: { id: string; name: string; email: string } | null;
        messages: ThreadMessage[];
      }>(`/api/admin/conversations/${clientId}`);
      setThreadMessages(data.messages || []);
      const matched = conversations.find((c) => c.clientId === clientId);
      if (matched) setSelectedClient(matched);
    } catch {
      setStatusMsg({ text: 'Failed to load conversation thread', type: 'error' });
    } finally {
      setLoadingThread(false);
    }
  };

  useEffect(() => {
    if (selectedClientId) {
      loadThread(selectedClientId);
    }
  }, [selectedClientId]);

  const handleAdminSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedClientId || sendingReply) return;

    setSendingReply(true);
    try {
      const res = await api<{ message: ThreadMessage }>(`/api/admin/conversations/${selectedClientId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: replyText.trim() }),
      });
      if (res.message) {
        setThreadMessages((prev) => [...prev, res.message]);
        setReplyText('');
        setStatusMsg({ text: 'Official message dispatched to client as Admin', type: 'success' });
        setTimeout(() => setStatusMsg(null), 3000);
        setConversations((prev) =>
          prev.map((c) =>
            c.clientId === selectedClientId
              ? { ...c, totalMessages: c.totalMessages + 1, latestMessage: res.message as any }
              : c
          )
        );
      }
    } catch (err) {
      setStatusMsg({ text: err instanceof Error ? err.message : 'Failed to send message', type: 'error' });
    } finally {
      setSendingReply(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this message as Admin?')) return;
    setDeletingId(msgId);
    try {
      await api(`/api/admin/messages/${msgId}`, { method: 'DELETE' });
      setThreadMessages((prev) => prev.filter((m) => m.id !== msgId));
      setStatusMsg({ text: 'Message deleted successfully', type: 'success' });
      setTimeout(() => setStatusMsg(null), 3000);
      setConversations((prev) =>
        prev.map((c) =>
          c.clientId === selectedClientId
            ? { ...c, totalMessages: Math.max(0, c.totalMessages - 1) }
            : c
        )
      );
    } catch {
      setStatusMsg({ text: 'Failed to delete message', type: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.clientName.toLowerCase().includes(search.toLowerCase()) ||
      (c.clientGstin && c.clientGstin.toLowerCase().includes(search.toLowerCase())) ||
      (c.assignedTeam && c.assignedTeam.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase mb-1 border border-indigo-200/60">
            <span>🛡️</span> Admin Oversight & Official Dispatch
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Client Communications</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit discussions and send official notices directly to clients as <b>🛡️ GSTBro Admin</b>.
          </p>
        </div>
        <button
          onClick={fetchConversations}
          className="self-start sm:self-auto px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition"
        >
          🔄 Refresh
        </button>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-xl text-xs font-medium ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Main Container: Split-pane on desktop, toggle on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[75vh] min-h-[550px]">
        {/* Left Pane: Conversation List */}
        <div
          className={`lg:col-span-5 bg-white rounded-xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden ${
            selectedClientId && window.innerWidth < 1024 ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="p-3 border-b border-slate-100">
            <input
              type="text"
              placeholder="Search by client or GSTIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loadingList && (
              <div className="p-8 text-center text-xs text-slate-400">Loading client conversations...</div>
            )}

            {!loadingList && !filteredConversations.length && (
              <div className="p-8 text-center text-xs text-slate-400">No client conversations found.</div>
            )}

            {filteredConversations.map((c) => {
              const isSelected = c.clientId === selectedClientId;
              return (
                <div
                  key={c.clientId}
                  onClick={() => loadThread(c.clientId)}
                  className={`p-3.5 cursor-pointer transition flex items-start gap-3 ${
                    isSelected ? 'bg-blue-50/80 border-l-4 border-l-blue-600' : 'hover:bg-slate-50/80'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0 font-mono">
                    {c.clientName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <strong className="text-xs font-bold text-slate-900 truncate">{c.clientName}</strong>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {c.latestMessage
                          ? new Date(c.latestMessage.created_at).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })
                          : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1">
                      <span className="truncate">
                        Team: <b>{c.assignedTeam ? c.assignedTeam.name : 'Unassigned'}</b>
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-slate-700">{c.totalMessages} msgs</span>
                    </div>

                    <p className="text-[11px] text-slate-500 truncate">
                      {c.latestMessage ? c.latestMessage.message : 'No messages exchanged yet'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Thread Inspector with Admin Delete & Admin Reply */}
        <div
          className={`lg:col-span-7 bg-white rounded-xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden ${
            !selectedClientId && window.innerWidth < 1024 ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {selectedClientId ? (
            <>
              {/* Thread Header */}
              <div className="p-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedClientId(null)}
                    className="lg:hidden p-1.5 text-slate-500 hover:text-slate-800 text-xs font-bold"
                  >
                    ← Back
                  </button>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      {selectedClient?.clientName || 'Conversation Thread'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Assigned Team:{' '}
                      <span className="font-semibold text-slate-700">
                        {selectedClient?.assignedTeam?.name || 'Unassigned'}
                      </span>{' '}
                      ({selectedClient?.assignedTeam?.email || 'N/A'})
                    </p>
                  </div>
                </div>
                {selectedClient?.clientGstin && (
                  <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                    {selectedClient.clientGstin}
                  </span>
                )}
              </div>

              {/* Thread Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/20">
                {loadingThread && (
                  <div className="text-center py-10 text-xs text-slate-400">Loading conversation thread...</div>
                )}

                {!loadingThread && !threadMessages.length && (
                  <div className="text-center py-16 space-y-2">
                    <span className="text-3xl block">💬</span>
                    <p className="text-xs font-semibold text-slate-700">No messages in this conversation</p>
                    <p className="text-[11px] text-slate-400">
                      Messages exchanged between the client, team, and admin will appear here.
                    </p>
                  </div>
                )}

                {threadMessages.map((m) => {
                  const isClient = m.sender_user_id === selectedClientId || m.sender_role === 'CLIENT';
                  const isAdmin = m.sender_role === 'ADMIN';

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isClient ? 'items-start' : 'items-end'} group`}
                    >
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-[10px] font-bold">
                          {isClient ? (
                            <span className="text-slate-700">👤 {selectedClient?.clientName || 'Client'}</span>
                          ) : isAdmin ? (
                            <span className="text-indigo-800 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded text-[9px]">
                              🛡️ GSTBro Admin
                            </span>
                          ) : (
                            <span className="text-blue-700">👤 {m.sender_name || 'Assigned Team'}</span>
                          )}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {new Date(m.created_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 max-w-[85%]">
                        {/* Admin Delete Action for Left Messages */}
                        {isClient && (
                          <button
                            onClick={() => handleDeleteMessage(m.id)}
                            disabled={deletingId === m.id}
                            title="Admin Purge Message"
                            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition text-xs shrink-0"
                          >
                            🗑️
                          </button>
                        )}

                        <div
                          className={`rounded-2xl px-3.5 py-2.5 text-xs shadow-xs leading-relaxed ${
                            isClient
                              ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                              : isAdmin
                              ? 'bg-indigo-950 text-white border border-indigo-800 rounded-tr-xs shadow-sm'
                              : 'bg-blue-600 text-white rounded-tr-xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.message}</p>
                        </div>

                        {/* Admin Delete Action for Right Messages */}
                        {!isClient && (
                          <button
                            onClick={() => handleDeleteMessage(m.id)}
                            disabled={deletingId === m.id}
                            title="Admin Purge Message"
                            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition text-xs shrink-0"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Admin Reply Box */}
              <form onSubmit={handleAdminSendReply} className="p-3 border-t border-slate-200 bg-white flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Type an official message to the client as Admin..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-600"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || sendingReply}
                  className="px-4 py-2 bg-indigo-950 hover:bg-indigo-900 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-40 flex items-center gap-1.5"
                >
                  <span>🛡️</span> {sendingReply ? 'Sending...' : 'Send as Admin'}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <span className="text-4xl block mb-2">💬</span>
              <p className="text-xs font-semibold text-slate-600">Select a conversation</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                Choose a client from the left pane to inspect message logs and send official Admin responses.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 11. ACTIVITY & COMPLIANCE AUDIT LOG PAGE (IMMUTABLE & NON-DELETABLE)
// -------------------------------------------------------------
export function ActivityLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalCount: 0,
    lookedCount: 0,
    changedCount: 0,
    adminCount: 0,
    teamCount: 0,
  });
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: '30',
        role: roleFilter,
        actionCategory: categoryFilter,
      });
      if (search.trim()) queryParams.set('search', search.trim());

      const res = await api<any>(`/api/admin/activity-logs?${queryParams.toString()}`);
      setLogs(res.logs || []);
      setMetrics(res.metrics || { totalCount: 0, lookedCount: 0, changedCount: 0, adminCount: 0, teamCount: 0 });
      setTotalPages(Math.max(1, Math.ceil((res.total || 0) / 30)));
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, roleFilter, categoryFilter]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchLogs();
    }, 10000);
    return () => clearInterval(timer);
  }, [autoRefresh, page, roleFilter, categoryFilter, search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200/80">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-bold uppercase mb-1">
            <span>🔒</span> Immutable Compliance Audit Trail
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Practice Activity Log</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tamper-proof record tracking who <b>LOOKED</b> at or <b>CHANGED</b> client records, GST filings, documents, and messages.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg cursor-pointer shadow-2xs">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
            />
            <span className="font-semibold text-[11px]">Live Auto-Refresh (10s)</span>
          </label>

          <button
            onClick={() => fetchLogs()}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition flex items-center gap-1.5 shadow-2xs"
          >
            <span>🔄</span> Refresh
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Audit Events</p>
          <p className="text-xl font-black text-slate-900 font-mono">{metrics.totalCount}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Looked / Views</p>
          <p className="text-xl font-black text-slate-700 font-mono">👁️ {metrics.lookedCount}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Changed / Updates</p>
          <p className="text-xl font-black text-amber-700 font-mono">✏️ {metrics.changedCount}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Admin Actions</p>
          <p className="text-xl font-black text-indigo-700 font-mono">🛡️ {metrics.adminCount}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Team Actions</p>
          <p className="text-xl font-black text-emerald-700 font-mono">👥 {metrics.teamCount}</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Action:</span>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="LOOKED">👁️ Looked / Views</option>
              <option value="CHANGED">✏️ Changed / Mutations</option>
              <option value="COMMUNICATION">💬 Communications</option>
              <option value="SECURITY">🔐 Security & Auth</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actor Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">🛡️ Admin Only</option>
              <option value="TEAM">👥 Team Only</option>
            </select>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-80">
          <input
            type="text"
            placeholder="Search actor, client, or action..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* Main Audit Trail Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Client</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => {
                const isAdmin = log.actor_role === 'ADMIN';
                const isLooked = log.action_category === 'LOOKED';
                const isMsg = log.action_type === 'MESSAGE';

                return (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-3 px-4">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              isAdmin ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isAdmin ? '🛡️ ADMIN' : '👥 TEAM'}
                          </span>
                          <span className="font-bold text-slate-900">{log.actor_name}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{log.actor_email}</p>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1 ${
                          isLooked
                            ? 'bg-slate-100 text-slate-700'
                            : isMsg
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isLooked ? '👁️ LOOKED' : isMsg ? '💬 MESSAGE' : '✏️ CHANGED'}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {log.client_name ? (
                        <div>
                          {log.client_user_id ? (
                            <Link
                              to={adminPath(`/clients/${log.client_user_id}`)}
                              className="font-bold text-blue-600 hover:underline"
                            >
                              {log.client_name}
                            </Link>
                          ) : (
                            <span className="font-semibold text-slate-800">{log.client_name}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-900 max-w-md">
                      <p className="line-clamp-2">{log.description}</p>
                    </td>

                    <td className="py-3 px-4 text-slate-400 font-mono text-[10px] whitespace-nowrap">
                      {log.ip_address || '—'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {log.details && Object.keys(log.details).length > 0 && (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2 py-1 text-[11px] font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        >
                          Payload 🔍
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {!loading && !logs.length && (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 space-y-1">
                    <p className="text-xs font-semibold text-slate-600">No activity log entries found</p>
                    <p className="text-[11px]">Audit events will populate automatically as team and admin perform actions.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[11px]">
            Showing page <b>{page}</b> of <b>{totalPages}</b>
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 font-semibold disabled:opacity-40"
            >
              ← Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 font-semibold disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Immutability & Compliance Notice Banner */}
      <div className="p-3.5 bg-slate-900 text-slate-300 rounded-xl text-xs flex items-center justify-between border border-slate-800">
        <div className="flex items-center gap-2">
          <span>🔒</span>
          <span>
            <b>Statutory Compliance Guarantee:</b> Activity logs are strictly append-only. No user, team member, or administrator has permission to delete or alter these records.
          </span>
        </div>
      </div>

      {/* Payload Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Audit Event Payload Details</h3>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <div className="text-xs space-y-2">
              <p><b>Event:</b> {selectedLog.description}</p>
              <p><b>Actor:</b> {selectedLog.actor_name} ({selectedLog.actor_email})</p>
              <p><b>IP Address:</b> {selectedLog.ip_address || 'N/A'}</p>
              <p><b>User Agent:</b> <span className="text-[11px] text-slate-500 break-all">{selectedLog.user_agent || 'N/A'}</span></p>

              <div>
                <p className="font-bold mb-1">Raw Payload JSON:</p>
                <pre className="p-3 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-60">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

