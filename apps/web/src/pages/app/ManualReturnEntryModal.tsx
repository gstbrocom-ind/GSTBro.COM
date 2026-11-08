import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import type { RawPeriodGstData } from '../../lib/itcEngine';

interface ManualReturnEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  existingRecords: RawPeriodGstData[];
  defaultPeriod?: string;
  defaultRowData?: RawPeriodGstData | null;
  onSaved: () => void;
}

export function ManualReturnEntryModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  existingRecords,
  defaultPeriod,
  defaultRowData,
  onSaved,
}: ManualReturnEntryModalProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    if (defaultPeriod) return defaultPeriod;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Active form section
  const [activeSection, setActiveSection] = useState<'ALL' | 'GSTR1' | 'GSTR3B'>('ALL');

  // GSTR-1 state
  const [g1Turnover, setG1Turnover] = useState<number | string>(0);
  const [g1Tax, setG1Tax] = useState<number | string>(0);
  const [g1Arn, setG1Arn] = useState<string>('');
  const [g1Date, setG1Date] = useState<string>('');
  const [g1Filed, setG1Filed] = useState<boolean>(false);

  // GSTR-3B state
  const [g3bTurnover, setG3bTurnover] = useState<number | string>(0);
  const [g3bTax, setG3bTax] = useState<number | string>(0);
  const [g3bItc, setG3bItc] = useState<number | string>(0);
  const [g3bCash, setG3bCash] = useState<number | string>(0);
  const [g3bArn, setG3bArn] = useState<string>('');
  const [g3bDate, setG3bDate] = useState<string>('');
  const [g3bFiled, setG3bFiled] = useState<boolean>(false);

  // Purchases
  const [purchasesVal, setPurchasesVal] = useState<number | string>(0);

  // Async state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Sync with defaultPeriod if passed
  useEffect(() => {
    if (defaultPeriod) {
      setSelectedPeriod(defaultPeriod);
    }
  }, [defaultPeriod]);

  // Load existing data for selectedPeriod
  useEffect(() => {
    if (!isOpen) return;

    const row = defaultRowData && defaultRowData.period === selectedPeriod
      ? defaultRowData
      : existingRecords.find((r) => r.period === selectedPeriod);

    const g1 = (row?.gstr1 || {}) as Record<string, unknown>;
    const g3b = (row?.gstr3b || {}) as Record<string, unknown>;
    const sales = (row?.sales || {}) as Record<string, unknown>;
    const itc = (row?.itc || {}) as Record<string, unknown>;
    const purchases = (row?.purchases || {}) as Record<string, unknown>;

    // GSTR-1
    const tG1Turnover = Number(g1.taxableSales ?? g1.taxableValue ?? sales.taxableSales ?? 0);
    const tG1Tax = Number(g1.totalTax ?? sales.outputTax ?? 0);
    const tG1Arn = String(g1.arn || '');
    const tG1Date = String(g1.filingDate || g1.arnDate || '');
    const isG1Done = Boolean(tG1Arn) || Object.keys(g1).length > 0;

    setG1Turnover(tG1Turnover || '');
    setG1Tax(tG1Tax || '');
    setG1Arn(tG1Arn);
    setG1Date(tG1Date);
    setG1Filed(isG1Done);

    // GSTR-3B
    const tG3bTurnover = Number(g3b.outwardTaxable ?? sales.taxableSales ?? 0);
    const tG3bTax = Number(g3b.outwardTax ?? sales.outputTax ?? 0);
    const tG3bItc = Number(g3b.itcAvailable ?? itc.totalItc ?? (itc.inwardItc as any)?.total ?? 0);
    const tG3bCash = Number(g3b.cashPaid ?? sales.cashTaxPaid ?? 0);
    const tG3bArn = String(g3b.arn || '');
    const tG3bDate = String(g3b.filingDate || g3b.arnDate || '');
    const isG3bDone = Boolean(tG3bArn) || Object.keys(g3b).length > 0;

    setG3bTurnover(tG3bTurnover || '');
    setG3bTax(tG3bTax || '');
    setG3bItc(tG3bItc || '');
    setG3bCash(tG3bCash || '');
    setG3bArn(tG3bArn);
    setG3bDate(tG3bDate);
    setG3bFiled(isG3bDone);

    // Purchases
    const tPurchases = Number(purchases.taxablePurchases ?? purchases.total ?? purchases.taxable_purchase ?? 0);
    setPurchasesVal(tPurchases || '');

    setError(null);
    setSuccess(null);
  }, [isOpen, selectedPeriod, defaultRowData, existingRecords]);

  if (!isOpen) return null;

  const handleCopyG1ToG3b = () => {
    setG3bTurnover(g1Turnover);
    setG3bTax(g1Tax);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !selectedPeriod) {
      setError('Client ID and Period are required.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const existing = existingRecords.find((r) => r.period === selectedPeriod);
      const existingG1 = (existing?.gstr1 || {}) as Record<string, unknown>;
      const existingG3b = (existing?.gstr3b || {}) as Record<string, unknown>;
      const existingSales = (existing?.sales || {}) as Record<string, unknown>;
      const existingItc = (existing?.itc || {}) as Record<string, unknown>;
      const existingPurchases = (existing?.purchases || {}) as Record<string, unknown>;

      const numG1Turnover = Number(g1Turnover) || 0;
      const numG1Tax = Number(g1Tax) || 0;
      const cleanG1Arn = g1Arn.trim();
      const cleanG1Date = g1Date.trim();

      const numG3bTurnover = Number(g3bTurnover) || 0;
      const numG3bTax = Number(g3bTax) || 0;
      const numG3bItc = Number(g3bItc) || 0;
      const numG3bCash = Number(g3bCash) || 0;
      const cleanG3bArn = g3bArn.trim();
      const cleanG3bDate = g3bDate.trim();

      const numPurchases = Number(purchasesVal) || 0;

      const payload = {
        gstr1: {
          ...existingG1,
          taxableSales: numG1Turnover,
          taxableValue: numG1Turnover,
          totalTax: numG1Tax,
          arn: cleanG1Arn,
          arnDate: cleanG1Date,
          filingDate: cleanG1Date,
          isFiled: Boolean(cleanG1Arn) || g1Filed,
          manualEntry: true,
          updatedAt: new Date().toISOString(),
        },
        gstr3b: {
          ...existingG3b,
          outwardTaxable: numG3bTurnover,
          outwardTax: numG3bTax,
          outwardTotalTax: numG3bTax,
          itcAvailable: numG3bItc,
          cashPaid: numG3bCash,
          arn: cleanG3bArn,
          arnDate: cleanG3bDate,
          filingDate: cleanG3bDate,
          isFiled: Boolean(cleanG3bArn) || g3bFiled,
          manualEntry: true,
          updatedAt: new Date().toISOString(),
        },
        sales: {
          ...existingSales,
          taxableSales: numG1Turnover || numG3bTurnover,
          outputTax: numG1Tax || numG3bTax,
          cashTaxPaid: numG3bCash,
          updatedAt: new Date().toISOString(),
        },
        itc: {
          ...existingItc,
          totalItc: numG3bItc,
          updatedAt: new Date().toISOString(),
        },
        purchases: {
          ...existingPurchases,
          taxablePurchases: numPurchases,
          total: numPurchases,
          taxable_purchases: numPurchases,
          updatedAt: new Date().toISOString(),
        },
      };

      await apiFetch(`/api/clients/${clientId}/gst-data/${selectedPeriod}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setSuccess(`✓ Return details for ${selectedPeriod} successfully saved and synced!`);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 900);
    } catch (err: any) {
      setError(err?.message || 'Failed to save return details. Please verify your inputs.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 text-white p-5 flex justify-between items-start">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider mb-1.5 backdrop-blur-xs">
              <span>✍️</span> Statutory Return Override
            </div>
            <h2 className="text-lg font-bold text-white">Manual GSTR-1 &amp; GSTR-3B Entry</h2>
            <p className="text-xs text-blue-100 mt-0.5">
              Client: <span className="font-semibold text-white">{clientName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl font-bold leading-none p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[calc(85vh-120px)] overflow-y-auto">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 text-xs text-blue-900 leading-relaxed flex items-start gap-2.5">
            <span className="text-base leading-none">💡</span>
            <div>
              <b>Team Override &amp; Recovery:</b> When automatic PDF or JSON extraction fails during return upload, enter or correct the statutory turnover, output tax, eligible ITC, and official Government ARN details here. All numbers immediately update the registry, MIS trends, and client dashboard.
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-xl font-medium">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3.5 rounded-xl font-semibold">
              {success}
            </div>
          )}

          {/* Period Selector & Navigation */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Return Month (Period)
                </label>
                <input
                  type="month"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  required
                  className="px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden transition"
                />
              </div>

              {/* View filter buttons */}
              <div className="flex gap-1.5 self-end sm:self-auto bg-slate-200/70 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveSection('ALL')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    activeSection === 'ALL'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Combined
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('GSTR1')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    activeSection === 'GSTR1'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  GSTR-1
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('GSTR3B')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    activeSection === 'GSTR3B'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  GSTR-3B
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 1: FORM GSTR-1 */}
          {(activeSection === 'ALL' || activeSection === 'GSTR1') && (
            <div className="border border-blue-200 rounded-2xl p-4.5 bg-blue-50/30 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-blue-200/80">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <h3 className="text-sm font-bold text-blue-950 uppercase tracking-wider">
                    Form GSTR-1 (Outward Supplies)
                  </h3>
                </div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={g1Filed}
                    onChange={(e) => setG1Filed(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Mark as Filed</span>
                </label>
              </div>

              <div className="grid sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GSTR-1 Taxable Turnover (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={g1Turnover}
                    onChange={(e) => setG1Turnover(e.target.value)}
                    placeholder="e.g. 485000"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden transition"
                  />
                  {Number(g1Turnover) > 0 && (
                    <span className="text-[11px] font-mono text-slate-500 mt-1 block">
                      ≈ ₹{Number(g1Turnover).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GSTR-1 Output Tax Liability (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={g1Tax}
                    onChange={(e) => setG1Tax(e.target.value)}
                    placeholder="e.g. 87300"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden transition"
                  />
                  {Number(g1Tax) > 0 && (
                    <span className="text-[11px] font-mono text-slate-500 mt-1 block">
                      ≈ ₹{Number(g1Tax).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GSTR-1 ARN Reference
                  </label>
                  <input
                    type="text"
                    value={g1Arn}
                    onChange={(e) => {
                      setG1Arn(e.target.value);
                      if (e.target.value.trim()) setG1Filed(true);
                    }}
                    placeholder="e.g. AA330826909972S"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono uppercase focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GSTR-1 Filing / ARN Date
                  </label>
                  <input
                    type="text"
                    value={g1Date}
                    onChange={(e) => setG1Date(e.target.value)}
                    placeholder="YYYY-MM-DD or DD/MM/YYYY"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: FORM GSTR-3B */}
          {(activeSection === 'ALL' || activeSection === 'GSTR3B') && (
            <div className="border border-indigo-200 rounded-2xl p-4.5 bg-indigo-50/30 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-indigo-200/80">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider">
                    Form GSTR-3B (Summary Return &amp; Cash Settlement)
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  {Number(g1Turnover) > 0 && (
                    <button
                      type="button"
                      onClick={handleCopyG1ToG3b}
                      className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-100/70 hover:bg-indigo-100 px-2 py-0.5 rounded-lg transition cursor-pointer"
                      title="Copy GSTR-1 turnover and tax to GSTR-3B"
                    >
                      ⎘ Copy from GSTR-1
                    </button>
                  )}
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={g3bFiled}
                      onChange={(e) => setG3bFiled(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Mark as Filed</span>
                  </label>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GSTR-3B Taxable Turnover (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={g3bTurnover}
                    onChange={(e) => setG3bTurnover(e.target.value)}
                    placeholder="e.g. 485000"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-hidden transition"
                  />
                  {Number(g3bTurnover) > 0 && (
                    <span className="text-[11px] font-mono text-slate-500 mt-1 block">
                      ≈ ₹{Number(g3bTurnover).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GSTR-3B Output Tax Liability (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={g3bTax}
                    onChange={(e) => setG3bTax(e.target.value)}
                    placeholder="e.g. 87300"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-hidden transition"
                  />
                  {Number(g3bTax) > 0 && (
                    <span className="text-[11px] font-mono text-slate-500 mt-1 block">
                      ≈ ₹{Number(g3bTax).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-800 mb-1 font-bold">
                    Eligible ITC Claimed (Table 4) (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={g3bItc}
                    onChange={(e) => setG3bItc(e.target.value)}
                    placeholder="e.g. 61560"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-emerald-300 rounded-xl font-mono font-bold text-emerald-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-hidden transition"
                  />
                  {Number(g3bItc) > 0 && (
                    <span className="text-[11px] font-mono text-emerald-600 mt-1 block">
                      ≈ ₹{Number(g3bItc).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-blue-800 mb-1 font-bold">
                    Cash Tax Paid (PMT-06 / Table 6.1) (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={g3bCash}
                    onChange={(e) => setG3bCash(e.target.value)}
                    placeholder="e.g. 1350"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-blue-300 rounded-xl font-mono font-bold text-blue-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden transition"
                  />
                  {Number(g3bCash) > 0 && (
                    <span className="text-[11px] font-mono text-blue-600 mt-1 block">
                      ≈ ₹{Number(g3bCash).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GSTR-3B ARN Reference
                  </label>
                  <input
                    type="text"
                    value={g3bArn}
                    onChange={(e) => {
                      setG3bArn(e.target.value);
                      if (e.target.value.trim()) setG3bFiled(true);
                    }}
                    placeholder="e.g. AB3308269501519"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono uppercase focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-hidden transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GSTR-3B Filing / ARN Date
                  </label>
                  <input
                    type="text"
                    value={g3bDate}
                    onChange={(e) => setG3bDate(e.target.value)}
                    placeholder="YYYY-MM-DD or DD/MM/YYYY"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-hidden transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: PURCHASES TAXABLE VALUE */}
          {activeSection === 'ALL' && (
            <div className="border border-purple-200 rounded-2xl p-4.5 bg-purple-50/30 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-purple-200/80">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                <h3 className="text-sm font-bold text-purple-950 uppercase tracking-wider">
                  Purchases Taxable Turnover (₹)
                </h3>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Taxable Purchases Value (Inward B2B Supplies)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={purchasesVal}
                  onChange={(e) => setPurchasesVal(e.target.value)}
                  placeholder="e.g. 342000"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-hidden transition"
                />
                {Number(purchasesVal) > 0 && (
                  <span className="text-[11px] font-mono text-purple-700 mt-1 block">
                    ≈ ₹{Number(purchasesVal).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {saving ? (
                <>
                  <span className="animate-spin text-sm">↻</span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>Save Return Details</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
