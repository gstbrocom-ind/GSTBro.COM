import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useAuth } from '../../../context/AuthContext';
import {
  fetchInvoices,
  fetchInvoiceDetail,
  cancelInvoice,
  issueCreditNote,
  type Invoice,
  type InvoiceLineItem,
  type VendorInvoiceProfile,
} from '../../../lib/invoiceApi';
import { InvoiceDocumentView } from '../../../components/invoice/InvoiceDocumentView';

export function InvoiceListPage({
  vendorId,
  onNewSingleInvoice,
}: {
  vendorId?: string;
  onNewSingleInvoice?: () => void;
}) {
  const { user } = useAuth();
  const targetVendorId = vendorId || user?.id;

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [fy, setFy] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Selected Invoice Modal for View / Print
  const [activeInvoice, setActiveInvoice] = useState<{
    invoice: Invoice;
    lines: InvoiceLineItem[];
    vendor: VendorInvoiceProfile | null;
  } | null>(null);

  // Cancel Modal
  const [cancelModalInv, setCancelModalInv] = useState<Invoice | null>(null);
  const [cancelReason, setCancelReason] = useState('Cancelled upon customer request');
  const [cancelling, setCancelling] = useState(false);

  // Credit Note Modal
  const [cnModalInv, setCnModalInv] = useState<Invoice | null>(null);
  const [cnAmount, setCnAmount] = useState<number>(0);
  const [cnReason, setCnReason] = useState('Goods returned / price concession');
  const [issuingCn, setIssuingCn] = useState(false);

  // Bulk ZIP download
  const [zipping, setZipping] = useState(false);

  useEffect(() => {
    if (!targetVendorId) return;
    loadInvoices();
  }, [targetVendorId, page, status, fy, fromDate, toDate]);

  async function loadInvoices() {
    setLoading(true);
    try {
      const res = await fetchInvoices(targetVendorId!, {
        page,
        limit: 15,
        status: status !== 'ALL' ? status : undefined,
        financialYear: fy || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        search: search.trim() || undefined,
      });
      setInvoices(res.invoices);
      setTotal(res.total);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleViewInvoice(inv: Invoice) {
    try {
      const res = await fetchInvoiceDetail(targetVendorId!, inv.id);
      setActiveInvoice(res);
    } catch (err: any) {
      alert(`Failed to load invoice: ${err.message}`);
    }
  }

  async function handleCancelSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cancelModalInv || !targetVendorId) return;
    setCancelling(true);
    try {
      await cancelInvoice(targetVendorId, cancelModalInv.id, cancelReason);
      setCancelModalInv(null);
      await loadInvoices();
    } catch (err: any) {
      alert(err.message || 'Cancellation failed');
    } finally {
      setCancelling(false);
    }
  }

  async function handleCreditNoteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cnModalInv || !targetVendorId) return;
    setIssuingCn(true);
    try {
      await issueCreditNote(targetVendorId, cnModalInv.id, {
        amount: Number(cnAmount),
        reason: cnReason,
      });
      setCnModalInv(null);
      alert('Credit note issued successfully!');
      await loadInvoices();
    } catch (err: any) {
      alert(err.message || 'Failed to issue credit note');
    } finally {
      setIssuingCn(false);
    }
  }

  // WhatsApp Share Handler
  function getWhatsAppUrl(inv: Invoice) {
    const text = `*Tax Invoice Details*\nInvoice No: ${inv.invoice_number}\nDate: ${inv.invoice_date}\nCustomer: ${inv.buyer_name}\nGrand Total: ₹${inv.grand_total.toLocaleString('en-IN')}\nStatus: ${inv.status}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  // Bulk ZIP Download
  async function handleBulkZip() {
    if (!invoices.length) return;
    setZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(`Invoices_${new Date().toISOString().split('T')[0]}`);

      // Create CSV summary of all listed invoices
      const csvHeader = 'Invoice No,Date,Customer,GSTIN,Place of Supply,Taxable,CGST,SGST,IGST,Total,Status\n';
      const csvRows = invoices
        .map(
          (i) =>
            `"${i.invoice_number}","${i.invoice_date}","${i.buyer_name}","${i.buyer_gstin || 'B2C'}","${i.place_of_supply}",${i.taxable_total},${i.cgst_total},${i.sgst_total},${i.igst_total},${i.grand_total},"${i.status}"`
        )
        .join('\n');

      folder?.file('Invoices_Summary.csv', csvHeader + csvRows);

      // Create JSON detail files for each invoice
      for (const inv of invoices) {
        folder?.file(`${inv.invoice_number.replace(/[^a-zA-Z0-9]/g, '_')}.json`, JSON.stringify(inv, null, 2));
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `Invoices_Export_${Date.now()}.zip`);
    } catch (err: any) {
      alert(`ZIP generation failed: ${err.message}`);
    } finally {
      setZipping(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Issued Invoices Archive</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable tax invoice records. Invoices are locked upon generation and cannot be modified or deleted.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onNewSingleInvoice && (
            <button
              onClick={onNewSingleInvoice}
              className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
            >
              <span>✍️</span>
              <span>+ Issue Single Invoice</span>
            </button>
          )}
          <button
            onClick={handleBulkZip}
            disabled={zipping || !invoices.length}
            className="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
          >
            {zipping ? 'Compressing...' : '📦 Bulk Download ZIP'}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        <div className="sm:col-span-2 lg:col-span-2">
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Search</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search invoice #, customer name, GSTIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadInvoices()}
              className="w-full border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-blue-500"
            />
            <button
              onClick={loadInvoices}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold"
            >
              Filter
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border rounded-lg p-1.5 text-xs"
          >
            <option value="ALL">All Invoices</option>
            <option value="ACTIVE">Active</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full border rounded-lg p-1.5 text-xs font-mono"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full border rounded-lg p-1.5 text-xs font-mono"
          />
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/60 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-3">GSTIN</th>
                <th className="py-3 px-3 text-right">Taxable</th>
                <th className="py-3 px-3 text-right">Taxes</th>
                <th className="py-3 px-3 text-right">Grand Total</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => {
                const totalTax = inv.cgst_total + inv.sgst_total + inv.igst_total;
                return (
                  <tr key={inv.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{inv.invoice_number}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{inv.invoice_date}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{inv.buyer_name}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{inv.buyer_gstin || 'B2C'}</td>
                    <td className="py-3 px-3 text-right font-mono">₹{Number(inv.taxable_total).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-3 text-right font-mono text-amber-700">₹{totalTax.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      ₹{Number(inv.grand_total).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleViewInvoice(inv)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded"
                      >
                        View & Print
                      </button>
                      <a
                        href={getWhatsAppUrl(inv)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded"
                        title="Share on WhatsApp"
                      >
                        WhatsApp
                      </a>
                      {inv.status === 'ACTIVE' && (
                        <>
                          <button
                            onClick={() => {
                              setCnModalInv(inv);
                              setCnAmount(Number(inv.grand_total));
                            }}
                            className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold rounded"
                          >
                            Credit Note
                          </button>
                          <button
                            onClick={() => setCancelModalInv(inv)}
                            className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!invoices.length && !loading && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No invoices found. Generate invoices from the Generator tab.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <span>Showing {invoices.length} of {total} invoices</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 bg-white border rounded disabled:opacity-50 font-semibold"
            >
              Previous
            </button>
            <span className="py-1 px-2 font-mono font-bold">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={invoices.length < 15}
              className="px-3 py-1 bg-white border rounded disabled:opacity-50 font-semibold"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Detail & Print Modal */}
      {activeInvoice && (
        <div className="modal-backdrop" onClick={() => setActiveInvoice(null)}>
          <div
            className="bg-white rounded-2xl p-4 sm:p-6 max-w-4xl w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Tax Invoice: {activeInvoice.invoice.invoice_number}
                </h3>
                <span className="text-xs text-slate-500">
                  Issued on {activeInvoice.invoice.invoice_date}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow"
                >
                  🖨️ Print / Download PDF
                </button>
                <button
                  onClick={() => setActiveInvoice(null)}
                  className="text-slate-400 text-xl font-bold p-1"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="overflow-x-auto pb-2 -mx-2 sm:mx-0 px-2 sm:px-0 scrollbar-thin">
              <InvoiceDocumentView
                invoice={activeInvoice.invoice}
                lines={activeInvoice.lines}
                vendor={activeInvoice.vendor}
              />
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelModalInv && (
        <div className="modal-backdrop" onClick={() => setCancelModalInv(null)}>
          <div
            className="bg-white rounded-2xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-red-600 text-base">Cancel Invoice</h3>
              <button onClick={() => setCancelModalInv(null)} className="text-slate-400 text-xl font-bold">×</button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel invoice <strong>{cancelModalInv.invoice_number}</strong>? In accordance with GST audit rules, this transition is irreversible.
            </p>

            <form onSubmit={handleCancelSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Cancellation *</label>
                <textarea
                  rows={3}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full border rounded-lg p-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setCancelModalInv(null)}
                  className="px-4 py-2 border rounded-lg text-slate-700 font-semibold"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold shadow"
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credit Note Modal */}
      {cnModalInv && (
        <div className="modal-backdrop" onClick={() => setCnModalInv(null)}>
          <div
            className="bg-white rounded-2xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-purple-700 text-base">Issue Credit Note</h3>
              <button onClick={() => setCnModalInv(null)} className="text-slate-400 text-xl font-bold">×</button>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <div>Invoice: <strong>{cnModalInv.invoice_number}</strong></div>
              <div>Original Value: <strong>₹{Number(cnModalInv.grand_total).toLocaleString('en-IN')}</strong></div>
            </div>

            <form onSubmit={handleCreditNoteSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Credit Note Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  max={cnModalInv.grand_total}
                  min={1}
                  required
                  value={cnAmount}
                  onChange={(e) => setCnAmount(Number(e.target.value))}
                  className="w-full border rounded-lg p-2 font-mono text-xs font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Statutory Reason *</label>
                <textarea
                  rows={2}
                  required
                  value={cnReason}
                  onChange={(e) => setCnReason(e.target.value)}
                  className="w-full border rounded-lg p-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setCnModalInv(null)}
                  className="px-4 py-2 border rounded-lg text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={issuingCn}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold shadow"
                >
                  {issuingCn ? 'Issuing...' : 'Issue Credit Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
