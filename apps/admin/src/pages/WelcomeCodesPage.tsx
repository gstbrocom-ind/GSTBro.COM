import { useEffect, useState, useMemo } from 'react';
import { api } from '../lib/api';

export interface WelcomeCode {
  id: string;
  code: string;
  note: string | null;
  created_by?: string | null;
  used: boolean;
  used_by_user_id?: string | null;
  used_by_email?: string | null;
  used_by_name?: string | null;
  used_at?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface WelcomeCodesSummary {
  total: number;
  available: number;
  used: number;
  expired: number;
  redemptionRate: number;
  codes: WelcomeCode[];
}

export function WelcomeCodesPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WelcomeCodesSummary>({
    total: 0,
    available: 0,
    used: 0,
    expired: 0,
    redemptionRate: 0,
    codes: [],
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'USED' | 'EXPIRED'>('ALL');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Generator form state
  const [genCount, setGenCount] = useState(1);
  const [genLength, setGenLength] = useState(6);
  const [genCharset, setGenCharset] = useState<'UPPERCASE_ONLY' | 'ALPHANUMERIC' | 'NUMBERS_ONLY' | 'SPECIAL_CHARS' | 'CUSTOM'>('UPPERCASE_ONLY');
  const [customCodeInput, setCustomCodeInput] = useState('');
  const [genNote, setGenNote] = useState('');
  const [genExpiryDays, setGenExpiryDays] = useState<number | null>(null);

  useEffect(() => {
    loadCodes();
  }, []);

  async function loadCodes() {
    setLoading(true);
    try {
      const res = await api<WelcomeCodesSummary>('/api/admin/welcome-codes');
      setData(res);
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Failed to fetch welcome codes' });
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(text: string, codeId: string) {
    navigator.clipboard.writeText(text);
    setCopiedCode(codeId);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  }

  function handleShareInvite(code: string, note?: string | null) {
    const inviteText = `Welcome to GST Bro!\n\nYou have been invited to register your account. Your unique registration Welcome Code is:\n\n👉  ${code}\n\nPlease visit the portal to complete your registration.\n${note ? `(Reference: ${note})` : ''}`;
    handleCopy(inviteText, `share-${code}`);
    setToastMessage({ type: 'success', text: `Invite message for code "${code}" copied to clipboard!` });
  }

  function handleCopyAllUnused() {
    const unused = data.codes.filter((c) => !c.used && (!c.expires_at || new Date(c.expires_at).getTime() > Date.now()));
    if (!unused.length) {
      setToastMessage({ type: 'error', text: 'No unused welcome codes available to copy' });
      return;
    }
    const text = unused.map((c) => `${c.code}${c.note ? ` (${c.note})` : ''}`).join('\n');
    navigator.clipboard.writeText(text);
    setToastMessage({ type: 'success', text: `Copied ${unused.length} available welcome code(s) to clipboard!` });
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api('/api/admin/welcome-codes/generate', {
        method: 'POST',
        body: JSON.stringify({
          count: genCharset === 'CUSTOM' ? 1 : genCount,
          length: genLength,
          charset: genCharset,
          customCode: genCharset === 'CUSTOM' ? customCodeInput : undefined,
          note: genNote,
          expiresInDays: genExpiryDays,
        }),
      });

      setToastMessage({ type: 'success', text: 'Welcome code(s) generated successfully!' });
      setShowGenerateModal(false);
      setCustomCodeInput('');
      setGenNote('');
      await loadCodes();
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Failed to generate codes' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(id: string, code: string) {
    if (!window.confirm(`Are you sure you want to revoke and delete unused welcome code "${code}"?`)) {
      return;
    }
    try {
      await api(`/api/admin/welcome-codes/${id}`, { method: 'DELETE' });
      setToastMessage({ type: 'success', text: `Code "${code}" revoked successfully` });
      await loadCodes();
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Failed to revoke code' });
    }
  }

  // Filter & Search
  const filteredCodes = useMemo(() => {
    const now = Date.now();
    return data.codes.filter((c) => {
      const isExpired = c.expires_at && new Date(c.expires_at).getTime() < now && !c.used;

      if (statusFilter === 'AVAILABLE' && (c.used || isExpired)) return false;
      if (statusFilter === 'USED' && !c.used) return false;
      if (statusFilter === 'EXPIRED' && !isExpired) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesCode = c.code.toLowerCase().includes(q);
        const matchesNote = (c.note || '').toLowerCase().includes(q);
        const matchesEmail = (c.used_by_email || '').toLowerCase().includes(q);
        const matchesName = (c.used_by_name || '').toLowerCase().includes(q);
        return matchesCode || matchesNote || matchesEmail || matchesName;
      }

      return true;
    });
  }, [data.codes, statusFilter, search]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-md transition ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-sm font-bold opacity-60 hover:opacity-100 ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 sm:p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
              🔒 Invite-Only Client Onboarding
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              5–8 Digits Unique
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-2 flex items-center gap-2">
            <span>🎟️</span> Client Welcome & Registration Codes
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Account registration is locked to authorized clients. Generate single or batch welcome codes, assign them to prospective clients, and track real-time registration redemptions.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={handleCopyAllUnused}
            className="w-full sm:w-auto px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5 shadow-sm"
            title="Copy all unused welcome codes to clipboard"
          >
            <span>📋</span> Copy Available ({data.available})
          </button>

          <button
            type="button"
            onClick={() => setShowGenerateModal(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-1.5"
          >
            <span>⚡</span> Generate Welcome Codes
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Generated</span>
            <span className="text-lg">🎟️</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{data.total}</p>
          <span className="text-[10px] text-slate-400">All codes issued</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Remaining Unused</span>
            <span className="text-lg">🟢</span>
          </div>
          <p className="text-2xl font-black text-emerald-600">{data.available}</p>
          <span className="text-[10px] text-emerald-700/80 font-medium">Ready to share with clients</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between text-purple-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Registered / Used</span>
            <span className="text-lg">🟣</span>
          </div>
          <p className="text-2xl font-black text-purple-600">{data.used}</p>
          <span className="text-[10px] text-purple-700/80 font-medium">Clients onboarded</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-rose-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Expired / Inactive</span>
            <span className="text-lg">🔴</span>
          </div>
          <p className="text-2xl font-black text-rose-600">{data.expired}</p>
          <span className="text-[10px] text-slate-400">Passed validity date</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Redemption Rate</span>
            <span className="text-lg">📈</span>
          </div>
          <p className="text-2xl font-black text-blue-600">{data.redemptionRate}%</p>
          <span className="text-[10px] text-slate-400">{data.used} of {data.total} codes redeemed</span>
        </div>
      </div>

      {/* Controls & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Status Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { key: 'ALL', label: `All Codes (${data.total})` },
              { key: 'AVAILABLE', label: `Available (${data.available})` },
              { key: 'USED', label: `Used / Registered (${data.used})` },
              { key: 'EXPIRED', label: `Expired (${data.expired})` },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                statusFilter === key
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="w-full md:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code, note, client, email..."
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-blue-500 transition"
          />
        </div>
      </div>

      {/* Main Codes Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading welcome codes database...
          </div>
        ) : filteredCodes.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto text-2xl">
              🎟️
            </div>
            <p className="font-semibold text-slate-700">No welcome codes found</p>
            <p className="text-slate-400 max-w-sm mx-auto">
              {search
                ? 'Try broadening your search query or reset the filter'
                : 'Click "Generate Welcome Codes" above to create unique client invitation codes.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-3 px-4">Welcome Code</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Client Note / Reference</th>
                  <th className="py-3 px-4">Registered User</th>
                  <th className="py-3 px-4">Redeemed At</th>
                  <th className="py-3 px-4">Validity</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCodes.map((item) => {
                  const now = Date.now();
                  const isExpired = item.expires_at && new Date(item.expires_at).getTime() < now && !item.used;
                  const isCopied = copiedCode === item.id;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      {/* Code Cell */}
                      <td className="py-3 px-4 font-mono font-bold">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-900 tracking-wider text-xs">
                            {item.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.code, item.id)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition"
                            title="Copy Code"
                          >
                            {isCopied ? '✓' : '📋'}
                          </button>
                        </div>
                      </td>

                      {/* Status Cell */}
                      <td className="py-3 px-4">
                        {item.used ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-bold text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                            Registered
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            Available
                          </span>
                        )}
                      </td>

                      {/* Note / Client */}
                      <td className="py-3 px-4 max-w-xs truncate text-slate-700 font-medium">
                        {item.note || <span className="text-slate-300 italic">— No note —</span>}
                      </td>

                      {/* Registered User */}
                      <td className="py-3 px-4">
                        {item.used ? (
                          <div>
                            <span className="font-bold text-slate-900 block truncate max-w-[180px]">
                              {item.used_by_name || 'Client Account'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[180px]">
                              {item.used_by_email}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">— Awaiting Signup —</span>
                        )}
                      </td>

                      {/* Redeemed At */}
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {item.used_at ? (
                          new Date(item.used_at).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Validity */}
                      <td className="py-3 px-4 text-[11px]">
                        {item.expires_at ? (
                          <div>
                            <span className={isExpired ? 'text-rose-600 font-semibold' : 'text-slate-600 font-medium'}>
                              {new Date(item.expires_at).toLocaleDateString('en-IN')}
                            </span>
                            <span className="block text-[10px] text-slate-400">
                              {isExpired ? 'Expired' : 'Expires on'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-emerald-700 font-medium">No Expiry</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleShareInvite(item.code, item.note)}
                            className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[11px] font-semibold transition"
                            title="Copy full invite text"
                          >
                            ✉️ Share
                          </button>

                          {!item.used && (
                            <button
                              type="button"
                              onClick={() => handleRevoke(item.id, item.code)}
                              className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-[11px] font-semibold transition"
                              title="Revoke / Delete Code"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate Codes Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>⚡</span> Generate Client Welcome Codes
              </h2>
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleGenerate} className="mt-4 space-y-4 text-xs">
              {/* Format / Type */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Code Format Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'UPPERCASE_ONLY', label: 'Clean Uppercase (e.g. 7X9K4B)' },
                    { id: 'NUMBERS_ONLY', label: 'Numbers Only (e.g. 849201)' },
                    { id: 'ALPHANUMERIC', label: 'Mixed Case (e.g. k7W9m2)' },
                    { id: 'CUSTOM', label: 'Custom Specific Word / Code' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setGenCharset(opt.id as any)}
                      className={`p-2 rounded-xl border text-left font-semibold transition ${
                        genCharset === opt.id
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs ring-1 ring-blue-500'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {genCharset === 'CUSTOM' ? (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Enter Custom Welcome Code (5 to 8 characters) *
                  </label>
                  <input
                    type="text"
                    required
                    minLength={5}
                    maxLength={8}
                    value={customCodeInput}
                    onChange={(e) => setCustomCodeInput(e.target.value.toUpperCase().trim())}
                    placeholder="e.g. VIP2026, APEX01"
                    className="w-full border rounded-xl p-2.5 font-mono font-bold text-sm tracking-widest uppercase bg-slate-50 focus:bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Must be 5 to 8 unique characters without spaces.
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {/* Quantity */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Quantity of Codes</label>
                    <select
                      value={genCount}
                      onChange={(e) => setGenCount(Number(e.target.value))}
                      className="w-full border rounded-xl p-2.5 font-semibold bg-white"
                    >
                      <option value={1}>1 Code</option>
                      <option value={3}>3 Codes</option>
                      <option value={5}>5 Codes</option>
                      <option value={10}>10 Codes (Batch)</option>
                      <option value={25}>25 Codes (Batch)</option>
                    </select>
                  </div>

                  {/* Length */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Code Length ({genLength} Digits)
                    </label>
                    <select
                      value={genLength}
                      onChange={(e) => setGenLength(Number(e.target.value))}
                      className="w-full border rounded-xl p-2.5 font-semibold bg-white"
                    >
                      <option value={5}>5 Characters</option>
                      <option value={6}>6 Characters (Recommended)</option>
                      <option value={7}>7 Characters</option>
                      <option value={8}>8 Characters</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Note / Client */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Client Name / Reference Note (Optional)
                </label>
                <input
                  type="text"
                  value={genNote}
                  onChange={(e) => setGenNote(e.target.value)}
                  placeholder="e.g. For Apex Global Solutions / March Onboarding"
                  className="w-full border rounded-xl p-2.5 text-xs bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Expiry */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Validity & Expiry</label>
                <select
                  value={genExpiryDays === null ? 'never' : String(genExpiryDays)}
                  onChange={(e) =>
                    setGenExpiryDays(e.target.value === 'never' ? null : Number(e.target.value))
                  }
                  className="w-full border rounded-xl p-2.5 font-semibold bg-white"
                >
                  <option value="never">No Expiry (Never Expires)</option>
                  <option value="7">Valid for 7 Days</option>
                  <option value="14">Valid for 14 Days</option>
                  <option value="30">Valid for 30 Days</option>
                  <option value="90">Valid for 90 Days</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || (genCharset === 'CUSTOM' && customCodeInput.length < 5)}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {submitting ? 'Generating...' : '⚡ Generate Codes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
