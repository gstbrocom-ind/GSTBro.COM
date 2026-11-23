import { useState } from 'react';
import { apiFetch } from '../../lib/api';

interface DayOneOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamMembers: Array<{
    id: string;
    name: string;
    role: string;
    firm_role?: string;
    icai_membership_no?: string | null;
    icai_membership_type?: 'FCA' | 'ACA' | null;
    cop_number?: string | null;
    partner_designation?: string | null;
  }>;
  onClientOnboarded: () => void;
}

interface ParsedCandidate {
  tradeName: string;
  legalName: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstin: string;
  pan: string;
  state: string;
  stateCode: string;
  address: string;
  constitutionType: 'PROPRIETORSHIP' | 'PARTNERSHIP' | 'LLP' | 'PRIVATE_LIMITED' | 'PUBLIC_LIMITED' | 'OTHER';
  services: string[];
  agreedMonthlyFee: number;
  billingFrequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  previousAuditor: string;
  notes: string;
  extractionConfidence: number;
  detectedEntities: string[];
}

interface DocumentKit {
  sa210EngagementLetter: string;
  previousAuditorNocLetter: string;
  kycChecklistDoc: string;
  roadmap90Days: string;
  taxAuthorityAuthorizationLetter: string;
  whatsappWelcomeDraft: string;
  emailWelcomeDraft: {
    subject: string;
    body: string;
  };
}

const SAMPLE_WHATSAPP_CHAT = `Client (Rajesh Sharma):
Hi Sir, good afternoon. As discussed over call, we want your firm to handle our GST returns and annual tax filing starting this month.
Company: Apex Logistics Solutions Pvt Ltd
GSTIN: 36AABCA1234F1Z5
PAN: AABCA1234F
Registered in Hyderabad, Telangana.
My Mobile: 9876543210
Email: rajesh@apexlogistics.in
We were previously with CA Verma & Associates in Banjara Hills.
Agreed monthly fee is Rs. 4,500. Please send engagement letter and portal link.`;

