import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  fetchInvoiceItems,
  fetchInvoiceSeries,
  fetchInvoiceCustomers,
  fetchInvoiceTemplates,
  fetchVendorInvoiceProfile,
  fetchInvoiceDetail,
  createSingleInvoice,
  type InvoiceItem,
  type InvoiceSeries,
  type InvoiceCustomer,
  type InvoiceTemplate,
  type VendorInvoiceProfile,
  type Invoice,
  type InvoiceLineItem,
} from '../../../lib/invoiceApi';
import { INDIAN_STATES, getStateCodeByName } from '../../../constants/indianStates';
import { InvoiceDocumentView } from '../../../components/invoice/InvoiceDocumentView';

interface FormLineItem {
  id: string;
  itemId: string;
  itemName: string;
  hsnSac: string;
  unit: string;
  quantity: number | '';
  unitPrice: number | '';
  discountPercent: number | '';
  gstRatePercent: number;
}

export function SingleInvoicePage({
  vendorId,
  onIssued,
  onViewArchive,
}: {
  vendorId?: string;
  onIssued?: (invoiceId: string) => void;
  onViewArchive?: () => void;
}) {
  const { user } = useAuth();
  const targetVendorId = vendorId || user?.id;

  const [loading, setLoading] = useState(true);
  const [vendorProfile, setVendorProfile] = useState<VendorInvoiceProfile | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [seriesList, setSeriesList] = useState<InvoiceSeries[]>([]);
  const [customers, setCustomers] = useState<InvoiceCustomer[]>([]);
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);

  // Invoice Header Form State
  const [selectedSeriesId, setSelectedSeriesId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Buyer Info
  const [customBuyer, setCustomBuyer] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerGstin, setBuyerGstin] = useState('');
  const [buyerState, setBuyerState] = useState('Maharashtra');
  const [buyerStateCode, setBuyerStateCode] = useState('27');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');

  // Line items state
  const [lines, setLines] = useState<FormLineItem[]>([
    {
      id: crypto.randomUUID(),
      itemId: '',
      itemName: '',
      hsnSac: '',
      unit: 'PCS',
      quantity: 1,
      unitPrice: 1000,
      discountPercent: 0,
      gstRatePercent: 18,
    },
  ]);

  // Confirmation & submission state
  const [confirmed, setConfirmed] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Success view & Document preview modal state
  const [issuedResult, setIssuedResult] = useState<{
    id: string;
    invoiceNumber: string;
    grandTotal: number;
    taxableTotal: number;
    cgstTotal: number;
    sgstTotal: number;
    igstTotal: number;
  } | null>(null);

  const [previewDoc, setPreviewDoc] = useState<{
    invoice: Invoice;
    lines: InvoiceLineItem[];
    vendor: VendorInvoiceProfile | null;
  } | null>(null);

  useEffect(() => {
    if (!targetVendorId) return;
    loadPrerequisites();
  }, [targetVendorId]);

  async function loadPrerequisites() {
    setLoading(true);
    try {
      const [profRes, itRes, srRes, cuRes, tpRes] = await Promise.all([
        fetchVendorInvoiceProfile(targetVendorId!),
        fetchInvoiceItems(targetVendorId!),
        fetchInvoiceSeries(targetVendorId!),
        fetchInvoiceCustomers(targetVendorId!),
        fetchInvoiceTemplates(targetVendorId!),
      ]);

      const p = profRes.profile;
      setVendorProfile(p);
      setItems(itRes.items.filter((i) => i.active));
      setSeriesList(srRes.series.filter((s) => s.active));
      setCustomers(cuRes.customers);
      setTemplates(tpRes.templates);

      if (srRes.series.length > 0) {
        setSelectedSeriesId(srRes.series[0].id);
      }

      if (tpRes.templates.length > 0) {
        const def = tpRes.templates.find((t) => t.is_default) || tpRes.templates[0];
        setSelectedTemplateId(def.id);
      }

      if (cuRes.customers.length > 0) {
        const firstCust = cuRes.customers[0];
        setSelectedCustomerId(firstCust.id);
        applyCustomer(firstCust);
      } else {
        setCustomBuyer(true);
        if (p?.state) {
          setBuyerState(p.state);
          setBuyerStateCode(p.state_code || '27');
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to load invoice prerequisites');
    } finally {
      setLoading(false);
    }
  }

  function applyCustomer(c: InvoiceCustomer) {
    setBuyerName(c.name);
    setBuyerGstin(c.gstin || '');
    setBuyerState(c.state || 'Maharashtra');
    setBuyerStateCode(c.state_code || (c.gstin?.length === 15 ? c.gstin.substring(0, 2) : '27'));
    setBuyerAddress(c.address || '');
    setBuyerPhone(c.phone || '');
  }

  function handleCustomerSelect(id: string) {
    setSelectedCustomerId(id);
    const c = customers.find((cust) => cust.id === id);
    if (c) applyCustomer(c);
  }

  // Supply nature: Intra-state vs Inter-state (IGST)
  const vendorStateCode = vendorProfile?.state_code || (vendorProfile?.gstin ? vendorProfile.gstin.substring(0, 2) : '27');
  const isIgst = buyerStateCode.trim() !== vendorStateCode.trim();

  // Calculate live values for a line item
  function computeLineCalculations(l: FormLineItem) {
    const qty = Math.max(0, Number(l.quantity) || 0);
    const price = Math.max(0, Number(l.unitPrice) || 0);
    const discPct = Math.min(100, Math.max(0, Number(l.discountPercent) || 0));
    const gross = qty * price;
    const discountAmount = gross * (discPct / 100);
    const taxableValue = Math.round((gross - discountAmount) * 100) / 100;
    const rate = Math.max(0, Number(l.gstRatePercent) || 0);

    const cgst = isIgst ? 0 : Math.round(taxableValue * (rate / 200) * 100) / 100;
    const sgst = isIgst ? 0 : cgst;
    const igst = isIgst ? Math.round(taxableValue * (rate / 100) * 100) / 100 : 0;
    const totalGst = isIgst ? igst : cgst + sgst;
    const lineTotal = Math.round((taxableValue + totalGst) * 100) / 100;

    return { gross, discountAmount, taxableValue, cgst, sgst, igst, totalGst, lineTotal };
  }

  // Live Invoice Totals
  const totals = useMemo(() => {
    let taxableTotal = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;
    let grandTotal = 0;
    let totalQty = 0;

    for (const l of lines) {
      const calc = computeLineCalculations(l);
      taxableTotal += calc.taxableValue;
      cgstTotal += calc.cgst;
      sgstTotal += calc.sgst;
      igstTotal += calc.igst;
      grandTotal += calc.lineTotal;
      totalQty += Number(l.quantity) || 0;
    }

    return {
      taxableTotal: Math.round(taxableTotal * 100) / 100,
      cgstTotal: Math.round(cgstTotal * 100) / 100,
      sgstTotal: Math.round(sgstTotal * 100) / 100,
      igstTotal: Math.round(igstTotal * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      totalGst: Math.round((cgstTotal + sgstTotal + igstTotal) * 100) / 100,
      totalQty,
    };
  }, [lines, isIgst]);

  // Line item handlers
  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        itemId: '',
        itemName: '',
        hsnSac: '',
        unit: 'PCS',
        quantity: 1,
        unitPrice: 1000,
        discountPercent: 0,
        gstRatePercent: 18,
      },
    ]);
  }

  function removeLine(index: number) {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLine(index: number, updates: Partial<FormLineItem>) {
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...updates } : l))
    );
  }

  function handleSelectCatalogItem(index: number, itemId: string) {
    const item = items.find((i) => i.id === itemId);
    if (!item) {
      updateLine(index, { itemId: '' });
      return;
    }

    // Default rate: use min_price or average
    const defaultRate = item.min_price > 0 ? item.min_price : 100;
    updateLine(index, {
      itemId: item.id,
      itemName: item.name,
      hsnSac: item.hsn_sac || '',
      unit: item.unit || 'PCS',
      unitPrice: defaultRate,
      gstRatePercent: item.gst_rate_percent,
    });
  }

  async function handleIssueInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!targetVendorId) return;

    if (!confirmed) {
      setErrorMsg('You must verify and check the confirmation checkbox before issuing the invoice.');
      return;
    }

    if (!selectedSeriesId) {
      setErrorMsg('Please select an active invoice series.');
      return;
    }

    if (lines.length === 0) {
      setErrorMsg('At least one line item is required.');
      return;
    }

    // Validate line items
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.itemName.trim()) {
        setErrorMsg(`Line #${i + 1} must have an item name.`);
        return;
      }
      if (!l.quantity || Number(l.quantity) <= 0) {
        setErrorMsg(`Line #${i + 1} must have a valid quantity greater than 0.`);
        return;
      }
    }

    setIssuing(true);
    setErrorMsg(null);

    try {
      const payload = {
        seriesId: selectedSeriesId,
        customerId: customBuyer ? null : selectedCustomerId || null,
        buyerName: buyerName.trim() || 'Walk-in Customer',
        buyerGstin: buyerGstin.trim().toUpperCase() || null,
        buyerAddress: buyerAddress.trim() || null,
        buyerState,
        buyerStateCode,
        buyerPhone: buyerPhone.trim() || null,
        invoiceDate,
        templateId: selectedTemplateId || null,
        lines: lines.map((l) => ({
          itemId: l.itemId || null,
          itemName: l.itemName.trim(),
          hsnSac: l.hsnSac.trim() || undefined,
          unit: l.unit.trim() || 'PCS',
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice) || 0,
          discountPercent: Number(l.discountPercent) || 0,
          gstRatePercent: Number(l.gstRatePercent) || 0,
        })),
      };

      const res = await createSingleInvoice(targetVendorId, payload);
      setIssuedResult(res.invoice);
      setConfirmed(false);
      if (onIssued) onIssued(res.invoice.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to issue single invoice');
    } finally {
      setIssuing(false);
    }
  }

  // Open invoice document view directly
  async function handleOpenDocument(invoiceId: string) {
    try {
      const data = await fetchInvoiceDetail(targetVendorId!, invoiceId);
      setPreviewDoc(data);
    } catch (err: any) {
      alert(err.message || 'Failed to load invoice document');
    }
  }

  function handleResetForNext() {
    setIssuedResult(null);
    setPreviewDoc(null);
    setLines([
      {
        id: crypto.randomUUID(),
        itemId: '',
        itemName: '',
        hsnSac: '',
        unit: 'PCS',
        quantity: 1,
        unitPrice: 1000,
        discountPercent: 0,
        gstRatePercent: 18,
      },
    ]);
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-6 rounded-2xl shadow-xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300">
            ✍️ Standard Tax Invoice Creator
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300">
            ⚡ Real-Time Auto GST Calculation
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300">
            🔒 Atomic Sequential Numbering
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-2">Single Tax Invoice Generator</h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
          Create and issue individual GST tax invoices for standard customer sales. Pick existing goods from your catalog or enter custom line items, specify unit rate and quantity, and taxes (CGST+SGST vs IGST) are calculated automatically in real time.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-xs font-semibold text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Main Single Invoice Form */}
      <form onSubmit={handleIssueInvoice} className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-xs">
        
        {/* =================================================================== */}
        {/* SECTION 1: CUSTOMER / BUYER INFORMATION */}
        {/* =================================================================== */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="font-bold text-slate-800 uppercase tracking-wider block">
              1. Customer / Buyer Information
            </span>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customBuyer}
                  onChange={(e) => setCustomBuyer(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="font-semibold text-blue-700">Custom Walk-in Buyer</span>
              </label>

              {/* Live Place of Supply badge */}
              <div
                className={`px-3 py-1 rounded-full font-bold text-[11px] flex items-center gap-1.5 ${
                  isIgst
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                <span>{isIgst ? '🌐' : '📍'}</span>
                <span>
                  {isIgst
                    ? `Inter-State Supply (IGST Applies — Buyer: ${buyerStateCode})`
                    : `Intra-State Supply (CGST + SGST Applies — State: ${vendorStateCode})`}
                </span>
              </div>
            </div>
          </div>

          {!customBuyer ? (
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="max-w-md">
                <label className="block font-semibold text-slate-700 mb-1">Select from Customer Directory:</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="w-full border rounded-lg p-2.5 text-xs font-semibold bg-white"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.gstin ? `(GSTIN: ${c.gstin})` : '(B2C / Walk-in)'} — {c.state || 'Unspecified'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Populated details display */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 text-slate-700">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Buyer Name</span>
                  <span className="font-bold text-slate-900">{buyerName || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">GSTIN</span>
                  <span className="font-mono font-bold text-blue-700">{buyerGstin || 'Unregistered / Consumer'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Place of Supply (State)</span>
                  <span className="font-semibold text-slate-900">{buyerState} (Code {buyerStateCode})</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Phone</span>
                  <span className="font-mono text-slate-700">{buyerPhone || '—'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Buyer Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Reliance Retail Ltd"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full border rounded-lg p-2 text-xs bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Buyer GSTIN (Optional)</label>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="27AABCA1234A1Z5"
                  value={buyerGstin}
                  onChange={(e) => {
                    const g = e.target.value.toUpperCase();
                    setBuyerGstin(g);
                    if (g.length >= 2) {
                      setBuyerStateCode(g.substring(0, 2));
                    }
                  }}
                  className="w-full border rounded-lg p-2 font-mono text-xs uppercase bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Place of Supply (State) *</label>
                <select
                  value={buyerState}
                  onChange={(e) => {
                    const stateName = e.target.value;
                    setBuyerState(stateName);
                    const code = getStateCodeByName(stateName);
                    if (code) setBuyerStateCode(code);
                  }}
                  className="w-full border rounded-lg p-2 text-xs bg-white"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Billing Address (Optional)</label>
                <input
                  type="text"
                  placeholder="Street, City, Pincode"
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                  className="w-full border rounded-lg p-2 text-xs bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Phone (Optional)</label>
                <input
                  type="text"
                  placeholder="+91 9876543210"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  className="w-full border rounded-lg p-2 font-mono text-xs bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* SECTION 2: INVOICE META & NUMBERING SERIES */}
        {/* =================================================================== */}
        <div className="border-t pt-4">
          <span className="font-bold text-slate-800 uppercase tracking-wider block mb-2">
            2. Invoice Metadata & Numbering Series
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Invoice / Issue Date *</label>
              <input
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full border rounded-lg p-2.5 font-mono text-xs font-semibold"
              />
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

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Styling Template:</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full border rounded-lg p-2.5 text-xs font-semibold"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (Title: "{t.custom_title}") {t.is_default ? '★ Default' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* SECTION 3: LINE ITEMS WITH AUTO GST CALCULATIONS */}
        {/* =================================================================== */}
        <div className="border-t pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div>
              <span className="font-bold text-slate-800 uppercase tracking-wider block">
                3. Invoice Line Items (Products & Services)
              </span>
              <span className="text-[11px] text-slate-500">
                Select an item from your catalog or enter custom description. Taxable amount and GST taxes calculate automatically.
              </span>
            </div>

            <button
              type="button"
              onClick={addLine}
              className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 font-bold flex items-center gap-1.5 transition"
            >
              <span>+</span>
              <span>Add Another Item Row</span>
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[700px] text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-2.5 w-8 text-center">#</th>
                  <th className="p-2.5 min-w-[220px]">Item Description</th>
                  <th className="p-2.5 w-24">HSN/SAC</th>
                  <th className="p-2.5 w-24">Units (Qty)</th>
                  <th className="p-2.5 w-20">Unit</th>
                  <th className="p-2.5 w-28">Rate (₹)</th>
                  <th className="p-2.5 w-20">Disc %</th>
                  <th className="p-2.5 w-24">GST Rate</th>
                  <th className="p-2.5 w-28 text-right">Taxable (₹)</th>
                  <th className="p-2.5 w-28 text-right">GST (₹)</th>
                  <th className="p-2.5 w-32 text-right">Total (₹)</th>
                  <th className="p-2.5 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {lines.map((l, index) => {
                  const calc = computeLineCalculations(l);
                  return (
                    <tr key={l.id} className="hover:bg-slate-50/50">
                      {/* S.No */}
                      <td className="p-2.5 text-center font-mono text-slate-400 font-bold">
                        {index + 1}
                      </td>

                      {/* Item Name & Catalog Picker */}
                      <td className="p-2.5 space-y-1.5">
                        <select
                          value={l.itemId}
                          onChange={(e) => handleSelectCatalogItem(index, e.target.value)}
                          className="w-full border rounded-md p-1.5 text-[11px] font-semibold bg-slate-50 text-blue-900 border-slate-200"
                        >
                          <option value="">-- Choose from Catalog or Enter Custom Below --</option>
                          {items.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.name} ({it.gst_rate_percent}% GST) — ₹{it.min_price} to ₹{it.max_price}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          required
                          placeholder="Item name / service description"
                          value={l.itemName}
                          onChange={(e) => updateLine(index, { itemName: e.target.value })}
                          className="w-full border rounded-md p-1.5 text-xs font-medium"
                        />
                      </td>

                      {/* HSN/SAC */}
                      <td className="p-2.5">
                        <input
                          type="text"
                          placeholder="8471"
                          value={l.hsnSac}
                          onChange={(e) => updateLine(index, { hsnSac: e.target.value })}
                          className="w-full border rounded-md p-1.5 text-xs font-mono"
                        />
                      </td>

                      {/* Quantity */}
                      <td className="p-2.5">
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          required
                          value={l.quantity}
                          onChange={(e) =>
                            updateLine(index, {
                              quantity: e.target.value === '' ? '' : Number(e.target.value),
                            })
                          }
                          className="w-full border rounded-md p-1.5 text-xs font-mono font-bold"
                        />
                      </td>

                      {/* Unit */}
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={l.unit}
                          onChange={(e) => updateLine(index, { unit: e.target.value.toUpperCase() })}
                          className="w-full border rounded-md p-1.5 text-xs uppercase font-medium"
                        />
                      </td>

                      {/* Unit Price (Rate) */}
                      <td className="p-2.5">
                        <div className="relative">
                          <span className="absolute left-2 top-1.5 text-slate-400 font-bold text-[10px]">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={l.unitPrice}
                            onChange={(e) =>
                              updateLine(index, {
                                unitPrice: e.target.value === '' ? '' : Number(e.target.value),
                              })
                            }
                            className="w-full border rounded-md pl-5 pr-1.5 py-1.5 text-xs font-mono font-bold"
                          />
                        </div>
                      </td>

                      {/* Discount % */}
                      <td className="p-2.5">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={l.discountPercent}
                          onChange={(e) =>
                            updateLine(index, {
                              discountPercent: e.target.value === '' ? '' : Number(e.target.value),
                            })
                          }
                          className="w-full border rounded-md p-1.5 text-xs font-mono"
                        />
                      </td>

                      {/* GST Rate */}
                      <td className="p-2.5">
                        <select
                          value={l.gstRatePercent}
                          onChange={(e) => updateLine(index, { gstRatePercent: Number(e.target.value) })}
                          className="w-full border rounded-md p-1.5 text-xs font-bold bg-white"
                        >
                          <option value={0}>0% GST</option>
                          <option value={5}>5% GST</option>
                          <option value={12}>12% GST</option>
                          <option value={18}>18% GST</option>
                          <option value={28}>28% GST</option>
                        </select>
                      </td>

                      {/* Calculated Taxable */}
                      <td className="p-2.5 text-right font-mono font-semibold text-slate-900">
                        ₹{calc.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Calculated Tax */}
                      <td className="p-2.5 text-right font-mono text-slate-600">
                        <div>₹{calc.totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        <div className="text-[9px] text-slate-400">
                          {isIgst ? `${l.gstRatePercent}% IGST` : `${l.gstRatePercent / 2}% C+S`}
                        </div>
                      </td>

                      {/* Line Total */}
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900 text-sm">
                        ₹{calc.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Remove Button */}
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          disabled={lines.length <= 1}
                          className="text-slate-400 hover:text-red-600 disabled:opacity-20 font-bold text-base transition"
                          title="Remove row"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* =================================================================== */}
        {/* SECTION 4: REAL-TIME INVOICE TOTALS BREAKDOWN */}
        {/* =================================================================== */}
        <div className="border-t pt-4 flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-2 text-slate-600 max-w-md">
            <span className="font-bold text-slate-800 uppercase tracking-wider block">
              Invoice Summary Notes
            </span>
            <p className="text-[11px] leading-relaxed">
              Amounts are computed per GST rules. If buyer state ({buyerStateCode}) equals vendor state ({vendorStateCode}), CGST and SGST are split evenly (50/50). For inter-state supply, IGST applies on the taxable turnover.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px]">
              <span className="font-semibold text-slate-700 block">
                Total Items: <strong>{lines.length}</strong> | Total Units: <strong>{totals.totalQty}</strong>
              </span>
            </div>
          </div>

          {/* Totals Table */}
          <div className="w-full lg:max-w-md bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-700">
              <span className="font-medium">Subtotal (Taxable Value):</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                ₹{totals.taxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {isIgst ? (
              <div className="flex justify-between items-center text-purple-800">
                <span className="font-medium">Integrated GST (IGST):</span>
                <span className="font-mono font-bold">
                  ₹{totals.igstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center text-slate-700">
                  <span className="font-medium">Central GST (CGST):</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{totals.cgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span className="font-medium">State GST (SGST):</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{totals.sgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            )}

            <div className="flex justify-between items-center text-slate-600 border-t pt-2">
              <span className="font-medium">Total GST Taxes:</span>
              <span className="font-mono font-bold text-slate-800">
                ₹{totals.totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between items-center border-t border-slate-300 pt-3 text-slate-900">
              <span className="text-sm font-black uppercase">Invoice Grand Total:</span>
              <span className="font-mono text-xl font-black text-blue-700">
                ₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* SECTION 5: LEGAL CONFIRMATION & ISSUE BUTTON */}
        {/* =================================================================== */}
        <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
          <input
            type="checkbox"
            id="single-confirm"
            required
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 rounded text-blue-600 w-4 h-4 cursor-pointer"
          />
          <label htmlFor="single-confirm" className="cursor-pointer">
            <span className="font-bold text-blue-900 block">
              Required Legal Confirmation
            </span>
            <span className="text-[11px] text-blue-800 leading-relaxed block mt-0.5">
              I verify and confirm the issuance of this tax invoice for ₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} to {buyerName || 'Walk-in Customer'}. I understand that officially issued invoices are immutable records and cannot be altered once saved.
            </span>
          </label>
        </div>

        {/* Action Button */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
          {onViewArchive && (
            <button
              type="button"
              onClick={onViewArchive}
              className="w-full sm:w-auto px-5 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition text-center"
            >
              Cancel / Invoices Archive
            </button>
          )}

          <button
            type="submit"
            disabled={issuing || !confirmed || totals.grandTotal <= 0}
            className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {issuing ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Issuing Tax Invoice...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Issue Tax Invoice</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* =================================================================== */}
      {/* ISSUED INVOICE SUCCESS MODAL / BANNER */}
      {/* =================================================================== */}
      {issuedResult && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-emerald-200 space-y-5 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">
              ✓
            </div>

            <div>
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest block">
                Official Tax Invoice Issued
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-1 font-mono">
                {issuedResult.invoiceNumber}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Saved to immutable audit ledger. Next invoice number will follow sequence.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-3 text-left">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Taxable Value</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{issuedResult.taxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Invoice Grand Total</span>
                <span className="font-mono text-lg font-black text-blue-700">
                  ₹{issuedResult.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleOpenDocument(issuedResult.id)}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
              >
                <span>👁️</span>
                <span>View, Print & Share PDF</span>
              </button>

              <button
                type="button"
                onClick={handleResetForNext}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition"
              >
                ✍️ Issue Another Invoice
              </button>
            </div>

            {onViewArchive && (
              <button
                type="button"
                onClick={() => {
                  setIssuedResult(null);
                  onViewArchive();
                }}
                className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
              >
                Go to Invoices Archive
              </button>
            )}
          </div>
        </div>
      )}

      {/* Document View / Print Modal */}
      {previewDoc && (
        <div className="modal-backdrop" onClick={() => setPreviewDoc(null)}>
          <div
            className="bg-white rounded-2xl p-4 sm:p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Tax Invoice {previewDoc.invoice.invoice_number}
                </h3>
                <span className="text-xs text-slate-500">
                  Issued on {previewDoc.invoice.invoice_date}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow"
                >
                  🖨️ Print / Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="overflow-x-auto pb-2 -mx-2 sm:mx-0 px-2 sm:px-0 scrollbar-thin">
              <InvoiceDocumentView
                invoice={previewDoc.invoice}
                lines={previewDoc.lines}
                vendor={previewDoc.vendor}
                template={templates.find((t) => t.id === selectedTemplateId) || previewDoc.invoice.template_snapshot}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
