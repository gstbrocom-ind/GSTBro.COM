import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  fetchInvoiceItems,
  fetchInvoiceSeries,
  fetchInvoiceCustomers,
  fetchInvoiceTemplates,
  generateInvoices,
  type InvoiceItem,
  type InvoiceSeries,
  type InvoiceCustomer,
  type InvoiceTemplate,
  type GenerateInvoiceParams,
} from '../../../lib/invoiceApi';
import { INDIAN_STATES } from '../../../constants/indianStates';

export function InvoiceGeneratorPage({
  vendorId,
  onGenerated,
}: {
  vendorId?: string;
  onGenerated?: () => void;
}) {
  const { user } = useAuth();
  const targetVendorId = vendorId || user?.id;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [seriesList, setSeriesList] = useState<InvoiceSeries[]>([]);
  const [customers, setCustomers] = useState<InvoiceCustomer[]>([]);
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);

  // Generator Form State
  const [generationMode, setGenerationMode] = useState<'EXACT' | 'RANGE'>('RANGE');
  const [amountBasis, setAmountBasis] = useState<'TAXABLE_VALUE' | 'GRAND_TOTAL'>('TAXABLE_VALUE');
  const [hasBatchTarget, setHasBatchTarget] = useState(false);
  const [totalBatchTarget, setTotalBatchTarget] = useState<number | ''>('');

  const [selectedSeriesId, setSelectedSeriesId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Date Configuration (Single date vs Range with weekend filtering)
  const [dateMode, setDateMode] = useState<'RANGE' | 'SINGLE'>('RANGE');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // 1st of current month
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [excludeSaturdays, setExcludeSaturdays] = useState(true);
  const [excludeSundays, setExcludeSundays] = useState(true);

  // Goods selection pool
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [itemSearch, setItemSearch] = useState('');

  // Buyer Info (if not selected from directory or custom)
  const [customBuyer, setCustomBuyer] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [buyerGstin, setBuyerGstin] = useState('');
  const [buyerState, setBuyerState] = useState('Maharashtra');

  // Amounts & Count
  const [targetTotal, setTargetTotal] = useState<number>(50000);
  const [minTotal, setMinTotal] = useState<number>(10000);
  const [maxTotal, setMaxTotal] = useState<number>(45000);
  const [count, setCount] = useState<number>(5);

  // Mandatory confirmation checkbox
  const [confirmed, setConfirmed] = useState(false);

  // Status & Feedback
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [batchResult, setBatchResult] = useState<any | null>(null);

  useEffect(() => {
    if (!targetVendorId) return;
    loadPrerequisites();
  }, [targetVendorId]);

  async function loadPrerequisites() {
    setLoading(true);
    try {
      const [itRes, srRes, cuRes, tpRes] = await Promise.all([
        fetchInvoiceItems(targetVendorId!),
        fetchInvoiceSeries(targetVendorId!),
        fetchInvoiceCustomers(targetVendorId!),
        fetchInvoiceTemplates(targetVendorId!),
      ]);

      const activeItems = itRes.items.filter((i) => i.active);
      setItems(activeItems);
      setSelectedItemIds(activeItems.map((i) => i.id)); // select all catalog goods by default
      setSeriesList(srRes.series.filter((s) => s.active));
      setCustomers(cuRes.customers);
      setTemplates(tpRes.templates);

      if (srRes.series.length > 0) {
        setSelectedSeriesId(srRes.series[0].id);
      }
      if (cuRes.customers.length > 0) {
        setSelectedCustomerId(cuRes.customers[0].id);
      }
      if (tpRes.templates.length > 0) {
        const def = tpRes.templates.find((t) => t.is_default) || tpRes.templates[0];
        setSelectedTemplateId(def.id);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Filtered goods based on search keyword
  const filteredItems = useMemo(() => {
    if (!itemSearch.trim()) return items;
    const q = itemSearch.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.hsn_sac && item.hsn_sac.toLowerCase().includes(q))
    );
  }, [items, itemSearch]);

  // Pre-flight checks
  const hasActiveItems = items.length >= 1;
  const hasSelectedItems = selectedItemIds.length >= 1;
  const hasActiveSeries = seriesList.length > 0;
  const canGenerate = hasActiveItems && hasSelectedItems && hasActiveSeries;

  function toggleItemSelection(id: string) {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAllItems() {
    setSelectedItemIds(items.map((i) => i.id));
  }

  function deselectAllItems() {
    setSelectedItemIds([]);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!targetVendorId) return;
    if (!confirmed) {
      setErrorMsg('You must check the confirmation checkbox before generating invoices.');
      return;
    }
    if (selectedItemIds.length === 0) {
      setErrorMsg('Please select at least one item from the goods list for invoice generation.');
      return;
    }
    if (generationMode === 'RANGE' && maxTotal < minTotal) {
      setErrorMsg('Maximum amount must be greater than or equal to minimum amount.');
      return;
    }
    if (dateMode === 'RANGE' && new Date(toDate) < new Date(fromDate)) {
      setErrorMsg('To Date cannot be earlier than From Date.');
      return;
    }

    setGenerating(true);
    setErrorMsg(null);
    setBatchResult(null);

    try {
      const params: GenerateInvoiceParams = {
        seriesId: selectedSeriesId,
        count,
        templateId: selectedTemplateId || null,
        confirmed: true,
        amountBasis,
        itemIds: selectedItemIds,
      };

      if (dateMode === 'RANGE') {
        params.fromDate = fromDate;
        params.toDate = toDate;
        params.excludeSaturdays = excludeSaturdays;
        params.excludeSundays = excludeSundays;
      } else {
        params.invoiceDate = invoiceDate;
      }

      if (customBuyer || !selectedCustomerId) {
        params.buyerName = buyerName || 'Walk-in Customer';
        params.buyerGstin = buyerGstin.toUpperCase().trim() || null;
        params.buyerState = buyerState;
        params.buyerStateCode = buyerGstin.length === 15 ? buyerGstin.substring(0, 2) : '27';
      } else {
        params.customerId = selectedCustomerId;
      }

      if (generationMode === 'EXACT') {
        params.targetTotal = Number(targetTotal);
      } else {
        params.minTotal = Number(minTotal);
        params.maxTotal = Number(maxTotal);
      }

      if (hasBatchTarget && Number(totalBatchTarget) > 0) {
        params.totalBatchTarget = Number(totalBatchTarget);
      }

      const res = await generateInvoices(targetVendorId, params);
      setBatchResult(res.batch);
      setConfirmed(false);
      if (onGenerated) onGenerated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Invoice generation failed');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 sm:p-6 rounded-2xl shadow-xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300">
            ⚡ Exact-Match Multi-Item Generator
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300">
            ✓ Taxable Basis Supported
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300">
            📅 Business Days Calendar
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-2">Bulk GST Tax Invoice Generator</h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
          Generate realistic GST tax invoices matching your exact turnover targets (Taxable value or Grand total). Randomly selects items from your chosen goods, balances quantities, computes exact CGST/SGST/IGST splits, and distributes dates chronologically across working days.
        </p>
      </div>

      {/* Pre-flight Warnings */}
      {!canGenerate && !loading && (
        <div className="bg-amber-50 border border-amber-200 p-4 sm:p-5 rounded-2xl space-y-2 text-xs text-amber-900">
          <div className="font-bold flex items-center gap-2 text-sm text-amber-800">
            <span>⚠️</span> Generation Prerequisites Check
          </div>
          <ul className="list-disc list-inside space-y-1 font-medium">
            {!hasActiveItems && (
              <li>
                You currently have <strong>0</strong> active items in your catalog. Please add items in the Catalog tab first.
              </li>
            )}
            {hasActiveItems && !hasSelectedItems && (
              <li>
                You have not selected any goods in the item selection checklist below. Please check at least one item.
              </li>
            )}
            {!hasActiveSeries && (
              <li>
                No active invoice series configured. Please configure an invoice series in the Series tab.
              </li>
            )}
          </ul>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-xs font-semibold text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Main Generation Form Card */}
      <form onSubmit={handleGenerate} className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-xs">
        
        {/* =================================================================== */}
        {/* 1. AMOUNT BASIS & GENERATION MODES */}
        {/* =================================================================== */}
        <div>
          <span className="font-bold text-slate-800 uppercase tracking-wider block mb-2">
            1. Target Amount Basis & Value Settings
          </span>

          {/* Basis Toggle: Taxable Value vs Grand Total */}
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAmountBasis('TAXABLE_VALUE')}
              className={`p-3.5 rounded-xl border text-left transition ${
                amountBasis === 'TAXABLE_VALUE'
                  ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">Taxable Value (Excluding GST)</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                  Turnover Basis
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                Targets your sales turnover before tax. Line items' taxable values will sum up to your target exactly, and CGST/SGST/IGST are computed on top.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setAmountBasis('GRAND_TOTAL')}
              className={`p-3.5 rounded-xl border text-left transition ${
                amountBasis === 'GRAND_TOTAL'
                  ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">Grand Total (Including GST)</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                  Invoice Final Total
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                Back-calculates taxable values and taxes such that the final invoice grand total (with taxes included) matches your target amount exactly.
              </p>
            </button>
          </div>

          {/* Mode Selector: Exact Amount vs Min-Max Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <button
              type="button"
              onClick={() => setGenerationMode('EXACT')}
              className={`p-3 rounded-xl border text-left transition ${
                generationMode === 'EXACT'
                  ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="font-bold text-slate-900 text-sm">Exact Rupee Amount</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Every generated invoice will match this exact target amount.
              </div>
            </button>

            <button
              type="button"
              onClick={() => setGenerationMode('RANGE')}
              className={`p-3 rounded-xl border text-left transition ${
                generationMode === 'RANGE'
                  ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="font-bold text-slate-900 text-sm">Random Min–Max Range</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Each invoice picks a randomized total within your min and max bounds.
              </div>
            </button>
          </div>

          {/* Amount Inputs */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            {generationMode === 'EXACT' ? (
              <div className="max-w-md">
                <label className="block font-semibold text-slate-700 mb-1">
                  Target Amount per Invoice ({amountBasis === 'TAXABLE_VALUE' ? 'Taxable Value' : 'Grand Total'}) (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min={1}
                    required
                    value={targetTotal}
                    onChange={(e) => setTargetTotal(Number(e.target.value))}
                    className="w-full border rounded-lg pl-8 pr-3 py-2 font-mono text-sm font-bold text-slate-900"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Each invoice will match ₹{targetTotal.toLocaleString('en-IN')}{' '}
                  {amountBasis === 'TAXABLE_VALUE' ? 'taxable turnover (before GST)' : 'grand total (after GST)'}.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Minimum Amount ({amountBasis === 'TAXABLE_VALUE' ? 'Taxable' : 'Grand Total'}) (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={1}
                    required
                    value={minTotal}
                    onChange={(e) => setMinTotal(Number(e.target.value))}
                    className="w-full border rounded-lg p-2 font-mono text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Maximum Amount ({amountBasis === 'TAXABLE_VALUE' ? 'Taxable' : 'Grand Total'}) (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={minTotal}
                    required
                    value={maxTotal}
                    onChange={(e) => setMaxTotal(Number(e.target.value))}
                    className="w-full border rounded-lg p-2 font-mono text-xs font-bold"
                  />
                </div>
              </div>
            )}

            {/* Optional Total Batch Target Input */}
            <div className="pt-2 border-t border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={hasBatchTarget}
                  onChange={(e) => setHasBatchTarget(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="font-bold text-slate-800">
                  Set Exact Total Cumulative Target for Whole Batch
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                  Optional
                </span>
              </label>

              {hasBatchTarget && (
                <div className="max-w-md pl-6">
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min={1}
                      placeholder="e.g. 500000"
                      value={totalBatchTarget}
                      onChange={(e) => setTotalBatchTarget(e.target.value ? Number(e.target.value) : '')}
                      className="w-full border rounded-lg pl-8 pr-3 py-1.5 font-mono text-xs font-bold text-slate-900"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    The engine will partition this total across all {count} invoices so their combined sum equals exactly ₹{Number(totalBatchTarget || 0).toLocaleString('en-IN')}.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 2. INVOICE DATE RANGE & BUSINESS DAYS (WEEKEND EXCLUSIONS) */}
        {/* =================================================================== */}
        <div className="border-t pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <span className="font-bold text-slate-800 uppercase tracking-wider block">
              2. Invoice Date & Working Days Calendar
            </span>
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setDateMode('RANGE')}
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition ${
                  dateMode === 'RANGE'
                    ? 'bg-white shadow-xs text-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📅 Date Range
              </button>
              <button
                type="button"
                onClick={() => setDateMode('SINGLE')}
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition ${
                  dateMode === 'SINGLE'
                    ? 'bg-white shadow-xs text-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Single Date
              </button>
            </div>
          </div>

          {dateMode === 'RANGE' ? (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">From Date *</label>
                  <input
                    type="date"
                    required
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full border rounded-lg p-2 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">To Date *</label>
                  <input
                    type="date"
                    required
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full border rounded-lg p-2 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Weekend exclusions */}
              <div className="flex flex-wrap items-center gap-6 pt-1">
                <span className="font-semibold text-slate-700 text-xs">Weekend Options:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={excludeSundays}
                    onChange={(e) => setExcludeSundays(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span className="text-slate-700 font-medium">Exclude Sundays (Skip Sundays)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={excludeSaturdays}
                    onChange={(e) => setExcludeSaturdays(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span className="text-slate-700 font-medium">Exclude Saturdays (Skip Saturdays)</span>
                </label>
              </div>

              <span className="text-[10px] text-slate-500 block">
                ℹ️ The batch engine will distribute invoice dates sequentially across the eligible business days, keeping invoice numbering strictly chronological.
              </span>
            </div>
          ) : (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 max-w-sm">
              <label className="block font-semibold text-slate-700 mb-1">Fixed Invoice / Sale Date *</label>
              <input
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full border rounded-lg p-2 text-xs font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                All generated invoices in this batch will share this exact date.
              </span>
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* 3. INVOICES COUNT & SERIES SELECTION */}
        {/* =================================================================== */}
        <div className="border-t pt-4">
          <span className="font-bold text-slate-800 uppercase tracking-wider block mb-2">
            3. Invoices Count & Series
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Number of Invoices *</label>
              <input
                type="number"
                min={1}
                max={200}
                required
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(200, Number(e.target.value))))}
                className="w-full border rounded-lg p-2.5 font-mono text-xs font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">1 to 200 invoices per batch</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Invoice Series *</label>
              <select
                value={selectedSeriesId}
                onChange={(e) => setSelectedSeriesId(e.target.value)}
                className="w-full border rounded-lg p-2.5 text-xs font-semibold"
              >
                {seriesList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.financial_year} — Prefix: {s.prefix} (Next #{s.current_number + 1})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 4. SELECT GOODS / ITEMS TO TAKE RANDOMLY FROM CATALOG */}
        {/* =================================================================== */}
        <div className="border-t pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div>
              <span className="font-bold text-slate-800 uppercase tracking-wider block">
                4. Select Goods to Include in Random Generation
              </span>
              <span className="text-[11px] text-slate-500">
                Choose which catalog goods can be randomly selected for line items in this batch ({selectedItemIds.length} of {items.length} selected).
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAllItems}
                className="px-2.5 py-1 text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={deselectAllItems}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200"
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Search box */}
          <div className="mb-2">
            <input
              type="text"
              placeholder="Search goods by item name or HSN/SAC..."
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              className="w-full sm:max-w-md border rounded-lg px-3 py-1.5 text-xs"
            />
          </div>

          {/* Items checklist table */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-60 overflow-y-auto scrollbar-thin">
            <table className="w-full min-w-[500px] text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-600 sticky top-0 font-semibold z-10">
                <tr>
                  <th className="p-2.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={items.length > 0 && selectedItemIds.length === items.length}
                      onChange={(e) => {
                        if (e.target.checked) selectAllItems();
                        else deselectAllItems();
                      }}
                      className="rounded text-blue-600"
                    />
                  </th>
                  <th className="p-2.5">Item Name</th>
                  <th className="p-2.5">HSN/SAC</th>
                  <th className="p-2.5">GST Rate</th>
                  <th className="p-2.5">Unit</th>
                  <th className="p-2.5">Price Range (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-slate-400">
                      {items.length === 0
                        ? 'No active items found. Please add items in the Catalog tab.'
                        : 'No items match your search.'}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isSelected = selectedItemIds.includes(item.id);
                    return (
                      <tr
                        key={item.id}
                        onClick={() => toggleItemSelection(item.id)}
                        className={`cursor-pointer transition hover:bg-blue-50/50 ${
                          isSelected ? 'bg-blue-50/20' : 'opacity-60'
                        }`}
                      >
                        <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleItemSelection(item.id)}
                            className="rounded text-blue-600"
                          />
                        </td>
                        <td className="p-2.5 font-bold text-slate-900">{item.name}</td>
                        <td className="p-2.5 font-mono text-slate-600">{item.hsn_sac || '—'}</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border">
                            {item.gst_rate_percent}% GST
                          </span>
                        </td>
                        <td className="p-2.5 uppercase font-medium text-slate-600">{item.unit}</td>
                        <td className="p-2.5 font-mono font-semibold text-slate-800">
                          ₹{Number(item.min_price).toLocaleString('en-IN')} – ₹{Number(item.max_price).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {selectedItemIds.length === 0 && (
            <p className="text-[11px] text-red-600 font-semibold mt-1">
              ⚠️ You must select at least one item to proceed with invoice generation.
            </p>
          )}
        </div>

        {/* =================================================================== */}
        {/* 5. CUSTOMER / BUYER SELECTION */}
        {/* =================================================================== */}
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 uppercase tracking-wider block">
              5. Customer / Buyer Details
            </span>
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={customBuyer}
                onChange={(e) => setCustomBuyer(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span className="font-semibold text-blue-700">Enter custom walk-in buyer</span>
            </label>
          </div>

          {!customBuyer ? (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select from Customer Directory:</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full border rounded-lg p-2.5 text-xs font-semibold"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.gstin ? `(GSTIN: ${c.gstin})` : '(B2C / Walk-in)'} — {c.state || 'State Unspecified'}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Buyer Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full border rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Buyer GSTIN (Optional)</label>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="27AABCA1234A1Z5"
                  value={buyerGstin}
                  onChange={(e) => setBuyerGstin(e.target.value.toUpperCase())}
                  className="w-full border rounded-lg p-2 font-mono text-xs uppercase"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Place of Supply (State) *</label>
                <select
                  value={buyerState}
                  onChange={(e) => setBuyerState(e.target.value)}
                  className="w-full border rounded-lg p-2 text-xs"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* 6. TEMPLATE SELECTOR */}
        {/* =================================================================== */}
        <div className="border-t pt-4">
          <label className="block font-semibold text-slate-700 mb-1">Invoice Styling Template:</label>
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="w-full max-w-sm border rounded-lg p-2 text-xs"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} (Title: "{t.custom_title}") {t.is_default ? '★ Default' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* =================================================================== */}
        {/* 7. REQUIRED LEGAL CONFIRMATION */}
        {/* =================================================================== */}
        <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
          <input
            type="checkbox"
            id="gen-confirm"
            required
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 rounded text-blue-600 w-4 h-4 cursor-pointer"
          />
          <label htmlFor="gen-confirm" className="cursor-pointer">
            <span className="font-bold text-blue-900 block">
              Required Legal Confirmation
            </span>
            <span className="text-[11px] text-blue-800 leading-relaxed block mt-0.5">
              I confirm the generation of <strong>{count}</strong> official GST tax invoice(s)
              {dateMode === 'RANGE' ? ` across ${fromDate} to ${toDate}` : ` dated ${invoiceDate}`}
              {' '}with target basis: <strong>{amountBasis === 'TAXABLE_VALUE' ? 'Taxable Value (Turnover before GST)' : 'Grand Total (Including GST)'}</strong>
              {hasBatchTarget && totalBatchTarget ? ` totaling ₹${Number(totalBatchTarget).toLocaleString('en-IN')}` : ''}
              {' '}picking randomly from <strong>{selectedItemIds.length}</strong> selected goods.
              I understand that issued tax invoices are immutable audit records and cannot be edited or deleted once generated.
            </span>
          </label>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={generating || !canGenerate || !confirmed || selectedItemIds.length === 0}
            className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Generating Exact Matches...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Generate Invoices Now</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* =================================================================== */}
      {/* BATCH GENERATION FEEDBACK */}
      {/* =================================================================== */}
      {batchResult && (
        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-emerald-800 tracking-wider">
                ✓ Generation Completed Successfully
              </span>
              <h3 className="text-lg font-bold text-emerald-950 mt-0.5">
                Generated {batchResult.count} Invoices (Total: ₹
                {batchResult.totalAmount.toLocaleString('en-IN')})
              </h3>
            </div>
            <span className="text-xs font-mono text-emerald-700 bg-white px-3 py-1 rounded-full border border-emerald-200">
              Batch: {batchResult.batchId.substring(0, 8)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {batchResult.invoices.map((inv: any) => (
              <div
                key={inv.id}
                className="bg-white p-3 rounded-xl border border-emerald-200 text-center shadow-xs"
              >
                <span className="font-mono font-bold text-blue-700 block text-xs">
                  {inv.invoiceNumber}
                </span>
                <span className="font-mono text-sm font-black text-slate-900 mt-1 block">
                  ₹{Number(inv.grandTotal).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 text-right">
            <span className="text-xs text-emerald-800 font-semibold">
              All invoices saved to your vault. Navigate to the Invoices tab to view, print, or share via WhatsApp.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
