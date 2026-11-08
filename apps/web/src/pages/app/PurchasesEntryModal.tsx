import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import type { RawPeriodGstData } from '../../lib/itcEngine';

interface PurchasesEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  existingRecords: RawPeriodGstData[];
  defaultPeriod?: string;
  onSaved: () => void;
}

export function PurchasesEntryModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  existingRecords,
  defaultPeriod,
  onSaved,
}: PurchasesEntryModalProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    if (defaultPeriod) return defaultPeriod;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [taxableValue, setTaxableValue] = useState<number>(0);
  const [invoiceCount, setInvoiceCount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Sync with defaultPeriod if passed or changed
  useEffect(() => {
    if (defaultPeriod) {
      setSelectedPeriod(defaultPeriod);
    }
  }, [defaultPeriod]);

  // Load existing purchase data for the selected period
  useEffect(() => {
    if (!isOpen) return;
    const rec = existingRecords.find((r) => r.period === selectedPeriod);
    const p = (rec?.purchases || {}) as Record<string, unknown>;
    const existingVal = Number(p.taxablePurchases ?? p.total ?? p.taxable_purchase ?? p.taxable_purchases ?? 0);
    setTaxableValue(existingVal);
    setInvoiceCount(p.invoiceCount ? String(p.invoiceCount) : '');
    setNotes(p.notes ? String(p.notes) : '');
    setError(null);
    setSuccess(null);
  }, [isOpen, selectedPeriod, existingRecords]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !selectedPeriod) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const rec = existingRecords.find((r) => r.period === selectedPeriod);
      const existingPurchases = (rec?.purchases || {}) as Record<string, unknown>;

      const updatedPurchases = {
        ...existingPurchases,
        taxablePurchases: Number(taxableValue) || 0,
        total: Number(taxableValue) || 0,
        taxable_purchases: Number(taxableValue) || 0,
        invoiceCount: invoiceCount ? Number(invoiceCount) : undefined,
        notes: notes.trim() || undefined,
        updatedAt: new Date().toISOString(),
      };

      await apiFetch(`/api/clients/${clientId}/gst-data/${selectedPeriod}`, {
        method: 'PUT',
        body: JSON.stringify({
          purchases: updatedPurchases,
        }),
      });

      setSuccess(`✓ Purchases for ${selectedPeriod} saved successfully! Reflected in Client Dashboard.`);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save purchases value.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 text-white p-5 flex justify-between items-start">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider mb-1.5 backdrop-blur-xs">
              <span>🛒</span> Team Data Entry
            </div>
            <h2 className="text-base font-bold text-white">Enter Purchases Taxable Value</h2>
            <p className="text-xs text-indigo-100 mt-0.5">
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

        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 leading-relaxed">
            💡 <b>Note:</b> GSTR-3B returns contain only ITC tax credits, not purchase turnover. Enter the client's actual taxable purchases here; it will immediately show on the client's dashboard overview, monthly trends, and expense metrics.
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-medium">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl font-semibold">
              {success}
            </div>
          )}

          {/* Period Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Select Return Month (Period)
            </label>
            <input
              type="month"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-hidden transition"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Format: YYYY-MM (e.g. 2026-05 for May 2026)
            </span>
          </div>

          {/* Taxable Purchases Value */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Taxable Purchases Value (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">₹</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={taxableValue || ''}
                onChange={(e) => setTaxableValue(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                required
                className="w-full pl-8 pr-4 py-2.5 text-base font-mono font-bold text-indigo-950 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-hidden transition"
              />
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block font-medium">
              Amount in words: ₹{taxableValue.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Optional Bill Count & Remarks */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                Total Bills (Optional)
              </label>
              <input
                type="number"
                min="0"
                value={invoiceCount}
                onChange={(e) => setInvoiceCount(e.target.value)}
                placeholder="e.g. 15"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                Source / Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Purchase Register"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white outline-hidden"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="animate-spin text-sm">⏳</span> Saving...
                </>
              ) : (
                <>
                  <span>💾</span> Save &amp; Update Client Dashboard
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
