import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  fetchInvoiceItems,
  createInvoiceItem,
  updateInvoiceItem,
  deleteInvoiceItem,
  type InvoiceItem,
} from '../../../lib/invoiceApi';

export function InvoiceItemsPage({ vendorId }: { vendorId?: string }) {
  const { user } = useAuth();
  const targetVendorId = vendorId || user?.id;

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InvoiceItem | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [hsn, setHsn] = useState('998311');
  const [rate, setRate] = useState<number>(18);
  const [unit, setUnit] = useState('NOS');
  const [minPrice, setMinPrice] = useState<number>(1000);
  const [maxPrice, setMaxPrice] = useState<number>(5000);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!targetVendorId) return;
    loadItems();
  }, [targetVendorId]);

  async function loadItems() {
    setLoading(true);
    try {
      const res = await fetchInvoiceItems(targetVendorId!);
      setItems(res.items || []);
      setActiveCount(res.activeCount || 0);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingItem(null);
    setName('');
    setHsn('998311');
    setRate(18);
    setUnit('NOS');
    setMinPrice(1000);
    setMaxPrice(5000);
    setErrorMsg(null);
    setModalOpen(true);
  }

  function openEditModal(item: InvoiceItem) {
    setEditingItem(item);
    setName(item.name);
    setHsn(item.hsn_sac);
    setRate(item.gst_rate_percent);
    setUnit(item.unit);
    setMinPrice(item.min_price);
    setMaxPrice(item.max_price);
    setErrorMsg(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetVendorId) return;
    if (maxPrice < minPrice) {
      setErrorMsg('Max price must be greater than or equal to min price');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);

    try {
      if (editingItem) {
        await updateInvoiceItem(targetVendorId, editingItem.id, {
          name,
          hsn_sac: hsn,
          gst_rate_percent: rate,
          unit,
          min_price: minPrice,
          max_price: maxPrice,
        });
      } else {
        await createInvoiceItem(targetVendorId, {
          name,
          hsn_sac: hsn,
          gst_rate_percent: rate,
          unit,
          min_price: minPrice,
          max_price: maxPrice,
          active: true,
        });
      }
      setModalOpen(false);
      await loadItems();
    } catch (err: any) {
      setErrorMsg(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to deactivate this item from invoice generation?')) return;
    try {
      await deleteInvoiceItem(targetVendorId!, id);
      await loadItems();
    } catch (err: any) {
      alert(err.message || 'Failed to deactivate item');
    }
  }

  return (
    <div className="space-y-6">
      {/* 5-Item Requirement Notice & Progress Card */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">Items Catalog & Pricing Bounds</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                activeCount >= 5
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {activeCount >= 5 ? '✓ Ready to Generate' : `${activeCount}/5 Minimum Required`}
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-xl">
            To generate randomized exact-matching GST invoices, your catalog must contain at least 5 active items with specified minimum and maximum price boundaries.
          </p>

          {/* Progress Bar */}
          <div className="w-full max-w-md bg-slate-100 h-2.5 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full transition-all duration-500 ${
                activeCount >= 5 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, (activeCount / 5) * 100)}%` }}
            />
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 shrink-0"
        >
          <span>+</span> Add New Item
        </button>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="font-bold text-xs uppercase tracking-wider text-slate-600">
            Active Catalog Items ({items.length})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/60 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-3">HSN / SAC</th>
                <th className="py-3 px-3">GST Rate</th>
                <th className="py-3 px-3">Unit</th>
                <th className="py-3 px-3 text-right">Min Price</th>
                <th className="py-3 px-3 text-right">Max Price</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">{item.name}</td>
                  <td className="py-3.5 px-3 font-mono text-slate-600">{item.hsn_sac}</td>
                  <td className="py-3.5 px-3">
                    <span className="inline-block px-2 py-0.5 rounded font-bold text-blue-700 bg-blue-50">
                      {item.gst_rate_percent}%
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-500 uppercase">{item.unit}</td>
                  <td className="py-3.5 px-3 text-right font-mono text-slate-700">
                    ₹{item.min_price.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                    ₹{item.max_price.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <button
                      onClick={() => openEditModal(item)}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                    >
                      Edit
                    </button>
                    {item.active && (
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 font-semibold"
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!items.length && !loading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No items in catalog yet. Click "+ Add New Item" above to add items.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div
            className="bg-white rounded-2xl p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editingItem ? 'Edit Catalog Item' : 'Add New Catalog Item'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 text-xl font-bold">×</button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Item / Service Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IT Software Consulting"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border rounded-lg p-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">HSN / SAC Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 998311"
                    value={hsn}
                    onChange={(e) => setHsn(e.target.value.trim())}
                    className="w-full border rounded-lg p-2 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit of Measurement *</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full border rounded-lg p-2 text-xs"
                  >
                    {['NOS', 'PCS', 'KGS', 'HRS', 'MTR', 'LTR', 'BAG', 'BOX', 'SET', 'JOB'].map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">GST Tax Rate *</label>
                <div className="flex gap-2">
                  {[0, 5, 12, 18, 28].map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setRate(r)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition ${
                        rate === r ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {r}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Minimum Price (₹) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={minPrice}
                    onChange={(e) => setMinPrice(Number(e.target.value))}
                    className="w-full border rounded-lg p-2 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Maximum Price (₹) *</label>
                  <input
                    type="number"
                    min={minPrice}
                    required
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full border rounded-lg p-2 font-mono text-xs"
                  />
                </div>
                <div className="col-span-2 text-[10px] text-slate-500">
                  During invoice generation, prices are picked randomly within this range so the grand total matches exactly.
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
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow"
                >
                  {submitting ? 'Saving...' : editingItem ? 'Update Item' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
