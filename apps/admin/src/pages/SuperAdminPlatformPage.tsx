import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type PlatformKpis = {
  totalFirms: number;
  activeFirms: number;
  totalTeamMembers: number;
  activeClientsCount: number;
  projectedMonthlyRevenue: number;
  billingPeriod: string;
  defaultRatePerClient: number;
};

type FirmSummary = {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string | null;
  gstin?: string | null;
  status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED';
  created_at: string;
  totalTeamMembers: number;
  activeClientsCount: number;
  latestInvoiceAmount: number;
  invoiceStatus: string;
};

export function SuperAdminPlatformPage() {
  const [kpis, setKpis] = useState<PlatformKpis | null>(null);
  const [firms, setFirms] = useState<FirmSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingFirmId, setUpdatingFirmId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [kpiRes, firmsRes] = await Promise.all([
        api<PlatformKpis>('/api/super-admin/kpis'),
        api<{ firms: FirmSummary[] }>('/api/super-admin/firms'),
      ]);
      setKpis(kpiRes);
      setFirms(firmsRes.firms || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load Super Admin dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleStatus = async (firmId: string, currentStatus: string) => {
    setUpdatingFirmId(firmId);
    try {
      const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await api(`/api/super-admin/firms/${firmId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      await fetchData();
    } catch (err: any) {
      alert(`Error updating firm status: ${err?.message || 'Unknown error'}`);
    } finally {
      setUpdatingFirmId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600">Loading Platform Telemetry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 mb-2">
            Super Admin Control Center
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Overview & CA Directory</h1>
          <p className="text-sm text-slate-500 mt-1">
            Zero-knowledge telemetry: Monitor CA practices, team sizes, and active client usage for B2B billing.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/welcome-codes"
            className="px-3.5 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/80 rounded-lg shadow-xs hover:bg-indigo-100 transition inline-flex items-center gap-1.5"
          >
            <span>⚡ Give CA Welcome Code</span>
          </a>
          <button
            onClick={fetchData}
            className="px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition"
          >
            Refresh Telemetry
          </button>
          <a
            href="/settings/content"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 transition inline-flex items-center gap-2"
          >
            <span>Website CMS Editor</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total CAs */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CA / Tax Firms</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{kpis?.totalFirms ?? 0}</span>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {kpis?.activeFirms ?? 0} Active
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">Subscribed accounting practices</div>
          <div className="absolute top-4 right-4 text-slate-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>

        {/* Team Members */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Team Members</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{kpis?.totalTeamMembers ?? 0}</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">Articles, accountants & managers</div>
          <div className="absolute top-4 right-4 text-slate-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>

        {/* Active Clients */}
        <div className="bg-white p-5 rounded-xl border border-indigo-200/80 shadow-sm relative overflow-hidden bg-gradient-to-br from-indigo-50/30 to-white">
          <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Active Clients (Current Cycle)</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-indigo-900">{kpis?.activeClientsCount ?? 0}</span>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-100/60 px-2 py-0.5 rounded-full">
              Actually Using
            </span>
          </div>
          <div className="mt-2 text-xs text-indigo-600/80">Period: {kpis?.billingPeriod}</div>
          <div className="absolute top-4 right-4 text-indigo-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Projected MRR */}
        <div className="bg-white p-5 rounded-xl border border-emerald-200/80 shadow-sm relative overflow-hidden bg-gradient-to-br from-emerald-50/30 to-white">
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Projected Revenue (MRR)</div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-emerald-900">₹{(kpis?.projectedMonthlyRevenue ?? 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="mt-2 text-xs text-emerald-600/80">@ ₹{kpis?.defaultRatePerClient}/active client + 18% GST</div>
          <div className="absolute top-4 right-4 text-emerald-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Firms Directory Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Registered CA Firms & Usage Tallies</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Super Admin views aggregate metrics only. Client tax files and documents are private to each CA firm.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {firms.length} Firms Onboarded
          </span>
        </div>

        {firms.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No CA firms registered yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-6">Firm / CA Details</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Team Members</th>
                  <th className="py-3 px-4 text-center">Active Clients</th>
                  <th className="py-3 px-4">Current Billing</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {firms.map((firm) => (
                  <tr key={firm.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-900">{firm.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{firm.email}</span>
                        {firm.phone && <span>• {firm.phone}</span>}
                        {firm.gstin && <span className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">{firm.gstin}</span>}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          firm.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                            : firm.status === 'TRIAL'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200/70'
                            : 'bg-rose-50 text-rose-700 border border-rose-200/70'
                        }`}
                      >
                        {firm.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center font-medium text-slate-700">
                      {firm.totalTeamMembers}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {firm.activeClientsCount}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium text-slate-900">
                        ₹{Number(firm.latestInvoiceAmount || firm.activeClientsCount * 149 * 1.18).toFixed(0)}
                      </div>
                      <div className="text-xs text-slate-400 capitalize">{firm.invoiceStatus.toLowerCase()}</div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleToggleStatus(firm.id, firm.status)}
                        disabled={updatingFirmId === firm.id}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-md transition ${
                          firm.status === 'ACTIVE'
                            ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        {updatingFirmId === firm.id ? 'Updating...' : firm.status === 'ACTIVE' ? 'Suspend Firm' : 'Activate Firm'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
