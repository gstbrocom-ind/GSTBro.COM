import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  fetchInvoiceTemplates,
  createInvoiceTemplate,
  updateInvoiceTemplate,
  fetchVendorInvoiceProfile,
  updateVendorInvoiceProfile,
  type InvoiceTemplate,
  type Invoice,
  type InvoiceLineItem,
  type VendorInvoiceProfile,
} from '../../../lib/invoiceApi';
import { InvoiceDocumentView } from '../../../components/invoice/InvoiceDocumentView';
import {
  INVOICE_PRESETS,
  INVOICE_SECTION_LABELS,
  DEFAULT_SECTION_ORDER,
  parseSectionOrder,
  type InvoiceSectionKey,
} from '../../../constants/invoicePresets';
import { INVOICE_FONTS, type InvoiceFontDefinition } from '../../../constants/invoiceFonts';
import { BrandingAssetUploader } from '../../../components/invoice/BrandingAssetUploader';

const SAMPLE_INVOICE: Invoice = {
  id: 'sample-inv-1',
  vendor_id: 'sample',
  series_id: 'series-1',
  invoice_number: 'INV/2026/0042',
  financial_year: '2026-27',
  invoice_date: new Date().toISOString().split('T')[0],
  buyer_name: 'Tata Consultancy Services Ltd',
  buyer_gstin: '27AAACT2727Q1ZW',
  buyer_address: 'TCS House, Raveline Street, Fort, Mumbai 400001',
  buyer_state: 'Maharashtra',
  buyer_state_code: '27',
  buyer_phone: '+91 98765 43210',
  place_of_supply: 'Maharashtra',
  place_of_supply_code: '27',
  is_igst: false,
  taxable_total: 63559.32,
  cgst_total: 5720.34,
  sgst_total: 5720.34,
  igst_total: 0,
  grand_total: 75000.0,
  status: 'ACTIVE',
  created_at: new Date().toISOString(),
};

const SAMPLE_LINES: InvoiceLineItem[] = [
  {
    id: 'l1',
    invoice_id: 'sample-inv-1',
    item_name: 'Cloud Infrastructure Architecture & Database Services',
    hsn_sac: '998314',
    unit: 'HRS',
    quantity: 12,
    unit_price: 2500,
    discount_percent: 5,
    taxable_value: 28500,
    gst_rate_percent: 18,
    cgst: 2565,
    sgst: 2565,
    igst: 0,
    line_total: 33630,
    sort_order: 1,
  },
  {
    id: 'l2',
    invoice_id: 'sample-inv-1',
    item_name: 'GST Compliance Automation & E-Invoice Integration Engine',
    hsn_sac: '998315',
    unit: 'JOB',
    quantity: 1,
    unit_price: 35059.32,
    discount_percent: 0,
    taxable_value: 35059.32,
    gst_rate_percent: 18,
    cgst: 3155.34,
    sgst: 3155.34,
    igst: 0,
    line_total: 41370,
    sort_order: 2,
  },
];

const SAMPLE_VENDOR: VendorInvoiceProfile = {
  id: 'sample-vendor',
  name: 'Acme Technologies Pvt Ltd',
  email: 'billing@acmetech.in',
  business_name: 'Acme Technologies Private Limited',
  gstin: '27AABCA1234A1Z5',
  pan: 'AABCA1234A',
  state: 'Maharashtra',
  state_code: '27',
  address: 'Plot 42, Tech Park, Andheri East, Mumbai 400069',
  phone: '+91 91234 56789',
  upi_id: 'acmetech@okaxis',
  bank_details: {
    bank_name: 'HDFC Bank Ltd',
    account_number: '50200012345678',
    ifsc: 'HDFC0001234',
    branch: 'Andheri East, Mumbai',
  },
  invoice_terms: '1. Payment due within 15 days of invoice date.\n2. Remit via NEFT/RTGS to bank account.\n3. Subject to local jurisdiction.',
};

type ActiveCustomizerTab = 'PRESETS' | 'BRANDING' | 'LAYOUT' | 'TEXTS' | 'STYLING' | 'COLUMNS';

