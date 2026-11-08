import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import {
  calculateMultiPeriodItcLedger,
  createEmptyBreakdown,
  PeriodItcLedger,
  RawPeriodGstData,
  sumBreakdown,
} from '../../lib/itcEngine';

interface TeamItcRcmModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  initialPeriod?: string;
  onSaved?: () => void;
}

export function TeamItcRcmModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  initialPeriod,
  onSaved,
}: TeamItcRcmModalProps) {
  const [period, setPeriod] = useState(
    initialPeriod || new Date().toISOString().slice(0, 7)
  );
  const [existingRecords, setExistingRecords] = useState<RawPeriodGstData[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Opening ITC Form State (for initial period)
  const [openingIgst, setOpeningIgst] = useState<number>(0);
  const [openingCgst, setOpeningCgst] = useState<number>(0);
  const [openingSgst, setOpeningSgst] = useState<number>(0);
  const [openingCess, setOpeningCess] = useState<number>(0);

  // Inward ITC Form State
  const [inwardIgst, setInwardIgst] = useState<number>(0);
  const [inwardCgst, setInwardCgst] = useState<number>(0);
  const [inwardSgst, setInwardSgst] = useState<number>(0);
  const [inwardCess, setInwardCess] = useState<number>(0);

  // RCM Form State
  const [rcmTaxableValue, setRcmTaxableValue] = useState<number>(0);
  const [rcmIgst, setRcmIgst] = useState<number>(0);
  const [rcmCgst, setRcmCgst] = useState<number>(0);
  const [rcmSgst, setRcmSgst] = useState<number>(0);
  const [rcmCashPaid, setRcmCashPaid] = useState<number>(0);
  const [rcmItcClaimed, setRcmItcClaimed] = useState<number>(0);

  // Multi-month preview ledger
  const [previewLedger, setPreviewLedger] = useState<PeriodItcLedger[]>([]);

  // Fetch client GST data across periods
  useEffect(() => {
    if (!isOpen || !clientId) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    apiFetch<{ gstData: RawPeriodGstData[] }>(`/api/clients/${clientId}/dashboard`)
      .then((res) => {
        const rows = res.gstData || [];
        setExistingRecords(rows);

        // Find current period data if exists
        const currentPeriodData = rows.find((r) => r.period === period);
        if (currentPeriodData) {
          const itc = (currentPeriodData.itc || {}) as Record<string, unknown>;
          const op = (itc.opening || {}) as Record<string, number>;
          const inw = (itc.inwardItc || {}) as Record<string, number>;
          const rcm = (currentPeriodData.rcm || {}) as Record<string, unknown>;
          const rcmLiab = (rcm.liability || {}) as Record<string, number>;

          setOpeningIgst(op.igst || 0);
          setOpeningCgst(op.cgst || 0);
          setOpeningSgst(op.sgst || 0);
          setOpeningCess(op.cess || 0);

          setInwardIgst(inw.igst || 0);
          setInwardCgst(inw.cgst || 0);
          setInwardSgst(inw.sgst || 0);
          setInwardCess(inw.cess || 0);

          setRcmTaxableValue(Number(rcm.taxableValue) || 0);
          setRcmIgst(rcmLiab.igst || 0);
          setRcmCgst(rcmLiab.cgst || 0);
          setRcmSgst(rcmLiab.sgst || 0);
          setRcmCashPaid(Number(rcm.cashPaid) || 0);
          setRcmItcClaimed(Number(rcm.itcClaimed) || 0);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load client GST data');
      })
      .finally(() => setLoading(false));
  }, [isOpen, clientId, period]);

  // Recalculate ledger preview whenever values change
  useEffect(() => {
    const openingBreakdown = sumBreakdown({
      igst: openingIgst,
      cgst: openingCgst,
      sgst: openingSgst,
      cess: openingCess,
    });

    const inwardBreakdown = sumBreakdown({
      igst: inwardIgst,
      cgst: inwardCgst,
      sgst: inwardSgst,
      cess: inwardCess,
    });

    const rcmLiabBreakdown = sumBreakdown({
      igst: rcmIgst,
      cgst: rcmCgst,
      sgst: rcmSgst,
      cess: 0,
    });

    // Merge current input into existing records for simulation
    const updatedRecords: RawPeriodGstData[] = [...existingRecords];
    const idx = updatedRecords.findIndex((r) => r.period === period);

    const currentSimulated: RawPeriodGstData = {
      period,
      sales: idx >= 0 ? updatedRecords[idx].sales : { taxableSales: 500000, outputTax: 90000 },
      itc: {
        opening: openingBreakdown,
        inwardItc: inwardBreakdown,
        totalItc: inwardBreakdown.total + rcmItcClaimed,
      },
      rcm: {
        taxableValue: rcmTaxableValue,
        liability: rcmLiabBreakdown,
        cashPaid: rcmCashPaid,
        itcClaimed: rcmItcClaimed,
      },
    };

    if (idx >= 0) {
      updatedRecords[idx] = { ...updatedRecords[idx], ...currentSimulated };
    } else {
      updatedRecords.push(currentSimulated);
    }

    const calculated = calculateMultiPeriodItcLedger(updatedRecords, openingBreakdown);
    setPreviewLedger(calculated);
  }, [
    period,
    existingRecords,
    openingIgst,
    openingCgst,
    openingSgst,
    openingCess,
    inwardIgst,
    inwardCgst,
    inwardSgst,
    inwardCess,
    rcmTaxableValue,
    rcmIgst,
    rcmCgst,
    rcmSgst,
    rcmCashPaid,
    rcmItcClaimed,
  ]);

  const handleSave = async () => {
    if (!clientId || !period) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const openingBreakdown = sumBreakdown({
        igst: openingIgst,
        cgst: openingCgst,
        sgst: openingSgst,
        cess: openingCess,
      });

      const inwardBreakdown = sumBreakdown({
        igst: inwardIgst,
        cgst: inwardCgst,
        sgst: inwardSgst,
        cess: inwardCess,
      });

      const rcmLiabBreakdown = sumBreakdown({
        igst: rcmIgst,
        cgst: rcmCgst,
        sgst: rcmSgst,
        cess: 0,
      });

      // Find current period to preserve sales and returns data
      const existing = existingRecords.find((r) => r.period === period);

      const payload = {
        ...existing,
        period,
        itc: {
          ...(existing?.itc || {}),
          opening: openingBreakdown,
          inwardItc: inwardBreakdown,
          totalItc: inwardBreakdown.total + rcmItcClaimed,
        },
        rcm: {
          taxableValue: rcmTaxableValue,
          liability: rcmLiabBreakdown,
          cashPaid: rcmCashPaid,
          itcClaimed: rcmItcClaimed,
        },
      };

      await apiFetch(`/api/clients/${clientId}/gst-data/${period}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setSuccessMsg(`Electronic Credit Ledger & RCM saved for ${period}. Automatic monthly carry-forward applied.`);
      if (onSaved) onSaved();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save ITC & RCM records.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={() => !saving && onClose()}>
      <div
        className="bg-white rounded-2xl p-6 max-w-4xl w-full shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold mb-1">
              <span>⚙️</span> Electronic Credit Ledger & RCM Manager
            </div>
            <h3 className="font-bold text-slate-900 text-lg">
              ITC Opening Balance & Reverse Charge (RCM)
            </h3>
            <p className="text-xs text-slate-500">
              Client: <b>{clientName}</b>. Configure Opening ITC and RCM entries. Subsequent months automatically compute cumulative ITC carry-forward according to Rule 88A.
            </p>
          </div>
          <button
            onClick={() => !saving && onClose()}
            className="text-slate-400 hover:text-slate-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">
            <strong>Error:</strong> {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3 font-semibold flex items-center gap-2">
            <span>✓</span> {successMsg}
          </div>
        )}

        {/* Period Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="font-bold text-slate-700">Filing Period Selection</span>
            <p className="text-slate-400 text-[11px]">Select the target month to enter or reconcile ITC & RCM</p>
          </div>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-xs bg-white text-slate-800 font-bold"
          />
        </div>

        {/* Main Entry Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Section 1: Opening ITC Balance */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <strong className="text-slate-800 font-semibold flex items-center gap-1.5">
                <span>🏦</span> Opening ITC Balance (Carried Forward)
              </strong>
              <span className="text-[10px] text-slate-400 uppercase font-bold">Rule 88A</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Input opening credit for the initial period. All future periods will calculate cumulative carry-forward automatically.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">IGST Credit (₹)</label>
                <input
                  type="number"
                  value={openingIgst}
                  onChange={(e) => setOpeningIgst(Number(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">CGST Credit (₹)</label>
                <input
                  type="number"
                  value={openingCgst}
                  onChange={(e) => setOpeningCgst(Number(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">SGST Credit (₹)</label>
                <input
                  type="number"
                  value={openingSgst}
                  onChange={(e) => setOpeningSgst(Number(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Cess Credit (₹)</label>
                <input
                  type="number"
                  value={openingCess}
                  onChange={(e) => setOpeningCess(Number(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-mono text-xs"
                />
              </div>
            </div>
            <div className="pt-1 text-right font-mono font-bold text-emerald-700 text-xs">
              Total Opening: ₹{(openingIgst + openingCgst + openingSgst + openingCess).toLocaleString('en-IN')}
            </div>
          </div>

          {/* Section 2: Inward ITC of Current Month */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <strong className="text-slate-800 font-semibold flex items-center gap-1.5">
                <span>📥</span> Inward ITC of Period ({period})
              </strong>
              <span className="text-[10px] text-slate-400 uppercase font-bold">GSTR-2B / 3B Table 4</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Tax credit availed on domestic purchase invoices received during this period.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Inward IGST (₹)</label>
                <input
                  type="number"
                  value={inwardIgst}
                  onChange={(e) => setInwardIgst(Number(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Inward CGST (₹)</label>
                <input
                  type="number"
                  value={inwardCgst}
                  onChange={(e) => setInwardCgst(Number(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Inward SGST (₹)</label>
                <input
                  type="number"
                  value={inwardSgst}
                  onChange={(e) => setInwardSgst(Number(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Inward Cess (₹)</label>
                <input
                  type="number"
                  value={inwardCess}
                  onChange={(e) => setInwardCess(Number(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-mono text-xs"
                />
              </div>
            </div>
            <div className="pt-1 text-right font-mono font-bold text-blue-700 text-xs">
              Total Inward ITC: ₹{(inwardIgst + inwardCgst + inwardSgst + inwardCess).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Section 3: Reverse Charge Mechanism (RCM) */}
        <div className="border border-amber-200 bg-amber-50/30 rounded-xl p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-amber-200 pb-2">
            <strong className="text-amber-900 font-semibold flex items-center gap-1.5">
              <span>⚖️</span> Reverse Charge Mechanism (RCM) — Section 9(3) / 9(4)
            </strong>
            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">
              Must be paid in Cash (PMT-06)
            </span>
          </div>
          <p className="text-[11px] text-amber-800">
            Per Section 49(4) CGST Act, RCM liability <b>cannot</b> be adjusted against ITC balances. It must be discharged in cash, after which it becomes eligible for ITC credit.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">RCM Inward Taxable Value (₹)</label>
              <input
                type="number"
                value={rcmTaxableValue}
                onChange={(e) => {
                  const val = Number(e.target.value) || 0;
                  setRcmTaxableValue(val);
                  // auto suggest 18% liability if blank
                  if (!rcmIgst && !rcmCgst && !rcmSgst) {
                    const half = Math.round((val * 0.18) / 2);
                    setRcmCgst(half);
                    setRcmSgst(half);
                    setRcmCashPaid(half * 2);
                    setRcmItcClaimed(half * 2);
                  }
                }}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono text-xs bg-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">RCM Tax Liability (CGST + SGST + IGST)</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  placeholder="CGST"
                  value={rcmCgst}
                  onChange={(e) => setRcmCgst(Number(e.target.value) || 0)}
                  className="w-1/3 px-2 py-1.5 border border-slate-300 rounded-lg font-mono text-xs bg-white"
                />
                <input
                  type="number"
                  placeholder="SGST"
                  value={rcmSgst}
                  onChange={(e) => setRcmSgst(Number(e.target.value) || 0)}
                  className="w-1/3 px-2 py-1.5 border border-slate-300 rounded-lg font-mono text-xs bg-white"
                />
                <input
                  type="number"
                  placeholder="IGST"
                  value={rcmIgst}
                  onChange={(e) => setRcmIgst(Number(e.target.value) || 0)}
                  className="w-1/3 px-2 py-1.5 border border-slate-300 rounded-lg font-mono text-xs bg-white"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">RCM Cash Paid & Claimed as ITC (₹)</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  placeholder="Cash Paid"
                  value={rcmCashPaid}
                  onChange={(e) => setRcmCashPaid(Number(e.target.value) || 0)}
                  className="w-1/2 px-2 py-1.5 border border-slate-300 rounded-lg font-mono text-xs bg-white font-bold text-amber-700"
                />
                <input
                  type="number"
                  placeholder="Eligible ITC"
                  value={rcmItcClaimed}
                  onChange={(e) => setRcmItcClaimed(Number(e.target.value) || 0)}
                  className="w-1/2 px-2 py-1.5 border border-slate-300 rounded-lg font-mono text-xs bg-white font-bold text-emerald-700"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Live Cumulative Multi-Month Ledger Calculation */}
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
          <div className="flex justify-between items-center">
            <strong className="text-slate-800 text-xs font-semibold">
              Live Multi-Period Cumulative ITC & Balance Carry-Forward Simulation
            </strong>
            <span className="text-[10px] text-slate-500 font-mono">
              Auto-Calculated by Engine
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left">
              <thead className="text-slate-600 bg-white font-semibold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2 px-2.5">Period</th>
                  <th className="py-2 px-2.5">Opening ITC</th>
                  <th className="py-2 px-2.5">Inward ITC</th>
                  <th className="py-2 px-2.5">RCM ITC</th>
                  <th className="py-2 px-2.5">Output Liability</th>
                  <th className="py-2 px-2.5">ITC Utilized</th>
                  <th className="py-2 px-2.5 text-emerald-700">Closing Carry Fwd</th>
                  <th className="py-2 px-2.5 text-blue-700">Cash Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {previewLedger.map((rec) => (
                  <tr
                    key={rec.period}
                    className={rec.period === period ? 'bg-blue-50/70 font-bold' : 'hover:bg-white'}
                  >
                    <td className="py-2 px-2.5 font-sans">
                      {rec.period} {rec.period === period && '⚡ (Active)'}
                    </td>
                    <td className="py-2 px-2.5">₹{rec.openingItc.total.toLocaleString('en-IN')}</td>
                    <td className="py-2 px-2.5">₹{rec.inwardItc.total.toLocaleString('en-IN')}</td>
                    <td className="py-2 px-2.5">₹{rec.rcm.itcClaimed.toLocaleString('en-IN')}</td>
                    <td className="py-2 px-2.5 text-amber-700">₹{rec.outputTaxLiability.toLocaleString('en-IN')}</td>
                    <td className="py-2 px-2.5 text-slate-700">₹{rec.itcUtilized.toLocaleString('en-IN')}</td>
                    <td className="py-2 px-2.5 text-emerald-700">₹{rec.closingItc.total.toLocaleString('en-IN')}</td>
                    <td className="py-2 px-2.5 text-blue-700">₹{rec.netCashPayable.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {!previewLedger.length && (
                  <tr>
                    <td colSpan={8} className="py-4 text-center text-slate-400 font-sans">
                      No periods configured yet. Enter values above to preview.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
          >
            {saving ? 'Saving...' : '💾 Save ITC & RCM to Client Portal'}
          </button>
        </div>
      </div>
    </div>
  );
}
