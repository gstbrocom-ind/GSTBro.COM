// ============================================================================
// GST Bro — Electronic Credit Ledger (ITC) & Reverse Charge (RCM) Engine
// Compliant with Section 49 & CGST Rules 85, 86, 88A (Indian GST Law)
// ============================================================================

export interface ItcBreakdown {
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  total: number;
}

export interface RcmDetails {
  taxableValue: number;
  liability: ItcBreakdown;
  cashPaid: number;
  itcClaimed: number;
}

export interface PeriodItcLedger {
  period: string;
  openingItc: ItcBreakdown;
  inwardItc: ItcBreakdown;
  rcm: RcmDetails;
  totalAvailableItc: number;
  outputTaxLiability: number;
  itcUtilized: number;
  closingItc: ItcBreakdown;
  netCashPayable: number;
  status: 'RECONCILED' | 'PROVISIONAL';
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
};

export function createEmptyBreakdown(): ItcBreakdown {
  return { igst: 0, cgst: 0, sgst: 0, cess: 0, total: 0 };
}

export function sumBreakdown(b?: Partial<ItcBreakdown> | null): ItcBreakdown {
  const igst = num(b?.igst);
  const cgst = num(b?.cgst);
  const sgst = num(b?.sgst);
  const cess = num(b?.cess);
  const total = num(b?.total) || (igst + cgst + sgst + cess);
  return { igst, cgst, sgst, cess, total };
}

export interface RawPeriodGstData {
  period: string;
  sales?: Record<string, unknown>;
  purchases?: Record<string, unknown>;
  itc?: Record<string, unknown>;
  rcm?: Record<string, unknown>;
  gstr1?: Record<string, unknown>;
  gstr3b?: Record<string, unknown>;
}

/**
 * Calculates running Electronic Credit Ledger (ITC) across all months.
 * Subsequent periods automatically carry forward previous month's closing ITC as opening ITC.
 */
export function calculateMultiPeriodItcLedger(
  records: RawPeriodGstData[],
  defaultOpeningItc?: Partial<ItcBreakdown>
): PeriodItcLedger[] {
  if (!records.length) return [];

  // Sort periods ascending (e.g. 2026-04 before 2026-05)
  const sorted = [...records].sort((a, b) => a.period.localeCompare(b.period));

  const result: PeriodItcLedger[] = [];
  let previousClosing: ItcBreakdown = sumBreakdown(defaultOpeningItc);

  for (let i = 0; i < sorted.length; i++) {
    const row = sorted[i];
    const itcObj = (row.itc || {}) as Record<string, unknown>;
    const salesObj = (row.sales || {}) as Record<string, unknown>;
    const gstr3bObj = (row.gstr3b || {}) as Record<string, unknown>;

    // 1. Opening ITC:
    // If explicitly set for this period (e.g., April start of financial year or initial entry), use it.
    // Otherwise automatically carry forward previous period's closing ITC balance.
    const rowOpening = (itcObj.openingItc || itcObj.opening || itcObj.openingBalance) as Partial<ItcBreakdown> | undefined;
    const openingItc: ItcBreakdown = rowOpening && (rowOpening.total ?? 0) > 0
      ? sumBreakdown(rowOpening)
      : (i === 0 && rowOpening ? sumBreakdown(rowOpening) : previousClosing);

    // 2. Inward ITC from GSTR-3B (Eligible ITC Table 4)
    const inwardBreakdown = (
      gstr3bObj.inwardItc ||
      gstr3bObj.allOtherItc ||
      itcObj.inwardItc ||
      itcObj.breakdown
    ) as Partial<ItcBreakdown> | undefined;

    const rawTotalItc = num(
      gstr3bObj.itcAvailable ??
      gstr3bObj.eligibleItc ??
      (gstr3bObj.itcNet as Record<string, unknown>)?.total ??
      itcObj.totalItc ??
      itcObj.total ??
      itcObj.total_itc
    );

    const inwardItc: ItcBreakdown = inwardBreakdown && (inwardBreakdown.total ?? (num(inwardBreakdown.igst) + num(inwardBreakdown.cgst) + num(inwardBreakdown.sgst))) > 0
      ? sumBreakdown(inwardBreakdown)
      : {
          igst: Math.round(rawTotalItc * 0.4),
          cgst: Math.round(rawTotalItc * 0.3),
          sgst: Math.round(rawTotalItc * 0.3),
          cess: 0,
          total: rawTotalItc,
        };

    // 3. GST on Sales (Output Tax Liability from GSTR-3B / Sales Register)
    const salesTaxComponentSum = num(salesObj.igst) + num(salesObj.cgst) + num(salesObj.sgst) + num(salesObj.cess);
    const gstr3bTaxComponentSum = num(gstr3bObj.igst) + num(gstr3bObj.cgst) + num(gstr3bObj.sgst) + num(gstr3bObj.cess);

    const outputTaxLiability = num(
      gstr3bObj.outwardTax ??
      gstr3bObj.outwardTotalTax ??
      salesObj.outputTax ??
      salesObj.gstAmount ??
      salesObj.output_tax ??
      (gstr3bTaxComponentSum > 0 ? gstr3bTaxComponentSum : (salesTaxComponentSum > 0 ? salesTaxComponentSum : 0))
    );

    // 4. Total Available ITC = Opening Balance + Inward ITC from GSTR-3B
    const totalAvailableItc = openingItc.total + inwardItc.total;

    // 5. Deducting GST on Sales: ITC Offset against Output Tax Liability
    const itcUtilized = Math.min(outputTaxLiability, totalAvailableItc);

    // 6. Net Cash Tax Payable: if Output Tax exceeds Available ITC, balance paid in cash (PMT-06)
    const netCashPayable = Math.max(0, outputTaxLiability - totalAvailableItc);

    // 7. Closing ITC Balance: carried forward to next month
    const closingTotal = Math.max(0, totalAvailableItc - itcUtilized);
    const ratio = totalAvailableItc > 0 ? closingTotal / totalAvailableItc : 0;
    const closingItc: ItcBreakdown = {
      igst: Math.round((openingItc.igst + inwardItc.igst) * ratio),
      cgst: Math.round((openingItc.cgst + inwardItc.cgst) * ratio),
      sgst: Math.round((openingItc.sgst + inwardItc.sgst) * ratio),
      cess: Math.round((openingItc.cess + inwardItc.cess) * ratio),
      total: closingTotal,
    };

    // Carry forward closing ITC to next period's opening
    previousClosing = closingItc;

    // Maintain RCM structure for backward compatibility without cluttering
    const rcmObj = (row.rcm || itcObj.rcm || {}) as Record<string, unknown>;
    const rcmTaxable = num(rcmObj.taxableValue ?? rcmObj.taxable_value);
    const rcm: RcmDetails = {
      taxableValue: rcmTaxable,
      liability: createEmptyBreakdown(),
      cashPaid: num(rcmObj.cashPaid),
      itcClaimed: num(rcmObj.itcClaimed),
    };

    result.push({
      period: row.period,
      openingItc,
      inwardItc,
      rcm,
      totalAvailableItc,
      outputTaxLiability,
      itcUtilized,
      closingItc,
      netCashPayable,
      status: (row.gstr3b || inwardItc.total > 0) ? 'RECONCILED' : 'PROVISIONAL',
    });
  }

  // Return in descending order (latest period first) for dashboard views
  return result.reverse();
}
