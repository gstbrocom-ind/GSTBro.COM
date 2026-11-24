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

type OtpSession = {
  id: string;
  identifier: string;
  channel: string;
  purpose: string;
  provider: string;
  verified: boolean;
  attempts: number;
  maxAttempts: number;
  isExpired: boolean;
  createdAt: string;
};

type OtpConfigData = {
  phoneOtpEnabled: boolean;
  supportPhone?: string;
  activeSmsProvider: string;
  activeEmailProvider: string;
  recentMobileSessions: OtpSession[];
  recentEmailSessions: OtpSession[];
};

// Crisp SVG Vector Icons for Institutional Telemetry
function PhoneCallIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function WelcomeKeyIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21 2-2 2m-1.5 1.5L14 9l-1.5-1.5-2 2 1.5 1.5L9 14l-1.5-1.5-2 2 1.5 1.5L3 21l3 3 7-7 1.5 1.5 2-2-1.5-1.5 3.5-3.5 1.5 1.5 2-2-1.5-1.5Z" />
      <circle cx="7.5" cy="7.5" r="4.5" />
    </svg>
  );
}

function RefreshCwIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

function TrashCanIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function ShieldCheckSvg({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function SmsDeviceIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  );
}

function MailEnvelopeIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

export function SuperAdminPlatformPage() {
  const [kpis, setKpis] = useState<PlatformKpis | null>(null);
  const [firms, setFirms] = useState<FirmSummary[]>([]);
  const [otpConfig, setOtpConfig] = useState<OtpConfigData | null>(null);
  const [hotlinePhone, setHotlinePhone] = useState('+91 98765 43210');
  const [savingHotline, setSavingHotline] = useState(false);
  const [togglingOtp, setTogglingOtp] = useState(false);
  const [otpNotice, setOtpNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingFirmId, setUpdatingFirmId] = useState<string | null>(null);
  const [deletingFirmId, setDeletingFirmId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [kpiRes, firmsRes, otpRes] = await Promise.all([
        api<PlatformKpis>('/api/super-admin/kpis'),
        api<{ firms: FirmSummary[] }>('/api/super-admin/firms'),
        api<OtpConfigData>('/api/super-admin/otp-config').catch(() => null),
      ]);
      setKpis(kpiRes);
      setFirms(firmsRes.firms || []);
      if (otpRes) {
        setOtpConfig(otpRes);
        if (otpRes.supportPhone) {
          setHotlinePhone(otpRes.supportPhone);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load Super Admin dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHotline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotlinePhone.trim()) return;
    setSavingHotline(true);
    setOtpNotice(null);
    try {
      const res = await api<{ success: boolean; supportPhone: string; message: string }>(
        '/api/super-admin/otp-config',
        {
          method: 'PATCH',
          body: JSON.stringify({ supportPhone: hotlinePhone.trim() }),
        }
      );
      setOtpNotice(`Registration "GET" hotline successfully updated to ${res.supportPhone || hotlinePhone}`);
      setTimeout(() => setOtpNotice(null), 6000);
    } catch (err: any) {
      alert(`Failed to update hotline: ${err?.message || 'Unknown error'}`);
    } finally {
      setSavingHotline(false);
    }
  };

  const handleToggleOtpChannel = async () => {
    if (!otpConfig) return;
    setTogglingOtp(true);
    setOtpNotice(null);
    try {
      const nextState = !otpConfig.phoneOtpEnabled;
      const res = await api<{ success: boolean; phoneOtpEnabled: boolean; message: string }>(
        '/api/super-admin/otp-config',
        {
          method: 'PATCH',
          body: JSON.stringify({ phoneOtpEnabled: nextState }),
        }
      );
      setOtpConfig((prev) => (prev ? { ...prev, phoneOtpEnabled: res.phoneOtpEnabled } : null));
      setOtpNotice(res.message);
      setTimeout(() => setOtpNotice(null), 6000);
    } catch (err: any) {
      alert(`Failed to update OTP configuration: ${err?.message || 'Unknown error'}`);
    } finally {
      setTogglingOtp(false);
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

  const handleDeleteFirm = async (firmId: string, firmName: string) => {
    const confirmation = window.prompt(
      `⚠️ PERMANENT DELETION WARNING:\n\nDeleting "${firmName}" will permanently wipe:\n- The CA Firm profile & workspace\n- All associated team member logins\n- Client allocations & task records\n\nTo confirm, type the exact firm name "${firmName}":`
    );
    if (!confirmation) return;
    if (confirmation.trim() !== firmName.trim()) {
      alert('Firm name did not match. Deletion cancelled.');
      return;
    }

    setDeletingFirmId(firmId);
    try {
      await api(`/api/super-admin/firms/${firmId}`, { method: 'DELETE' });
      alert(`Firm "${firmName}" has been permanently deleted.`);
      await fetchData();
    } catch (err: any) {
      alert(`Failed to delete firm: ${err?.message || 'Unknown error'}`);
    } finally {
      setDeletingFirmId(null);
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
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header with Mobile Responsive Action Wrap */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 mb-2">
            <ShieldCheckSvg className="w-3.5 h-3.5" />
            <span>Super Admin Control Center</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Platform Overview & CA Directory</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Zero-knowledge telemetry: Monitor CA practices, team sizes, and active client usage for B2B billing.
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          <a
            href="/leads"
            className="px-3 py-2 text-xs sm:text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200/80 rounded-xl shadow-2xs hover:bg-blue-100 transition inline-flex items-center gap-1.5 touch-target"
          >
            <PhoneCallIcon className="w-3.5 h-3.5" />
            <span>Callback Leads</span>
          </a>
          <a
            href="/welcome-codes"
            className="px-3 py-2 text-xs sm:text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/80 rounded-xl shadow-2xs hover:bg-indigo-100 transition inline-flex items-center gap-1.5 touch-target"
          >
            <WelcomeKeyIcon className="w-3.5 h-3.5" />
            <span>CA Welcome Codes</span>
          </a>
          <button
            onClick={fetchData}
            className="px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl shadow-2xs hover:bg-slate-50 transition inline-flex items-center gap-1.5 touch-target"
          >
            <RefreshCwIcon className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <a
            href="/settings/content"
            className="px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-indigo-600 rounded-xl shadow-xs hover:bg-indigo-700 transition inline-flex items-center gap-1.5 touch-target"
          >
            <span>CMS Editor</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs sm:text-sm font-medium">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total CAs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs relative overflow-hidden">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CA / Tax Firms</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{kpis?.totalFirms ?? 0}</span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
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
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs relative overflow-hidden">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Team Members</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{kpis?.totalTeamMembers ?? 0}</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">Articles, accountants & managers</div>
          <div className="absolute top-4 right-4 text-slate-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>

        {/* Active Clients */}
        <div className="bg-white p-5 rounded-2xl border border-indigo-200/80 shadow-2xs relative overflow-hidden bg-gradient-to-br from-indigo-50/30 to-white">
          <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Active Clients (Current Cycle)</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-indigo-900">{kpis?.activeClientsCount ?? 0}</span>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-100/60 px-2 py-0.5 rounded-full border border-indigo-200/50">
              Active Billing
            </span>
          </div>
          <div className="mt-2 text-xs text-indigo-600/80 font-mono">Period: {kpis?.billingPeriod}</div>
          <div className="absolute top-4 right-4 text-indigo-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Projected MRR */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-200/80 shadow-2xs relative overflow-hidden bg-gradient-to-br from-emerald-50/30 to-white">
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Projected Revenue (MRR)</div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-emerald-900">₹{(kpis?.projectedMonthlyRevenue ?? 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="mt-2 text-xs text-emerald-600/80">@ ₹{kpis?.defaultRatePerClient}/active client + 18% GST</div>
          <div className="absolute top-4 right-4 text-emerald-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Firms Directory Table (Responsive: Table on Desktop, Cards on Mobile) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">Registered CA Firms & Usage Tallies</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Super Admin views aggregate metrics only. Client tax files and documents are private to each CA firm.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200/60 self-start sm:self-auto">
            {firms.length} Firms Onboarded
          </span>
        </div>

        {firms.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No CA firms registered yet.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
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
                          {firm.gstin && <span className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/50">{firm.gstin}</span>}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
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
                        <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/50">
                          {firm.activeClientsCount}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-900 font-mono">
                          ₹{Number(firm.latestInvoiceAmount || firm.activeClientsCount * 149 * 1.18).toFixed(0)}
                        </div>
                        <div className="text-xs text-slate-400 capitalize">{firm.invoiceStatus.toLowerCase()}</div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleStatus(firm.id, firm.status)}
                            disabled={updatingFirmId === firm.id}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition cursor-pointer touch-target ${
                              firm.status === 'ACTIVE'
                                ? 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                          >
                            {updatingFirmId === firm.id ? 'Updating...' : firm.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteFirm(firm.id, firm.name)}
                            disabled={deletingFirmId === firm.id}
                            className="text-xs font-semibold px-3 py-1.5 rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer flex items-center gap-1 shadow-2xs touch-target"
                            title="Permanently Delete Firm & Workspace"
                          >
                            <TrashCanIcon className="w-3.5 h-3.5" />
                            <span>{deletingFirmId === firm.id ? 'Deleting...' : 'Delete'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {firms.map((firm) => (
                <div key={firm.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{firm.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{firm.email}</p>
                      {firm.phone && <p className="text-xs text-slate-500">{firm.phone}</p>}
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${
                        firm.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                          : firm.status === 'TRIAL'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200/70'
                          : 'bg-rose-50 text-rose-700 border border-rose-200/70'
                      }`}
                    >
                      {firm.status}
                    </span>
                  </div>

                  {firm.gstin && (
                    <div className="inline-block font-mono text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/50">
                      GSTIN: {firm.gstin}
                    </div>
                  )}

                  {/* 3-Column Metric Tally */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 text-center">
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-slate-500">Team</span>
                      <strong className="text-xs font-bold text-slate-800">{firm.totalTeamMembers}</strong>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-slate-500">Clients</span>
                      <strong className="text-xs font-bold text-indigo-700">{firm.activeClientsCount}</strong>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-slate-500">Billing</span>
                      <strong className="text-xs font-bold text-slate-900 font-mono">
                        ₹{Number(firm.latestInvoiceAmount || firm.activeClientsCount * 149 * 1.18).toFixed(0)}
                      </strong>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleToggleStatus(firm.id, firm.status)}
                      disabled={updatingFirmId === firm.id}
                      className={`flex-1 text-xs font-semibold py-2 rounded-xl transition cursor-pointer text-center touch-target ${
                        firm.status === 'ACTIVE'
                          ? 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                          : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      {updatingFirmId === firm.id ? 'Updating...' : firm.status === 'ACTIVE' ? 'Suspend Practice' : 'Activate Practice'}
                    </button>
                    <button
                      onClick={() => handleDeleteFirm(firm.id, firm.name)}
                      disabled={deletingFirmId === firm.id}
                      className="text-xs font-semibold px-3 py-2 rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs touch-target"
                      title="Permanently Delete Firm"
                    >
                      <TrashCanIcon className="w-3.5 h-3.5" />
                      <span>{deletingFirmId === firm.id ? '...' : 'Delete'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* OTP GATEWAYS & VERIFICATION TELEMETRY (SUPER ADMIN CONTROL) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-50 to-indigo-50/30">
          <div>
            <div className="flex items-center gap-2">
              <SmsDeviceIcon className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Registration OTP Gateway & Verification Telemetry</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Control public registration verification channels and inspect live phone / email verification logs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleOtpChannel}
              disabled={togglingOtp || !otpConfig}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer touch-target ${
                otpConfig?.phoneOtpEnabled
                  ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              <span>{togglingOtp ? 'Updating...' : otpConfig?.phoneOtpEnabled ? 'Hide Phone SMS OTP (Use Email Only)' : 'Enable Phone SMS OTP'}</span>
            </button>
          </div>
        </div>

        {otpNotice && (
          <div className="m-4 sm:m-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <ShieldCheckSvg className="w-4 h-4 text-emerald-600" />
            <span>{otpNotice}</span>
          </div>
        )}

        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-200/80 bg-slate-50/50">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Registration Channel Mode</span>
            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                otpConfig?.phoneOtpEnabled
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              }`}>
                {otpConfig?.phoneOtpEnabled ? 'Email + Phone SMS Active' : 'Email OTP Only (SMS Hidden)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
              {otpConfig?.phoneOtpEnabled
                ? 'Taxpayers & CA firms see both SMS and Email verification options.'
                : 'Phone SMS OTP is hidden from public signup. Users verify cleanly via Email with zero SMS delivery failures.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Configured SMS Gateway</span>
            <div className="mt-2 flex items-center gap-2">
              <strong className="text-sm text-slate-900 font-mono">{otpConfig?.activeSmsProvider || 'APITxT'}</strong>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                DLT Standard
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
              Primary Indian SMS gateway for mobile OTP delivery when enabled.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Configured Email Gateway</span>
            <div className="mt-2 flex items-center gap-2">
              <strong className="text-sm text-slate-900 font-mono">Resend Cloud API</strong>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                Active & High Deliverability
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
              Dispatches 6-digit branded verification codes directly to taxpayer/practitioner inboxes.
            </p>
          </div>
        </div>

        {/* WELCOME CODE CALL HOTLINE EDITOR */}
        <div className="p-4 sm:p-6 border-b border-slate-200/80 bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <PhoneCallIcon className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Registration "GET" Call Hotline</h3>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase tracking-wider">
                Direct Call Redirect
              </span>
            </div>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              When prospective clients or CA firms click <strong className="text-emerald-700">GET</strong> on the Admin Welcome Code input, their device initiates a phone call directly to this number.
            </p>
          </div>

          <form onSubmit={handleSaveHotline} className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <input
                type="text"
                required
                value={hotlinePhone}
                onChange={(e) => setHotlinePhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="px-3 py-2 rounded-xl text-xs font-mono font-bold text-slate-900 border border-emerald-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-44 sm:w-48 shadow-2xs"
              />
            </div>
            <button
              type="submit"
              disabled={savingHotline || !hotlinePhone.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition cursor-pointer shadow-xs whitespace-nowrap touch-target"
            >
              {savingHotline ? 'Saving...' : 'Save Hotline'}
            </button>
            <a
              href={`tel:${hotlinePhone.replace(/\s+/g, '')}`}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition flex items-center gap-1.5 shadow-2xs whitespace-nowrap cursor-pointer touch-target"
              title="Test Dial Hotline"
            >
              <PhoneCallIcon className="w-3.5 h-3.5" />
              <span>Test Dial</span>
            </a>
          </form>
        </div>

        {/* RECENT SESSIONS TABLE (Responsive: Table on Desktop, Cards on Mobile) */}
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h3 className="text-sm font-bold text-slate-900">Recent OTP Verification Sessions (Audit Log)</h3>
            <span className="text-xs text-slate-500">Showing recent 25 mobile & email attempts</span>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">Channel</th>
                  <th className="p-3">Masked Target</th>
                  <th className="p-3">Purpose</th>
                  <th className="p-3">Provider</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Requested At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(!otpConfig?.recentMobileSessions?.length && !otpConfig?.recentEmailSessions?.length) ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      No recent OTP verification sessions recorded.
                    </td>
                  </tr>
                ) : (
                  [...(otpConfig?.recentMobileSessions || []), ...(otpConfig?.recentEmailSessions || [])]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 25)
                    .map((s, idx) => (
                      <tr key={s.id || idx} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-semibold">
                          {s.channel === 'MOBILE_SMS' ? (
                            <span className="inline-flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60 font-semibold">
                              <SmsDeviceIcon className="w-3 h-3" />
                              <span>SMS</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/60 font-semibold">
                              <MailEnvelopeIcon className="w-3 h-3" />
                              <span>Email</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono font-medium text-slate-800">{s.identifier}</td>
                        <td className="p-3 text-slate-600">{s.purpose}</td>
                        <td className="p-3 font-mono text-slate-500">{s.provider}</td>
                        <td className="p-3">
                          {s.verified ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              VERIFIED
                            </span>
                          ) : s.isExpired ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              EXPIRED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              PENDING
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right text-slate-400 font-mono">
                          {new Date(s.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Sessions Stacked Cards */}
          <div className="md:hidden divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
            {(!otpConfig?.recentMobileSessions?.length && !otpConfig?.recentEmailSessions?.length) ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No recent OTP verification sessions recorded.
              </div>
            ) : (
              [...(otpConfig?.recentMobileSessions || []), ...(otpConfig?.recentEmailSessions || [])]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 15)
                .map((s, idx) => (
                  <div key={s.id || idx} className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {s.channel === 'MOBILE_SMS' ? (
                          <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60 text-xs font-semibold">
                            <SmsDeviceIcon className="w-3 h-3" /> SMS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200/60 text-xs font-semibold">
                            <MailEnvelopeIcon className="w-3 h-3" /> Email
                          </span>
                        )}
                        <span className="font-mono text-xs font-bold text-slate-800">{s.identifier}</span>
                      </div>
                      <div>
                        {s.verified ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            VERIFIED
                          </span>
                        ) : s.isExpired ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            EXPIRED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            PENDING
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{s.purpose} ({s.provider})</span>
                      <span className="font-mono">{new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
