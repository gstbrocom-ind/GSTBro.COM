import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  fetchInvoiceCustomers,
  createInvoiceCustomer,
  updateInvoiceCustomer,
  type InvoiceCustomer,
} from '../../../lib/invoiceApi';
import { INDIAN_STATES } from '../../../constants/indianStates';

// State code mapping
const STATE_CODES: Record<string, string> = {
  'Jammu and Kashmir': '01',
  'Himachal Pradesh': '02',
  Punjab: '03',
  Chandigarh: '04',
  Uttarakhand: '05',
  Haryana: '06',
  Delhi: '07',
  Rajasthan: '08',
  'Uttar Pradesh': '09',
  Bihar: '10',
  Sikkim: '11',
  'Arunachal Pradesh': '12',
  Nagaland: '13',
  Manipur: '14',
  Mizoram: '15',
  Tripura: '16',
  Meghalaya: '17',
  Assam: '18',
  'West Bengal': '19',
  Jharkhand: '20',
  Odisha: '21',
  Chhattisgarh: '22',
  'Madhya Pradesh': '23',
  Gujarat: '24',
  'Dadra and Nagar Haveli and Daman and Diu': '26',
  Maharashtra: '27',
  Karnataka: '29',
  Goa: '30',
  Lakshadweep: '31',
  Kerala: '32',
  'Tamil Nadu': '33',
  Puducherry: '34',
  'Andaman and Nicobar Islands': '35',
  Telangana: '36',
  'Andhra Pradesh': '37',
  Ladakh: '38',
};

export function InvoiceCustomersPage({ vendorId }: { vendorId?: string }) {
  const { user } = useAuth();
  const targetVendorId = vendorId || user?.id;

  const [customers, setCustomers] = useState<InvoiceCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<InvoiceCustomer | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [gstin, setGstin] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!targetVendorId) return;
    loadCustomers();
  }, [targetVendorId]);

  async function loadCustomers() {
    setLoading(true);
    try {
      const res = await fetchInvoiceCustomers(targetVendorId!);
      setCustomers(res.customers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingCustomer(null);
    setName('');
    setGstin('');
    setState(user?.state || 'Maharashtra');
    setAddress('');
    setPhone('');
    setEmail('');
    setErrorMsg(null);
    setModalOpen(true);
  }

  function openEditModal(c: InvoiceCustomer) {
    setEditingCustomer(c);
    setName(c.name);
    setGstin(c.gstin || '');
    setState(c.state);
    setAddress(c.address || '');
    setPhone(c.phone || '');
    setEmail(c.email || '');
    setErrorMsg(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetVendorId) return;
    setSubmitting(true);
    setErrorMsg(null);

    const customerName = name.trim() || 'Customer';
    const selectedState = state.trim() || user?.state || 'Maharashtra';
    const stateCode = STATE_CODES[selectedState] || (gstin.trim().length >= 2 ? gstin.trim().substring(0, 2) : '27');

    try {
      if (editingCustomer) {
        await updateInvoiceCustomer(targetVendorId, editingCustomer.id, {
          name: customerName,
          gstin: gstin.trim().toUpperCase() || null,
          state: selectedState,
          state_code: stateCode,
          address: address.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
        });
      } else {
        await createInvoiceCustomer(targetVendorId, {
          name: customerName,
          gstin: gstin.trim().toUpperCase() || null,
          state: selectedState,
          state_code: stateCode,
          address: address.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
        });
      }
      setModalOpen(false);
      await loadCustomers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Customers & Buyers Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain your B2B corporate clients (with GSTIN) and retail buyers for instant invoice generation.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 shrink-0"
        >
          <span>+</span> Add New Customer
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/60 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Customer / Buyer Name</th>
                <th className="py-3 px-3">GSTIN</th>
                <th className="py-3 px-3">State & Code</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">Address</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">{c.name}</td>
                  <td className="py-3.5 px-3 font-mono">
                    {c.gstin ? (
                      <span className="text-blue-700 font-bold">{c.gstin}</span>
                    ) : (
                      <span className="text-slate-400 italic">B2C (Unregistered)</span>
                    )}
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="font-semibold text-slate-700">{c.state}</span>{' '}
                    <span className="text-slate-400 font-mono text-[10px]">({c.state_code})</span>
                  </td>
                  <td className="py-3.5 px-3 text-slate-600">{c.phone || c.email || '—'}</td>
                  <td className="py-3.5 px-3 text-slate-500 max-w-xs truncate">{c.address || '—'}</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => openEditModal(c)}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {!customers.length && !loading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No customers added yet. Click "+ Add New Customer" above to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Modal */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 text-xl font-bold">×</button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-[11px] flex items-center gap-2">
              <span className="text-sm">💡</span>
              <span>All fields are completely optional. Save with as little or as much detail as you have.</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Company / Customer Legal Name <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corp Solutions (or leave blank for Customer)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border rounded-lg p-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  GSTIN <span className="text-slate-400 font-normal">(Optional — leave blank for B2C/retail)</span>
                </label>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="e.g. 27AABCA1234A1Z5"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  className="w-full border rounded-lg p-2 font-mono text-xs uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  State (Place of Supply) <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full border rounded-lg p-2 text-xs"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Billing Address</label>
                <textarea
                  rows={2}
                  placeholder="Street, City, Pincode"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full border rounded-lg p-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="accounts@client.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border rounded-lg p-2 text-xs"
                  />
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
                  {submitting ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
