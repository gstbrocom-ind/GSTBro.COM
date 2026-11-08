import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { ItcBreakdown, RawPeriodGstData, sumBreakdown } from '../../lib/itcEngine';

interface OpeningItcModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  existingRecords: RawPeriodGstData[];
  onSaved: () => void;
}

export function OpeningItcModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  existingRecords,
  onSaved,
}: OpeningItcModalProps) {
  // Default to April of current financial year (start of FY)
  const [startPeriod, setStartPeriod] = useState<string>(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    const fyStartYear = currentMonth >= 4 ? currentYear : currentYear - 1;
    return `${fyStartYear}-04`;
  });

  const [totalOpening, setTotalOpening] = useState<number>(0);
  const [igst, setIgst] = useState<number>(0);
  const [cgst, setCgst] = useState<number>(0);
  const [sgst, setSgst] = useState<number>(0);
  const [cess, setCess] = useState<number>(0);
  const [showBreakdown, setShowBreakdown] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Prepopulate existing opening balance if available for the selected start period
  useEffect(() => {
    if (!isOpen) return;
    const record = existingRecords.find((r) => r.period === startPeriod);
    const itcObj = (record?.itc || {}) as Record<string, unknown>;
    const op = (itcObj.openingItc || itcObj.opening || itcObj.openingBalance) as Partial<ItcBreakdown> | undefined;

    if (op) {
      const b = sumBreakdown(op);
      setTotalOpening(b.total);
      setIgst(b.igst);
      setCgst(b.cgst);
      setSgst(b.sgst);
      setCess(b.cess);
      if (b.igst > 0 || b.cgst > 0 || b.sgst > 0) {
        setShowBreakdown(true);
      }
    } else {
      setTotalOpening(0);
      setIgst(0);
      setCgst(0);
      setSgst(0);
      setCess(0);
    }
    setError(null);
    setSuccess(null);
  }, [isOpen, startPeriod, existingRecords]);

  // Handle total input change -> auto-distribute if breakdown not manually set
  const handleTotalChange = (val: number) => {
    setTotalOpening(val);
    if (!showBreakdown) {
      // Standard practical allocation (approx. 50% IGST, 25% CGST, 25% SGST)
      setIgst(Math.round(val * 0.5));
      setCgst(Math.round(val * 0.25));
      setSgst(Math.round(val * 0.25));
      setCess(0);
    }
  };

  // Handle breakdown changes -> auto sum total
  const handleBreakdownChange = (field: 'igst' | 'cgst' | 'sgst' | 'cess', val: number) => {
    const nextIgst = field === 'igst' ? val : igst;
    const nextCgst = field === 'cgst' ? val : cgst;
    const nextSgst = field === 'sgst' ? val : sgst;
    const nextCess = field === 'cess' ? val : cess;
    setIgst(nextIgst);
    setCgst(nextCgst);
    setSgst(nextSgst);
    setCess(nextCess);
    setTotalOpening(nextIgst + nextCgst + nextSgst + nextCess);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !startPeriod) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const finalBreakdown: ItcBreakdown = {
        igst: Math.max(0, Math.round(igst)),
        cgst: Math.max(0, Math.round(cgst)),
        sgst: Math.max(0, Math.round(sgst)),
        cess: Math.max(0, Math.round(cess)),
        total: Math.max(0, Math.round(totalOpening)),
      };

      const existing = existingRecords.find((r) => r.period === startPeriod);
      const existingItc = (existing?.itc || {}) as Record<string, unknown>;

      const payload = {
        period: startPeriod,
        itc: {
          ...existingItc,
          openingItc: finalBreakdown,
          opening: finalBreakdown,
        },
        sales: existing?.sales || {},
        purchases: existing?.purchases || {},
        gstr1: existing?.gstr1 || {},
        gstr3b: existing?.gstr3b || {},
      };

      await apiFetch(`/api/clients/${clientId}/gst-data/${startPeriod}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setSuccess(`✓ Opening ITC balance of ₹${finalBreakdown.total.toLocaleString('en-IN')} saved for ${startPeriod}! Automatic carry-forward applied.`);
      onSaved();
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save opening ITC balance');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const currentYear = new Date().getFullYear();
  const yearOptions = [
    { value: `${currentYear}-04`, label: `April ${currentYear} (FY ${currentYear}-${String(currentYear + 1).slice(2)}) - Current FY` },
    { value: `${currentYear - 1}-04`, label: `April ${currentYear - 1} (FY ${currentYear - 1}-${String(currentYear).slice(2)}) - Previous FY` },
    { value: `${currentYear - 2}-04`, label: `April ${currentYear - 2} (FY ${currentYear - 2}-${String(currentYear - 1).slice(2)})` },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 font-bold text-sm">
              🏦
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Opening Balance of ITC</h3>
              <p className="text-[11px] text-slate-400">
                {clientName} • Start of Financial Year
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {/* Information / Formula Banner */}
          <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs text-blue-900 space-y-1">
            <p className="font-bold text-[11px] uppercase tracking-wide text-blue-800 flex items-center gap-1.5">
              <span>⚡</span> Automatic Rolling Ledger Formula
            </p>
            <p className="text-slate-700 leading-relaxed text-[11px]">
              Enter the starting Opening ITC balance for the financial year. Every subsequent month automatically calculates:
            </p>
            <div className="mt-1.5 py-1.5 px-2 bg-white rounded-lg border border-blue-200 text-[11px] font-mono text-blue-950 font-semibold text-center">
              Opening ITC + Monthly GSTR-3B ITC – GST on Sales = Closing ITC (Next Month Opening)
            </div>
          </div>

          {/* Select Start Period */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Start of Financial Year (Opening Period)
            </label>
            <select
              value={startPeriod}
              onChange={(e) => setStartPeriod(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
            >
              {yearOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              Statutory GST FY begins in April. Opening balance entered here rolls forward automatically across all months.
            </p>
          </div>

          {/* Total Opening ITC Input */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Total Opening ITC Balance (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={totalOpening || ''}
                  onChange={(e) => handleTotalChange(Number(e.target.value))}
                  placeholder="0"
                  required
                  className="w-full pl-8 pr-3 py-2.5 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
                />
              </div>
            </div>

            {/* Toggle Tax Head Breakdown */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
              >
                <span>{showBreakdown ? '▲ Hide' : '▼ Specify'} Tax Head Breakdown (IGST, CGST, SGST)</span>
              </button>
            </div>

            {/* Breakdown Inputs (Collapsible) */}
            {showBreakdown && (
              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                    Opening IGST (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={igst || ''}
                    onChange={(e) => handleBreakdownChange('igst', Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                    Opening CGST (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={cgst || ''}
                    onChange={(e) => handleBreakdownChange('cgst', Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                    Opening SGST (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={sgst || ''}
                    onChange={(e) => handleBreakdownChange('sgst', Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                    Opening Cess (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={cess || ''}
                    onChange={(e) => handleBreakdownChange('cess', Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-semibold">
              {success}
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? 'Saving Opening Balance...' : 'Save & Calculate Ledger →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
