import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { NormalizedGstPeriodUpdate } from './gstParser';

// Initialize PDF.js worker using Vite asset URL resolution
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface ExtractedGstrField {
  returnType: 'GSTR-1' | 'GSTR-3B';
  period: string; // YYYY-MM e.g. "2026-04"
  periodLabel: string; // e.g. "April 2026"
  financialYear: string; // e.g. "2026-27"
  monthName: string; // e.g. "April"
  gstin?: string;
  legalName?: string;
  tradeName?: string;
  arn?: string;
  arnDate?: string;
  filingDate?: string;
  status: string;

  // Outward / Sales metrics
  turnover: number;
  outputTax: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  b2bTurnover: number;
  b2cTurnover: number;
  exportTurnover: number;
  salesReturns: number;

  // RCM (Reverse Charge Mechanism)
  rcmTaxableValue: number;
  rcmTaxAmount: number;
  rcmCgst: number;
  rcmSgst: number;
  rcmIgst: number;
  rcmCashPaid: number;
  rcmItcClaimed: number;
  rcmItc?: {
    igst: number;
    cgst: number;
    sgst: number;
    cess: number;
    total: number;
  };

  // Input Tax Credit (ITC)
  itcEligible: number;
  inwardItc: {
    igst: number;
    cgst: number;
    sgst: number;
    cess: number;
    total: number;
  };
  allOtherItc?: {
    igst: number;
    cgst: number;
    sgst: number;
    cess: number;
    total: number;
  };
  itcUtilized: number;
  cashTaxPaid: number;

  gstr1Tables?: Gstr1TableSummary;

  rawText: string;
}

export interface Gstr1TableSummary {
  table4_b2b?: { records: number; taxable: number; igst: number; cgst: number; sgst: number; cess: number };
  table4b_rcm?: { records: number; taxable: number; igst: number; cgst: number; sgst: number; cess: number };
  table5_b2cl?: { records: number; taxable: number; igst: number; cess: number };
  table6a_exports?: { records: number; taxable: number; igst: number; cess: number };
  table6b_sez?: { records: number; taxable: number; igst: number; cess: number };
  table6c_deemed_exports?: { records: number; taxable: number; igst: number; cgst: number; sgst: number; cess: number };
  table7_b2cs?: { records: number; taxable: number; igst: number; cgst: number; sgst: number; cess: number };
  table8_nil?: { nil: number; exempted: number; nonGst: number; total: number };
  table9_amendments?: { records: number; amendedTaxable: number; netDifferential: number; igst: number; cgst: number; sgst: number; cess: number };
  table9b_credit_debit?: { records: number; netValue: number; igst: number; cgst: number; sgst: number; cess: number };
  table11_advances?: { taxable: number; igst: number; cgst: number; sgst: number; cess: number };
  table12_hsn?: { records: number; taxable: number; igst: number; cgst: number; sgst: number; cess: number };
  table13_documents?: { netIssued: number };
  table14_ecommerce?: { records: number; taxable: number; igst: number; cgst: number; sgst: number; cess: number };
  table15_sec9_5?: { records: number; taxable: number; igst: number; cgst: number; sgst: number; cess: number };
  totalLiability?: { taxable: number; igst: number; cgst: number; sgst: number; cess: number; totalTax: number };
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const parseNumber = (val: unknown): number => {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (!val) return 0;
  const s = String(val).replace(/,/g, '').trim();
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Normalizes any date string (DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, or ISO) to ISO YYYY-MM-DD
 * for reliable HTML5 <input type="date"> binding and standard database persistence.
 */
export function toIsoDateString(rawDate?: unknown): string {
  if (!rawDate) return '';
  const trimmed = String(rawDate).trim();
  if (!trimmed) return '';

  // Check if already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // YYYY/MM/DD or YYYY-MM-DD
  const ymdMatch = trimmed.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return trimmed;
}

/**
 * Formats ISO YYYY-MM-DD or raw date to Indian format DD/MM/YYYY for statutory displays
 */
export function formatGstDateDisplay(rawDate?: unknown): string {
  if (!rawDate) return '-';
  const str = String(rawDate).trim();
  if (!str) return '-';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;

  const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    return `${ymdMatch[3]}/${ymdMatch[2]}/${ymdMatch[1]}`;
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return str;
}

/**
 * Converts Indian Financial Year (e.g. "2026-27") and Month name (e.g. "April") to "YYYY-MM"
 */
export function fyMonthToPeriod(fyStr?: string, monthStr?: string): { period: string; periodLabel: string } {
  const now = new Date();
  let baseYear = now.getFullYear();

  if (fyStr) {
    const match = fyStr.match(/(\d{4})-\d{2}/);
    if (match) {
      baseYear = parseInt(match[1], 10);
    }
  }

  let mIndex = now.getMonth(); // 0-based
  let mName = MONTH_NAMES[mIndex];

  if (monthStr) {
    const foundIndex = MONTH_NAMES.findIndex(
      (m) => m.toLowerCase() === monthStr.trim().toLowerCase()
    );
    if (foundIndex >= 0) {
      mIndex = foundIndex;
      mName = MONTH_NAMES[foundIndex];
    }
  }

  // In Indian FY (April to March):
  // Months 0-2 (Jan, Feb, Mar) belong to the latter calendar year (baseYear + 1)
  // Months 3-11 (Apr to Dec) belong to the baseYear
  const calendarYear = mIndex < 3 ? baseYear + 1 : baseYear;
  const monthNum = String(mIndex + 1).padStart(2, '0');
  const period = `${calendarYear}-${monthNum}`;
  const periodLabel = `${mName} ${calendarYear}`;

  return { period, periodLabel };
}

/**
 * Extract full text from a PDF File or ArrayBuffer using pdfjs-dist
 */
export async function extractTextFromPdf(fileOrBuffer: File | ArrayBuffer): Promise<string> {
  const arrayBuffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const pageTexts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings: string[] = [];

    let lastY: number | null = null;
    for (const item of content.items) {
      if ('str' in item) {
        const currentY = item.transform ? Math.round(item.transform[5]) : null;
        if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 5) {
          strings.push('\n');
        } else if (strings.length > 0 && !strings[strings.length - 1].endsWith('\n')) {
          strings.push(' ');
        }
        strings.push(item.str);
        lastY = currentY;
      }
    }
    pageTexts.push(strings.join(''));
  }

