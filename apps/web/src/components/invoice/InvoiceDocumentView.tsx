import { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { numberToWordsIndian } from '../../lib/amountInWords';
import type { Invoice, InvoiceLineItem, InvoiceTemplate, VendorInvoiceProfile } from '../../lib/invoiceApi';
import {
  parseSectionOrder,
  type InvoiceSectionKey,
} from '../../constants/invoicePresets';
import { getFontFamilyCss } from '../../constants/invoiceFonts';

interface Props {
  invoice: Invoice;
  lines: InvoiceLineItem[];
  vendor?: VendorInvoiceProfile | null;
  template?: InvoiceTemplate | null;
  interactive?: boolean;
  onUpdateLabel?: (key: string, value: string) => void;
  onUpdateCustomTitle?: (title: string) => void;
  onUpdateFooterText?: (text: string) => void;
  onSelectSection?: (sectionKey: InvoiceSectionKey) => void;
  onUpdateColumnWidth?: (colKey: string, newWidth: number) => void;
}

const DEFAULT_TEMPLATE: InvoiceTemplate = {
  id: 'default',
  vendor_id: '',
  name: 'Default Standard',
  page_size: 'A4',
  orientation: 'portrait',
  accent_color: '#1d4ed8',
  secondary_color: '#64748b',
  font_family: 'sans-serif',
  logo_position: 'top-left',
  logo_width: 80,
  logo_height: 80,
  custom_title: 'TAX INVOICE',
  title_font_size: 18,
  title_alignment: 'center',
  header_font_size: 10,
  table_header_font_size: 9,
  table_body_font_size: 9,
  footer_font_size: 8,
  summary_font_size: 10,
  custom_labels: {},
  field_visibility: {
    invoice_details: true,
    secondary_refs: true,
    hsn_column: true,
    unit_column: true,
    qty_column: true,
    rate_column: true,
    buyer_gstin: true,
    buyer_address: true,
    place_of_supply: true,
    bank_details: true,
    upi_qr: true,
    signature: true,
    terms: true,
    amount_in_words: true,
  },
  column_widths: {
    sno: 5,
    description: 25,
    hsn: 10,
    qty: 8,
    unit: 7,
    rate: 12,
    taxable: 13,
    tax: 8,
    total: 12,
  },
  custom_fields: [],
  text_styles: {
    title: { bold: true, uppercase: true, letterSpacing: 2 },
  },
  footer_text: 'Thank you for your business!',
  watermark_text: '',
  show_table_borders: true,
  border_color: '#e2e8f0',
  header_bg_color: '#f8fafc',
  alternate_row_color: '',
  is_default: true,
};

export function InvoiceDocumentView({
  invoice,
  lines,
  vendor,
  template,
  interactive = false,
  onUpdateLabel,
  onUpdateCustomTitle,
  onUpdateFooterText,
  onSelectSection,
  onUpdateColumnWidth,
}: Props) {
  const tpl: InvoiceTemplate = (template || invoice.template_snapshot || DEFAULT_TEMPLATE) as InvoiceTemplate;

  const labels = tpl.custom_labels || {};
  const vis = tpl.field_visibility || {};
  const colW = tpl.column_widths || {};

  // Extract layout configuration
  const layoutType = labels.layout_type || 'TRADERS_B2B';
  const partyLayout = labels.party_layout || 'seller_left_buyer_right';
  const qrPosition = labels.qr_position || (layoutType === 'RETAILERS_POS' || layoutType === 'SMALL_BUSINESS' ? 'prominent_center' : 'beside_bank');
  const sectionOrder = parseSectionOrder(labels.section_order);

  // Dynamic labels with defaults
  const lblTitle = tpl.custom_title || 'TAX INVOICE';
  const lblSubtitle = labels.subtitle || '';
  const lblInvoiceNo = labels.invoice_number || 'Invoice No';
  const lblInvoiceDate = labels.invoice_date || 'Date';
  const lblBuyer = labels.buyer || (layoutType === 'ENGINEERING_WORKS' ? 'Details of Receiver (Billed to)' : layoutType === 'TALLY_CLASSIC_ERP' ? 'Buyer' : 'Billed To');
  const lblSeller = labels.seller || (layoutType === 'ENGINEERING_WORKS' ? 'Details of Supplier' : 'Issued By');
  const lblPlaceOfSupply = labels.place_of_supply || 'Place of Supply';
  const lblTermsTitle = labels.terms_title || (layoutType === 'ENGINEERING_WORKS' ? 'Terms & condition:' : layoutType === 'TALLY_CLASSIC_ERP' ? 'Declaration:' : 'Terms & Conditions:');
  const lblTermsText = labels.terms_text || vendor?.invoice_terms || '1. Goods once sold will not be taken back.\n2. Interest @18% p.a. will be charged on overdue payments.\n3. Subject to local jurisdiction.';
  const lblSignatoryTitle = labels.signatory_title || 'Authorised Signatory';
  const lblPaymentTitle = labels.payment_title || 'Payment & Bank Coordinates';
  const footerText = tpl.footer_text || 'Thank you for your business!';

  // Column header custom labels
  const colSno = labels.col_sno || '#';
  const colDesc = labels.col_description || 'Item Description';
  const colHsn = labels.col_hsn || (layoutType === 'SERVICE_PRO' ? 'SAC Code' : 'HSN/SAC');
  const colQty = labels.col_qty || (layoutType === 'SERVICE_PRO' ? 'Hours/Milestone' : 'Qty');
  const colUnit = labels.col_unit || (layoutType === 'TALLY_CLASSIC_ERP' ? 'per' : 'Unit');
  const colRate = labels.col_rate || 'Rate (₹)';
  const colTaxable = labels.col_taxable || 'Taxable (₹)';
  const colTax = labels.col_tax || (invoice.is_igst ? 'IGST' : 'CGST+SGST');
  const colTotal = labels.col_total || 'Total (₹)';

  // Inline editing state
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');

  function startEditing(key: string, currentValue: string) {
    if (!interactive) return;
    setEditingKey(key);
    setTempValue(currentValue);
  }

  function commitEditing(key: string) {
    if (key === 'custom_title') {
      if (onUpdateCustomTitle) onUpdateCustomTitle(tempValue);
    } else if (key === 'footer_text') {
      if (onUpdateFooterText) onUpdateFooterText(tempValue);
    } else {
      if (onUpdateLabel) onUpdateLabel(key, tempValue);
    }
    setEditingKey(null);
  }

  function handleKeyDown(e: React.KeyboardEvent, key: string) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commitEditing(key);
    } else if (e.key === 'Escape') {
      setEditingKey(null);
    }
  }

  // Interactive Column Resizing Handler
  function handleMouseDownResize(e: React.MouseEvent, colKey: string) {
    if (!interactive) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const initialWidth = colW[colKey] || 10;

    function onMouseMove(moveEvent: MouseEvent) {
      const deltaX = moveEvent.clientX - startX;
      // Convert pixel delta into percentage based on 750px table width
      const deltaPercent = Math.round((deltaX / 750) * 100);
      const newWidth = Math.max(3, Math.min(65, initialWidth + deltaPercent));
      if (onUpdateColumnWidth) {
        onUpdateColumnWidth(colKey, newWidth);
      }
    }

    function onMouseUp() {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  function renderResizeHandle(colKey: string) {
    if (!interactive) return null;
    return (
      <div
        onMouseDown={(e) => handleMouseDownResize(e, colKey)}
        className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500/60 transition-colors z-20 group-hover:bg-slate-300/80 flex items-center justify-center select-none"
        title="Drag left/right to resize column width"
      >
        <div className="w-0.5 h-3 bg-slate-400 group-hover:bg-blue-600 rounded" />
      </div>
    );
  }

  // Helper component to render an inline editable text string
  function RenderEditable({
    idKey,
    value,
    className = '',
    style = {},
    multiline = false,
  }: {
    idKey: string;
    value: string;
    className?: string;
    style?: React.CSSProperties;
    multiline?: boolean;
  }) {
    if (interactive && editingKey === idKey) {
      if (multiline) {
        return (
          <textarea
            autoFocus
            rows={3}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => commitEditing(idKey)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setEditingKey(null);
            }}
            className="w-full p-1 text-xs border-2 border-blue-500 rounded bg-blue-50/50 text-slate-900 outline-none"
          />
        );
      }
      return (
        <input
          type="text"
          autoFocus
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={() => commitEditing(idKey)}
          onKeyDown={(e) => handleKeyDown(e, idKey)}
          className="p-1 text-xs border-2 border-blue-500 rounded bg-blue-50/50 text-slate-900 font-bold outline-none inline-block max-w-full"
        />
      );
    }

    if (interactive) {
      return (
        <span
          onClick={() => startEditing(idKey, value)}
          className={`cursor-pointer hover:outline-dashed hover:outline-2 hover:outline-blue-400 hover:bg-blue-50/60 rounded px-1 transition relative group ${className}`}
          style={style}
          title="Click to edit text directly"
        >
          {value || <span className="text-slate-300 italic">(Empty text)</span>}
          <span className="opacity-0 group-hover:opacity-100 transition text-[9px] text-blue-600 font-normal ml-1 select-none">
            ✎
          </span>
        </span>
      );
    }

    return (
      <span className={className} style={style}>
        {value}
      </span>
    );
  }

  // UPI Payment String
  const upiId = vendor?.upi_id || '';
  const upiString = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
        vendor?.business_name || vendor?.name || 'Vendor'
      )}&am=${invoice.grand_total}&cu=INR&tn=${encodeURIComponent(invoice.invoice_number)}`
    : '';

  const amountInWords = numberToWordsIndian(invoice.grand_total);

  // Total discounts calculation for retail savings badge
  const totalDiscounts = lines.reduce((acc, l) => {
    const disc = l.discount_percent ? (l.quantity * l.unit_price * l.discount_percent) / 100 : 0;
    return acc + disc;
  }, 0);

  // Group items by HSN/SAC and GST rate for statutory HSN tax summary table
  const hsnSummary = useMemo(() => {
    const map = new Map<string, { hsn: string; taxable: number; rate: number; cgst: number; sgst: number; igst: number; totalTax: number }>();
    for (const line of lines) {
      const hsn = line.hsn_sac || 'N/A';
      const rate = line.gst_rate_percent || 0;
      const key = `${hsn}_${rate}`;
      const taxable = line.taxable_value || 0;
      const cgst = line.cgst || 0;
      const sgst = line.sgst || 0;
      const igst = line.igst || 0;
      const totalTax = invoice.is_igst ? igst : cgst + sgst;

      if (!map.has(key)) {
        map.set(key, { hsn, taxable, rate, cgst, sgst, igst, totalTax });
      } else {
        const cur = map.get(key)!;
        cur.taxable += taxable;
        cur.cgst += cgst;
        cur.sgst += sgst;
        cur.igst += igst;
        cur.totalTax += totalTax;
      }
    }
    return Array.from(map.values());
  }, [lines, invoice.is_igst]);

  // Helper functions for default reference labels and values per industry preset
  function getDefaultRef1Label(lt: string) {
    if (lt === 'ENGINEERING_WORKS') return 'Transport Mode';
    if (lt === 'TALLY_CLASSIC_ERP') return 'Delivery Note';
    if (lt === 'MODERN_MINIMALIST_ACCENT') return 'Payment Due Date';
    if (lt === 'RETAILERS_POS') return 'POS Register / Counter';
    if (lt === 'SERVICE_PRO') return 'Project / Contract Ref';
    if (lt === 'SMALL_BUSINESS') return 'Customer Order Ref';
    if (lt === 'MODERN_CORP') return 'Corporate PO Ref';
    if (lt === 'EXPORT_SEZ') return 'Foreign Contract / PO';
    if (lt === 'HEALTHCARE_PHARMA') return 'Drug License No (DL)';
    if (lt === 'LOGISTICS_TRANSPORTER') return 'Lorry Receipt (LR) No.';
    if (lt === 'MANUFACTURING_JOBWORK') return 'Work Order (WO) No.';
    return 'Purchase Order (PO) Ref';
  }

  function getDefaultRef1Value(lt: string) {
    if (lt === 'ENGINEERING_WORKS') return 'Road / By Tempo';
    if (lt === 'TALLY_CLASSIC_ERP') return 'DN-2021-081';
    if (lt === 'MODERN_MINIMALIST_ACCENT') return '06/03/2024';
    if (lt === 'RETAILERS_POS') return 'Counter #01 (Ground Floor)';
    if (lt === 'SERVICE_PRO') return 'PRJ-CLOUD-2026';
    if (lt === 'SMALL_BUSINESS') return 'ORD-2026-441';
    if (lt === 'MODERN_CORP') return 'PO/ENT/2026/8849';
    if (lt === 'EXPORT_SEZ') return 'PO-GLOBAL-2026-USA';
    if (lt === 'HEALTHCARE_PHARMA') return 'DL-20B-4819 / DL-21B-4820';
    if (lt === 'LOGISTICS_TRANSPORTER') return 'LR-HYD-2026-9921';
    if (lt === 'MANUFACTURING_JOBWORK') return 'WO-MFG-2026-4410';
    return 'PO-2026-9810';
  }

  function getDefaultRef2Label(lt: string) {
    if (lt === 'ENGINEERING_WORKS') return 'Vehicle Number';
    if (lt === 'TALLY_CLASSIC_ERP') return "Supplier's Ref.";
    if (lt === 'MODERN_MINIMALIST_ACCENT') return 'Payment Mode';
    if (lt === 'RETAILERS_POS') return 'Cashier / Operator';
    if (lt === 'SERVICE_PRO') return 'Billing Period';
    if (lt === 'SMALL_BUSINESS') return 'Payment Status';
    if (lt === 'MODERN_CORP') return 'Cost Center / Unit';
    if (lt === 'EXPORT_SEZ') return 'LUT / Bond Reference';
    if (lt === 'HEALTHCARE_PHARMA') return 'Prescribing Doctor';
    if (lt === 'LOGISTICS_TRANSPORTER') return 'Vehicle Number';
    if (lt === 'MANUFACTURING_JOBWORK') return 'Delivery Challan No.';
    return 'E-Way Bill Number';
  }

  function getDefaultRef2Value(lt: string) {
    if (lt === 'ENGINEERING_WORKS') return 'DL 1L AA 1234';
    if (lt === 'TALLY_CLASSIC_ERP') return 'REF-2021-99';
    if (lt === 'MODERN_MINIMALIST_ACCENT') return 'Online / UPI';
    if (lt === 'RETAILERS_POS') return 'Cashier: Anand K.';
    if (lt === 'SERVICE_PRO') return '01-Oct-2026 to 15-Oct-2026';
    if (lt === 'SMALL_BUSINESS') return 'Paid via UPI';
    if (lt === 'MODERN_CORP') return 'CC-FIN-IT-009';
    if (lt === 'EXPORT_SEZ') return 'ARN: AD360224001928';
    if (lt === 'HEALTHCARE_PHARMA') return 'Dr. R. K. Sharma (MD)';
    if (lt === 'LOGISTICS_TRANSPORTER') return 'TS 09 UB 1234 (16-Wheeler)';
    if (lt === 'MANUFACTURING_JOBWORK') return 'DC-2026-1092';
    return '2410-9832-1192';
  }

  function getDefaultRef3Label(lt: string) {
    if (lt === 'ENGINEERING_WORKS') return 'Payment Terms';
    if (lt === 'TALLY_CLASSIC_ERP') return 'Despatch Document No.';
    if (lt === 'MODERN_MINIMALIST_ACCENT') return 'Reference No.';
    if (lt === 'RETAILERS_POS') return 'Payment Mode';
    if (lt === 'SERVICE_PRO') return 'Payment Terms';
    if (lt === 'SMALL_BUSINESS') return 'Delivery Mode';
    if (lt === 'MODERN_CORP') return 'Credit Terms';
    if (lt === 'EXPORT_SEZ') return 'Port of Loading';
    if (lt === 'HEALTHCARE_PHARMA') return 'Patient Name / UHID';
    if (lt === 'LOGISTICS_TRANSPORTER') return 'E-Way Bill Number';
    if (lt === 'MANUFACTURING_JOBWORK') return 'Process Nature';
    return 'Vehicle / Dispatch No.';
  }

  function getDefaultRef3Value(lt: string) {
    if (lt === 'ENGINEERING_WORKS') return 'Immediate / 15 Days';
    if (lt === 'TALLY_CLASSIC_ERP') return 'DSP-2021-12';
    if (lt === 'MODERN_MINIMALIST_ACCENT') return 'REF-2024-99';
    if (lt === 'RETAILERS_POS') return 'UPI / Scan & Pay';
    if (lt === 'SERVICE_PRO') return 'Net 15 Days';
    if (lt === 'SMALL_BUSINESS') return 'Counter Handover';
    if (lt === 'MODERN_CORP') return 'Net 30 Days';
    if (lt === 'EXPORT_SEZ') return 'JNPT Nhava Sheva (INJNP1)';
    if (lt === 'HEALTHCARE_PHARMA') return 'UHID-2026-9921';
    if (lt === 'LOGISTICS_TRANSPORTER') return '2410-9832-1192';
    if (lt === 'MANUFACTURING_JOBWORK') return 'CNC Milling & Anodizing';
    return 'TS 09 UB 1234';
  }

  function getDefaultRef4Label(lt: string) {
    if (lt === 'ENGINEERING_WORKS') return 'PO Number';
    if (lt === 'TALLY_CLASSIC_ERP') return 'Despatched through';
    if (lt === 'MODERN_MINIMALIST_ACCENT') return 'Order Token';
    if (lt === 'RETAILERS_POS') return 'Order Token No.';
    if (lt === 'SERVICE_PRO') return 'Milestone Deliverable';
    if (lt === 'SMALL_BUSINESS') return 'Contact Helpline';
    if (lt === 'MODERN_CORP') return 'Approval Reference';
    if (lt === 'EXPORT_SEZ') return 'Country of Destination';
    if (lt === 'HEALTHCARE_PHARMA') return 'Drug Schedule Category';
    if (lt === 'LOGISTICS_TRANSPORTER') return 'Transit Route';
    if (lt === 'MANUFACTURING_JOBWORK') return 'QC / Inspection Report';
    return 'Due Date / Terms';
  }

  function getDefaultRef4Value(lt: string) {
    if (lt === 'ENGINEERING_WORKS') return 'PO-2021-998';
    if (lt === 'TALLY_CLASSIC_ERP') return 'Road Transport';
    if (lt === 'MODERN_MINIMALIST_ACCENT') return 'TK-88';
    if (lt === 'RETAILERS_POS') return 'Token #42';
    if (lt === 'SERVICE_PRO') return 'Milestone 2 Signoff';
    if (lt === 'SMALL_BUSINESS') return '+91 91234 56789';
    if (lt === 'MODERN_CORP') return 'APP-BOARD-2026-88';
    if (lt === 'EXPORT_SEZ') return 'United States of America';
    if (lt === 'HEALTHCARE_PHARMA') return 'Schedule H / OTC';
    if (lt === 'LOGISTICS_TRANSPORTER') return 'Hyderabad Hub -> Bengaluru DC';
    if (lt === 'MANUFACTURING_JOBWORK') return 'QC-PASS-REPORT-08';
    return 'Net 15 Days (Due: 31-10-2026)';
  }

  // ==========================================================================
  // SECTION RENDERERS
  // ==========================================================================

  // 1. Header Section - Clean Logo & Title
  function renderHeader() {
    const logoPos = tpl.logo_position || 'top-left';

    const logoElement = (
      <div className="shrink-0">
        {vendor?.logo_url ? (
          <img
            src={vendor.logo_url}
            alt="Vendor Logo"
            style={{
              width: `${tpl.logo_width || 75}px`,
              height: `${tpl.logo_height || 75}px`,
              objectFit: 'contain',
            }}
            className="rounded"
          />
        ) : (
          <div
            className="flex items-center justify-center font-bold text-white rounded-xl px-3.5 py-2.5 shadow-xs text-xs"
            style={{ backgroundColor: layoutType === 'MODERN_MINIMALIST_ACCENT' ? '#1e293b' : tpl.accent_color }}
          >
            {(vendor?.business_name || vendor?.name || 'GST').substring(0, 3).toUpperCase()}
          </div>
        )}
      </div>
    );

    const titleElement = (
      <div className={`flex-1 ${logoPos === 'top-right' ? 'text-left' : 'text-center'}`}>
        <h1
          className="font-black tracking-wider leading-tight"
          style={{
            fontSize: `${tpl.title_font_size || 20}px`,
            color: layoutType === 'MODERN_MINIMALIST_ACCENT' ? '#ffffff' : tpl.accent_color,
            letterSpacing: `${tpl.text_styles?.title?.letterSpacing || 1}px`,
          }}
        >
          <RenderEditable idKey="custom_title" value={lblTitle} />
        </h1>
        {lblSubtitle && (
          <p className={`text-[11px] font-medium mt-0.5 ${layoutType === 'MODERN_MINIMALIST_ACCENT' ? 'text-blue-100' : 'text-slate-500'}`}>
            <RenderEditable idKey="subtitle" value={lblSubtitle} />
          </p>
        )}
      </div>
    );

    const spacerElement = (
      <div style={{ width: `${tpl.logo_width || 75}px` }} className="shrink-0 hidden sm:flex items-center justify-end">
        {invoice.status === 'CANCELLED' && (
          <span className="inline-block px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px]">
            CANCELLED
          </span>
        )}
      </div>
    );

    return (
      <div
        key="header"
        onClick={() => interactive && onSelectSection?.('header')}
        className={`mb-4 pb-3 relative transition ${
          interactive ? 'hover:ring-1 hover:ring-blue-300 rounded-lg p-2' : ''
        } ${layoutType === 'MODERN_MINIMALIST_ACCENT' ? 'p-3 rounded-xl text-white' : 'border-b'}`}
        style={{
          borderColor: tpl.accent_color,
          backgroundColor: layoutType === 'MODERN_MINIMALIST_ACCENT' ? tpl.accent_color : undefined,
        }}
      >
        {logoPos === 'top-center' ? (
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            {logoElement}
            {titleElement}
          </div>
        ) : logoPos === 'top-right' ? (
          <div className="flex items-center justify-between gap-4">
            {titleElement}
            {logoElement}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            {logoElement}
            {titleElement}
            {spacerElement}
          </div>
        )}
      </div>
    );
  }

  // 2. Invoice Body Particulars & References (Active/Inactive toggleable, clean & compact)
  function renderDetails() {
    if (vis.invoice_details === false) return null;

    const reverseChargeVal =
      labels.reverse_charge_val || (layoutType === 'LOGISTICS_TRANSPORTER' ? 'Yes (GTA Recipient @5%)' : 'No');
    const lblReverseCharge = labels.lbl_reverse_charge || 'RCM';

    const ref1Lbl = labels.ref_po_label || getDefaultRef1Label(layoutType);
    const ref1Val = labels.ref_po_value || getDefaultRef1Value(layoutType);
    const ref2Lbl = labels.ref_secondary_label || getDefaultRef2Label(layoutType);
    const ref2Val = labels.ref_secondary_value || getDefaultRef2Value(layoutType);
    const ref3Lbl = labels.ref_tertiary_label || getDefaultRef3Label(layoutType);
    const ref3Val = labels.ref_tertiary_value || getDefaultRef3Value(layoutType);
    const ref4Lbl = labels.ref_quaternary_label || getDefaultRef4Label(layoutType);
    const ref4Val = labels.ref_quaternary_value || getDefaultRef4Value(layoutType);

    return (
      <div
        key="details"
        onClick={() => interactive && onSelectSection?.('details')}
        className={`mb-4 border rounded-xl bg-slate-50/60 text-xs overflow-hidden transition ${
          interactive ? 'hover:ring-1 hover:ring-blue-300' : ''
        }`}
        style={{ borderColor: tpl.border_color || '#cbd5e1' }}
      >
        {/* Simple & Clean Row 1: Primary Particulars */}
        <div className="flex flex-wrap items-center justify-between gap-y-2 p-2.5 divide-x divide-slate-200">
          <div className="px-3 py-0.5 flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              <RenderEditable idKey="invoice_number" value={lblInvoiceNo} />:
            </span>
            <strong className="font-mono text-xs text-slate-900">{invoice.invoice_number}</strong>
          </div>

          <div className="px-3 py-0.5 flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              <RenderEditable idKey="invoice_date" value={lblInvoiceDate} />:
            </span>
            <span className="font-mono text-xs text-slate-800 font-semibold">{invoice.invoice_date}</span>
          </div>

          <div className="px-3 py-0.5 flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              <RenderEditable idKey="place_of_supply" value={lblPlaceOfSupply} />:
            </span>
            <span className="font-semibold text-xs text-slate-800">
              {invoice.place_of_supply || invoice.buyer_state || 'Local State'} ({invoice.buyer_state_code || '27'})
            </span>
          </div>

          {vis.reverse_charge !== false && (
            <div className="px-3 py-0.5 flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                <RenderEditable idKey="lbl_reverse_charge" value={lblReverseCharge} />:
              </span>
              <span className="font-semibold text-xs text-slate-800">
                <RenderEditable idKey="reverse_charge_val" value={reverseChargeVal} />
              </span>
            </div>
          )}

          <div className="px-3 py-0.5 text-right">
            <span className="text-[10px] uppercase font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
              <RenderEditable idKey="copy_category" value={labels.copy_category || 'Original for Recipient'} />
            </span>
          </div>
        </div>

        {/* Sleek Row 2: Secondary References (Active/Inactive Toggleable) */}
        {vis.secondary_refs !== false && (
          <div className="border-t border-slate-200 bg-white px-3 py-1.5 flex flex-wrap items-center justify-between gap-y-1 text-[11px] text-slate-600">
            <div>
              <span className="font-semibold text-slate-400 text-[10px] uppercase">
                <RenderEditable idKey="ref_po_label" value={ref1Lbl} />:{' '}
              </span>
              <span className="font-medium text-slate-800">
                <RenderEditable idKey="ref_po_value" value={ref1Val} />
              </span>
            </div>
            <div>
              <span className="font-semibold text-slate-400 text-[10px] uppercase">
                <RenderEditable idKey="ref_secondary_label" value={ref2Lbl} />:{' '}
              </span>
              <span className="font-medium text-slate-800">
                <RenderEditable idKey="ref_secondary_value" value={ref2Val} />
              </span>
            </div>
            <div>
              <span className="font-semibold text-slate-400 text-[10px] uppercase">
                <RenderEditable idKey="ref_tertiary_label" value={ref3Lbl} />:{' '}
              </span>
              <span className="font-medium text-slate-800">
                <RenderEditable idKey="ref_tertiary_value" value={ref3Val} />
              </span>
            </div>
            <div>
              <span className="font-semibold text-slate-400 text-[10px] uppercase">
                <RenderEditable idKey="ref_quaternary_label" value={ref4Lbl} />:{' '}
              </span>
              <span className="font-medium text-slate-800">
                <RenderEditable idKey="ref_quaternary_value" value={ref4Val} />
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. Buyer & Seller Parties Section (With specialized Tally & Engineering layouts)
  function renderParties() {
    // ------------------------------------------------------------------------
    // Archetype 10: ENGINEERING_WORKS (Modelled exactly after Image 1)
    // ------------------------------------------------------------------------
    if (layoutType === 'ENGINEERING_WORKS') {
      return (
        <div key="parties" className="mb-4 text-xs border border-slate-700 divide-y divide-slate-700">
          {/* Centered Company Credentials */}
          <div className="p-3 text-center space-y-1">
            <h2 className="text-base font-bold text-slate-900 tracking-wide uppercase">
              {vendor?.business_name || vendor?.name || 'OM ENGINEERING WORKS'}
            </h2>
            <div className="text-[11px] text-slate-600">
              {vendor?.address || 'C-129, Sector-4, DSIIDC Indl. Complex, Bawana, New Delhi - 110039'}
            </div>
            <div className="text-[10px] text-slate-500">
              Tel: {vendor?.phone || '9818235621'} | Email: {vendor?.email || 'omengineeringworksdelhi@gmail.com'}
            </div>
          </div>

          {/* PAN & GSTIN Bar */}
          <div className="grid grid-cols-2 divide-x divide-slate-700 bg-slate-50/50 font-mono text-[11px] font-bold p-1.5 px-3 text-slate-800">
            <div>
              PAN NO: <span className="font-semibold">{vendor?.pan || 'DGTPG4061H'}</span>
            </div>
            <div className="pl-3">
              GSTIN NO: <span className="text-blue-800">{vendor?.gstin || '07DGTPG4061H1Z6'}</span>
            </div>
          </div>

          {/* Split: Details of Receiver (Left) + Stacked Particulars (Right) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-700">
            {/* Receiver / Buyer Box */}
            <div className="p-3 space-y-1.5">
              <span className="font-bold text-slate-800 uppercase text-[10px] block">
                <RenderEditable idKey="buyer" value={lblBuyer} />
              </span>
              <h3 className="font-bold text-xs text-slate-900">{invoice.buyer_name}</h3>
              {invoice.buyer_address && (
                <div className="text-[11px] text-slate-600 leading-snug">{invoice.buyer_address}</div>
              )}
              <div className="text-[11px] text-slate-600">
                State: <strong>{invoice.buyer_state}</strong> | Code: <strong>{invoice.buyer_state_code}</strong>
              </div>
              <div className="font-mono text-[11px] font-semibold text-slate-800">
                Buyer's GSTIN: <strong className="text-blue-700">{invoice.buyer_gstin || 'Unregistered'}</strong>
              </div>
            </div>

            {/* Stacked Particulars Table */}
            <div className="divide-y divide-slate-300 font-mono text-[11px]">
              <div className="p-1 px-3 flex justify-between">
                <span className="text-slate-500">Invoice No. :</span>
                <strong className="text-slate-900">{invoice.invoice_number}</strong>
              </div>
              <div className="p-1 px-3 flex justify-between">
                <span className="text-slate-500">Date :</span>
                <span>{invoice.invoice_date}</span>
              </div>
              <div className="p-1 px-3 flex justify-between">
                <span className="text-slate-500">Transport Mode :</span>
                <span><RenderEditable idKey="ref_po_value" value={labels.ref_po_value || 'Road / By Tempo'} /></span>
              </div>
              <div className="p-1 px-3 flex justify-between">
                <span className="text-slate-500">Vehicle Number :</span>
                <span><RenderEditable idKey="ref_secondary_value" value={labels.ref_secondary_value || 'DL 1L AA 1234'} /></span>
              </div>
              <div className="p-1 px-3 flex justify-between">
                <span className="text-slate-500">Payment Terms :</span>
                <span><RenderEditable idKey="ref_tertiary_value" value={labels.ref_tertiary_value || 'Immediate'} /></span>
              </div>
              <div className="p-1 px-3 flex justify-between">
                <span className="text-slate-500">PO Number :</span>
                <span><RenderEditable idKey="ref_quaternary_value" value={labels.ref_quaternary_value || 'PO-2021-998'} /></span>
              </div>
              <div className="p-1 px-3 flex justify-between">
                <span className="text-slate-500">State : {vendor?.state || 'Delhi'}</span>
                <span>Code : {vendor?.state_code || '07'}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ------------------------------------------------------------------------
    // Archetype 11: TALLY_CLASSIC_ERP (Modelled exactly after Image 2)
    // ------------------------------------------------------------------------
    if (layoutType === 'TALLY_CLASSIC_ERP') {
      return (
        <div key="parties" className="mb-4 text-xs border border-black divide-x divide-black grid grid-cols-1 sm:grid-cols-2">
          {/* Left Column: Supplier on top, Buyer below */}
          <div className="divide-y divide-black">
            <div className="p-2 space-y-1">
              <h2 className="font-bold text-xs text-black uppercase">
                {vendor?.business_name || vendor?.name || 'Bilal Old Readymade Garments and Shoes'}
              </h2>
              <div className="text-[10px] text-slate-700 leading-snug">
                {vendor?.address || 'Shop No 34 Kabadi Market, Hari Singh High Street, Srinagar'}
              </div>
              <div className="font-mono text-[10px]">
                GSTIN/UIN: <strong>{vendor?.gstin || '01BQPZD5122N1ZN'}</strong>
              </div>
              <div className="text-[10px]">
                State Name: <strong>{vendor?.state || 'Jammu & Kashmir'}</strong>, Code: {vendor?.state_code || '01'}
              </div>
              {vendor?.phone && <div className="text-[10px]">Contact: {vendor.phone}</div>}
              {vendor?.email && <div className="text-[10px]">E-Mail: {vendor.email}</div>}
            </div>

            <div className="p-2 space-y-1 bg-slate-50/40">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Buyer</span>
              <h3 className="font-bold text-xs text-black">{invoice.buyer_name}</h3>
              {invoice.buyer_address && (
                <div className="text-[10px] text-slate-700 leading-snug">{invoice.buyer_address}</div>
              )}
              <div className="text-[10px]">
                State Name: <strong>{invoice.buyer_state}</strong>, Code: {invoice.buyer_state_code}
              </div>
              {invoice.buyer_gstin && (
                <div className="font-mono text-[10px]">
                  GSTIN/UIN: <strong>{invoice.buyer_gstin}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Multi-Tier Despatch Matrix Table */}
          <div className="divide-y divide-black font-mono text-[10px]">
            <div className="grid grid-cols-2 divide-x divide-black p-1">
              <div className="px-1">
                <span className="text-slate-500 block">Invoice No.</span>
                <strong className="text-black">{invoice.invoice_number}</strong>
              </div>
              <div className="px-1">
                <span className="text-slate-500 block">Dated</span>
                <span className="text-black">{invoice.invoice_date}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-black p-1">
              <div className="px-1">
                <span className="text-slate-500 block">Delivery Note</span>
                <span><RenderEditable idKey="ref_po_value" value={labels.ref_po_value || '—'} /></span>
              </div>
              <div className="px-1">
                <span className="text-slate-500 block">Mode/Terms of Payment</span>
                <span>Immediate</span>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-black p-1">
              <div className="px-1">
                <span className="text-slate-500 block">Supplier's Ref.</span>
                <span><RenderEditable idKey="ref_secondary_value" value={labels.ref_secondary_value || '—'} /></span>
              </div>
              <div className="px-1">
                <span className="text-slate-500 block">Other Reference(s)</span>
                <span>—</span>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-black p-1">
              <div className="px-1">
                <span className="text-slate-500 block">Despatch Document No.</span>
                <span><RenderEditable idKey="ref_tertiary_value" value={labels.ref_tertiary_value || '—'} /></span>
              </div>
              <div className="px-1">
                <span className="text-slate-500 block">Delivery Note Date</span>
                <span>{invoice.invoice_date}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-black p-1">
              <div className="px-1">
                <span className="text-slate-500 block">Despatched through</span>
                <span><RenderEditable idKey="ref_quaternary_value" value={labels.ref_quaternary_value || 'Road Transport'} /></span>
              </div>
              <div className="px-1">
                <span className="text-slate-500 block">Destination</span>
                <span>{invoice.place_of_supply}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ------------------------------------------------------------------------
    // Archetype 12: MODERN_MINIMALIST_ACCENT (Modelled exactly after Image 3)
    // ------------------------------------------------------------------------
    if (layoutType === 'MODERN_MINIMALIST_ACCENT') {
      return (
        <div key="parties" className="mb-4 text-xs space-y-3">
          {/* Centered Company Block */}
          <div className="text-center space-y-0.5 pb-2 border-b border-slate-200">
            <h2 className="text-lg font-black text-slate-900 tracking-wide uppercase">
              {vendor?.business_name || vendor?.name || 'SHREE SHYAM ENTERPRISES'}
            </h2>
            <div className="text-xs text-slate-600">
              {vendor?.address || 'SHOP NO. 25, 26, KALWAR, JHOTWARA, JAIPUR -303706'}
            </div>
            {vendor?.gstin && (
              <div className="font-mono text-xs font-semibold text-slate-800">
                GSTIN: <span className="text-blue-800">{vendor.gstin}</span>
              </div>
            )}
            <div className="text-[11px] text-slate-500">
              Email ID: {vendor?.email || 'Shreeshyamenterprises122@gmail.com'} | Ph.- {vendor?.phone || '01412589401'}
            </div>
          </div>

          {/* Light Cyan / Blue Split Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-sky-50/70 p-3 rounded-xl border border-sky-100">
            <div>
              <span className="font-bold text-slate-800 uppercase text-[10px] block">
                <RenderEditable idKey="buyer" value={lblBuyer} />
              </span>
              <div className="font-bold text-xs text-slate-900 mt-1">PARTY'S NAME - {invoice.buyer_name}</div>
              {invoice.buyer_address && (
                <div className="text-slate-600 text-xs mt-0.5">ADDRESS: {invoice.buyer_address}</div>
              )}
              {invoice.buyer_gstin && (
                <div className="font-mono text-[11px] text-slate-700 mt-0.5">GSTIN: {invoice.buyer_gstin}</div>
              )}
            </div>

            <div className="sm:text-right space-y-1 font-mono text-xs">
              <div>
                <span className="text-slate-500">Payment Due Date: </span>
                <strong className="text-slate-800"><RenderEditable idKey="ref_po_value" value={labels.ref_po_value || invoice.invoice_date} /></strong>
              </div>
              <div>
                <span className="text-slate-500">Payment Mode: </span>
                <span className="font-semibold text-slate-800"><RenderEditable idKey="ref_secondary_value" value={labels.ref_secondary_value || 'Online'} /></span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ------------------------------------------------------------------------
    // Standard Parties Layout
    // ------------------------------------------------------------------------
    const isStacked = partyLayout === 'stacked';
    const isInverted = partyLayout === 'buyer_left_seller_right';

    const sellerBlock = (
      <div key="seller-box" className="space-y-1">
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
          <RenderEditable idKey="seller" value={lblSeller} />
        </span>
        <h2 className="font-bold text-sm text-slate-900">
          {vendor?.business_name || vendor?.name || 'Registered Supplier'}
        </h2>
        {vis.seller_gstin !== false && vendor?.gstin && (
          <div className="font-mono font-semibold text-slate-700">
            GSTIN: <span className="text-blue-700 font-bold">{vendor.gstin}</span>
          </div>
        )}
        {vendor?.pan && <div className="font-mono text-slate-600">PAN: {vendor.pan}</div>}
        {vendor?.address && <div className="text-slate-600 leading-relaxed">{vendor.address}</div>}
        <div className="text-slate-600">
          State: <strong>{vendor?.state || 'Maharashtra'}</strong> (Code: {vendor?.state_code || '27'})
        </div>
        {vis.seller_phone !== false && vendor?.phone && (
          <div className="text-slate-600">Phone: {vendor.phone}</div>
        )}
      </div>
    );

    const buyerBlock = (
      <div
        key="buyer-box"
        className={`space-y-1 ${
          !isStacked ? 'border-t sm:border-t-0 sm:border-l sm:pl-6 border-slate-200' : 'border-t pt-3 border-slate-200'
        }`}
      >
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
          <RenderEditable idKey="buyer" value={lblBuyer} />
        </span>
        <h2 className="font-bold text-sm text-slate-900">{invoice.buyer_name}</h2>
        {vis.buyer_gstin !== false && (
          <div className="font-mono text-slate-700">
            GSTIN:{' '}
            {invoice.buyer_gstin ? (
              <strong className="text-blue-700">{invoice.buyer_gstin}</strong>
            ) : (
              <span className="text-slate-400 italic">Unregistered (Consumer)</span>
            )}
          </div>
        )}
        {vis.buyer_address !== false && invoice.buyer_address && (
          <div className="text-slate-600 leading-relaxed">{invoice.buyer_address}</div>
        )}
        <div className="text-slate-600">
          State: <strong>{invoice.buyer_state}</strong> (Code: {invoice.buyer_state_code})
        </div>
        {vis.place_of_supply !== false && (
          <div className="text-slate-600">
            <RenderEditable idKey="place_of_supply" value={lblPlaceOfSupply} />:{' '}
            <strong className="text-slate-900">{invoice.place_of_supply}</strong>
          </div>
        )}
        <div className="mt-1">
          <span
            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              invoice.is_igst ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {invoice.is_igst ? '🌐 Inter-State (IGST 100%)' : '📍 Intra-State (CGST + SGST)'}
          </span>
        </div>
      </div>
    );

    return (
      <div
        key="parties"
        onClick={() => interactive && onSelectSection?.('parties')}
        className={`mb-6 text-xs bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 ${
          isStacked ? 'space-y-4' : 'grid grid-cols-1 sm:grid-cols-2 gap-6'
        }`}
        style={{ fontSize: `${tpl.header_font_size || 10}px` }}
      >
        {isInverted ? [buyerBlock, sellerBlock] : [sellerBlock, buyerBlock]}
      </div>
    );
  }

  // 4. Line Items Table Section (With Draggable Column Width Resizers)
  function renderItems() {
    return (
      <div
        key="items"
        onClick={() => interactive && onSelectSection?.('items')}
        className="mb-4 overflow-x-auto rounded-xl border shadow-2xs"
        style={{ borderColor: tpl.border_color }}
      >
        <table className="w-full text-left border-collapse" style={{ fontSize: `${tpl.table_body_font_size || 9}px` }}>
          <thead
            style={{
              backgroundColor: tpl.header_bg_color || '#f8fafc',
              fontSize: `${tpl.table_header_font_size || 9}px`,
              borderBottom: `2px solid ${tpl.accent_color}`,
            }}
          >
            <tr className="font-bold text-slate-700">
              <th className="py-2.5 px-3 relative select-none group" style={{ width: `${colW.sno || 5}%` }}>
                <RenderEditable idKey="col_sno" value={colSno} />
                {renderResizeHandle('sno')}
              </th>
              <th className="py-2.5 px-3 relative select-none group" style={{ width: `${colW.description || 35}%` }}>
                <RenderEditable idKey="col_description" value={colDesc} />
                {renderResizeHandle('description')}
              </th>
              {vis.hsn_column !== false && (
                <th className="py-2.5 px-3 relative select-none group" style={{ width: `${colW.hsn || 10}%` }}>
                  <RenderEditable idKey="col_hsn" value={colHsn} />
                  {renderResizeHandle('hsn')}
                </th>
              )}
              {vis.qty_column !== false && (
                <th className="py-2.5 px-3 text-right relative select-none group" style={{ width: `${colW.qty || 8}%` }}>
                  <RenderEditable idKey="col_qty" value={colQty} />
                  {renderResizeHandle('qty')}
                </th>
              )}
              {vis.unit_column !== false && (
                <th className="py-2.5 px-3 relative select-none group" style={{ width: `${colW.unit || 7}%` }}>
                  <RenderEditable idKey="col_unit" value={colUnit} />
                  {renderResizeHandle('unit')}
                </th>
              )}
              {vis.rate_column !== false && (
                <th className="py-2.5 px-3 text-right relative select-none group" style={{ width: `${colW.rate || 12}%` }}>
                  <RenderEditable idKey="col_rate" value={colRate} />
                  {renderResizeHandle('rate')}
                </th>
              )}
              {colW.taxable !== 0 && (
                <th className="py-2.5 px-3 text-right relative select-none group" style={{ width: `${colW.taxable || 13}%` }}>
                  <RenderEditable idKey="col_taxable" value={colTaxable} />
                  {renderResizeHandle('taxable')}
                </th>
              )}
              {colW.tax !== 0 && (
                <th className="py-2.5 px-3 text-right relative select-none group" style={{ width: `${colW.tax || 10}%` }}>
                  <RenderEditable idKey="col_tax" value={colTax} />
                  {renderResizeHandle('tax')}
                </th>
              )}
              <th className="py-2.5 px-3 text-right relative select-none group" style={{ width: `${colW.total || 14}%` }}>
                <RenderEditable idKey="col_total" value={colTotal} />
                {renderResizeHandle('total')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {lines.map((line, idx) => {
              const lineTax = invoice.is_igst ? line.igst : line.cgst + line.sgst;
              return (
                <tr
                  key={line.id || idx}
                  className="hover:bg-slate-50/50"
                  style={{
                    backgroundColor:
                      idx % 2 === 1 && tpl.alternate_row_color ? tpl.alternate_row_color : undefined,
                  }}
                >
                  <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-2 px-3 font-semibold text-slate-900">{line.item_name}</td>
                  {vis.hsn_column !== false && (
                    <td className="py-2 px-3 font-mono text-slate-600">{line.hsn_sac || '—'}</td>
                  )}
                  {vis.qty_column !== false && (
                    <td className="py-2 px-3 text-right font-mono">{line.quantity}</td>
                  )}
                  {vis.unit_column !== false && (
                    <td className="py-2 px-3 font-mono text-slate-500 uppercase">{line.unit}</td>
                  )}
                  {vis.rate_column !== false && (
                    <td className="py-2 px-3 text-right font-mono">
                      {line.unit_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  )}
                  {colW.taxable !== 0 && (
                    <td className="py-2 px-3 text-right font-mono font-medium">
                      {line.taxable_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  )}
                  {colW.tax !== 0 && (
                    <td className="py-2 px-3 text-right font-mono text-slate-600">
                      <div>{lineTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      <div className="text-[10px] text-slate-400">({line.gst_rate_percent}%)</div>
                    </td>
                  )}
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                    {line.line_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Statutory HSN/SAC Tax Summary Matrix Table (Tally ERP Style from Image 2) */}
        {vis.hsn_tax_summary_table === true && (
          <div className="border-t-2 border-slate-700 bg-slate-50/70 p-3">
            <div className="text-[10px] uppercase font-bold text-slate-700 tracking-wider mb-1.5">
              Statutory HSN/SAC Tax Summary Matrix
            </div>
            <table className="w-full text-left border-collapse text-[10px] border border-slate-300">
              <thead>
                <tr className="border-b bg-slate-100 font-bold text-slate-700">
                  <th className="p-1 px-2 border-r border-slate-300">HSN/SAC</th>
                  <th className="p-1 px-2 text-right border-r border-slate-300">Taxable Value (₹)</th>
                  {!invoice.is_igst ? (
                    <>
                      <th className="p-1 px-2 text-right border-r border-slate-300">Central Tax Rate</th>
                      <th className="p-1 px-2 text-right border-r border-slate-300">Central Tax (₹)</th>
                      <th className="p-1 px-2 text-right border-r border-slate-300">State Tax Rate</th>
                      <th className="p-1 px-2 text-right border-r border-slate-300">State Tax (₹)</th>
                    </>
                  ) : (
                    <>
                      <th className="p-1 px-2 text-right border-r border-slate-300">IGST Rate</th>
                      <th className="p-1 px-2 text-right border-r border-slate-300">IGST Tax (₹)</th>
                    </>
                  )}
                  <th className="p-1 px-2 text-right">Total Tax Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {hsnSummary.map((h, i) => (
                  <tr key={i} className="hover:bg-white">
                    <td className="p-1 px-2 border-r border-slate-300 text-slate-900 font-bold">{h.hsn}</td>
                    <td className="p-1 px-2 text-right border-r border-slate-300">
                      {h.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    {!invoice.is_igst ? (
                      <>
                        <td className="p-1 px-2 text-right border-r border-slate-300">{(h.rate / 2).toFixed(2)}%</td>
                        <td className="p-1 px-2 text-right border-r border-slate-300">
                          {h.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-1 px-2 text-right border-r border-slate-300">{(h.rate / 2).toFixed(2)}%</td>
                        <td className="p-1 px-2 text-right border-r border-slate-300">
                          {h.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-1 px-2 text-right border-r border-slate-300">{h.rate.toFixed(2)}%</td>
                        <td className="p-1 px-2 text-right border-r border-slate-300">
                          {h.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </>
                    )}
                    <td className="p-1 px-2 text-right font-bold text-slate-900">
                      {h.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // 5. Tax Calculations & Grand Total Matrix Section
  function renderSummary() {
    return (
      <div
        key="summary"
        onClick={() => interactive && onSelectSection?.('summary')}
        className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4 items-start"
      >
        {/* Left Side: Amount in Words & Savings Badge */}
        <div className="space-y-3 text-xs">
          {vis.amount_in_words !== false && (
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Amount in Words:
              </span>
              <p className="font-semibold text-slate-800 italic">{amountInWords}</p>
            </div>
          )}

          {/* Retail Savings Highlight */}
          {layoutType === 'RETAILERS_POS' && totalDiscounts > 0 && (
            <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded-xl text-emerald-800 font-bold flex items-center justify-between">
              <span>{labels.savings_banner || '🎉 Total Savings:'}</span>
              <span>₹{totalDiscounts.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Right Side: Calculation Totals Box */}
        <div
          className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 font-mono text-xs shadow-2xs"
          style={{ fontSize: `${tpl.summary_font_size || 10}px` }}
        >
          <div className="flex justify-between text-slate-600">
            <span>Total Taxable Value:</span>
            <span className="font-bold text-slate-900">
              ₹{invoice.taxable_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {invoice.is_igst ? (
            <div className="flex justify-between text-purple-700">
              <span>Integrated Tax (IGST):</span>
              <span>₹{invoice.igst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-blue-700">
                <span>Central Tax (CGST):</span>
                <span>₹{invoice.cgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-blue-700">
                <span>State Tax (SGST):</span>
                <span>₹{invoice.sgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </>
          )}

          {/* Balance Received & Balance Due (Image 3 Modern Accent Archetype) */}
          {vis.balance_due_fields === true && (
            <>
              <div className="flex justify-between text-slate-600 border-t border-slate-200 pt-1">
                <span>
                  <RenderEditable idKey="balance_received_label" value={labels.balance_received_label || 'Balance Received :'} />
                </span>
                <span>
                  ₹<RenderEditable idKey="balance_received_value" value={labels.balance_received_value || '0.00'} />
                </span>
              </div>
              <div className="flex justify-between text-slate-800 font-bold">
                <span>
                  <RenderEditable idKey="balance_due_label" value={labels.balance_due_label || 'Balance Due :'} />
                </span>
                <span className="text-red-700">
                  ₹<RenderEditable idKey="balance_due_value" value={labels.balance_due_value || '0.00'} />
                </span>
              </div>
            </>
          )}

          {/* Grand Total */}
          <div
            className={`flex justify-between items-center pt-2 text-base font-bold ${
              layoutType === 'MODERN_MINIMALIST_ACCENT'
                ? 'p-2 rounded-lg text-white font-black'
                : 'border-t-2 text-slate-900'
            }`}
            style={{
              borderColor: tpl.accent_color,
              backgroundColor: layoutType === 'MODERN_MINIMALIST_ACCENT' ? tpl.accent_color : undefined,
            }}
          >
            <span className="font-sans font-black">Grand Total:</span>
            <span className="text-xl font-black">
              ₹{invoice.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 6. Payment Details & UPI QR Code Section
  function renderPayment() {
    if (vis.bank_details === false && vis.upi_qr === false) return null;

    return (
      <div
        key="payment"
        onClick={() => interactive && onSelectSection?.('payment')}
        className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs"
      >
        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5 tracking-wider">
          <RenderEditable idKey="payment_title" value={lblPaymentTitle} />
        </span>

        <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${qrPosition === 'prominent_center' ? 'text-center' : ''}`}>
          {vis.bank_details !== false && vendor?.bank_details && (
            <div className="space-y-0.5 text-slate-700 text-[11px] flex-1">
              <div>Bank: <strong>{vendor.bank_details.bank_name || 'N/A'}</strong></div>
              <div>Account No: <strong className="font-mono text-slate-900">{vendor.bank_details.account_number || 'N/A'}</strong></div>
              <div>IFSC Code: <strong className="font-mono text-slate-900">{vendor.bank_details.ifsc || 'N/A'}</strong></div>
              {vendor.bank_details.branch && <div>Branch: {vendor.bank_details.branch}</div>}
              {vendor.upi_id && (
                <div className="pt-0.5 text-blue-700 font-mono">
                  UPI ID: <strong>{vendor.upi_id}</strong>
                </div>
              )}
            </div>
          )}

          {vis.upi_qr !== false && upiString && (
            <div className="flex flex-col items-center shrink-0 p-2 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <QRCodeSVG value={upiString} size={qrPosition === 'prominent_center' ? 84 : 64} />
              <span className="text-[9px] font-bold text-slate-600 mt-1 uppercase tracking-wider">
                Scan to Pay (UPI)
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 7. Terms & Conditions Section
  function renderTerms() {
    if (vis.terms === false) return null;

    return (
      <div
        key="terms"
        onClick={() => interactive && onSelectSection?.('terms')}
        className="mb-3 text-xs space-y-1"
        style={{ fontSize: `${tpl.footer_font_size || 8}px` }}
      >
        <span className="font-bold text-slate-700 uppercase tracking-wider block">
          <RenderEditable idKey="terms_title" value={lblTermsTitle} />
        </span>
        <div className="text-slate-600 whitespace-pre-line leading-relaxed font-sans">
          <RenderEditable idKey="terms_text" value={lblTermsText} multiline={true} />
        </div>
      </div>
    );
  }

  // 8. Authorized Signature Section
  function renderSignature() {
    if (vis.signature === false) return null;

    return (
      <div
        key="signature"
        onClick={() => interactive && onSelectSection?.('signature')}
        className="mt-6 pt-3 border-t border-slate-200 flex justify-between items-end text-xs"
      >
        {/* Receiver's Sign for Image 1 / Engineering Archetype */}
        {layoutType === 'ENGINEERING_WORKS' && (
          <div className="text-center">
            <div className="w-32 border-b border-dashed border-slate-400 mb-1" />
            <span className="text-[10px] font-semibold text-slate-500">Receiver's Sign.</span>
          </div>
        )}

        <div className="ml-auto text-center space-y-1">
          {vendor?.signature_url && (
            <img
              src={vendor.signature_url}
              alt="Signature"
              className="h-10 mx-auto object-contain mb-1"
            />
          )}
          <div className="w-44 border-b border-slate-400 mx-auto" />
          <span className="text-[10px] font-bold uppercase text-slate-600 block">
            For {vendor?.business_name || vendor?.name || 'Authorized Signatory'}
          </span>
          <span className="text-[9px] text-slate-400 font-semibold block">
            <RenderEditable idKey="signatory_title" value={lblSignatoryTitle} />
          </span>
        </div>
      </div>
    );
  }

  // 9. Footer Notes Section
  function renderFooter() {
    if (!footerText) return null;

    return (
      <div
        key="footer"
        onClick={() => interactive && onSelectSection?.('footer')}
        className="border-t pt-2 text-center text-slate-500 text-xs"
        style={{
          borderColor: tpl.border_color,
          fontSize: `${tpl.footer_font_size || 8}px`,
        }}
      >
        <p className="font-medium italic">
          <RenderEditable idKey="footer_text" value={footerText} />
        </p>
      </div>
    );
  }

  // Section dispatcher map
  const sectionMap: Record<InvoiceSectionKey, () => React.ReactNode> = {
    header: renderHeader,
    details: renderDetails,
    parties: renderParties,
    items: renderItems,
    summary: renderSummary,
    payment: renderPayment,
    terms: renderTerms,
    signature: renderSignature,
    footer: renderFooter,
  };

  return (
    <div
      id="printable-invoice"
      className={`bg-white text-slate-800 mx-auto p-6 transition-all relative overflow-hidden ${
        vis.framed_border ? 'border-2 border-slate-900 rounded-none' : 'rounded-2xl shadow-xl border border-slate-200'
      }`}
      style={{
        maxWidth: tpl.page_size === 'THERMAL' ? '320px' : tpl.page_size === 'A5' ? '600px' : '840px',
        fontFamily: getFontFamilyCss(tpl.font_family),
      }}
    >
      {/* Watermark if present */}
      {tpl.watermark_text && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 select-none z-0">
          <span className="text-8xl font-black uppercase transform -rotate-45 text-slate-900">
            {tpl.watermark_text}
          </span>
        </div>
      )}

      {/* Render sections according to user-configured Drag-and-Drop sectionOrder */}
      <div className="relative z-10 space-y-2">
        {sectionOrder.map((secKey) => {
          const fn = sectionMap[secKey];
          return fn ? fn() : null;
        })}
      </div>
    </div>
  );
}