export function DayOneOnboardingModal({
  isOpen,
  onClose,
  teamMembers,
  onClientOnboarded,
}: DayOneOnboardingModalProps) {
  const [step, setStep] = useState<'input' | 'review' | 'launched'>('input');
  const [rawText, setRawText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Review & Override State
  const [form, setForm] = useState<ParsedCandidate>({
    tradeName: '',
    legalName: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstin: '',
    pan: '',
    state: '',
    stateCode: '',
    address: '',
    constitutionType: 'PROPRIETORSHIP',
    services: ['GSTR_1', 'GSTR_3B', 'RECONCILIATION_2B'],
    agreedMonthlyFee: 3000,
    billingFrequency: 'MONTHLY',
    previousAuditor: '',
    notes: '',
    extractionConfidence: 0.5,
    detectedEntities: [],
  });

  const [assignedStaffId, setAssignedStaffId] = useState<string>('');
  const [signingPartnerId, setSigningPartnerId] = useState<string>('');
  const [customWelcomeCode, setCustomWelcomeCode] = useState<string>('');

  const partners = teamMembers.filter(
    (m) => m.role === 'FIRM_OWNER' || m.role === 'FIRM_PARTNER' || m.firm_role === 'FIRM_OWNER' || m.firm_role === 'FIRM_PARTNER'
  );

  // Result Launch State
  const [launchedData, setLaunchedData] = useState<{
    welcomeCode: string;
    whatsappUrl: string;
    driveFolderUrl?: string;
    documentKit: DocumentKit;
  } | null>(null);

  const [activeDocTab, setActiveDocTab] = useState<'sa210' | 'noc' | 'kyc' | 'roadmap' | 'auth'>('sa210');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExtract = async () => {
    if (!rawText.trim() || rawText.trim().length < 5) {
      setError('Please paste client notes, email text, or a WhatsApp chat transcript.');
      return;
    }

    setExtracting(true);
    setError(null);

    try {
      const res = await apiFetch<{ success: boolean; data: ParsedCandidate }>('/api/firm/ai-intake/parse', {
        method: 'POST',
        body: JSON.stringify({ rawText: rawText.trim() }),
      });

      if (res.data) {
        setForm(res.data);
        if (res.data.contactPerson && !customWelcomeCode) {
          const cleanPart = res.data.contactPerson.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '');
          if (cleanPart.length >= 3) {
            setCustomWelcomeCode(`GST-${cleanPart}-${Math.floor(100 + Math.random() * 900)}`);
          }
        }
        setStep('review');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to analyze text. Please review input.');
    } finally {
      setExtracting(false);
    }
  };

  const handleExecuteLaunch = async () => {
    if (!form.tradeName.trim() || !form.contactPerson.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Trade name, contact person, email, and phone are mandatory.');
      return;
    }

    setLaunching(true);
    setError(null);

    try {
      const res = await apiFetch<{
        success: boolean;
        message: string;
        client: any;
        welcomeCode: string;
        whatsappUrl: string;
        driveFolderUrl?: string;
        documentKit: DocumentKit;
      }>('/api/firm/ai-intake/execute', {
        method: 'POST',
        body: JSON.stringify({
          tradeName: form.tradeName.trim(),
          legalName: form.legalName.trim() || form.tradeName.trim(),
          contactPerson: form.contactPerson.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          gstin: form.gstin.trim() || undefined,
          pan: form.pan.trim() || undefined,
          state: form.state.trim() || undefined,
          stateCode: form.stateCode.trim() || undefined,
          address: form.address.trim() || undefined,
          constitutionType: form.constitutionType,
          services: form.services,
          agreedMonthlyFee: Number(form.agreedMonthlyFee) || 0,
          assignedStaffId: assignedStaffId || null,
          signingPartnerId: signingPartnerId || null,
          previousAuditor: form.previousAuditor.trim() || undefined,
          customWelcomeCode: customWelcomeCode.trim() || undefined,
          notes: form.notes,
        }),
      });

      setLaunchedData({
        welcomeCode: res.welcomeCode,
        whatsappUrl: res.whatsappUrl,
        driveFolderUrl: res.driveFolderUrl,
        documentKit: res.documentKit,
      });

      setStep('launched');
      onClientOnboarded();
    } catch (err: any) {
      setError(err?.message || 'Failed to execute onboarding. Please verify details.');
    } finally {
      setLaunching(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(label);
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  const toggleService = (srv: string) => {
    setForm((prev) => {
      const exists = prev.services.includes(srv);
      return {
        ...prev,
        services: exists ? prev.services.filter((s) => s !== srv) : [...prev.services, srv],
      };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-900/40 text-lg">
              ✨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-tight">Day-One AI Client Onboarding Suite</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ICAI SA 210 Compliant
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Paste raw WhatsApp chats or notes &rarr; Instant 10-doc regulatory kit, invite code & drive setup.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button type="button" onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">
              ✕
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-slate-200">
          {/* STEP 1: RAW INPUT */}
          {step === 'input' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <span>📝</span>
                  <span>Paste Client Conversation or Notes</span>
                </label>
                <button
                  type="button"
                  onClick={() => setRawText(SAMPLE_WHATSAPP_CHAT)}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1"
                >
                  <span>✨</span>
                  <span>Try Sample WhatsApp Chat</span>
                </button>
              </div>

              <textarea
                rows={9}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste client's WhatsApp messages, email inquiry, or call transcript here...&#10;&#10;e.g. 'Rajesh from Apex Logistics Solutions Pvt Ltd. GSTIN: 36AABCA1234F1Z5, Phone: 9876543210. Needs monthly GSTR-1 & 3B filing. Fee agreed is 4500/month.'"
                className="w-full p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 transition shadow-inner leading-relaxed"
              />

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span className="text-base">💡</span>
                  <span>The AI automatically extracts entity names, GSTIN, PAN, states, contacts, and agreed fees.</span>
                </div>
                <button
                  type="button"
                  disabled={extracting}
                  onClick={handleExtract}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {extracting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Analyzing Entities...</span>
                    </>
                  ) : (
                    <>
                      <span>🤖 Extract &amp; Build Client Dossier</span>
                      <span>&rarr;</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PARTNER REVIEW & OVERRIDES */}
          {step === 'review' && (
            <div className="space-y-6">
              {/* Confidence Banner */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900 border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🎯</span>
                  <div>
                    <span className="text-xs font-bold text-emerald-300">
                      Extraction Complete ({Math.round(form.extractionConfidence * 100)}% Confidence)
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Detected: {form.detectedEntities.join(' • ') || 'Key business attributes'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Edit Input Text
                </button>
              </div>

              {/* Two-Column Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Business Trade Name */}
                <div>
                  <label className="font-bold text-slate-400 block mb-1">Trade / Business Name *</label>
                  <input
                    type="text"
                    value={form.tradeName}
                    onChange={(e) => setForm({ ...form, tradeName: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold focus:border-indigo-500"
                  />
                </div>

                {/* Contact Person */}
                <div>
                  <label className="font-bold text-slate-400 block mb-1">Contact Person (MD / Director) *</label>
                  <input
                    type="text"
                    value={form.contactPerson}
                    onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold focus:border-indigo-500"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="font-bold text-slate-400 block mb-1">Mobile / WhatsApp Number *</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:border-indigo-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="font-bold text-slate-400 block mb-1">Client Email Address *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:border-indigo-500"
                  />
                </div>

                {/* GSTIN */}
                <div>
                  <label className="font-bold text-slate-400 block mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={form.gstin}
                    maxLength={15}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      const panDerived = val.length >= 12 ? val.substring(2, 12) : form.pan;
                      setForm({ ...form, gstin: val, pan: panDerived });
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-cyan-400 font-mono font-bold focus:border-indigo-500"
                  />
                </div>

                {/* PAN */}
                <div>
                  <label className="font-bold text-slate-400 block mb-1">PAN</label>
                  <input
                    type="text"
                    value={form.pan}
                    maxLength={10}
                    onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 font-mono font-bold focus:border-indigo-500"
                  />
                </div>

                {/* Constitution */}
                <div>
                  <label className="font-bold text-slate-400 block mb-1">Business Constitution</label>
                  <select
                    value={form.constitutionType}
                    onChange={(e) => setForm({ ...form, constitutionType: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-indigo-500"
                  >
                    <option value="PROPRIETORSHIP">Proprietorship</option>
                    <option value="PARTNERSHIP">Partnership Firm</option>
                    <option value="LLP">Limited Liability Partnership (LLP)</option>
                    <option value="PRIVATE_LIMITED">Private Limited Company</option>
                    <option value="PUBLIC_LIMITED">Public Limited Company</option>
                    <option value="OTHER">Other / Society / Trust</option>
                  </select>
                </div>

                {/* Agreed Retainer Fee */}
                <div>
                  <label className="font-bold text-slate-400 block mb-1">Monthly Practice Retainer (₹)</label>
                  <input
                    type="number"
                    value={form.agreedMonthlyFee}
                    onChange={(e) => setForm({ ...form, agreedMonthlyFee: Number(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-bold focus:border-indigo-500"
                  />
                </div>

                {/* Assign to Staff */}
                <div>
                  <label className="font-bold text-slate-400 block mb-1">Assign to Article Clerk / Manager</label>
                  <select
                    value={assignedStaffId}
                    onChange={(e) => setAssignedStaffId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-indigo-500"
                  >
                    <option value="">— Assign to Me (Managing Partner) —</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.firm_role === 'FIRM_PARTNER' ? 'Partner' : m.firm_role || m.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Signing Partner for ICAI SA 210 Engagement Letter & NOC */}
                <div>
                  <label className="font-bold text-slate-400 block mb-1">Signing Partner (ICAI SA 210 &amp; NOC)</label>
                  <select
                    value={signingPartnerId}
                    onChange={(e) => setSigningPartnerId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 font-medium focus:border-indigo-500"
                  >
                    <option value="">— Primary Managing Partner / Practice Default —</option>
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>
                        CA {p.name} {p.icai_membership_no ? `(MRN: ${p.icai_membership_no})` : ''} {p.partner_designation ? `• ${p.partner_designation}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Previous Auditor */}
                <div>
                  <label className="font-bold text-slate-400 block mb-1">Previous Auditor (For ICAI Clause 8 NOC)</label>
                  <input
                    type="text"
                    value={form.previousAuditor}
                    placeholder="e.g. CA Verma & Associates"
                    onChange={(e) => setForm({ ...form, previousAuditor: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Service Selection Badges */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 block">Scope of Engagement &amp; Active Services</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'GSTR_1', label: 'Form GSTR-1 (Outward Supplies)' },
                    { id: 'GSTR_3B', label: 'Form GSTR-3B (Summary Tax Return)' },
                    { id: 'RECONCILIATION_2B', label: 'Continuous 2B ITC Reconciliation' },
                    { id: 'TAX_AUDIT', label: 'Tax Audit (3CB / 3CD)' },
                    { id: 'GSTR_9_ANNUAL', label: 'Annual Return (GSTR-9 & 9C)' },
                    { id: 'TDS_COMPLIANCE', label: 'TDS / TCS Filing (26Q / 27Q)' },
                    { id: 'NOTICE_DEFENSE', label: 'Department Scrutiny Defense' },
                  ].map((s) => {
                    const active = form.services.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleService(s.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                          active
                            ? 'bg-blue-600/30 border-blue-500 text-blue-200'
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {active ? '✓ ' : '+ '}
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Practice Custom Welcome Code */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Practice Invite Code for Client</label>
                <input
                  type="text"
                  value={customWelcomeCode}
                  placeholder="e.g. GST-APEX-482"
                  onChange={(e) => setCustomWelcomeCode(e.target.value.toUpperCase())}
                  className="w-full max-w-sm p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-indigo-300 font-mono font-bold focus:border-indigo-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold"
                >
                  &larr; Back
                </button>
                <button
                  type="button"
                  disabled={launching}
                  onClick={handleExecuteLaunch}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-extrabold text-xs shadow-lg shadow-emerald-900/40 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {launching ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Provisioning Client, Docs &amp; Drive...</span>
                    </>
                  ) : (
                    <>
                      <span>🚀 Finalize &amp; Launch Client</span>
                      <span>&rarr;</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: LAUNCHED & DOCUMENT SUITE */}
          {step === 'launched' && launchedData && (
            <div className="space-y-6">
              {/* Success Hero */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 border border-emerald-500/40 shadow-xl space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-xl">
                    ✓
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Client Successfully Onboarded!</h3>
                    <p className="text-xs text-emerald-300">
                      <strong>{form.tradeName}</strong> has been created, mapped to your firm, and compliance tasks are scheduled.
                    </p>
                  </div>
                </div>

                {/* 1-Click WhatsApp Direct Share */}
                <div className="pt-3 border-t border-emerald-900/40 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">Practice Welcome Code:</span>
                    <span className="font-mono font-black text-white bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
                      {launchedData.welcomeCode}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={launchedData.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer no-underline"
                    >
                      <span>💬 Open WhatsApp with Client</span>
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(launchedData.documentKit.whatsappWelcomeDraft, 'WhatsApp Invite Copied!')
                      }
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
                    >
                      {copyFeedback === 'WhatsApp Invite Copied!' ? '✓ Copied!' : 'Copy Text'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Generated Document Kit Viewer */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Generated Regulatory &amp; Practice Documents
                  </h4>
                  {copyFeedback && (
                    <span className="text-xs font-bold text-emerald-400 animate-pulse">{copyFeedback}</span>
                  )}
                </div>

                {/* Tab Navigation */}
                <div className="flex flex-wrap gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-bold">
                  {[
                    { id: 'sa210', label: '📄 ICAI SA 210 Engagement Letter' },
                    { id: 'noc', label: '⚖️ Previous Auditor NOC' },
                    { id: 'kyc', label: '🛡️ KYC & DPDP Checklist' },
                    { id: 'roadmap', label: '🗺️ 90-Day Roadmap' },
                    { id: 'auth', label: '🏛️ Authority Letter' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveDocTab(tab.id as any)}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                        activeDocTab === tab.id
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Document Preview Box */}
                <div className="relative rounded-2xl bg-slate-950 border border-slate-800 p-4 max-h-72 overflow-y-auto font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed shadow-inner">
                  {activeDocTab === 'sa210' && launchedData.documentKit.sa210EngagementLetter}
                  {activeDocTab === 'noc' && launchedData.documentKit.previousAuditorNocLetter}
                  {activeDocTab === 'kyc' && launchedData.documentKit.kycChecklistDoc}
                  {activeDocTab === 'roadmap' && launchedData.documentKit.roadmap90Days}
                  {activeDocTab === 'auth' && launchedData.documentKit.taxAuthorityAuthorizationLetter}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      let textToCopy = '';
                      if (activeDocTab === 'sa210') textToCopy = launchedData.documentKit.sa210EngagementLetter;
                      else if (activeDocTab === 'noc') textToCopy = launchedData.documentKit.previousAuditorNocLetter;
                      else if (activeDocTab === 'kyc') textToCopy = launchedData.documentKit.kycChecklistDoc;
                      else if (activeDocTab === 'roadmap') textToCopy = launchedData.documentKit.roadmap90Days;
                      else if (activeDocTab === 'auth') textToCopy = launchedData.documentKit.taxAuthorityAuthorizationLetter;

                      copyToClipboard(textToCopy, 'Document Copied to Clipboard!');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <span>📋 Copy Active Document</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer"
                  >
                    Done &amp; Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
