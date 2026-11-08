import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  fetchInvoiceSeries,
  createInvoiceSeries,
  updateInvoiceSeries,
  type InvoiceSeries,
} from '../../../lib/invoiceApi';

export function InvoiceSeriesPage({ vendorId }: { vendorId?: string }) {
  const { user } = useAuth();
  const targetVendorId = vendorId || user?.id;

  const [seriesList, setSeriesList] = useState<InvoiceSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const currentYear = new Date().getFullYear();
  const defaultFy =
    new Date().getMonth() < 3
      ? `${currentYear - 1}-${String(currentYear).slice(-2)}`
      : `${currentYear}-${String(currentYear + 1).slice(-2)}`;

  const [fy, setFy] = useState(defaultFy);
  const [prefix, setPrefix] = useState('INV/');
  const [startNum, setStartNum] = useState<number>(1);
  const [padding, setPadding] = useState<number>(4);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!targetVendorId) return;
    loadSeries();
  }, [targetVendorId]);

  async function loadSeries() {
    setLoading(true);
    try {
      const res = await fetchInvoiceSeries(targetVendorId!);
      setSeriesList(res.series || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Live Next Invoice Number Preview
  const nextNumberPreview = `${prefix}${String(startNum).padStart(padding, '0')}`;
  const isLengthValid = nextNumberPreview.length <= 16;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetVendorId) return;
    if (!isLengthValid) {
      setErrorMsg('Generated invoice number exceeds 16 characters. Please shorten prefix or reduce padding.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);

    try {
      await createInvoiceSeries(targetVendorId, {
        financial_year: fy,
        prefix,
        start_number: startNum,
        padding,
        active: true,
      });
      setModalOpen(false);
      await loadSeries();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save series');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(series: InvoiceSeries) {
    try {
      await updateInvoiceSeries(targetVendorId!, series.id, { active: !series.active });
      await loadSeries();
    } catch (err: any) {
      alert(err.message || 'Failed to update series');
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Multi-Financial Year Invoice Series</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure atomic sequential numbering per financial year (e.g. 2025-26, 2026-27). Max 16 characters, alphanumeric with '/' and '-'.
          </p>
        </div>
        <button
          onClick={() => {
            setFy(defaultFy);
            setPrefix('INV/');
            setStartNum(1);
            setPadding(4);
            setErrorMsg(null);
            setModalOpen(true);
          }}
          className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 shrink-0"
        >
          <span>+</span> Configure New FY Series
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/60 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Financial Year</th>
                <th className="py-3 px-3">Prefix</th>
                <th className="py-3 px-3">Start #</th>
                <th className="py-3 px-3">Last Issued #</th>
                <th className="py-3 px-3">Padding</th>
                <th className="py-3 px-3">Next Invoice #</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {seriesList.map((s) => {
                const nextNum = s.current_number > 0 ? s.current_number + 1 : s.start_number;
                const nextFormatted = `${s.prefix}${String(nextNum).padStart(s.padding, '0')}`;
                return (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-bold text-blue-700">{s.financial_year}</td>
                    <td className="py-3.5 px-3 font-mono font-semibold">{s.prefix}</td>
                    <td className="py-3.5 px-3 font-mono">{s.start_number}</td>
                    <td className="py-3.5 px-3 font-mono text-slate-600">
                      {s.current_number > 0 ? s.current_number : 'None issued yet'}
                    </td>
                    <td className="py-3.5 px-3 font-mono">{s.padding} digits</td>
                    <td className="py-3.5 px-3 font-mono font-bold text-emerald-700">
                      {nextFormatted}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          s.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {s.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => toggleActive(s)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold ${
                          s.active ? 'bg-amber-50 hover:bg-amber-100 text-amber-700' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {s.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!seriesList.length && !loading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No series configured yet. Click "+ Configure New FY Series" above to set one up.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Series Modal */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">Configure Invoice Series</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 text-xl font-bold">×</button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Financial Year (YYYY-YY) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026-27"
                  value={fy}
                  onChange={(e) => setFy(e.target.value.trim())}
                  className="w-full border rounded-lg p-2 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Prefix (Max 8 characters, A-Z, 0-9, /, -) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. INV/ or GST/26/"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9/\-]/g, ''))}
                  className="w-full border rounded-lg p-2 font-mono text-xs uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Number *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={startNum}
                    onChange={(e) => setStartNum(Math.max(1, Number(e.target.value)))}
                    className="w-full border rounded-lg p-2 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Zero-Padding *</label>
                  <select
                    value={padding}
                    onChange={(e) => setPadding(Number(e.target.value))}
                    className="w-full border rounded-lg p-2 text-xs"
                  >
                    {[3, 4, 5, 6].map((p) => (
                      <option key={p} value={p}>{p} digits (e.g. {String(1).padStart(p, '0')})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Next Generated Invoice Number
                </span>
                <span
                  className={`font-mono text-lg font-black block ${
                    isLengthValid ? 'text-blue-700' : 'text-red-600'
                  }`}
                >
                  {nextNumberPreview}
                </span>
                <div className="text-[11px] text-slate-500">
                  Length: <span className="font-bold">{nextNumberPreview.length} / 16</span> characters{' '}
                  {isLengthValid ? '✓ Valid' : '⚠️ Exceeds 16 character GST limit'}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !isLengthValid}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Series'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