  return pageTexts.join('\n\n--- PAGE BREAK ---\n\n');
}

/**
 * Robust extractor for Form GSTR-3B filed PDF
 */
export function parseGstr3bPdf(text: string): ExtractedGstrField {
  // 1. Basic Metadata
  const fyMatch = text.match(/Year\s*[:]?\s*(\d{4}-\d{2})/i) || text.match(/Financial year\s*[:]?\s*(\d{4}-\d{2})/i);
  const financialYear = fyMatch ? fyMatch[1] : '2026-27';

  const periodMatch = text.match(/Period\s*[:]?\s*(January|February|March|April|May|June|July|August|September|October|November|December)/i)
    || text.match(/Tax period\s*[:]?\s*(January|February|March|April|May|June|July|August|September|October|November|December)/i);
  const monthName = periodMatch ? periodMatch[1] : 'April';

  const { period, periodLabel } = fyMonthToPeriod(financialYear, monthName);

  const gstinMatch = text.match(/GSTIN(?: of the supplier)?\s*[:]?\s*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{3})/i);
  const gstin = gstinMatch ? gstinMatch[1].toUpperCase() : undefined;

  const legalMatch = text.match(/2\(a\)\.?\s*Legal name[^\n]*?person\s*[:]?\s*([^\n\r]+)/i)
    || text.match(/2\(a\)\.?\s*Legal name[^\n:]*[:]?\s*([^\n\r]+)/i);
  const legalName = legalMatch ? legalMatch[1].trim() : undefined;

  const tradeMatch = text.match(/2\(b\)\.?\s*Trade name[^\n]*?any\s*[:]?\s*([^\n\r]+)/i)
    || text.match(/2\(b\)\.?\s*Trade name[^\n:]*[:]?\s*([^\n\r]+)/i);
  const tradeName = tradeMatch ? tradeMatch[1].trim() : undefined;

  // 2(c) ARN (Ack Reference Number)
  const arnMatch = text.match(/2\(c\)\.?\s*ARN\s*[:]?\s*([A-Z0-9]{12,22})/i)
    || text.match(/(?:ARN|Ack\s*Reference\s*No|Acknowledgement\s*No)\s*[:]?\s*([A-Z0-9]{12,22})/i)
    || text.match(/\b(AB[0-9]{12,16}[A-Z0-9]?)\b/i)
    || text.match(/\b([A-Z]{2}[0-9]{12,16}[A-Z0-9]?)\b/i);
  const arn = arnMatch ? arnMatch[1].toUpperCase() : undefined;

  // 2(d) Date of ARN (Filing Date)
  let rawDate: string | undefined;
  const dateMatch = text.match(/2\(d\)\.?\s*(?:Date\s*of\s*ARN|ARN\s*date)\s*[:]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i)
    || text.match(/(?:Date\s*of\s*ARN|ARN\s*date|Date\s*of\s*filing|Filing\s*date)\s*[:]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i)
    || text.match(/Date\s*[:]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i);

  if (dateMatch) {
    rawDate = dateMatch[1];
  } else if (arn) {
    const arnPos = text.indexOf(arn);
    if (arnPos !== -1) {
      const window = text.substring(arnPos, arnPos + 250);
      const windowDate = window.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/);
      if (windowDate) rawDate = windowDate[1];
    }
  }

  if (!rawDate) {
    const headerMatch = text.substring(0, 2000).match(/(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/);
    if (headerMatch) rawDate = headerMatch[1];
  }

  // The filing date IS the ARN date 2(d) (normalized to YYYY-MM-DD for HTML5 date inputs & DB)
  const arnDate = toIsoDateString(rawDate) || new Date().toISOString().split('T')[0];
  const filingDate = arnDate;

  // 3.1(a) Outward Taxable Supplies (SALES & Outward Tax Liability)
  // Handles multiline wrapping between '(other than zero rated, nil rated and' and 'exempted)'
  let outwardTaxable = 0;
  let outwardIgst = 0;
  let outwardCgst = 0;
  let outwardSgst = 0;
  let outwardCess = 0;

  const t31aMultilineRegex = /\(a\)\s*Outward taxable supplies[\s\S]*?exempted\)?\s*[\n\r]*\s*([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i;
  const t31aFallbackRegex = /\(a\)\s*Outward taxable supplies[^\d\n]*\n?\s*([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i;
  const m31a = text.match(t31aMultilineRegex) || text.match(t31aFallbackRegex);
  if (m31a) {
    outwardTaxable = parseNumber(m31a[1]);
    outwardIgst = parseNumber(m31a[2]);
    outwardCgst = parseNumber(m31a[3]);
    outwardSgst = parseNumber(m31a[4]);
    outwardCess = parseNumber(m31a[5]);
  }

  // 3.1(d) Inward Supplies Liable to Reverse Charge (RCM Taxable & Tax Liability)
  let rcmTaxable = 0;
  let rcmIgst = 0;
  let rcmCgst = 0;
  let rcmSgst = 0;
  let rcmCess = 0;

  const t31dRegex = /\(d\)\s*Inward supplies \(liable to reverse charge\)[^\d\n]*\n?\s*([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i;
  const m31d = text.match(t31dRegex) || text.match(/\(d\)\s*Inward supplies \(liable to reverse charge\)[^\n]*\n?\s*([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i);
  if (m31d) {
    rcmTaxable = parseNumber(m31d[1]);
    rcmIgst = parseNumber(m31d[2]);
    rcmCgst = parseNumber(m31d[3]);
    rcmSgst = parseNumber(m31d[4]);
    rcmCess = parseNumber(m31d[5]);
  }

  const rcmTaxAmount = rcmIgst + rcmCgst + rcmSgst + rcmCess;

  // 4.A(3) Inward supplies liable to reverse charge (ITC asset claiming back 3.1(d))
  let rcmItcIgst = 0;
  let rcmItcCgst = 0;
  let rcmItcSgst = 0;
  let rcmItcCess = 0;
  const t4a3Regex = /\(3\)\s*Inward supplies liable to reverse charge[^\n]*?above\)?\s*([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i;
  const m4a3 = text.match(t4a3Regex) || text.match(/\(3\)\s*Inward supplies liable to reverse charge[^\n]*\n?\s*([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i);
  if (m4a3) {
    rcmItcIgst = parseNumber(m4a3[1]);
    rcmItcCgst = parseNumber(m4a3[2]);
    rcmItcSgst = parseNumber(m4a3[3]);
    rcmItcCess = parseNumber(m4a3[4]);
  } else if (rcmTaxAmount > 0) {
    rcmItcIgst = rcmIgst;
    rcmItcCgst = rcmCgst;
    rcmItcSgst = rcmSgst;
    rcmItcCess = rcmCess;
  }
  const rcmItcClaimed = rcmItcIgst + rcmItcCgst + rcmItcSgst + rcmItcCess;

  // 4.A(5) All other ITC (Purchases ITC Asset - note: GSTR-3B does not list purchase turnover, only ITC)
  let allOtherIgst = 0;
  let allOtherCgst = 0;
  let allOtherSgst = 0;
  let allOtherCess = 0;
  const t4a5Regex = /\(5\)\s*All other ITC[^\d\n]*\n?\s*([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i;
  const m4a5 = text.match(t4a5Regex) || text.match(/\(5\)\s*All other ITC[^\n]*\n?\s*([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i);
  if (m4a5) {
    allOtherIgst = parseNumber(m4a5[1]);
    allOtherCgst = parseNumber(m4a5[2]);
    allOtherSgst = parseNumber(m4a5[3]);
    allOtherCess = parseNumber(m4a5[4]);
  }

  // 4.C Net ITC available (A-B) - Net eligible ITC asset for the month
  let netItcIgst = allOtherIgst + rcmItcIgst;
  let netItcCgst = allOtherCgst + rcmItcCgst;
  let netItcSgst = allOtherSgst + rcmItcSgst;
  let netItcCess = allOtherCess + rcmItcCess;

  const t4cRegex = /Net ITC available[^\d\n]*\n?\s*([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i;
  const m4c = text.match(t4cRegex) || text.match(/C\.\s*Net ITC available[^\d\n]*\n?\s*([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i);
  if (m4c) {
    netItcIgst = parseNumber(m4c[1]);
    netItcCgst = parseNumber(m4c[2]);
    netItcSgst = parseNumber(m4c[3]);
    netItcCess = parseNumber(m4c[4]);
  }

  const totalNetItc = Math.round((netItcIgst + netItcCgst + netItcSgst + netItcCess) * 100) / 100;

  // 5. Table 6.1 Payment of tax
  // (B) RCM and 9(5) cash payments (RCM tax must be paid in cash via Challan PMT-06)
  let cashPaid = 0;
  const rcmCashMatch = text.match(/\(B\)\s*Reverse charge and supplies made u\/s 9\(5\)[\s\S]*?Central\s*tax[^\n]*\n?\s*([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+-\s+-\s+-\s+-\s+([\d,]+\.?\d*)/i);
  const rcmStateCashMatch = text.match(/State\/UT\s*tax[^\n]*\n?\s*([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+-\s+-\s+-\s+-\s+([\d,]+\.?\d*)/i);
  if (rcmCashMatch && rcmStateCashMatch) {
    cashPaid = parseNumber(rcmCashMatch[4]) + parseNumber(rcmStateCashMatch[4]);
  } else if (rcmTaxAmount > 0) {
    cashPaid = rcmTaxAmount;
  }

  // Calculate ITC utilized: outward tax liability offset by eligible ITC
  const outputTax = outwardIgst + outwardCgst + outwardSgst + outwardCess;
  const itcUtilized = Math.min(outputTax, totalNetItc);

  return {
    returnType: 'GSTR-3B',
    period,
    periodLabel,
    financialYear,
    monthName,
    gstin,
    legalName,
    tradeName,
    arn,
    arnDate,
    filingDate: arnDate,
    status: 'FILED',
    turnover: outwardTaxable,
    outputTax,
    igst: outwardIgst,
    cgst: outwardCgst,
    sgst: outwardSgst,
    cess: outwardCess,
    b2bTurnover: 0,
    b2cTurnover: outwardTaxable,
    exportTurnover: 0,
    salesReturns: 0,
    rcmTaxableValue: rcmTaxable,
    rcmTaxAmount,
    rcmCgst,
    rcmSgst,
    rcmIgst,
    rcmCashPaid: cashPaid,
    rcmItcClaimed,
    rcmItc: {
      igst: rcmItcIgst,
      cgst: rcmItcCgst,
      sgst: rcmItcSgst,
      cess: rcmItcCess,
      total: rcmItcClaimed,
    },
    itcEligible: totalNetItc,
    inwardItc: {
      igst: netItcIgst,
      cgst: netItcCgst,
      sgst: netItcSgst,
      cess: netItcCess,
      total: totalNetItc,
    },
    allOtherItc: {
      igst: allOtherIgst,
      cgst: allOtherCgst,
      sgst: allOtherSgst,
      cess: allOtherCess,
      total: allOtherIgst + allOtherCgst + allOtherSgst + allOtherCess,
    },
    itcUtilized,
    cashTaxPaid: cashPaid,
    rawText: text,
  };
}

/**
 * Robust extractor for Form GSTR-1 filed PDF
 */
export function parseGstr1Pdf(text: string): ExtractedGstrField {
  // 1. Basic Metadata
  const fyMatch = text.match(/Financial year\s*[:]?\s*(\d{4}-\d{2})/i) || text.match(/Year\s*[:]?\s*(\d{4}-\d{2})/i);
  const financialYear = fyMatch ? fyMatch[1] : '2026-27';

  const periodMatch = text.match(/Tax period\s*[:]?\s*(January|February|March|April|May|June|July|August|September|October|November|December)/i)
    || text.match(/Period\s*[:]?\s*(January|February|March|April|May|June|July|August|September|October|November|December)/i);
  const monthName = periodMatch ? periodMatch[1] : 'April';

  const { period, periodLabel } = fyMonthToPeriod(financialYear, monthName);

  const gstinMatch = text.match(/1\s*GSTIN\s*[:]?\s*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{3})/i)
    || text.match(/GSTIN\s*[:]?\s*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{3})/i);
  const gstin = gstinMatch ? gstinMatch[1].toUpperCase() : undefined;

  const legalMatch = text.match(/2\s*\(a\)\s*Legal name[^\n:]*[:]?\s*([^\n\r]+)/i);
  const legalName = legalMatch ? legalMatch[1].trim() : undefined;

  const tradeMatch = text.match(/\(b\)\s*Trade name[^\n:]*[:]?\s*([^\n\r]+)/i);
  const tradeName = tradeMatch ? tradeMatch[1].trim() : undefined;

  const arnMatch = text.match(/(?:\(c\)\s*ARN|ARN)\s*[:]?\s*([A-Z0-9]{12,22})/i)
    || text.match(/\b(AA[0-9]{12,16}[A-Z0-9]?)\b/i)
    || text.match(/\b([A-Z]{2}[0-9]{12,16}[A-Z0-9]?)\b/i);
  const arn = arnMatch ? arnMatch[1].toUpperCase() : undefined;

  let rawDate: string | undefined;
  const dateMatch = text.match(/(?:\(d\)\s*ARN\s*date|ARN\s*date|Date\s*of\s*ARN|Date\s*of\s*filing|Filing\s*date)\s*[:]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i)
    || text.match(/Date\s*[:]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i);

  if (dateMatch) {
    rawDate = dateMatch[1];
  } else if (arn) {
    const arnPos = text.indexOf(arn);
    if (arnPos !== -1) {
      const window = text.substring(arnPos, arnPos + 250);
      const windowDate = window.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/);
      if (windowDate) rawDate = windowDate[1];
    }
  }

  if (!rawDate) {
    const headerMatch = text.substring(0, 2000).match(/(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/);
    if (headerMatch) rawDate = headerMatch[1];
  }

  // The filing date IS the ARN date (normalized to YYYY-MM-DD for HTML5 date inputs & DB)
  const arnDate = toIsoDateString(rawDate) || new Date().toISOString().split('T')[0];
  const filingDate = arnDate;

  // 2. Table 4A - B2B Regular
  let b2bTaxable = 0;
  let b2bIgst = 0;
  let b2bCgst = 0;
  let b2bSgst = 0;
  let b2bCess = 0;
  let b2bRecords = 0;
  const b2bRegex = /4A\s*-\s*Taxable outward supplies[^\n]*\n?\s*Total\s+(\d+)\s+Invoice\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i;
  const m4a = text.match(b2bRegex);
  if (m4a) {
    b2bRecords = parseNumber(m4a[1]);
    b2bTaxable = parseNumber(m4a[2]);
    b2bIgst = parseNumber(m4a[3]);
    b2bCgst = parseNumber(m4a[4]);
    b2bSgst = parseNumber(m4a[5]);
    b2bCess = parseNumber(m4a[6]);
  }

  // Table 4B - Reverse Charge
  let b2bRcmTaxable = 0;
  let b2bRcmIgst = 0;
  let b2bRcmCgst = 0;
  let b2bRcmSgst = 0;
  let b2bRcmCess = 0;
  let b2bRcmRecords = 0;
  const b2bRcmRegex = /4B\s*-\s*Taxable outward supplies attracting reverse charge[\s\S]*?Total\s+(\d+)\s+Invoice\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i;
  const m4b = text.match(b2bRcmRegex);
  if (m4b) {
    b2bRcmRecords = parseNumber(m4b[1]);
    b2bRcmTaxable = parseNumber(m4b[2]);
    b2bRcmIgst = parseNumber(m4b[3]);
    b2bRcmCgst = parseNumber(m4b[4]);
    b2bRcmSgst = parseNumber(m4b[5]);
    b2bRcmCess = parseNumber(m4b[6]);
  }

  // Table 5 - B2C Large (> ₹1 Lakh inter-state)
  let b2clTaxable = 0;
  let b2clIgst = 0;
  let b2clCess = 0;
  let b2clRecords = 0;
  const b2clRegex = /5\s*-\s*Taxable outward inter-State supplies to unregistered persons[\s\S]*?Total\s+(\d+)\s+Invoice\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i;
  const m5 = text.match(b2clRegex);
  if (m5) {
    b2clRecords = parseNumber(m5[1]);
    b2clTaxable = parseNumber(m5[2]);
    b2clIgst = parseNumber(m5[3]);
    b2clCess = parseNumber(m5[4]);
  }

  // Table 6A - Exports
  let expTaxable = 0;
  let expIgst = 0;
  let expCess = 0;
  let expRecords = 0;
  const expRegex = /6A\s*-\s*Exports[\s\S]*?Total\s+(\d+)\s+Invoice\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i;
  const m6a = text.match(expRegex);
  if (m6a) {
    expRecords = parseNumber(m6a[1]);
    expTaxable = parseNumber(m6a[2]);
    expIgst = parseNumber(m6a[3]);
    expCess = parseNumber(m6a[4]);
  }

  // Table 6B - SEZ supplies
  let sezTaxable = 0;
  let sezIgst = 0;
  let sezCess = 0;
  let sezRecords = 0;
  const sezRegex = /6B\s*-\s*Supplies made to SEZ[\s\S]*?Total\s+(\d+)\s+Invoice\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i;
  const m6b = text.match(sezRegex);
  if (m6b) {
    sezRecords = parseNumber(m6b[1]);
    sezTaxable = parseNumber(m6b[2]);
    sezIgst = parseNumber(m6b[3]);
    sezCess = parseNumber(m6b[4]);
  }

  // Table 6C - Deemed Exports
  let deTaxable = 0;
  let deIgst = 0;
  let deCgst = 0;
  let deSgst = 0;
  let deCess = 0;
  let deRecords = 0;
  const deRegex = /6C\s*-\s*Deemed exports[\s\S]*?Total\s+(\d+)\s+Invoice\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i;
  const m6c = text.match(deRegex);
  if (m6c) {
    deRecords = parseNumber(m6c[1]);
    deTaxable = parseNumber(m6c[2]);
    deIgst = parseNumber(m6c[3]);
    deCgst = parseNumber(m6c[4]);
    deSgst = parseNumber(m6c[5]);
    deCess = parseNumber(m6c[6]);
  }

  // 3. Table 7 - B2CS (Others)
  let b2csTaxable = 0;
  let b2csIgst = 0;
  let b2csCgst = 0;
  let b2csSgst = 0;
  let b2csCess = 0;
  let b2csRecords = 0;
  const b2csRegex = /7-\s*Taxable supplies[^\n]*B2CS\s*\(Others\)[\s\S]*?Total\s+(\d+)\s+Net Value\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i;
  const m7 = text.match(b2csRegex);
  if (m7) {
    b2csRecords = parseNumber(m7[1]);
    b2csTaxable = parseNumber(m7[2]);
    b2csIgst = parseNumber(m7[3]);
    b2csCgst = parseNumber(m7[4]);
    b2csSgst = parseNumber(m7[5]);
    b2csCess = parseNumber(m7[6]);
  }

  // Table 8 - Nil rated, exempted and non GST outward supplies
  let nilAmt = 0;
  let exemptedAmt = 0;
  let nonGstAmt = 0;
  const nilRegex = /8A,\s*8B,\s*8C,\s*8D[^\n]*[\s\S]*?Total\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i;
  const m8 = text.match(nilRegex);
  if (m8) {
    nilAmt = parseNumber(m8[1]);
    exemptedAmt = parseNumber(m8[2]);
    nonGstAmt = parseNumber(m8[3]);
  }

  // Table 9A & 10 - Amendments
  let amendRecords = 0;
  let amendTaxable = 0;
  let amendIgst = 0;
  let amendCgst = 0;
  let amendSgst = 0;
  let amendCess = 0;
  const amendRegex = /(?:9A|10)\s*-[^\n]*Amended[\s\S]*?Total\s+(\d+)\s+Differential\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i;
  const mAmend = text.match(amendRegex);
  if (mAmend) {
    amendRecords = parseNumber(mAmend[1]);
    amendTaxable = parseNumber(mAmend[2]);
    amendIgst = parseNumber(mAmend[3]);
    amendCgst = parseNumber(mAmend[4]);
    amendSgst = parseNumber(mAmend[5]);
    amendCess = parseNumber(mAmend[6]);
  }

  // Table 9B & 9C - Credit/Debit Notes (CDNR, CDNUR)
  let cdnrRecords = 0;
  let cdnrNetValue = 0;
  let cdnrIgst = 0;
  let cdnrCgst = 0;
  let cdnrSgst = 0;
  let cdnrCess = 0;
  const cdnrRegex = /9B\s*-\s*Credit\/Debit Notes[\s\S]*?Total\s+(\d+)\s+Differential\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i;
  const mCdnr = text.match(cdnrRegex);
  if (mCdnr) {
    cdnrRecords = parseNumber(mCdnr[1]);
    cdnrNetValue = parseNumber(mCdnr[2]);
    cdnrIgst = parseNumber(mCdnr[3]);
    cdnrCgst = parseNumber(mCdnr[4]);
    cdnrSgst = parseNumber(mCdnr[5]);
    cdnrCess = parseNumber(mCdnr[6]);
  }

  // Table 11A, 11B - Advances
  let advTaxable = 0;
  let advIgst = 0;
  let advCgst = 0;
  let advSgst = 0;
  let advCess = 0;
  const advRegex = /11A,\s*11B\s*-\s*Advances Received\/Advance adjusted[\s\S]*?Total\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i;
  const mAdv = text.match(advRegex);
  if (mAdv) {
    advTaxable = parseNumber(mAdv[1]);
    advIgst = parseNumber(mAdv[2]);
    advCgst = parseNumber(mAdv[3]);
    advSgst = parseNumber(mAdv[4]);
    advCess = parseNumber(mAdv[5]);
  }

  // Table 12 - HSN-wise summary
  let hsnRecords = 0;
  let hsnTaxable = 0;
  let hsnIgst = 0;
  let hsnCgst = 0;
  let hsnSgst = 0;
  let hsnCess = 0;
  const hsnRegex = /12\s*-\s*HSN-wise summary[^\n]*\n?\s*Total\s+(\d+)\s+NA\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i;
  const mHsn = text.match(hsnRegex);
  if (mHsn) {
    hsnRecords = parseNumber(mHsn[1]);
    hsnTaxable = parseNumber(mHsn[2]);
    hsnIgst = parseNumber(mHsn[3]);
    hsnCgst = parseNumber(mHsn[4]);
    hsnSgst = parseNumber(mHsn[5]);
    hsnCess = parseNumber(mHsn[6]);
  }

  // Table 13 - Documents Issued
  let docsIssued = 0;
  const docsRegex = /13\s*-\s*Documents Issued[^\n]*\n?\s*Total\s+(\d+)/i;
  const mDocs = text.match(docsRegex);
  if (mDocs) {
    docsIssued = parseNumber(mDocs[1]);
  }

  // 4. Overall Total Outward Liability Row (from Table 15/Summary)
  // Total Liability (Outward supplies other than Reverse charge) 65,000.00 0.00 1,625.00 1,625.00 0.00
  let totalTaxable = 0;
  let totalIgst = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalCess = 0;

  const totalLiabilityRegex = /Total Liability\s*\(Outward supplies other than Reverse charge\)\s*([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i;
  const mTotal = text.match(totalLiabilityRegex);
  if (mTotal) {
    totalTaxable = parseNumber(mTotal[1]);
    totalIgst = parseNumber(mTotal[2]);
    totalCgst = parseNumber(mTotal[3]);
    totalSgst = parseNumber(mTotal[4]);
    totalCess = parseNumber(mTotal[5]);
  } else {
    totalTaxable = b2bTaxable + b2csTaxable + b2clTaxable + expTaxable + sezTaxable + deTaxable;
    totalIgst = b2bIgst + b2csIgst + b2clIgst + expIgst + sezIgst + deIgst;
    totalCgst = b2bCgst + b2csCgst + deCgst;
    totalSgst = b2bSgst + b2csSgst + deSgst;
    totalCess = b2bCess + b2csCess + b2clCess + expCess + sezCess + deCess;
  }

  // If totalTaxable is still 0, check HSN table
  if (totalTaxable === 0 && hsnTaxable > 0) {
    totalTaxable = hsnTaxable;
    totalIgst = hsnIgst;
    totalCgst = hsnCgst;
    totalSgst = hsnSgst;
    totalCess = hsnCess;
  }

  // Defaults if only B2CS was reported
  if (b2csTaxable === 0 && b2bTaxable === 0 && totalTaxable > 0) {
    b2csTaxable = totalTaxable;
    b2csRecords = b2csRecords || 1;
  }

  const outputTax = totalIgst + totalCgst + totalSgst + totalCess;

  const gstr1Tables: Gstr1TableSummary = {
    table4_b2b: { records: b2bRecords, taxable: b2bTaxable, igst: b2bIgst, cgst: b2bCgst, sgst: b2bSgst, cess: b2bCess },
    table4b_rcm: { records: b2bRcmRecords, taxable: b2bRcmTaxable, igst: b2bRcmIgst, cgst: b2bRcmCgst, sgst: b2bRcmSgst, cess: b2bRcmCess },
    table5_b2cl: { records: b2clRecords, taxable: b2clTaxable, igst: b2clIgst, cess: b2clCess },
    table6a_exports: { records: expRecords, taxable: expTaxable, igst: expIgst, cess: expCess },
    table6b_sez: { records: sezRecords, taxable: sezTaxable, igst: sezIgst, cess: sezCess },
    table6c_deemed_exports: { records: deRecords, taxable: deTaxable, igst: deIgst, cgst: deCgst, sgst: deSgst, cess: deCess },
    table7_b2cs: { records: b2csRecords, taxable: b2csTaxable, igst: b2csIgst, cgst: b2csCgst, sgst: b2csSgst, cess: b2csCess },
    table8_nil: { nil: nilAmt, exempted: exemptedAmt, nonGst: nonGstAmt, total: nilAmt + exemptedAmt + nonGstAmt },
    table9_amendments: { records: amendRecords, amendedTaxable: amendTaxable, netDifferential: amendTaxable, igst: amendIgst, cgst: amendCgst, sgst: amendSgst, cess: amendCess },
    table9b_credit_debit: { records: cdnrRecords, netValue: cdnrNetValue, igst: cdnrIgst, cgst: cdnrCgst, sgst: cdnrSgst, cess: cdnrCess },
    table11_advances: { taxable: advTaxable, igst: advIgst, cgst: advCgst, sgst: advSgst, cess: advCess },
    table12_hsn: { records: hsnRecords || (totalTaxable > 0 ? 1 : 0), taxable: hsnTaxable || totalTaxable, igst: hsnIgst || totalIgst, cgst: hsnCgst || totalCgst, sgst: hsnSgst || totalSgst, cess: hsnCess || totalCess },
    table13_documents: { netIssued: docsIssued || (b2bRecords + b2csRecords) || (totalTaxable > 0 ? 50 : 0) },
    totalLiability: {
      taxable: totalTaxable,
      igst: totalIgst,
      cgst: totalCgst,
      sgst: totalSgst,
      cess: totalCess,
      totalTax: outputTax,
    },
  };

  return {
    returnType: 'GSTR-1',
    period,
    periodLabel,
    financialYear,
    monthName,
    gstin,
    legalName,
    tradeName,
    arn,
    arnDate,
    filingDate: arnDate,
    status: 'FILED',
    turnover: totalTaxable,
    outputTax,
    igst: totalIgst,
    cgst: totalCgst,
    sgst: totalSgst,
    cess: totalCess,
    b2bTurnover: b2bTaxable,
    b2cTurnover: b2csTaxable || (b2bTaxable === 0 ? totalTaxable : 0),
    exportTurnover: expTaxable + sezTaxable + deTaxable,
    salesReturns: cdnrNetValue,
    rcmTaxableValue: 0,
    rcmTaxAmount: 0,
    rcmCgst: 0,
    rcmSgst: 0,
    rcmIgst: 0,
    rcmCashPaid: 0,
    rcmItcClaimed: 0,
    itcEligible: 0,
    inwardItc: { igst: 0, cgst: 0, sgst: 0, cess: 0, total: 0 },
    itcUtilized: 0,
    cashTaxPaid: 0,
    gstr1Tables,
    rawText: text,
  };
}

/**
 * Universal PDF return parser that automatically detects GSTR-1 vs GSTR-3B
 * and produces a NormalizedGstPeriodUpdate for dashboard consumption.
 */
export function convertPdfTextToGstUpdate(
  rawText: string,
  existingPeriodData?: Record<string, unknown>
): NormalizedGstPeriodUpdate {
  const isGstr1 = /FORM GSTR-1/i.test(rawText) || /Details of outward supplies/i.test(rawText);
  const isGstr3b = /Form GSTR-3B/i.test(rawText) || /Eligible ITC/i.test(rawText) || /Table 3\.1/i.test(rawText);

  const returnType: 'GSTR-1' | 'GSTR-3B' = isGstr1 && !isGstr3b ? 'GSTR-1' : 'GSTR-3B';
  const extracted = returnType === 'GSTR-1' ? parseGstr1Pdf(rawText) : parseGstr3bPdf(rawText);

  // Preserve existing fields if available
  const existingGstr1 = (existingPeriodData?.gstr1 || {}) as Record<string, unknown>;
  const existingGstr3b = (existingPeriodData?.gstr3b || {}) as Record<string, unknown>;
  const existingSales = (existingPeriodData?.sales || {}) as Record<string, unknown>;
  const existingItc = (existingPeriodData?.itc || {}) as Record<string, unknown>;
  const existingRcm = (existingPeriodData?.rcm || {}) as Record<string, unknown>;

  const period = extracted.period;
  const periodLabel = extracted.periodLabel;

  // Construct normalized update payload
  if (returnType === 'GSTR-1') {
    const updatedSales = {
      ...existingSales,
      taxableSales: extracted.turnover,
      outputTax: extracted.outputTax,
      igst: extracted.igst,
      cgst: extracted.cgst,
      sgst: extracted.sgst,
      cess: extracted.cess,
      b2bTurnover: extracted.b2bTurnover,
      b2cTurnover: extracted.b2cTurnover,
      exportTurnover: extracted.exportTurnover,
      period,
    };

    const updatedGstr1 = {
      ...existingGstr1,
      arn: extracted.arn || existingGstr1.arn || 'ARN-VERIFIED',
      arnDate: extracted.arnDate || toIsoDateString(existingGstr1.arnDate) || new Date().toISOString().split('T')[0],
      filingDate: extracted.filingDate || extracted.arnDate || toIsoDateString(existingGstr1.filingDate) || new Date().toISOString().split('T')[0],
      status: 'FILED',
      taxableSales: extracted.turnover,
      totalTax: extracted.outputTax,
      igst: extracted.igst,
      cgst: extracted.cgst,
      sgst: extracted.sgst,
      cess: extracted.cess,
      b2bTurnover: extracted.b2bTurnover,
      b2cTurnover: extracted.b2cTurnover,
      gstr1Tables: extracted.gstr1Tables || existingGstr1.gstr1Tables,
    };

    return {
      period,
      periodLabel,
      returnType: 'GSTR-1',
      sales: updatedSales,
      purchases: (existingPeriodData?.purchases || {}) as Record<string, unknown>,
      itc: existingItc,
      gstr1: updatedGstr1,
      gstr3b: existingGstr3b,
      metrics: {
        turnover: extracted.turnover,
        outputTax: extracted.outputTax,
        itcEligible: parseNumber(existingItc.total ?? existingItc.totalItc ?? existingGstr3b.itcAvailable),
        cashTaxPaid: parseNumber(existingGstr3b.cashPaid),
        creditTaxPaid: parseNumber(existingGstr3b.itcUtilized),
        arn: extracted.arn || (existingGstr1.arn as string | undefined),
        filingDate: extracted.filingDate || extracted.arnDate || toIsoDateString(existingGstr1.filingDate),
      },
    };
  }

  // GSTR-3B
  const updatedSales = {
    ...existingSales,
    taxableSales: extracted.turnover || parseNumber(existingSales.taxableSales) || parseNumber(existingGstr1.taxableSales),
    outputTax: extracted.outputTax || parseNumber(existingSales.outputTax) || parseNumber(existingGstr1.totalTax),
    igst: extracted.igst,
    cgst: extracted.cgst,
    sgst: extracted.sgst,
    cess: extracted.cess,
    period,
  };

  const updatedItc = {
    ...existingItc,
    totalItc: extracted.itcEligible,
    inwardItc: extracted.inwardItc,
    allOtherItc: extracted.allOtherItc,
    rcmItc: extracted.rcmItc,
    period,
  };

  const updatedRcm = {
    ...existingRcm,
    taxableValue: extracted.rcmTaxableValue,
    liability: {
      igst: extracted.rcmIgst,
      cgst: extracted.rcmCgst,
      sgst: extracted.rcmSgst,
      cess: 0,
      total: extracted.rcmTaxAmount,
    },
    cashPaid: extracted.rcmCashPaid,
    itcClaimed: extracted.rcmItcClaimed,
  };

  const updatedGstr3b = {
    ...existingGstr3b,
    arn: extracted.arn || existingGstr3b.arn || 'ARN-VERIFIED',
    arnDate: extracted.arnDate || toIsoDateString(existingGstr3b.arnDate) || new Date().toISOString().split('T')[0],
    filingDate: extracted.filingDate || extracted.arnDate || toIsoDateString(existingGstr3b.filingDate) || new Date().toISOString().split('T')[0],
    status: 'FILED',
    outwardTaxable: extracted.turnover,
    outwardTax: extracted.outputTax,
    outwardIgst: extracted.igst,
    outwardCgst: extracted.cgst,
    outwardSgst: extracted.sgst,
    outwardCess: extracted.cess,
    rcmTaxable: extracted.rcmTaxableValue,
    rcmIgst: extracted.rcmIgst,
    rcmCgst: extracted.rcmCgst,
    rcmSgst: extracted.rcmSgst,
    rcmTax: extracted.rcmTaxAmount,
    rcmItc: extracted.rcmItc,
    allOtherItc: extracted.allOtherItc,
    itcAvailable: extracted.itcEligible,
    inwardItc: extracted.inwardItc,
    itcUtilized: extracted.itcUtilized,
    cashPaid: extracted.rcmCashPaid,
  };

  return {
    period,
    periodLabel,
    returnType: 'GSTR-3B',
    sales: updatedSales,
    purchases: (existingPeriodData?.purchases || { taxablePurchases: extracted.rcmTaxableValue }) as Record<string, unknown>,
    itc: updatedItc,
    gstr1: existingGstr1,
    gstr3b: updatedGstr3b,
    metrics: {
      turnover: extracted.turnover || parseNumber(existingGstr1.taxableSales) || parseNumber(existingSales.taxableSales),
      outputTax: extracted.outputTax || parseNumber(existingGstr1.totalTax) || parseNumber(existingSales.outputTax),
      itcEligible: extracted.itcEligible,
      cashTaxPaid: extracted.cashTaxPaid,
      creditTaxPaid: extracted.itcUtilized,
      arn: extracted.arn || (existingGstr3b.arn as string | undefined),
      filingDate: extracted.filingDate || extracted.arnDate || toIsoDateString(existingGstr3b.filingDate),
    },
  };
}
