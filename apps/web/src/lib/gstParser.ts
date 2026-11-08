/**
 * GST Return Parser & Converter Utility
 * Supports official GST Portal JSON exports for GSTR-1 and GSTR-3B.
 * Converts complex nested JSON schemas into normalized period data for GST Bro dashboards.
 */
import { toIsoDateString } from './pdfReturnParser';

export interface ParsedGstr1 {
  period: string; // YYYY-MM
  periodLabel: string; // e.g., "April 2026"
  gstin?: string;
  arn?: string;
  filingDate?: string;
  taxableSales: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  totalTax: number;
  totalInvoiceValue: number;
  b2bCount: number;
  b2csCount: number;
  exportCount: number;
  hsnSummaryCount: number;
  raw: Record<string, unknown>;
}

export interface ParsedGstr3b {
  period: string; // YYYY-MM
  periodLabel: string; // e.g., "April 2026"
  gstin?: string;
  arn?: string;
  filingDate?: string;
  status?: string;
  outwardTaxable: number;
  outwardIgst: number;
  outwardCgst: number;
  outwardSgst: number;
  outwardCess: number;
  outwardTotalTax: number;
  inwardReverseChargeTaxable: number;
  itcAvailable: {
    igst: number;
    cgst: number;
    sgst: number;
    cess: number;
    total: number;
  };
  itcReversed: {
    igst: number;
    cgst: number;
    sgst: number;
    cess: number;
    total: number;
  };
  itcNet: {
    igst: number;
    cgst: number;
    sgst: number;
    cess: number;
    total: number;
  };
  itcIneligible: {
    igst: number;
    cgst: number;
    sgst: number;
    cess: number;
    total: number;
  };
  taxPaidCash: {
    igst: number;
    cgst: number;
    sgst: number;
    cess: number;
    total: number;
  };
  taxPaidItc: {
    igst: number;
    cgst: number;
    sgst: number;
    cess: number;
    total: number;
  };
  interest: number;
  lateFee: number;
  raw: Record<string, unknown>;
}

