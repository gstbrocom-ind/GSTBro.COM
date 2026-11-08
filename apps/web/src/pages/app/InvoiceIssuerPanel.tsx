import { useState, useEffect } from 'react';

export interface PreservedInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  buyerName: string;
  buyerGstin: string;
  placeOfSupply: string;
  taxableAmount: number;
  igst: number;
  cgst: number;
  sgst: number;
  totalAmount: number;
  status: 'DRAFT' | 'ISSUED' | 'TEAM_SYNCED';
  itemsCount: number;
  createdAt: string;
}

const STORAGE_KEY = 'gstbro_preserved_invoices';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi'
];

export function InvoiceIssuerPanel({
  clientState,
}: {
  clientBusinessName?: string | null;
  clientGstin?: string | null;
  clientState?: string | null;
}) {
  const [invoices, setInvoices] = useState<PreservedInvoice[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        id: 'inv-1',
        invoiceNumber: 'INV-2026-0042',
        invoiceDate: '2026-04-12',
        buyerName: 'Nexus Global Technologies Ltd',
        buyerGstin: '27AAACW2892G1ZV',
        placeOfSupply: clientState || 'Maharashtra',
        taxableAmount: 200000,
        igst: 0,
        cgst: 18000,
        sgst: 18000,
        totalAmount: 236000,
        status: 'TEAM_SYNCED',
        itemsCount: 1,
        createdAt: '2026-04-12T10:30:00Z',
      },
      {
        id: 'inv-2',
        invoiceNumber: 'INV-2026-0043',
        invoiceDate: '2026-04-18',
        buyerName: 'Apex Logistics Solutions',
        buyerGstin: '29ABCDE1234F1Z5',
        placeOfSupply: 'Karnataka',
        taxableAmount: 300000,
        igst: 54000,
        cgst: 0,
        sgst: 0,
        totalAmount: 354000,
        status: 'ISSUED',
        itemsCount: 2,
        createdAt: '2026-04-18T14:15:00Z',
      },
    ];
  });

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Invoice form fields
  const [invNum, setInvNum] = useState(`INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`);
  const [invDate, setInvDate] = useState(new Date().toISOString().split('T')[0]);
  const [buyerName, setBuyerName] = useState('');
  const [buyerGstin, setBuyerGstin] = useState('');
  const [pos, setPos] = useState(clientState || 'Maharashtra');
  const [itemDesc, setItemDesc] = useState('Professional Consulting Services');
  const [hsn, setHsn] = useState('998311');
  const [qty, setQty] = useState(1);
  const [rate, setRate] = useState(50000);
  const [taxRate, setTaxRate] = useState(18);
  const [selectedInvoice, setSelectedInvoice] = useState<PreservedInvoice | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
    } catch {
      // ignore
    }
  }, [invoices]);

  const isInterState = clientState && pos ? clientState.toLowerCase() !== pos.toLowerCase() : false;
  const taxableVal = Math.round(qty * rate);
  const taxAmount = Math.round(taxableVal * (taxRate / 100));
  const igstVal = isInterState ? taxAmount : 0;
  const cgstVal = isInterState ? 0 : Math.round(taxAmount / 2);
  const sgstVal = isInterState ? 0 : Math.round(taxAmount / 2);
  const totalInvoiceVal = taxableVal + taxAmount;

  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invNum || !buyerName || taxableVal <= 0) return;

    const newInv: PreservedInvoice = {
      id: 'inv-' + Date.now(),
      invoiceNumber: invNum,
      invoiceDate: invDate,
      buyerName,
      buyerGstin: buyerGstin.toUpperCase().trim(),
      placeOfSupply: pos,
      taxableAmount: taxableVal,
      igst: igstVal,
      cgst: cgstVal,
      sgst: sgstVal,
      totalAmount: totalInvoiceVal,
      status: 'ISSUED',
      itemsCount: 1,
      createdAt: new Date().toISOString(),
    };

    setInvoices((prev) => [newInv, ...prev]);
    setCreateModalOpen(false);
    // Reset fields
    setBuyerName('');
    setBuyerGstin('');
    setRate(50000);
  };

  const filtered = invoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.buyerName.toLowerCase().includes(search.toLowerCase()) ||
      inv.buyerGstin.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2">
              <span>🧾</span> B2B & B2C Billing Hub
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">Issue & Preserve Tax Invoices</h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Generate GST-compliant tax invoices, auto-calculate IGST vs CGST/SGST based on place of supply, and preserve your billing records for GSTR-1 team filing.
            </p>
          </div>
          <button
            onClick={() => {
              setInvNum(`INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`);
              setCreateModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 shrink-0"
          >
            <span>+</span> Create New Invoice
          </button>
        </div>
      </div>

      {/* Invoices List / Vault */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Preserved Invoices Vault</h3>
            <p className="text-xs text-slate-500">All invoices generated from this workspace are securely archived and accessible to your team.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search invoice #, buyer, GSTIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 outline-none w-64 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Invoice #</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Customer / Buyer</th>
                <th className="py-2.5 px-3">Buyer GSTIN</th>
                <th className="py-2.5 px-3">Taxable Value</th>
                <th className="py-2.5 px-3">Total Tax</th>
                <th className="py-2.5 px-3">Grand Total</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((inv) => {
                const totalTax = inv.igst + inv.cgst + inv.sgst;
                return (
                  <tr key={inv.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-mono font-bold text-blue-600">{inv.invoiceNumber}</td>
                    <td className="py-3 px-3 text-slate-600">{inv.invoiceDate}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{inv.buyerName}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{inv.buyerGstin || 'B2C (Unregistered)'}</td>
                    <td className="py-3 px-3 font-mono">₹{inv.taxableAmount.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-3 font-mono text-amber-600">₹{totalTax.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">₹{inv.totalAmount.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.status === 'TEAM_SYNCED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {inv.status === 'TEAM_SYNCED' ? '✓ Synced with Team' : 'Issued'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                      >
                        View & Print
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No preserved invoices found matching your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Creation Modal */}
      {createModalOpen && (
        <div className="modal-backdrop" onClick={() => setCreateModalOpen(false)}>
          <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">Generate GST Tax Invoice</h3>
                <p className="text-xs text-slate-500">Compliant with Rule 46 of CGST Rules 2017</p>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1">×</button>
            </div>

            <form onSubmit={handleSaveInvoice} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Invoice Number *</label>
                  <input
                    type="text"
                    required
                    value={invNum}
                    onChange={(e) => setInvNum(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={invDate}
                    onChange={(e) => setInvDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer / Buyer Legal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corp India Pvt Ltd"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Buyer GSTIN (15 Digits, leave blank if B2C)</label>
                  <input
                    type="text"
                    placeholder="e.g. 27AAACA1234A1Z5"
                    maxLength={15}
                    value={buyerGstin}
                    onChange={(e) => setBuyerGstin(e.target.value.toUpperCase())}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono text-xs uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Place of Supply (State) *</label>
                  <select
                    value={pos}
                    onChange={(e) => setPos(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Supply Nature</span>
                  <span className="font-bold text-slate-900 mt-0.5">
                    {isInterState ? 'Inter-State (IGST 100%)' : 'Intra-State (CGST 50% + SGST 50%)'}
                  </span>
                </div>
              </div>

              {/* Item Details */}
              <div className="border-t pt-3">
                <span className="font-bold text-slate-800 block mb-2">Invoice Line Item</span>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={itemDesc}
                      onChange={(e) => setItemDesc(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">HSN / SAC</label>
                    <input
                      type="text"
                      value={hsn}
                      onChange={(e) => setHsn(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={qty}
                      onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                      className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Rate (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={rate}
                      onChange={(e) => setRate(Math.max(0, Number(e.target.value)))}
                      className="w-full border border-slate-300 rounded-lg p-2 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <label className="font-semibold text-slate-700">GST Slab:</label>
                  {[0, 5, 12, 18, 28].map((r) => (
                    <label key={r} className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="taxRate"
                        checked={taxRate === r}
                        onChange={() => setTaxRate(r)}
                      />
                      <span>{r}%</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Tax Summary Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="font-sans text-slate-600">Taxable Value:</span>
                  <span className="font-bold text-slate-900">₹{taxableVal.toLocaleString('en-IN')}</span>
                </div>
                {isInterState ? (
                  <div className="flex justify-between text-indigo-600">
                    <span className="font-sans">IGST ({taxRate}%):</span>
                    <span>₹{igstVal.toLocaleString('en-IN')}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-blue-600">
                      <span className="font-sans">CGST ({(taxRate / 2)}%):</span>
                      <span>₹{cgstVal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-blue-600">
                      <span className="font-sans">SGST ({(taxRate / 2)}%):</span>
                      <span>₹{sgstVal.toLocaleString('en-IN')}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between border-t border-slate-300 pt-1 text-sm font-bold text-slate-900">
                  <span className="font-sans">Grand Total:</span>
                  <span>₹{totalInvoiceVal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md transition"
                >
                  Save & Preserve Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Viewer Modal */}
      {selectedInvoice && (
        <div className="modal-backdrop" onClick={() => setSelectedInvoice(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Tax Invoice</span>
                <h3 className="font-bold text-slate-900 text-xl font-mono">{selectedInvoice.invoiceNumber}</h3>
                <p className="text-xs text-slate-500">Dated: {selectedInvoice.invoiceDate}</p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Billed To</span>
                <strong className="text-slate-900 block text-sm mt-0.5">{selectedInvoice.buyerName}</strong>
                <span className="font-mono text-slate-600 block mt-1">
                  GSTIN: {selectedInvoice.buyerGstin || 'Unregistered'}
                </span>
                <span className="text-slate-500 block mt-0.5">POS: {selectedInvoice.placeOfSupply}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Invoice Status</span>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold mt-1">
                  {selectedInvoice.status}
                </span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden font-mono text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5 text-right">Taxable</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="p-2.5 font-sans">Standard Supplies / Services</td>
                    <td className="p-2.5 text-right">₹{selectedInvoice.taxableAmount.toLocaleString('en-IN')}</td>
                    <td className="p-2.5 text-right font-bold">₹{selectedInvoice.totalAmount.toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-slate-500">Preserved in client vault</span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
                >
                  Print / PDF
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