export function InvoiceTemplatePage({ vendorId }: { vendorId?: string }) {
  const { user } = useAuth();
  const targetVendorId = vendorId || user?.id;

  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Vendor profile state (stores real logo and signature)
  const [vendorProfile, setVendorProfile] = useState<VendorInvoiceProfile | null>(null);

  // Typography font filtering state
  const [fontCategoryFilter, setFontCategoryFilter] = useState<'ALL' | 'Sans-Serif' | 'Serif' | 'Monospace / ERP'>('ALL');
  const [fontSearch, setFontSearch] = useState('');

  // Active customizer tab on the left panel
  const [activeTab, setActiveTab] = useState<ActiveCustomizerTab>('PRESETS');

  // Currently editing template state
  const [tpl, setTpl] = useState<Partial<InvoiceTemplate>>(() => INVOICE_PRESETS[0].template);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!targetVendorId) return;
    loadTemplatesAndProfile();
  }, [targetVendorId]);

  async function loadTemplatesAndProfile() {
    setLoading(true);
    try {
      const [tplRes, profRes] = await Promise.allSettled([
        fetchInvoiceTemplates(targetVendorId!),
        fetchVendorInvoiceProfile(targetVendorId!),
      ]);

      if (tplRes.status === 'fulfilled') {
        const list = tplRes.value.templates || [];
        setTemplates(list);
        if (list.length > 0) {
          const def = list.find((t) => t.is_default) || list[0];
          setSelectedTemplateId(def.id);
          setTpl(def);
        } else {
          setTpl(INVOICE_PRESETS[0].template);
        }
      }

      if (profRes.status === 'fulfilled' && profRes.value?.profile) {
        setVendorProfile(profRes.value.profile);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateLogo(newUrl: string) {
    setVendorProfile((prev) => {
      const base = prev || SAMPLE_VENDOR;
      return { ...base, logo_url: newUrl || null };
    });
    if (targetVendorId) {
      try {
        await updateVendorInvoiceProfile(targetVendorId, { logo_url: newUrl || null });
        setMessage({ type: 'success', text: 'Logo uploaded, cropped, and saved to vendor profile!' });
      } catch (err: any) {
        console.warn('Auto-save logo error', err);
      }
    }
  }

  async function handleUpdateSignature(newUrl: string) {
    setVendorProfile((prev) => {
      const base = prev || SAMPLE_VENDOR;
      return { ...base, signature_url: newUrl || null };
    });
    if (targetVendorId) {
      try {
        await updateVendorInvoiceProfile(targetVendorId, { signature_url: newUrl || null });
        setMessage({ type: 'success', text: 'Signature uploaded, cropped, and saved to vendor profile!' });
      } catch (err: any) {
        console.warn('Auto-save signature error', err);
      }
    }
  }

  const filteredFonts = useMemo(() => {
    return INVOICE_FONTS.filter((f) => {
      const matchesCat = fontCategoryFilter === 'ALL' || f.category === fontCategoryFilter;
      const q = fontSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        f.name.toLowerCase().includes(q) ||
        f.badge.toLowerCase().includes(q) ||
        f.recommendedFor.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [fontCategoryFilter, fontSearch]);

  function handleSelectSavedTemplate(id: string) {
    setSelectedTemplateId(id);
    const found = templates.find((t) => t.id === id);
    if (found) {
      setTpl(found);
      setMessage(null);
    }
  }

  // Apply one of the 5 industry-specific presets
  function applyPreset(presetId: string) {
    const p = INVOICE_PRESETS.find((x) => x.id === presetId);
    if (!p) return;
    setTpl((prev) => ({
      ...prev,
      ...p.template,
      name: `${p.name} (Customized)`,
    }));
    setMessage({
      type: 'success',
      text: `Applied "${p.name}" preset! Edit sections and texts live beside.`,
    });
  }

  // Section Ordering (Drag and Drop / Move Up / Move Down)
  const currentSectionOrder = parseSectionOrder(tpl.custom_labels?.section_order);

  function updateSectionOrder(newOrder: InvoiceSectionKey[]) {
    setTpl((prev) => ({
      ...prev,
      custom_labels: {
        ...(prev.custom_labels || {}),
        section_order: newOrder.join(','),
      },
    }));
  }

  function moveSection(index: number, direction: 'UP' | 'DOWN') {
    const newIndex = direction === 'UP' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= currentSectionOrder.length) return;
    const order = [...currentSectionOrder];
    const [moved] = order.splice(index, 1);
    order.splice(newIndex, 0, moved);
    updateSectionOrder(order);
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const order = [...currentSectionOrder];
    const [moved] = order.splice(draggedIndex, 1);
    order.splice(index, 0, moved);
    setDraggedIndex(index);
    updateSectionOrder(order);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
  }

  // Live text update handlers (called directly when user clicks & types in preview or sidebar)
  function handleUpdateCustomLabel(key: string, value: string) {
    setTpl((prev) => ({
      ...prev,
      custom_labels: {
        ...(prev.custom_labels || {}),
        [key]: value,
      },
    }));
  }

  function handleUpdateCustomTitle(title: string) {
    setTpl((prev) => ({ ...prev, custom_title: title }));
  }

  function handleUpdateFooterText(text: string) {
    setTpl((prev) => ({ ...prev, footer_text: text }));
  }

  function toggleFieldVisibility(fieldKey: string) {
    setTpl((prev) => ({
      ...prev,
      field_visibility: {
        ...(prev.field_visibility || {}),
        [fieldKey]: prev.field_visibility?.[fieldKey] === false ? true : false,
      },
    }));
  }

  function handleUpdateColumnWidth(colKey: string, newWidth: number) {
    setTpl((prev) => ({
      ...prev,
      column_widths: {
        ...(prev.column_widths || {}),
        [colKey]: newWidth,
      },
    }));
  }

  async function handleSaveTemplate(asNew = false) {
    if (!targetVendorId) return;
    setSaving(true);
    setMessage(null);
    try {
      if (selectedTemplateId && !asNew) {
        await updateInvoiceTemplate(targetVendorId, selectedTemplateId, tpl);
        setMessage({ type: 'success', text: 'Template changes saved successfully!' });
      } else {
        const res = await createInvoiceTemplate(targetVendorId, {
          ...tpl,
          name: tpl.name || 'New Custom Template',
        });
        setSelectedTemplateId(res.template.id);
        setMessage({ type: 'success', text: 'Created new customized invoice template!' });
      }
      await loadTemplatesAndProfile();
    } catch (err: any) {
      setMessage({ type: 'error', text: `Failed to save template: ${err.message}` });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300">
              🎨 12 Professional Presets
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300">
              ✍️ Live Inline Context Editing
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300">
              ↔️ Draggable Column Widths
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-2">Invoice Template Designer</h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Choose from 12 industry presets (including Engineering Works, Classic Tally ERP, and Modern Minimalist Banner). Drag table column dividers directly in the preview beside to resize columns, and toggle body particulars active or inactive.
          </p>
        </div>

        {/* Saved Templates Selector */}
        <div className="flex items-center gap-2 bg-slate-800/80 p-2 rounded-xl border border-slate-700">
          <span className="text-xs text-slate-400 font-medium">Template:</span>
          <select
            value={selectedTemplateId}
            onChange={(e) => handleSelectSavedTemplate(e.target.value)}
            className="bg-slate-900 text-white border border-slate-600 rounded-lg px-3 py-1.5 text-xs font-bold outline-none"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.is_default ? '★ Default' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-sm font-bold opacity-60 hover:opacity-100">
            ×
          </button>
        </div>
      )}

      {/* 2-COLUMN WORKSPACE: Controls on Left, Live Preview Beside on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* =================================================================== */}
        {/* LEFT PANEL: Customization Controls (Tabs) */}
        {/* =================================================================== */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
          
          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50/80 p-1.5 gap-1 overflow-x-auto scrollbar-none font-semibold">
            {[
              { key: 'PRESETS', label: '📐 12 Presets', icon: '📐' },
              { key: 'BRANDING', label: '🖼️ Logo & Signature', icon: '🖼️' },
              { key: 'LAYOUT', label: '🔀 Layout & Order', icon: '🔀' },
              { key: 'TEXTS', label: '✍️ Text Context', icon: '✍️' },
              { key: 'STYLING', label: '🔤 17+ Font Styles', icon: '🔤' },
              { key: 'COLUMNS', label: '👁️ Visibility & Widths', icon: '👁️' },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key as ActiveCustomizerTab)}
                className={`px-3 py-2 rounded-xl whitespace-nowrap transition font-bold shrink-0 ${
                  activeTab === key
                    ? 'bg-white text-blue-600 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-5 space-y-5 max-h-[750px] overflow-y-auto">
            
            {/* ------------------------------------------------------------- */}
            {/* TAB 1: 5 INDUSTRY PRESETS */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'PRESETS' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Select Industry Invoice Preset</h3>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Click any preset to apply layout, colors, labels, and regulatory settings for that business type:
                  </p>
                </div>

                <div className="space-y-3">
                  {INVOICE_PRESETS.map((p) => {
                    const isSelected = tpl.custom_labels?.layout_type === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => applyPreset(p.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition text-left relative ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20'
                            : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{p.icon}</span>
                            <div>
                              <h4 className="font-bold text-slate-900 text-xs">{p.name}</h4>
                              <span className="text-[10px] text-blue-700 font-semibold">{p.badge}</span>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="px-2 py-0.5 bg-blue-600 text-white rounded-md text-[10px] font-bold">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">{p.description}</p>
                        <div className="mt-2 text-[10px] text-slate-400">
                          Target: <strong className="text-slate-600">{p.targetAudience}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 2: BRANDING ASSETS (DEDICATED LOGO & SIGNATURE UPLOAD/CROP) */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'BRANDING' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <span>🖼️</span> Dedicated Branding Assets Studio
                  </h3>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Upload official Company Logo and Authorized Signatures from local files (.png, .jpg, .jpeg, .webp, .pdf). Built-in cropping lets you pan, zoom, and crop to exact dimensions:
                  </p>
                </div>

                {/* 1. Company Logo Station */}
                <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <span>🏢</span> Company Header Logo
                    </span>
                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                      PNG / JPG / PDF
                    </span>
                  </div>

                  <BrandingAssetUploader
                    label="Company Logo"
                    sublabel="Upload from local drive and crop with 1:1 or free aspect ratio"
                    value={vendorProfile?.logo_url || ''}
                    onChange={handleUpdateLogo}
                    vendorId={targetVendorId}
                    preset="1:1"
                    placeholder="https://..."
                  />

                  {/* Logo Dimensions & Alignment Controls */}
                  <div className="pt-2 border-t border-slate-200 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Logo Width: {tpl.logo_width || 75}px
                        </label>
                        <input
                          type="range"
                          min="40"
                          max="180"
                          value={tpl.logo_width || 75}
                          onChange={(e) => setTpl((prev) => ({ ...prev, logo_width: Number(e.target.value) }))}
                          className="w-full accent-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Logo Height: {tpl.logo_height || 75}px
                        </label>
                        <input
                          type="range"
                          min="40"
                          max="180"
                          value={tpl.logo_height || 75}
                          onChange={(e) => setTpl((prev) => ({ ...prev, logo_height: Number(e.target.value) }))}
                          className="w-full accent-blue-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Logo Alignment</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { val: 'top-left', lbl: 'Left Align' },
                          { val: 'top-center', lbl: 'Center Align' },
                          { val: 'top-right', lbl: 'Right Align' },
                        ].map(({ val, lbl }) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setTpl((prev) => ({ ...prev, logo_position: val as any }))}
                            className={`p-1.5 text-center rounded-lg border font-semibold text-[11px] transition ${
                              (tpl.logo_position || 'top-left') === val
                                ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Authorized Signature & Stamp Station */}
                <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <span>✍️</span> Authorized Signatory & Official Stamp
                    </span>
                    <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                      PNG / JPG / PDF
                    </span>
                  </div>

                  <BrandingAssetUploader
                    label="Authorized Signature"
                    sublabel="Upload signature/stamp image or scanned PDF and crop signature box"
                    value={vendorProfile?.signature_url || ''}
                    onChange={handleUpdateSignature}
                    vendorId={targetVendorId}
                    preset="3:1"
                    placeholder="https://..."
                  />

                  {/* Signatory Settings */}
                  <div className="pt-2 border-t border-slate-200 space-y-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Signatory Designation / Label
                      </label>
                      <input
                        type="text"
                        value={tpl.custom_labels?.signatory_title || 'Authorised Signatory'}
                        onChange={(e) => handleUpdateCustomLabel('signatory_title', e.target.value)}
                        placeholder="e.g. Authorised Signatory, Managing Director, Proprietor"
                        className="w-full border rounded-lg p-2 text-xs bg-white font-semibold"
                      />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer p-1 hover:bg-slate-100 rounded-lg transition">
                      <input
                        type="checkbox"
                        checked={tpl.field_visibility?.signature !== false}
                        onChange={() => toggleFieldVisibility('signature')}
                        className="rounded text-blue-600"
                      />
                      <span className="font-semibold text-slate-700 text-xs">
                        Show Authorized Signatory Block on Invoice
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 3: DRAG & DROP LAYOUT & SWAP CONTROLS */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'LAYOUT' && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Drag & Drop Section Arranger</h3>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Drag handles (⠿) or use the arrows to reorder sections. Changes immediately reflect in the preview beside:
                  </p>
                </div>

                {/* Drag and Drop List */}
                <div className="space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                  {currentSectionOrder.map((secKey, index) => {
                    const info = INVOICE_SECTION_LABELS[secKey];
                    const isDragging = draggedIndex === index;
                    return (
                      <div
                        key={secKey}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center justify-between p-2.5 bg-white border rounded-xl shadow-2xs transition cursor-grab active:cursor-grabbing ${
                          isDragging ? 'opacity-40 border-dashed border-blue-500 scale-95' : 'border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-slate-400 font-bold select-none text-sm">⠿</span>
                          <span className="text-base">{info?.icon || '📄'}</span>
                          <span className="font-semibold text-slate-800 text-xs">
                            {index + 1}. {info?.label || secKey}
                          </span>
                        </div>

                        {/* Move Up / Down Buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveSection(index, 'UP')}
                            className="p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-20 rounded"
                            title="Move Up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={index === currentSectionOrder.length - 1}
                            onClick={() => moveSection(index, 'DOWN')}
                            className="p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-20 rounded"
                            title="Move Down"
                          >
                            ↓
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Section Replacement / Swapping Positions */}
                <div className="border-t pt-4 space-y-4">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Position & Alignment Swappers
                  </h4>

                  {/* Buyer & Seller Card Swapper */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Party Cards Arrangement:</label>
                    <select
                      value={tpl.custom_labels?.party_layout || 'seller_left_buyer_right'}
                      onChange={(e) => handleUpdateCustomLabel('party_layout', e.target.value)}
                      className="w-full border rounded-lg p-2 text-xs font-semibold bg-white"
                    >
                      <option value="seller_left_buyer_right">Seller (Left) + Buyer (Right) — Standard</option>
                      <option value="buyer_left_seller_right">Buyer (Left) + Seller (Right) — Inverted</option>
                      <option value="stacked">Stacked Full-Width (Seller above Buyer)</option>
                    </select>
                  </div>

                  {/* UPI QR Code Position */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Scan-to-Pay UPI QR Position:</label>
                    <select
                      value={tpl.custom_labels?.qr_position || 'beside_bank'}
                      onChange={(e) => handleUpdateCustomLabel('qr_position', e.target.value)}
                      className="w-full border rounded-lg p-2 text-xs font-semibold bg-white"
                    >
                      <option value="beside_bank">Beside Bank Details Box (Recommended)</option>
                      <option value="prominent_center">Prominent Center Card (Best for Retail / POS)</option>
                    </select>
                  </div>

                  {/* Logo Position */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Header Logo Position:</label>
                    <select
                      value={tpl.logo_position || 'top-left'}
                      onChange={(e) => setTpl((prev) => ({ ...prev, logo_position: e.target.value as any }))}
                      className="w-full border rounded-lg p-2 text-xs font-semibold bg-white"
                    >
                      <option value="top-left">Top Left</option>
                      <option value="top-center">Top Center</option>
                      <option value="top-right">Top Right</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 3: TEXT CONTEXT & EDITABLE LABELS */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'TEXTS' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Editable Text Context</h3>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Customize any wording or title. You can also click directly on any text in the preview beside to edit it:
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Main Invoice Title (Any Word) *</label>
                    <input
                      type="text"
                      value={tpl.custom_title || ''}
                      onChange={(e) => handleUpdateCustomTitle(e.target.value)}
                      placeholder="e.g. TAX INVOICE, BILL OF SUPPLY, PROFORMA"
                      className="w-full border rounded-lg p-2 text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Subtitle / Statutory Reference</label>
                    <input
                      type="text"
                      value={tpl.custom_labels?.subtitle || ''}
                      onChange={(e) => handleUpdateCustomLabel('subtitle', e.target.value)}
                      placeholder="e.g. (Issued under Rule 46 of CGST Rules, 2017)"
                      className="w-full border rounded-lg p-2 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Invoice # Label</label>
                      <input
                        type="text"
                        value={tpl.custom_labels?.invoice_number || ''}
                        onChange={(e) => handleUpdateCustomLabel('invoice_number', e.target.value)}
                        placeholder="Invoice No"
                        className="w-full border rounded-lg p-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Invoice Date Label</label>
                      <input
                        type="text"
                        value={tpl.custom_labels?.invoice_date || ''}
                        onChange={(e) => handleUpdateCustomLabel('invoice_date', e.target.value)}
                        placeholder="Invoice Date"
                        className="w-full border rounded-lg p-2 text-xs"
                      />
                    </div>
                  </div>

                  {/* Body Particulars & References Customizer */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      📑 Invoice Body Particulars & References (In Body)
                    </h4>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Particulars Title in Body</label>
                      <input
                        type="text"
                        value={tpl.custom_labels?.details_section_title || ''}
                        onChange={(e) => handleUpdateCustomLabel('details_section_title', e.target.value)}
                        placeholder="Invoice Particulars & Statutory References"
                        className="w-full border rounded-lg p-2 text-xs bg-white font-semibold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Document Copy Badge</label>
                        <input
                          type="text"
                          value={tpl.custom_labels?.copy_category || ''}
                          onChange={(e) => handleUpdateCustomLabel('copy_category', e.target.value)}
                          placeholder="Original for Recipient"
                          className="w-full border rounded-lg p-2 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Reverse Charge (RCM) Text</label>
                        <input
                          type="text"
                          value={tpl.custom_labels?.reverse_charge_val || ''}
                          onChange={(e) => handleUpdateCustomLabel('reverse_charge_val', e.target.value)}
                          placeholder="No / Yes"
                          className="w-full border rounded-lg p-2 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Ref #1 Label (e.g. PO/WO/LR/DL)</label>
                        <input
                          type="text"
                          value={tpl.custom_labels?.ref_po_label || ''}
                          onChange={(e) => handleUpdateCustomLabel('ref_po_label', e.target.value)}
                          placeholder="Purchase Order (PO) Ref"
                          className="w-full border rounded-lg p-2 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Ref #1 Value</label>
                        <input
                          type="text"
                          value={tpl.custom_labels?.ref_po_value || ''}
                          onChange={(e) => handleUpdateCustomLabel('ref_po_value', e.target.value)}
                          placeholder="PO-2026-9810"
                          className="w-full border rounded-lg p-2 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Ref #2 Label (e.g. E-Way/Cashier)</label>
                        <input
                          type="text"
                          value={tpl.custom_labels?.ref_secondary_label || ''}
                          onChange={(e) => handleUpdateCustomLabel('ref_secondary_label', e.target.value)}
                          placeholder="E-Way Bill Number"
                          className="w-full border rounded-lg p-2 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Ref #2 Value</label>
                        <input
                          type="text"
                          value={tpl.custom_labels?.ref_secondary_value || ''}
                          onChange={(e) => handleUpdateCustomLabel('ref_secondary_value', e.target.value)}
                          placeholder="2410-9832-1192"
                          className="w-full border rounded-lg p-2 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Ref #3 Label (e.g. Vehicle/Payment)</label>
                        <input
                          type="text"
                          value={tpl.custom_labels?.ref_tertiary_label || ''}
                          onChange={(e) => handleUpdateCustomLabel('ref_tertiary_label', e.target.value)}
                          placeholder="Vehicle / Dispatch No."
                          className="w-full border rounded-lg p-2 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Ref #3 Value</label>
                        <input
                          type="text"
                          value={tpl.custom_labels?.ref_tertiary_value || ''}
                          onChange={(e) => handleUpdateCustomLabel('ref_tertiary_value', e.target.value)}
                          placeholder="TS 09 UB 1234"
                          className="w-full border rounded-lg p-2 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Ref #4 Label (e.g. Due Date/Route)</label>
                        <input
                          type="text"
                          value={tpl.custom_labels?.ref_quaternary_label || ''}
                          onChange={(e) => handleUpdateCustomLabel('ref_quaternary_label', e.target.value)}
                          placeholder="Due Date / Terms"
                          className="w-full border rounded-lg p-2 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Ref #4 Value</label>
                        <input
                          type="text"
                          value={tpl.custom_labels?.ref_quaternary_value || ''}
                          onChange={(e) => handleUpdateCustomLabel('ref_quaternary_value', e.target.value)}
                          placeholder="Net 15 Days (Due: 31-10-2026)"
                          className="w-full border rounded-lg p-2 text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Buyer Section Title</label>
                      <input
                        type="text"
                        value={tpl.custom_labels?.buyer || ''}
                        onChange={(e) => handleUpdateCustomLabel('buyer', e.target.value)}
                        placeholder="Billed To"
                        className="w-full border rounded-lg p-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Seller Section Title</label>
                      <input
                        type="text"
                        value={tpl.custom_labels?.seller || ''}
                        onChange={(e) => handleUpdateCustomLabel('seller', e.target.value)}
                        placeholder="Issued By"
                        className="w-full border rounded-lg p-2 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Terms & Conditions Title</label>
                    <input
                      type="text"
                      value={tpl.custom_labels?.terms_title || ''}
                      onChange={(e) => handleUpdateCustomLabel('terms_title', e.target.value)}
                      placeholder="Terms & Conditions:"
                      className="w-full border rounded-lg p-2 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Terms Content Clauses</label>
                    <textarea
                      rows={4}
                      value={tpl.custom_labels?.terms_text || ''}
                      onChange={(e) => handleUpdateCustomLabel('terms_text', e.target.value)}
                      placeholder="1. Goods once sold will not be returned..."
                      className="w-full border rounded-lg p-2 text-xs font-mono leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Footer Greeting / Closing Note</label>
                    <input
                      type="text"
                      value={tpl.footer_text || ''}
                      onChange={(e) => handleUpdateFooterText(e.target.value)}
                      placeholder="Thank you for your business!"
                      className="w-full border rounded-lg p-2 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 5: STYLING, COLORS & TOP 17+ FONT STYLES */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'STYLING' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <span>🔤</span> Top 17 Professional Font Styles
                  </h3>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Choose from 17 top-tier typography styles designed specifically for invoices, financial clarity, and statutory GST compliance:
                  </p>
                </div>

                {/* Category Filter Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pb-1">
                  {(['ALL', 'Sans-Serif', 'Serif', 'Monospace / ERP'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFontCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                        fontCategoryFilter === cat
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat === 'ALL' ? 'All (17 Fonts)' : cat}
                    </button>
                  ))}
                </div>

                {/* Font Search */}
                <div>
                  <input
                    type="text"
                    value={fontSearch}
                    onChange={(e) => setFontSearch(e.target.value)}
                    placeholder="Search fonts by name, style, or industry..."
                    className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-slate-50 focus:bg-white"
                  />
                </div>

                {/* Scrollable Font Cards List */}
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {filteredFonts.map((f) => {
                    const isSelected =
                      (tpl.font_family || 'inter').toLowerCase() === f.id.toLowerCase() ||
                      (f.id === 'inter' && tpl.font_family === 'sans-serif') ||
                      (f.id === 'merriweather' && tpl.font_family === 'serif') ||
                      (f.id === 'jetbrains_mono' && (tpl.font_family === 'mono' || tpl.font_family === 'monospace'));

                    return (
                      <div
                        key={f.id}
                        onClick={() => setTpl((prev) => ({ ...prev, font_family: f.id }))}
                        className={`p-3 rounded-xl border cursor-pointer transition relative group ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/60 shadow-xs ring-1 ring-blue-500'
                            : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="font-bold text-sm text-slate-900"
                              style={{ fontFamily: f.family }}
                            >
                              {f.name}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              {f.badge}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-slate-400">
                              {f.category}
                            </span>
                            {isSelected && (
                              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                                ✓
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Live Font Sample */}
                        <div
                          className="mt-2 p-2 rounded-lg bg-white border border-slate-100 text-xs font-medium text-slate-800 tracking-wide"
                          style={{ fontFamily: f.family }}
                        >
                          {f.previewSample}
                        </div>

                        <div className="mt-1 text-[10px] text-slate-400 flex items-center gap-1">
                          <span className="font-semibold text-slate-500">Best for:</span> {f.recommendedFor}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Typography Sizing Controls */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <span>📏</span> Typography Sizing Scales
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Invoice Title: {tpl.title_font_size || 20}px
                      </label>
                      <input
                        type="range"
                        min="14"
                        max="32"
                        value={tpl.title_font_size || 20}
                        onChange={(e) => setTpl((prev) => ({ ...prev, title_font_size: Number(e.target.value) }))}
                        className="w-full accent-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Header Details: {tpl.header_font_size || 10}px
                      </label>
                      <input
                        type="range"
                        min="8"
                        max="14"
                        value={tpl.header_font_size || 10}
                        onChange={(e) => setTpl((prev) => ({ ...prev, header_font_size: Number(e.target.value) }))}
                        className="w-full accent-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Table Header: {tpl.table_header_font_size || 9}px
                      </label>
                      <input
                        type="range"
                        min="7"
                        max="13"
                        value={tpl.table_header_font_size || 9}
                        onChange={(e) => setTpl((prev) => ({ ...prev, table_header_font_size: Number(e.target.value) }))}
                        className="w-full accent-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Table Body: {tpl.table_body_font_size || 9}px
                      </label>
                      <input
                        type="range"
                        min="7"
                        max="13"
                        value={tpl.table_body_font_size || 9}
                        onChange={(e) => setTpl((prev) => ({ ...prev, table_body_font_size: Number(e.target.value) }))}
                        className="w-full accent-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Summary Matrix: {tpl.summary_font_size || 10}px
                      </label>
                      <input
                        type="range"
                        min="8"
                        max="14"
                        value={tpl.summary_font_size || 10}
                        onChange={(e) => setTpl((prev) => ({ ...prev, summary_font_size: Number(e.target.value) }))}
                        className="w-full accent-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Footer Notes: {tpl.footer_font_size || 8}px
                      </label>
                      <input
                        type="range"
                        min="7"
                        max="12"
                        value={tpl.footer_font_size || 8}
                        onChange={(e) => setTpl((prev) => ({ ...prev, footer_font_size: Number(e.target.value) }))}
                        className="w-full accent-blue-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Colors & Page Sheet Format */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Primary Accent Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={tpl.accent_color || '#1d4ed8'}
                        onChange={(e) => setTpl((prev) => ({ ...prev, accent_color: e.target.value }))}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0"
                      />
                      <input
                        type="text"
                        value={tpl.accent_color || ''}
                        onChange={(e) => setTpl((prev) => ({ ...prev, accent_color: e.target.value }))}
                        className="w-full border rounded-lg p-1.5 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Header Background</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={tpl.header_bg_color || '#f8fafc'}
                        onChange={(e) => setTpl((prev) => ({ ...prev, header_bg_color: e.target.value }))}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0"
                      />
                      <input
                        type="text"
                        value={tpl.header_bg_color || ''}
                        onChange={(e) => setTpl((prev) => ({ ...prev, header_bg_color: e.target.value }))}
                        className="w-full border rounded-lg p-1.5 font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Page Format Size</label>
                    <select
                      value={tpl.page_size || 'A4'}
                      onChange={(e) => setTpl((prev) => ({ ...prev, page_size: e.target.value as any }))}
                      className="w-full border rounded-lg p-2 text-xs font-semibold bg-white"
                    >
                      <option value="A4">A4 Standard Sheet</option>
                      <option value="A5">A5 Compact Half-Sheet</option>
                      <option value="THERMAL">Thermal POS Receipt (80mm)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Watermark Text (Optional)</label>
                    <input
                      type="text"
                      value={tpl.watermark_text || ''}
                      onChange={(e) => setTpl((prev) => ({ ...prev, watermark_text: e.target.value }))}
                      placeholder="e.g. DRAFT, ORIGINAL, SAMPLE"
                      className="w-full border rounded-lg p-2 text-xs uppercase"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 5: VISIBILITY TOGGLES */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'COLUMNS' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Table Columns & Field Visibility</h3>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Check or uncheck elements to include or omit them from the generated invoice:
                  </p>
                </div>

                <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                  {[
                    { key: 'invoice_details', label: 'Invoice Body Particulars Strip (Active / Inactive)' },
                    { key: 'secondary_refs', label: 'Secondary References / PO / Transport (Active / Inactive)' },
                    { key: 'hsn_tax_summary_table', label: 'Statutory HSN/SAC Tax Matrix Sub-table (Tally ERP Style)' },
                    { key: 'balance_due_fields', label: 'Balance Received & Balance Due Rows (Modern Accent)' },
                    { key: 'framed_border', label: 'Framed Boxed Document Border (Engineering & Tally)' },
                    { key: 'hsn_column', label: 'HSN/SAC Code Column' },
                    { key: 'unit_column', label: 'Unit of Measure Column' },
                    { key: 'qty_column', label: 'Quantity Column' },
                    { key: 'rate_column', label: 'Rate (Unit Price) Column' },
                    { key: 'buyer_gstin', label: 'Buyer GSTIN Display' },
                    { key: 'buyer_address', label: 'Buyer Full Address' },
                    { key: 'place_of_supply', label: 'Place of Supply' },
                    { key: 'bank_details', label: 'Bank Payment Details Box' },
                    { key: 'upi_qr', label: 'UPI Scan-to-Pay QR Code' },
                    { key: 'terms', label: 'Terms & Conditions Clause' },
                    { key: 'signature', label: 'Authorized Signatory Box' },
                    { key: 'amount_in_words', label: 'Amount in Words Box' },
                  ].map(({ key, label }) => {
                    const isVisible = tpl.field_visibility?.[key] !== false;
                    return (
                      <label key={key} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-white rounded-lg transition">
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => toggleFieldVisibility(key)}
                          className="rounded text-blue-600"
                        />
                        <span className="font-semibold text-slate-800 text-xs">{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="border-t pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tpl.is_default || false}
                  onChange={(e) => setTpl((prev) => ({ ...prev, is_default: e.target.checked }))}
                  className="rounded text-blue-600"
                />
                <span className="font-bold text-slate-800 text-xs">Set as Default Template</span>
              </label>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleSaveTemplate(false)}
                  disabled={saving}
                  className="flex-1 sm:flex-initial px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : '💾 Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveTemplate(true)}
                  disabled={saving}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition disabled:opacity-50"
                >
                  Save As New
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* RIGHT PANEL: Live Interactive Preview Beside */}
        {/* =================================================================== */}
        <div className="lg:col-span-7 lg:sticky lg:top-4 space-y-3">
          <div className="bg-slate-900 text-white p-3 rounded-2xl flex items-center justify-between text-xs shadow-md">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-bold">Live Invoice Preview Beside</span>
              <span className="text-slate-400">|</span>
              <span className="text-blue-300 text-[11px]">Drag column edges to resize • Click text to edit</span>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold text-[11px] transition"
            >
              🖨️ Test Print
            </button>
          </div>

          {/* Interactive Document View */}
          <div className="overflow-x-auto p-1 bg-slate-100/70 rounded-2xl border border-slate-200 shadow-inner">
            <InvoiceDocumentView
              invoice={SAMPLE_INVOICE}
              lines={SAMPLE_LINES}
              vendor={vendorProfile || SAMPLE_VENDOR}
              template={tpl as InvoiceTemplate}
              interactive={true}
              onUpdateLabel={handleUpdateCustomLabel}
              onUpdateCustomTitle={handleUpdateCustomTitle}
              onUpdateFooterText={handleUpdateFooterText}
              onUpdateColumnWidth={handleUpdateColumnWidth}
              onSelectSection={(sec) => {
                if (sec === 'header' || sec === 'signature') {
                  setActiveTab('BRANDING');
                } else {
                  setActiveTab('LAYOUT');
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
