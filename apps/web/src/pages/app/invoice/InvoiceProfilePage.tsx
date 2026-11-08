import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  fetchVendorInvoiceProfile,
  updateVendorInvoiceProfile,
  type VendorInvoiceProfile,
} from '../../../lib/invoiceApi';
import { INDIAN_STATES } from '../../../constants/indianStates';
import { BrandingAssetUploader } from '../../../components/invoice/BrandingAssetUploader';

export function InvoiceProfilePage({ vendorId }: { vendorId?: string }) {
  const { user } = useAuth();
  const targetVendorId = vendorId || user?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [businessName, setBusinessName] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [stateCode, setStateCode] = useState('27');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [sigUrl, setSigUrl] = useState('');
  const [bankName, setBankName] = useState('');
  const [acctNo, setAcctNo] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [branch, setBranch] = useState('');
  const [upiId, setUpiId] = useState('');
  const [terms, setTerms] = useState(
    '1. Goods once sold will not be taken back.\n2. Interest @18% p.a. will be charged on overdue payments.\n3. Subject to local jurisdiction.'
  );

  useEffect(() => {
    if (!targetVendorId) return;
    loadProfile();
  }, [targetVendorId]);

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await fetchVendorInvoiceProfile(targetVendorId!);
      const p = res.profile;
      if (p) {
        setBusinessName(p.business_name || p.name || '');
        setGstin(p.gstin || '');
        setPan(p.pan || (p.gstin?.length === 15 ? p.gstin.substring(2, 12) : ''));
        setState(p.state || 'Maharashtra');
        setStateCode(p.state_code || (p.gstin?.length === 15 ? p.gstin.substring(0, 2) : '27'));
        setAddress(p.address || '');
        setPhone(p.phone || '');
        setLogoUrl(p.logo_url || '');
        setSigUrl(p.signature_url || '');
        setBankName(p.bank_details?.bank_name || '');
        setAcctNo(p.bank_details?.account_number || '');
        setIfsc(p.bank_details?.ifsc || '');
        setBranch(p.bank_details?.branch || '');
        setUpiId(p.upi_id || '');
        if (p.invoice_terms) setTerms(p.invoice_terms);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // When GSTIN changes, auto-populate PAN and State Code
  function handleGstinChange(val: string) {
    const clean = val.toUpperCase().trim();
    setGstin(clean);
    if (clean.length >= 2) {
      setStateCode(clean.substring(0, 2));
    }
    if (clean.length === 15) {
      setPan(clean.substring(2, 12));
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!targetVendorId) return;
    setSaving(true);
    setStatusMsg(null);

    try {
      await updateVendorInvoiceProfile(targetVendorId, {
        business_name: businessName,
        gstin: gstin || null,
        pan: pan || null,
        state,
        state_code: stateCode,
        address: address || null,
        phone: phone || null,
        logo_url: logoUrl || null,
        signature_url: sigUrl || null,
        bank_details: {
          bank_name: bankName,
          account_number: acctNo,
          ifsc: ifsc,
          branch: branch,
        },
        upi_id: upiId || null,
        invoice_terms: terms,
      });

      setStatusMsg({ type: 'success', text: 'Vendor profile and billing settings updated successfully!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Vendor Billing & Tax Profile</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            These details appear on your generated invoices, tax returns, UPI payment QR codes, and footer terms.
          </p>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Business & Tax Identity */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            1. Business & Tax Identity
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Legal Business Name *</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Apex Global Solutions Pvt Ltd"
                className="w-full border rounded-lg p-2.5 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                GSTIN (15 Digits Alphanumeric)
              </label>
              <input
                type="text"
                maxLength={15}
                value={gstin}
                onChange={(e) => handleGstinChange(e.target.value)}
                placeholder="27AABCA1234A1Z5"
                className="w-full border rounded-lg p-2.5 font-mono text-xs uppercase font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Format: 2 state digits + 10 PAN chars + entity + Z + check digit
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">PAN (Auto-Extracted)</label>
              <input
                type="text"
                maxLength={10}
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                placeholder="AABCA1234A"
                className="w-full border rounded-lg p-2.5 font-mono text-xs uppercase"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">State *</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full border rounded-lg p-2.5 text-xs"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">GST State Code *</label>
              <input
                type="text"
                maxLength={2}
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                className="w-full border rounded-lg p-2.5 font-mono text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Official Registered Address *</label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Office #, Street, City, Pincode"
                className="w-full border rounded-lg p-2.5 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98200 12345"
                className="w-full border rounded-lg p-2.5 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Banking & UPI Details */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            2. Banking & UPI QR Code Setup
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bank Name</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. HDFC Bank Ltd"
                className="w-full border rounded-lg p-2.5 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bank Account Number</label>
              <input
                type="text"
                value={acctNo}
                onChange={(e) => setAcctNo(e.target.value)}
                placeholder="502000..."
                className="w-full border rounded-lg p-2.5 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">IFSC Code</label>
              <input
                type="text"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                placeholder="HDFC0000123"
                className="w-full border rounded-lg p-2.5 font-mono text-xs uppercase"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Branch Name</label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="Andheri East, Mumbai"
                className="w-full border rounded-lg p-2.5 text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                UPI ID (Generates Dynamic Payment QR on Invoices)
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value.toLowerCase().trim())}
                placeholder="e.g. yourbusiness@okicici"
                className="w-full border rounded-lg p-2.5 font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Branding & Terms */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            3. Branding Assets & Default Invoice Terms
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <BrandingAssetUploader
              label="Company Logo"
              sublabel="Upload PNG, JPG, or PDF from local drive and crop to fit invoice header"
              value={logoUrl}
              onChange={setLogoUrl}
              vendorId={targetVendorId}
              preset="1:1"
              placeholder="https://res.cloudinary.com/..."
            />

            <BrandingAssetUploader
              label="Authorized Signature & Stamp"
              sublabel="Upload PNG, JPG, or PDF from local drive and crop signature area"
              value={sigUrl}
              onChange={setSigUrl}
              vendorId={targetVendorId}
              preset="3:1"
              placeholder="https://res.cloudinary.com/..."
            />

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Standard Terms & Conditions</label>
              <textarea
                rows={3}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full border rounded-lg p-2.5 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg transition flex items-center justify-center gap-2"
          >
            {saving ? 'Saving...' : '💾 Save Vendor Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