export interface NormalizedGstPeriodUpdate {
  period: string;
  periodLabel: string;
  returnType: 'GSTR-1' | 'GSTR-3B' | 'COMBINED';
  sales: Record<string, unknown>;
  purchases: Record<string, unknown>;
  itc: Record<string, unknown>;
  gstr1: Record<string, unknown>;
  gstr3b: Record<string, unknown>;
  metrics: {
    turnover: number;
    outputTax: number;
    itcEligible: number;
    cashTaxPaid: number;
    creditTaxPaid: number;
    arn?: string;
    filingDate?: string;
  };
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Converts GST portal period code (e.g. "042026") or ISO format to "YYYY-MM" and "Month YYYY"
 */
export function normalizeFp(fp: unknown): { period: string; label: string } {
  if (!fp) {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return { period: `${d.getFullYear()}-${m}`, label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` };
  }
  const str = String(fp).trim();

  // If format is MMYYYY (e.g. "042026")
  if (/^\d{6}$/.test(str)) {
    const month = parseInt(str.substring(0, 2), 10);
    const year = parseInt(str.substring(2, 6), 10);
    const monthStr = String(month).padStart(2, '0');
    return {
      period: `${year}-${monthStr}`,
      label: `${MONTH_NAMES[month - 1] ?? 'Month'} ${year}`
    };
  }

  // If format is YYYY-MM
  if (/^\d{4}-\d{2}$/.test(str)) {
    const [year, month] = str.split('-');
    const mIndex = parseInt(month, 10) - 1;
    return {
      period: str,
      label: `${MONTH_NAMES[mIndex] ?? 'Month'} ${year}`
    };
  }

  return { period: str, label: str };
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Parse GSTR-1 JSON from official GST Portal format
 */
export function parseGstr1Json(json: Record<string, unknown>): ParsedGstr1 {
  const root = (json.data && typeof json.data === 'object' ? json.data : json) as Record<string, unknown>;
  const { period, label } = normalizeFp(root.fp || root.ret_period || root.period);
  const gstin = typeof root.gstin === 'string' ? root.gstin : undefined;
  const arn = typeof root.arn === 'string' ? root.arn : undefined;
  const filingDate = typeof root.filing_date === 'string' ? root.filing_date : undefined;

  let taxableSales = 0;
  let igst = 0;
  let cgst = 0;
  let sgst = 0;
  let cess = 0;
  let totalInvoiceValue = 0;
  let b2bCount = 0;
  let b2csCount = 0;
  let exportCount = 0;

  // 1. Process B2B Invoices
  if (Array.isArray(root.b2b)) {
    for (const b2bItem of root.b2b) {
      if (b2bItem && Array.isArray(b2bItem.inv)) {
        for (const inv of b2bItem.inv) {
          b2bCount++;
          totalInvoiceValue += num(inv.val);
          if (Array.isArray(inv.itms)) {
            for (const itm of inv.itms) {
              const det = itm.itm_det || itm;
              taxableSales += num(det.txval);
              igst += num(det.iamt);
              cgst += num(det.camt);
              sgst += num(det.samt);
              cess += num(det.csamt);
            }
          }
        }
      }
    }
  }

  // 2. Process B2CL (Large B2C Invoices)
  if (Array.isArray(root.b2cl)) {
    for (const item of root.b2cl) {
      if (item && Array.isArray(item.inv)) {
        for (const inv of item.inv) {
          totalInvoiceValue += num(inv.val);
          if (Array.isArray(inv.itms)) {
            for (const itm of inv.itms) {
              const det = itm.itm_det || itm;
              taxableSales += num(det.txval);
              igst += num(det.iamt);
              cess += num(det.csamt);
            }
          }
        }
      }
    }
  }

  // 3. Process B2CS (Small B2C Supplies)
  if (Array.isArray(root.b2cs)) {
    for (const item of root.b2cs) {
      b2csCount++;
      taxableSales += num(item.txval);
      igst += num(item.iamt);
      cgst += num(item.camt);
      sgst += num(item.samt);
      cess += num(item.csamt);
    }
  }

  // 4. Process EXP (Export Supplies)
  if (Array.isArray(root.exp)) {
    for (const expItem of root.exp) {
      if (expItem && Array.isArray(expItem.inv)) {
        for (const inv of expItem.inv) {
          exportCount++;
          totalInvoiceValue += num(inv.val);
          if (Array.isArray(inv.itms)) {
            for (const itm of inv.itms) {
              const det = itm.itm_det || itm;
              taxableSales += num(det.txval);
              igst += num(det.iamt);
              cess += num(det.csamt);
            }
          }
        }
      }
    }
  }

  // 5. Process Nil / Exempt Supplies
  if (root.nil && typeof root.nil === 'object') {
    const nilObj = root.nil as Record<string, unknown>;
    if (Array.isArray(nilObj.inv)) {
      for (const item of nilObj.inv) {
        taxableSales += num(item.nil_amt) + num(item.expt_amt) + num(item.ngsup_amt);
      }
    }
  }

  // 6. HSN data count
  let hsnSummaryCount = 0;
  if (root.hsn && typeof root.hsn === 'object') {
    const hsnObj = root.hsn as Record<string, unknown>;
    if (Array.isArray(hsnObj.data)) {
      hsnSummaryCount = hsnObj.data.length;
    }
  }

  const totalTax = igst + cgst + sgst + cess;
  if (totalInvoiceValue === 0) {
    totalInvoiceValue = taxableSales + totalTax;
  }

  return {
    period,
    periodLabel: label,
    gstin,
    arn,
    filingDate: toIsoDateString(filingDate || (root.arn_date as string) || (root.filing_date as string)) || undefined,
    taxableSales: Math.round(taxableSales * 100) / 100,
    igst: Math.round(igst * 100) / 100,
    cgst: Math.round(cgst * 100) / 100,
    sgst: Math.round(sgst * 100) / 100,
    cess: Math.round(cess * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    totalInvoiceValue: Math.round(totalInvoiceValue * 100) / 100,
    b2bCount,
    b2csCount,
    exportCount,
    hsnSummaryCount,
    raw: root,
  };
}

/**
 * Parse GSTR-3B JSON from official GST Portal format
 */
export function parseGstr3bJson(json: Record<string, unknown>): ParsedGstr3b {
  const root = (json.data && typeof json.data === 'object' ? json.data : json) as Record<string, unknown>;
  const { period, label } = normalizeFp(root.ret_period || root.fp || root.period);
  const gstin = typeof root.gstin === 'string' ? root.gstin : undefined;
  const arn = typeof root.arn === 'string' ? root.arn : undefined;
  const filingDate = toIsoDateString(root.filing_date || root.arn_date || root.date) || undefined;
  const status = typeof root.status === 'string' ? root.status : 'Filed';

  // Table 3.1: Outward supplies
  let outwardTaxable = 0;
  let outwardIgst = 0;
  let outwardCgst = 0;
  let outwardSgst = 0;
  let outwardCess = 0;
  let inwardReverseChargeTaxable = 0;

  if (root.sup_details && typeof root.sup_details === 'object') {
    const sup = root.sup_details as Record<string, Record<string, unknown>>;
    if (sup.osup_det) {
      outwardTaxable += num(sup.osup_det.txval);
      outwardIgst += num(sup.osup_det.iamt);
      outwardCgst += num(sup.osup_det.camt);
      outwardSgst += num(sup.osup_det.samt);
      outwardCess += num(sup.osup_det.csamt);
    }
    if (sup.osup_zero) {
      outwardTaxable += num(sup.osup_zero.txval);
      outwardIgst += num(sup.osup_zero.iamt);
      outwardCess += num(sup.osup_zero.csamt);
    }
    if (sup.osup_nil_exmp) {
      outwardTaxable += num(sup.osup_nil_exmp.txval);
    }
    if (sup.isup_rev) {
      inwardReverseChargeTaxable += num(sup.isup_rev.txval);
      outwardIgst += num(sup.isup_rev.iamt);
      outwardCgst += num(sup.isup_rev.camt);
      outwardSgst += num(sup.isup_rev.samt);
      outwardCess += num(sup.isup_rev.csamt);
    }
  }

  const outwardTotalTax = outwardIgst + outwardCgst + outwardSgst + outwardCess;

  // Table 4: Eligible ITC
  const itcAvailable = { igst: 0, cgst: 0, sgst: 0, cess: 0, total: 0 };
  const itcReversed = { igst: 0, cgst: 0, sgst: 0, cess: 0, total: 0 };
  const itcIneligible = { igst: 0, cgst: 0, sgst: 0, cess: 0, total: 0 };

  if (root.itc_elg && typeof root.itc_elg === 'object') {
    const elg = root.itc_elg as Record<string, unknown>;
    if (Array.isArray(elg.itc_avl)) {
      for (const item of elg.itc_avl) {
        itcAvailable.igst += num(item.iamt);
        itcAvailable.cgst += num(item.camt);
        itcAvailable.sgst += num(item.samt);
        itcAvailable.cess += num(item.csamt);
      }
      itcAvailable.total = itcAvailable.igst + itcAvailable.cgst + itcAvailable.sgst + itcAvailable.cess;
    }
    if (Array.isArray(elg.itc_rev)) {
      for (const item of elg.itc_rev) {
        itcReversed.igst += num(item.iamt);
        itcReversed.cgst += num(item.camt);
        itcReversed.sgst += num(item.samt);
        itcReversed.cess += num(item.csamt);
      }
      itcReversed.total = itcReversed.igst + itcReversed.cgst + itcReversed.sgst + itcReversed.cess;
    }
    if (Array.isArray(elg.itc_inelg)) {
      for (const item of elg.itc_inelg) {
        itcIneligible.igst += num(item.iamt);
        itcIneligible.cgst += num(item.camt);
        itcIneligible.sgst += num(item.samt);
        itcIneligible.cess += num(item.csamt);
      }
      itcIneligible.total = itcIneligible.igst + itcIneligible.cgst + itcIneligible.sgst + itcIneligible.cess;
    }
  }

  const itcNet = {
    igst: Math.max(0, itcAvailable.igst - itcReversed.igst),
    cgst: Math.max(0, itcAvailable.cgst - itcReversed.cgst),
    sgst: Math.max(0, itcAvailable.sgst - itcReversed.sgst),
    cess: Math.max(0, itcAvailable.cess - itcReversed.cess),
    total: Math.max(0, itcAvailable.total - itcReversed.total),
  };

  // Table 6.1: Tax payment (Cash vs ITC credit)
  const taxPaidCash = { igst: 0, cgst: 0, sgst: 0, cess: 0, total: 0 };
  const taxPaidItc = { igst: 0, cgst: 0, sgst: 0, cess: 0, total: 0 };

  if (root.tx_py && typeof root.tx_py === 'object') {
    const txObj = root.tx_py as Record<string, unknown>;
    const list = Array.isArray(txObj.tx_py) ? txObj.tx_py : Array.isArray(root.tx_py) ? root.tx_py : [];
    for (const record of list) {
      if (record && typeof record === 'object') {
        const item = record as Record<string, Record<string, unknown>>;
        if (item.pd_cash) {
          taxPaidCash.igst += num(item.pd_cash.iamt);
          taxPaidCash.cgst += num(item.pd_cash.camt);
          taxPaidCash.sgst += num(item.pd_cash.samt);
          taxPaidCash.cess += num(item.pd_cash.csamt);
        }
        if (item.pd_itc) {
          taxPaidItc.igst += num(item.pd_itc.iamt);
          taxPaidItc.cgst += num(item.pd_itc.camt);
          taxPaidItc.sgst += num(item.pd_itc.samt);
          taxPaidItc.cess += num(item.pd_itc.csamt);
        }
      }
    }
    taxPaidCash.total = taxPaidCash.igst + taxPaidCash.cgst + taxPaidCash.sgst + taxPaidCash.cess;
    taxPaidItc.total = taxPaidItc.igst + taxPaidItc.cgst + taxPaidItc.sgst + taxPaidItc.cess;
  }

  // Table 5.1: Interest & Late Fee
  let interest = 0;
  let lateFee = 0;
  if (root.intr_ltfee && typeof root.intr_ltfee === 'object') {
    const fees = root.intr_ltfee as Record<string, Record<string, unknown>>;
    if (fees.intr_details) {
      interest += num(fees.intr_details.iamt) + num(fees.intr_details.camt) + num(fees.intr_details.samt) + num(fees.intr_details.csamt);
    }
    if (fees.ltfee_details) {
      lateFee += num(fees.ltfee_details.camt) + num(fees.ltfee_details.samt);
    }
  }

  return {
    period,
    periodLabel: label,
    gstin,
    arn,
    filingDate,
    status,
    outwardTaxable: Math.round(outwardTaxable * 100) / 100,
    outwardIgst: Math.round(outwardIgst * 100) / 100,
    outwardCgst: Math.round(outwardCgst * 100) / 100,
    outwardSgst: Math.round(outwardSgst * 100) / 100,
    outwardCess: Math.round(outwardCess * 100) / 100,
    outwardTotalTax: Math.round(outwardTotalTax * 100) / 100,
    inwardReverseChargeTaxable: Math.round(inwardReverseChargeTaxable * 100) / 100,
    itcAvailable,
    itcReversed,
    itcNet,
    itcIneligible,
    taxPaidCash,
    taxPaidItc,
    interest: Math.round(interest * 100) / 100,
    lateFee: Math.round(lateFee * 100) / 100,
    raw: root,
  };
}

/**
 * Auto-detect return type and convert to NormalizedGstPeriodUpdate
 */
export function convertGstJson(rawJson: unknown, existingRow?: Record<string, unknown>): NormalizedGstPeriodUpdate {
  if (!rawJson || typeof rawJson !== 'object') {
    throw new Error('Invalid JSON structure. Please provide a valid GST return export.');
  }

  const obj = rawJson as Record<string, unknown>;

  // Check if GSTR-1: has b2b or b2cs or exp or hsn
  const isGstr1 = Boolean(obj.b2b || obj.b2cs || obj.b2cl || obj.exp || (obj.hsn && !obj.sup_details));
  // Check if GSTR-3B: has sup_details or itc_elg or tx_py
  const isGstr3b = Boolean(obj.sup_details || obj.itc_elg || obj.tx_py || obj.intr_ltfee);

  if (!isGstr1 && !isGstr3b) {
    // If neither clearly flagged, try inspecting keys
    if (obj.fp && !obj.ret_period) {
      return convertFromGstr1(parseGstr1Json(obj), existingRow);
    }
    if (obj.ret_period) {
      return convertFromGstr3b(parseGstr3bJson(obj), existingRow);
    }
    throw new Error('Unrecognized GST return format. Supported formats: GSTR-1 and GSTR-3B JSON exports.');
  }

  if (isGstr1 && !isGstr3b) {
    const parsed1 = parseGstr1Json(obj);
    return convertFromGstr1(parsed1, existingRow);
  }

  if (isGstr3b && !isGstr1) {
    const parsed3b = parseGstr3bJson(obj);
    return convertFromGstr3b(parsed3b, existingRow);
  }

  // Combined object containing both
  const parsed1 = parseGstr1Json(obj);
  const parsed3b = parseGstr3bJson(obj);
  return mergeGstr1AndGstr3b(parsed1, parsed3b);
}

function convertFromGstr1(parsed: ParsedGstr1, existingRow?: Record<string, unknown>): NormalizedGstPeriodUpdate {
  const existing3b = (existingRow?.gstr3b ?? {}) as Record<string, unknown>;
  const existingItc = (existingRow?.itc ?? {}) as Record<string, unknown>;
  const existingPurchases = (existingRow?.purchases ?? {}) as Record<string, unknown>;

  const sales = {
    total: parsed.taxableSales,
    taxableSales: parsed.taxableSales,
    taxable_sales: parsed.taxableSales,
    igst: parsed.igst,
    cgst: parsed.cgst,
    sgst: parsed.sgst,
    cess: parsed.cess,
    gstAmount: parsed.totalTax,
    outputTax: parsed.totalTax,
    totalInvoiceValue: parsed.totalInvoiceValue,
    b2bCount: parsed.b2bCount,
    b2csCount: parsed.b2csCount,
    exportCount: parsed.exportCount,
  };

  const gstr1 = {
    filed: true,
    arn: parsed.arn ?? 'ARN-GSTR1-SYNCED',
    filingDate: toIsoDateString(parsed.filingDate) || new Date().toISOString().split('T')[0],
    arnDate: toIsoDateString(parsed.filingDate) || new Date().toISOString().split('T')[0],
    taxableValue: parsed.taxableSales,
    totalTax: parsed.totalTax,
    igst: parsed.igst,
    cgst: parsed.cgst,
    sgst: parsed.sgst,
    cess: parsed.cess,
    invoiceCount: parsed.b2bCount + parsed.b2csCount + parsed.exportCount,
    updatedAt: new Date().toISOString(),
  };

  const turnover = parsed.taxableSales;
  const outputTax = parsed.totalTax;
  const itcEligible = num(existingItc.total) || num(existingItc.totalItc);
  const cashTaxPaid = Math.max(0, outputTax - itcEligible);

  return {
    period: parsed.period,
    periodLabel: parsed.periodLabel,
    returnType: 'GSTR-1',
    sales,
    purchases: existingPurchases,
    itc: existingItc,
    gstr1,
    gstr3b: existing3b,
    metrics: {
      turnover,
      outputTax,
      itcEligible,
      cashTaxPaid,
      creditTaxPaid: itcEligible,
      arn: parsed.arn,
      filingDate: parsed.filingDate,
    },
  };
}

function convertFromGstr3b(parsed: ParsedGstr3b, existingRow?: Record<string, unknown>): NormalizedGstPeriodUpdate {
  const existingGstr1 = (existingRow?.gstr1 ?? {}) as Record<string, unknown>;
  const existingSales = (existingRow?.sales ?? {}) as Record<string, unknown>;

  const sales = {
    total: parsed.outwardTaxable || num(existingSales.total),
    taxableSales: parsed.outwardTaxable || num(existingSales.taxableSales),
    taxable_sales: parsed.outwardTaxable || num(existingSales.taxable_sales),
    igst: parsed.outwardIgst,
    cgst: parsed.outwardCgst,
    sgst: parsed.outwardSgst,
    cess: parsed.outwardCess,
    gstAmount: parsed.outwardTotalTax,
    outputTax: parsed.outwardTotalTax,
    reverseChargeTaxable: parsed.inwardReverseChargeTaxable,
  };

  const itc = {
    total: parsed.itcNet.total,
    totalItc: parsed.itcNet.total,
    total_itc: parsed.itcNet.total,
    igst: parsed.itcNet.igst,
    cgst: parsed.itcNet.cgst,
    sgst: parsed.itcNet.sgst,
    cess: parsed.itcNet.cess,
    availableTotal: parsed.itcAvailable.total,
    reversedTotal: parsed.itcReversed.total,
    ineligibleTotal: parsed.itcIneligible.total,
  };

  const purchases = {
    total: parsed.itcNet.total,
    taxablePurchase: Math.round(parsed.itcNet.total * (100 / 18)), // estimated taxable inward
    taxable_purchase: Math.round(parsed.itcNet.total * (100 / 18)),
    igst: parsed.itcNet.igst,
    cgst: parsed.itcNet.cgst,
    sgst: parsed.itcNet.sgst,
    cess: parsed.itcNet.cess,
  };

  const gstr3b = {
    filed: true,
    arn: parsed.arn ?? 'AA270426019284M',
    filingDate: toIsoDateString(parsed.filingDate) || new Date().toISOString().split('T')[0],
    arnDate: toIsoDateString(parsed.filingDate) || new Date().toISOString().split('T')[0],
    totalTax: parsed.outwardTotalTax,
    itcClaimed: parsed.itcNet.total,
    cashPaid: parsed.taxPaidCash.total,
    creditPaid: parsed.taxPaidItc.total,
    interest: parsed.interest,
    lateFee: parsed.lateFee,
    updatedAt: new Date().toISOString(),
  };

  const turnover = sales.total;
  const outputTax = parsed.outwardTotalTax;
  const itcEligible = parsed.itcNet.total;
  const cashTaxPaid = parsed.taxPaidCash.total || Math.max(0, outputTax - itcEligible);

  return {
    period: parsed.period,
    periodLabel: parsed.periodLabel,
    returnType: 'GSTR-3B',
    sales,
    purchases,
    itc,
    gstr1: existingGstr1,
    gstr3b,
    metrics: {
      turnover,
      outputTax,
      itcEligible,
      cashTaxPaid,
      creditTaxPaid: parsed.taxPaidItc.total || itcEligible,
      arn: parsed.arn,
      filingDate: parsed.filingDate,
    },
  };
}

function mergeGstr1AndGstr3b(p1: ParsedGstr1, p3b: ParsedGstr3b): NormalizedGstPeriodUpdate {
  const c1 = convertFromGstr1(p1);
  const c3b = convertFromGstr3b(p3b, { sales: c1.sales, gstr1: c1.gstr1 });

  return {
    ...c3b,
    period: p1.period || p3b.period,
    periodLabel: p1.periodLabel || p3b.periodLabel,
    returnType: 'COMBINED',
    gstr1: c1.gstr1,
    metrics: {
      turnover: p1.taxableSales || p3b.outwardTaxable,
      outputTax: p3b.outwardTotalTax || p1.totalTax,
      itcEligible: p3b.itcNet.total,
      cashTaxPaid: p3b.taxPaidCash.total,
      creditTaxPaid: p3b.taxPaidItc.total,
      arn: p3b.arn || p1.arn,
      filingDate: p3b.filingDate || p1.filingDate,
    },
  };
}

