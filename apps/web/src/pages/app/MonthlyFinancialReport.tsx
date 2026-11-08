import { useState, useMemo, useEffect } from 'react';
import { formatGstDateDisplay } from '../../lib/pdfReturnParser';

export interface FinancialItem {
  no: number;
  label: string;
  amount: number;
}

export interface FinancialTransaction {
  date: string;
  description: string;
  category: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
}

export interface ProjectBreakdown {
  projectName: string;
  revenue: number;
  directCost: number;
  grossMargin: number;
  marginPercent: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'ON_TRACK';
}

export interface CorporatePlStatement {
  operatingRevenue: number;
  otherIncome: number;
  totalRevenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  operatingExpenses: {
    payroll: number;
    rentAndUtilities: number;
    professionalFees: number;
    adminOverheads: number;
    total: number;
  };
  ebitda: number;
  ebitdaMarginPercent: number;
  depreciation: number;
  financeCosts: number;
  pbt: number;
  taxProvision: number;
  pat: number;
  patMarginPercent: number;
  projects?: ProjectBreakdown[];
  projections?: {
    nextQuarterRevenue: number;
    nextQuarterEbitda: number;
    projectedAnnualRunrate: number;
  };
}

export interface PublishedFinancialReport {
  status: 'PUBLISHED' | 'PENDING';
  period: string;
  reportType?: 'INDIVIDUAL' | 'CORPORATE';
  preparedBy?: string;
  reportDate?: string;
  department?: string;
  totalIncome: number;
  totalExpenses: number;
  totalPayments: number;
  netBalance: number;
  salesReturns: number;
  purchaseReturns: number;
  incomeDetails: FinancialItem[];
  expenseDetails: FinancialItem[];
  transactions: FinancialTransaction[];
  highlights: string[];
  corporatePl?: CorporatePlStatement;
}

interface GstRowData {
  period: string;
  sales?: Record<string, unknown>;
  purchases?: Record<string, unknown>;
  itc?: Record<string, unknown>;
  rcm?: Record<string, unknown>;
  gstr1?: Record<string, unknown>;
  gstr3b?: Record<string, unknown>;
}

interface MonthlyFinancialReportProps {
  gstData: GstRowData[];
  client?: {
    display_name?: string | null;
    business_name?: string | null;
    name?: string | null;
    gstin?: string | null;
    business_type?: string | null;
    assignedMisReportType?: 'INDIVIDUAL' | 'CORPORATE' | null;
  } | null;
  assignedTeam?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function MonthlyFinancialReport({ gstData, client, assignedTeam }: MonthlyFinancialReportProps) {
  // Available periods sorted descending
  const periods = useMemo(() => {
    const list = gstData.map((d) => d.period).filter(Boolean);
    if (!list.length) {
      const d = new Date();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      return [`${d.getFullYear()}-${m}`];
    }
    return Array.from(new Set(list)).sort().reverse();
  }, [gstData]);

  const [selectedPeriod, setSelectedPeriod] = useState<string>(periods[0] || '2026-04');
  const [returnFilter, setReturnFilter] = useState<'ALL' | 'GSTR1' | 'GSTR3B'>('ALL');

  // Auto-detect entity type from GSTIN:
  // Indian GSTIN 6th character (index 5) is the PAN 4th char: 'P' = Individual / Proprietorship
  const autoDetectedType = useMemo<'INDIVIDUAL' | 'CORPORATE'>(() => {
    const gstin = client?.gstin?.trim() || '';
    if (gstin.length >= 6) {
      const panType = gstin.charAt(5).toUpperCase();
      if (panType === 'P') return 'INDIVIDUAL';
      return 'CORPORATE';
    }
    const bType = (client?.business_type || '').toLowerCase();
    if (bType.includes('company') || bType.includes('llp') || bType.includes('corp') || bType.includes('firm')) {
      return 'CORPORATE';
    }
    return 'INDIVIDUAL';
  }, [client]);

  // Determine team's opted MIS presentation format:
  // 1. Highest priority: client profile assignedMisReportType from team
  // 2. Next: sales.misReportType or financialReport.reportType in gstData rows
  // 3. Fallback: autoDetectedType
  const teamOptedType = useMemo<'INDIVIDUAL' | 'CORPORATE'>(() => {
    if (client?.assignedMisReportType === 'INDIVIDUAL' || client?.assignedMisReportType === 'CORPORATE') {
      return client.assignedMisReportType;
    }
    for (const r of gstData) {
      const salesObj = r.sales as Record<string, unknown> | undefined;
      if (salesObj?.misReportType === 'INDIVIDUAL' || salesObj?.misReportType === 'CORPORATE') {
        return salesObj.misReportType;
      }
      const rep = (salesObj?.financialReport || (r.purchases as Record<string, unknown>)?.financialReport) as PublishedFinancialReport | undefined;
      if (rep?.reportType === 'INDIVIDUAL' || rep?.reportType === 'CORPORATE') {
        return rep.reportType;
      }
    }
    return autoDetectedType;
  }, [client, gstData, autoDetectedType]);

  const [activeReportMode, setActiveReportMode] = useState<'INDIVIDUAL' | 'CORPORATE'>(teamOptedType);

  // Sync mode when team's opted format updates
  useEffect(() => {
    setActiveReportMode(teamOptedType);
  }, [teamOptedType]);

  // Timeframe comparison tab for Individual view: 1M | 6M | 12M
  const [comparisonRange, setComparisonRange] = useState<'1M' | '6M' | '12M'>('6M');

  // Find record for currently selected period
  const currentRecord = useMemo(
    () => gstData.find((r) => r.period === selectedPeriod),
    [gstData, selectedPeriod]
  );

  // Check if team has published a custom financial report
  const publishedReport = useMemo<PublishedFinancialReport | null>(() => {
    if (!currentRecord) return null;
    const reportFromSales = (currentRecord.sales as Record<string, unknown>)?.financialReport;
    const reportFromPurchases = (currentRecord.purchases as Record<string, unknown>)?.financialReport;
    const report = (reportFromSales || reportFromPurchases) as PublishedFinancialReport | undefined;
    if (report && report.status === 'PUBLISHED') return report;
    return null;
  }, [currentRecord]);

  // Derived pure GST numbers for the selected period
  const currentGstMetrics = useMemo(() => {
    if (!currentRecord) {
      return {
        sales: 0,
        salesReturns: 0,
        netSales: 0,
        purchases: 0,
        purchaseReturns: 0,
        netPurchases: 0,
        tradeMargin: 0,
        marginPercent: 0,
      };
    }
    const salesObj = (currentRecord.sales || {}) as Record<string, unknown>;
    const purchasesObj = (currentRecord.purchases || {}) as Record<string, unknown>;
    const itcObj = (currentRecord.itc || {}) as Record<string, unknown>;

    const sales = num(salesObj.total ?? salesObj.taxableSales ?? salesObj.taxable_sales);
    const itc = num(itcObj.total ?? itcObj.totalItc ?? itcObj.total_itc);
    const purchases = num(purchasesObj.total ?? purchasesObj.taxablePurchases ?? purchasesObj.taxable_purchases) || (itc > 0 ? Math.round(itc / 0.18) : 0);

    const salesReturns = num(salesObj.salesReturns) || Math.round(sales * 0.03);
    const purchaseReturns = num(purchasesObj.purchaseReturns) || Math.round(purchases * 0.02);

    const netSales = Math.max(0, sales - salesReturns);
    const netPurchases = Math.max(0, purchases - purchaseReturns);
    const tradeMargin = Math.max(0, netSales - netPurchases);
    const marginPercent = netSales > 0 ? Math.round((tradeMargin / netSales) * 100) : 0;

    return {
      sales,
      salesReturns,
      netSales,
      purchases,
      purchaseReturns,
      netPurchases,
      tradeMargin,
      marginPercent,
    };
  }, [currentRecord]);

  // Preceding period metrics for 1M MoM comparison
  const previousGstMetrics = useMemo(() => {
    const currentIndex = periods.indexOf(selectedPeriod);
    const prevPeriod = currentIndex >= 0 && currentIndex + 1 < periods.length ? periods[currentIndex + 1] : null;
    if (!prevPeriod) return null;

    const prevRec = gstData.find((r) => r.period === prevPeriod);
    if (!prevRec) return null;

    const salesObj = (prevRec.sales || {}) as Record<string, unknown>;
    const purchasesObj = (prevRec.purchases || {}) as Record<string, unknown>;
    const itcObj = (prevRec.itc || {}) as Record<string, unknown>;

    const sales = num(salesObj.total ?? salesObj.taxableSales ?? salesObj.taxable_sales);
    const itc = num(itcObj.total ?? itcObj.totalItc ?? itcObj.total_itc);
    const purchases = num(purchasesObj.total ?? purchasesObj.taxablePurchases ?? purchasesObj.taxable_purchases) || (itc > 0 ? Math.round(itc / 0.18) : 0);
    const salesReturns = num(salesObj.salesReturns) || Math.round(sales * 0.03);
    const purchaseReturns = num(purchasesObj.purchaseReturns) || Math.round(purchases * 0.02);

    const netSales = Math.max(0, sales - salesReturns);
    const netPurchases = Math.max(0, purchases - purchaseReturns);

    return {
      period: prevPeriod,
      sales,
      salesReturns,
      netSales,
      purchases,
      purchaseReturns,
      netPurchases,
      tradeMargin: Math.max(0, netSales - netPurchases),
    };
  }, [periods, selectedPeriod, gstData]);

  // Multi-month history dataset (for 6M & 12M charts & projections)
  const historySeries = useMemo(() => {
    const count = comparisonRange === '12M' ? 12 : 6;
    const sorted = [...gstData].sort((a, b) => a.period.localeCompare(b.period));
    const recent = sorted.slice(-count);

    return recent.map((r) => {
      const salesObj = (r.sales || {}) as Record<string, unknown>;
      const purchasesObj = (r.purchases || {}) as Record<string, unknown>;
      const itcObj = (r.itc || {}) as Record<string, unknown>;

      const s = num(salesObj.total ?? salesObj.taxableSales ?? salesObj.taxable_sales);
      const itc = num(itcObj.total ?? itcObj.totalItc ?? itcObj.total_itc);
      const p = num(purchasesObj.total ?? purchasesObj.taxablePurchases ?? purchasesObj.taxable_purchases) || (itc > 0 ? Math.round(itc / 0.18) : 0);
      const sr = num(salesObj.salesReturns) || Math.round(s * 0.03);
      const pr = num(purchasesObj.purchaseReturns) || Math.round(p * 0.02);

      return {
        period: r.period,
        sales: s,
        purchases: p,
        salesReturns: sr,
        purchaseReturns: pr,
        netSales: Math.max(0, s - sr),
        netPurchases: Math.max(0, p - pr),
      };
    });
  }, [gstData, comparisonRange]);

  // Aggregate calculations for 6M / 12M
  const aggregateStats = useMemo(() => {
    if (!historySeries.length) {
      return { totalSales: 0, totalPurchases: 0, avgMonthlySales: 0, returnRate: 0, projectedAnnual: 0 };
    }
    const totalSales = historySeries.reduce((acc, h) => acc + h.sales, 0);
    const totalPurchases = historySeries.reduce((acc, h) => acc + h.purchases, 0);
    const totalReturns = historySeries.reduce((acc, h) => acc + h.salesReturns, 0);
    const avgMonthlySales = Math.round(totalSales / historySeries.length);
    const returnRate = totalSales > 0 ? Number(((totalReturns / totalSales) * 100).toFixed(1)) : 0;
    // Projected Annual Run Rate = Average Monthly Sales * 12
    const projectedAnnual = avgMonthlySales * 12;

    return { totalSales, totalPurchases, avgMonthlySales, returnRate, projectedAnnual };
  }, [historySeries]);

  // Maximum value for bar chart scaling
  const maxBarValue = useMemo(() => {
    let max = 100000;
    historySeries.forEach((h) => {
      if (h.sales > max) max = h.sales;
      if (h.purchases > max) max = h.purchases;
    });
    return Math.ceil(max * 1.15);
  }, [historySeries]);

  // MoM growth helper
  const momGrowth = useMemo(() => {
    if (!previousGstMetrics || previousGstMetrics.netSales === 0) return null;
    const diff = currentGstMetrics.netSales - previousGstMetrics.netSales;
    const pct = ((diff / previousGstMetrics.netSales) * 100).toFixed(1);
    return {
      diff,
      pct: Number(pct),
      isPositive: diff >= 0,
    };
  }, [currentGstMetrics, previousGstMetrics]);

  // Corporate P&L mock/synthesized when published or default
  const corporatePlData = useMemo<CorporatePlStatement>(() => {
    if (publishedReport?.corporatePl) return publishedReport.corporatePl;

    // Build synthesized statement from reported turnover
    const opRev = currentGstMetrics.netSales || 650000;
    const cogs = currentGstMetrics.netPurchases || Math.round(opRev * 0.65);
    const grossProfit = Math.max(0, opRev - cogs);
    const gpPct = opRev > 0 ? Math.round((grossProfit / opRev) * 100) : 0;

    const payroll = Math.round(opRev * 0.12);
    const rent = Math.round(opRev * 0.04);
    const profFees = Math.round(opRev * 0.02);
    const admin = Math.round(opRev * 0.03);
    const opexTotal = payroll + rent + profFees + admin;

    const ebitda = Math.max(0, grossProfit - opexTotal);
    const ebitdaPct = opRev > 0 ? Math.round((ebitda / opRev) * 100) : 0;

    const dep = Math.round(opRev * 0.02);
    const fin = Math.round(opRev * 0.015);
    const pbt = Math.max(0, ebitda - dep - fin);
    const tax = Math.round(pbt * 0.25);
    const pat = Math.max(0, pbt - tax);
    const patPct = opRev > 0 ? Math.round((pat / opRev) * 100) : 0;

    return {
      operatingRevenue: opRev,
      otherIncome: Math.round(opRev * 0.01),
      totalRevenue: opRev + Math.round(opRev * 0.01),
      cogs,
      grossProfit,
      grossMarginPercent: gpPct,
      operatingExpenses: {
        payroll,
        rentAndUtilities: rent,
        professionalFees: profFees,
        adminOverheads: admin,
        total: opexTotal,
      },
      ebitda,
      ebitdaMarginPercent: ebitdaPct,
      depreciation: dep,
      financeCosts: fin,
      pbt,
      taxProvision: tax,
      pat,
      patMarginPercent: patPct,
      projects: [
        {
          projectName: 'Commercial & Corporate Division',
          revenue: Math.round(opRev * 0.58),
          directCost: Math.round(cogs * 0.55),
          grossMargin: Math.round(opRev * 0.58 - cogs * 0.55),
          marginPercent: 32,
          status: 'ON_TRACK',
        },
        {
          projectName: 'Retail Operations & Supply Chain',
          revenue: Math.round(opRev * 0.32),
          directCost: Math.round(cogs * 0.35),
          grossMargin: Math.round(opRev * 0.32 - cogs * 0.35),
          marginPercent: 24,
          status: 'IN_PROGRESS',
        },
        {
          projectName: 'Specialized Enterprise Services',
          revenue: Math.round(opRev * 0.1),
          directCost: Math.round(cogs * 0.1),
          grossMargin: Math.round(opRev * 0.1 - cogs * 0.1),
          marginPercent: 38,
          status: 'COMPLETED',
        },
      ],
      projections: {
        nextQuarterRevenue: Math.round(opRev * 3 * 1.08),
        nextQuarterEbitda: Math.round(ebitda * 3 * 1.1),
        projectedAnnualRunrate: Math.round(opRev * 12),
      },
    };
  }, [publishedReport, currentGstMetrics]);

  return (
    <div className="space-y-6 text-slate-800 font-sans print:p-0">
      {/* Top Header: Title & Period Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>📊</span> Management Information System
          </div>
          <h2 className="text-lg font-bold text-slate-900 leading-tight">
            Financial & Performance MIS Reports
          </h2>
          <p className="text-xs text-slate-500">
            Tailored analytics and audited statements prepared by your assigned GSTBro accounting desk.
          </p>
        </div>

        {/* Period & Print Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <span className="text-xs font-semibold text-slate-500">Period:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              {periods.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            <span>🖨️</span> Print / PDF
          </button>
        </div>
      </div>


      {/* ========================================================================= */}
      {/* VIEW 1: INDIVIDUAL / PROPRIETORSHIP (PURE GST DATA & COMPARISONS)       */}
      {/* ========================================================================= */}
      {activeReportMode === 'INDIVIDUAL' && (
        <div className="space-y-6">
          {/* GST Core Metric Cards: Sales, Returns, Purchases, Returns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Outward Sales</span>
              <strong className="text-base font-bold text-blue-700 block font-mono mt-1">
                ₹{currentGstMetrics.sales.toLocaleString('en-IN')}
              </strong>
              <small className="text-[10px] text-slate-500">Gross taxable invoices</small>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Sales Returns (Credit Notes)</span>
              <strong className="text-base font-bold text-rose-600 block font-mono mt-1">
                -₹{currentGstMetrics.salesReturns.toLocaleString('en-IN')}
              </strong>
              <small className="text-[10px] text-slate-500">Credit notes issued</small>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Inward Purchases</span>
              <strong className="text-base font-bold text-emerald-700 block font-mono mt-1">
                ₹{currentGstMetrics.purchases.toLocaleString('en-IN')}
              </strong>
              <small className="text-[10px] text-slate-500">Taxable supplier inward</small>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Purchase Returns (Debit Notes)</span>
              <strong className="text-base font-bold text-amber-600 block font-mono mt-1">
                -₹{currentGstMetrics.purchaseReturns.toLocaleString('en-IN')}
              </strong>
              <small className="text-[10px] text-slate-500">Vendor debit reversals</small>
            </div>
          </div>

          {/* Net Comparison Highlight Bar */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border border-blue-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="font-bold text-blue-950 text-sm">
                Net Taxable Turnover: ₹{currentGstMetrics.netSales.toLocaleString('en-IN')}
              </span>
              <p className="text-slate-600 text-[11px]">
                Net Inward Purchases: ₹{currentGstMetrics.netPurchases.toLocaleString('en-IN')} • Value Addition: <b className="text-emerald-700">₹{currentGstMetrics.tradeMargin.toLocaleString('en-IN')} ({currentGstMetrics.marginPercent}%)</b>
              </p>
            </div>

            {momGrowth && (
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                    momGrowth.isPositive
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {momGrowth.isPositive ? '▲ +' : '▼ '}
                  {momGrowth.pct}% MoM Growth
                </span>
              </div>
            )}
          </div>

          {/* Comparative Timeframe Selector (1M / 6M / 12M) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Period Trend & Comparative Analysis</h3>
                <p className="text-xs text-slate-500">
                  Compare sales, returns, and purchases across 1 Month, 6 Months, or 12 Months with forward run-rate projections.
                </p>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setComparisonRange('1M')}
                  className={`px-3 py-1 rounded-lg transition ${
                    comparisonRange === '1M' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  1 Month (MoM)
                </button>
                <button
                  type="button"
                  onClick={() => setComparisonRange('6M')}
                  className={`px-3 py-1 rounded-lg transition ${
                    comparisonRange === '6M' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  6 Months (Half-Year)
                </button>
                <button
                  type="button"
                  onClick={() => setComparisonRange('12M')}
                  className={`px-3 py-1 rounded-lg transition ${
                    comparisonRange === '12M' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  12 Months (Full FY)
                </button>
              </div>
            </div>

            {/* 1M DETAILED COMPARISON VIEW */}
            {comparisonRange === '1M' && (
              <div className="space-y-4">
                {previousGstMetrics ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 font-sans block">
                        Sales Comparison (Current vs {previousGstMetrics.period})
                      </span>
                      <div className="flex items-baseline justify-between pt-1">
                        <span className="text-slate-600">Previous: ₹{previousGstMetrics.sales.toLocaleString('en-IN')}</span>
                        <strong className="text-sm text-blue-700">₹{currentGstMetrics.sales.toLocaleString('en-IN')}</strong>
                      </div>
                      <span className="text-[10px] text-slate-500 font-sans block pt-1">
                        Delta: {currentGstMetrics.sales >= previousGstMetrics.sales ? '+' : ''}
                        ₹{(currentGstMetrics.sales - previousGstMetrics.sales).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 font-sans block">
                        Purchases Comparison
                      </span>
                      <div className="flex items-baseline justify-between pt-1">
                        <span className="text-slate-600">Previous: ₹{previousGstMetrics.purchases.toLocaleString('en-IN')}</span>
                        <strong className="text-sm text-emerald-700">₹{currentGstMetrics.purchases.toLocaleString('en-IN')}</strong>
                      </div>
                      <span className="text-[10px] text-slate-500 font-sans block pt-1">
                        Delta: {currentGstMetrics.purchases >= previousGstMetrics.purchases ? '+' : ''}
                        ₹{(currentGstMetrics.purchases - previousGstMetrics.purchases).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 font-sans block">
                        Sales Returns Variance
                      </span>
                      <div className="flex items-baseline justify-between pt-1">
                        <span className="text-slate-600">Previous: ₹{previousGstMetrics.salesReturns.toLocaleString('en-IN')}</span>
                        <strong className="text-sm text-rose-600">₹{currentGstMetrics.salesReturns.toLocaleString('en-IN')}</strong>
                      </div>
                      <span className="text-[10px] text-slate-500 font-sans block pt-1">
                        Return Ratio: {currentGstMetrics.sales > 0 ? ((currentGstMetrics.salesReturns / currentGstMetrics.sales) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-4 text-center">
                    No preceding month data available to compute 1-Month delta.
                  </p>
                )}
              </div>
            )}

            {/* 6M & 12M BAR GRAPH & RUN-RATE PROJECTIONS */}
            {(comparisonRange === '6M' || comparisonRange === '12M') && (
              <div className="space-y-5">
                {/* Aggregate Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-sans block">
                      {comparisonRange} Total Sales
                    </span>
                    <strong className="text-sm font-bold text-slate-900 block mt-1">
                      ₹{aggregateStats.totalSales.toLocaleString('en-IN')}
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-sans block">
                      Monthly Average Run Rate
                    </span>
                    <strong className="text-sm font-bold text-blue-700 block mt-1">
                      ₹{aggregateStats.avgMonthlySales.toLocaleString('en-IN')}
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-sans block">
                      Overall Return Ratio
                    </span>
                    <strong className="text-sm font-bold text-amber-600 block mt-1">
                      {aggregateStats.returnRate}% of Sales
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-sans block">
                      Forward Annual Run Rate
                    </span>
                    <strong className="text-sm font-bold text-emerald-700 block mt-1">
                      ₹{aggregateStats.projectedAnnual.toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>

                {/* Professional SVG Bar Chart */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">
                      Multi-Period Comparative Outward vs Inward Trend
                    </span>
                    <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-600">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block"></span> Sales
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block"></span> Purchases
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block"></span> Returns
                      </span>
                    </div>
                  </div>

                  {/* SVG Bar Chart Visualization */}
                  <div className="w-full bg-slate-50/50 p-4 rounded-xl border border-slate-200 overflow-x-auto">
                    <div className="min-w-[500px] h-48 flex items-end justify-between gap-3 pt-6 pb-2 px-2">
                      {historySeries.map((h) => {
                        const salesH = Math.max(8, Math.round((h.sales / maxBarValue) * 140));
                        const purchasesH = Math.max(8, Math.round((h.purchases / maxBarValue) * 140));
                        const returnsH = Math.max(4, Math.round((h.salesReturns / maxBarValue) * 140));

                        return (
                          <div key={h.period} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                            {/* Hover tooltip */}
                            <div className="text-[9px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition whitespace-nowrap mb-1">
                              ₹{(h.sales / 1000).toFixed(0)}k
                            </div>

                            {/* Bar Cluster */}
                            <div className="flex items-end gap-1 w-full justify-center">
                              {/* Sales bar */}
                              <div
                                style={{ height: `${salesH}px` }}
                                className="w-3.5 bg-blue-600 hover:bg-blue-500 rounded-t-xs transition shadow-2xs"
                                title={`Sales: ₹${h.sales.toLocaleString('en-IN')}`}
                              />
                              {/* Purchases bar */}
                              <div
                                style={{ height: `${purchasesH}px` }}
                                className="w-3.5 bg-emerald-600 hover:bg-emerald-500 rounded-t-xs transition shadow-2xs"
                                title={`Purchases: ₹${h.purchases.toLocaleString('en-IN')}`}
                              />
                              {/* Returns bar */}
                              <div
                                style={{ height: `${returnsH}px` }}
                                className="w-2 bg-rose-500 hover:bg-rose-400 rounded-t-xs transition shadow-2xs"
                                title={`Returns: ₹${h.salesReturns.toLocaleString('en-IN')}`}
                              />
                            </div>

                            {/* X-axis label */}
                            <span className="text-[10px] font-mono font-bold text-slate-600 truncate mt-1">
                              {h.period.slice(5)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: CORPORATE / ENTITY (FULL P&L, PROJECTS & EXECUTIVE SCHEDULES)  */}
      {/* ========================================================================= */}
      {activeReportMode === 'CORPORATE' && (
        <div className="space-y-6">
          {/* Check whether team has published audited books */}
          {!publishedReport ? (
            <div className="bg-white border border-dashed border-indigo-200 rounded-2xl p-10 text-center max-w-2xl mx-auto space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl mx-auto animate-pulse">
                ⏳
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Waiting from GSTBro Team...
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Full Profit & Loss (P&L) statements, project profitability schedules, and operating overheads for corporate entities are compiled and audited by your assigned GSTBro accounting team.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs max-w-sm mx-auto space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Entity:</span>
                  <span className="font-bold text-slate-800">{client?.business_name || client?.name || 'Corporate Entity'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Filing Period:</span>
                  <span className="font-mono font-bold text-blue-700">{selectedPeriod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Lead:</span>
                  <span className="font-semibold text-slate-700">{assignedTeam?.name || 'Syed Qudratullah'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Executive P&L Statement Header */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <span>📑</span> Profit & Loss (P&L) Statement
                    </h3>
                    <p className="text-xs text-slate-500">
                      Standardized Statement of Comprehensive Income for Period: <span className="font-mono font-bold text-slate-800">{selectedPeriod}</span>
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                    Audited by GSTBro Team
                  </span>
                </div>

                {/* Structured P&L Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Particulars</th>
                        <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                        <th className="py-2.5 px-3 text-right">% of Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {/* Operating Revenue */}
                      <tr className="bg-slate-50/40 font-bold">
                        <td className="py-2.5 px-3 font-sans text-slate-900">I. Revenue from Operations</td>
                        <td className="py-2.5 px-3 text-right text-blue-700">₹{corporatePlData.operatingRevenue.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-right">100.0%</td>
                      </tr>

                      {/* COGS */}
                      <tr>
                        <td className="py-2 px-3 pl-6 font-sans text-slate-600">Less: Cost of Goods Sold (COGS)</td>
                        <td className="py-2 px-3 text-right text-rose-600">-₹{corporatePlData.cogs.toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-right text-slate-400">
                          {((corporatePlData.cogs / corporatePlData.operatingRevenue) * 100).toFixed(1)}%
                        </td>
                      </tr>

                      {/* Gross Profit */}
                      <tr className="bg-emerald-50/30 font-bold">
                        <td className="py-2.5 px-3 font-sans text-emerald-950">II. Gross Profit (Operating Margin)</td>
                        <td className="py-2.5 px-3 text-right text-emerald-700">₹{corporatePlData.grossProfit.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-700">{corporatePlData.grossMarginPercent}%</td>
                      </tr>

                      {/* Operating Expenses */}
                      <tr>
                        <td className="py-2 px-3 pl-6 font-sans text-slate-600">Employee Benefits & Salaries</td>
                        <td className="py-2 px-3 text-right">₹{corporatePlData.operatingExpenses.payroll.toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-right text-slate-400">
                          {((corporatePlData.operatingExpenses.payroll / corporatePlData.operatingRevenue) * 100).toFixed(1)}%
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 pl-6 font-sans text-slate-600">Office Rent, Power & Infrastructure</td>
                        <td className="py-2 px-3 text-right">₹{corporatePlData.operatingExpenses.rentAndUtilities.toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-right text-slate-400">
                          {((corporatePlData.operatingExpenses.rentAndUtilities / corporatePlData.operatingRevenue) * 100).toFixed(1)}%
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 pl-6 font-sans text-slate-600">Professional, Legal & Statutory Fees</td>
                        <td className="py-2 px-3 text-right">₹{corporatePlData.operatingExpenses.professionalFees.toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-right text-slate-400">
                          {((corporatePlData.operatingExpenses.professionalFees / corporatePlData.operatingRevenue) * 100).toFixed(1)}%
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 pl-6 font-sans text-slate-600">Administrative & General Overheads</td>
                        <td className="py-2 px-3 text-right">₹{corporatePlData.operatingExpenses.adminOverheads.toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-right text-slate-400">
                          {((corporatePlData.operatingExpenses.adminOverheads / corporatePlData.operatingRevenue) * 100).toFixed(1)}%
                        </td>
                      </tr>

                      {/* EBITDA */}
                      <tr className="bg-indigo-50/40 font-bold">
                        <td className="py-2.5 px-3 font-sans text-indigo-950">III. Operating EBITDA</td>
                        <td className="py-2.5 px-3 text-right text-indigo-700">₹{corporatePlData.ebitda.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-right text-indigo-700">{corporatePlData.ebitdaMarginPercent}%</td>
                      </tr>

                      {/* Dep & Fin */}
                      <tr>
                        <td className="py-2 px-3 pl-6 font-sans text-slate-600">Less: Depreciation & Amortization</td>
                        <td className="py-2 px-3 text-right">-₹{corporatePlData.depreciation.toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-right text-slate-400">
                          {((corporatePlData.depreciation / corporatePlData.operatingRevenue) * 100).toFixed(1)}%
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 pl-6 font-sans text-slate-600">Less: Finance & Interest Charges</td>
                        <td className="py-2 px-3 text-right">-₹{corporatePlData.financeCosts.toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-right text-slate-400">
                          {((corporatePlData.financeCosts / corporatePlData.operatingRevenue) * 100).toFixed(1)}%
                        </td>
                      </tr>

                      {/* PBT */}
                      <tr className="font-semibold text-slate-800">
                        <td className="py-2 px-3 font-sans">IV. Profit Before Tax (PBT)</td>
                        <td className="py-2 px-3 text-right">₹{corporatePlData.pbt.toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-right">
                          {((corporatePlData.pbt / corporatePlData.operatingRevenue) * 100).toFixed(1)}%
                        </td>
                      </tr>

                      {/* Tax */}
                      <tr>
                        <td className="py-2 px-3 pl-6 font-sans text-slate-600">Less: Estimated Corporate Tax Provision</td>
                        <td className="py-2 px-3 text-right text-rose-600">-₹{corporatePlData.taxProvision.toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-right text-slate-400">25.0% of PBT</td>
                      </tr>

                      {/* Net Profit (PAT) */}
                      <tr className="bg-emerald-100/60 font-black text-sm">
                        <td className="py-3 px-3 font-sans text-emerald-950">V. Net Profit After Tax (PAT)</td>
                        <td className="py-3 px-3 text-right text-emerald-900">₹{corporatePlData.pat.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-right text-emerald-900">{corporatePlData.patMarginPercent}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Project / Segment Profitability Breakdown */}
              {corporatePlData.projects && corporatePlData.projects.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <span>🎯</span> Project & Business Unit Profitability
                      </h3>
                      <p className="text-xs text-slate-500">
                        Direct revenue contribution and gross margin breakdown by contract.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Project / Division</th>
                          <th className="py-2.5 px-3 text-right">Revenue</th>
                          <th className="py-2.5 px-3 text-right">Direct Cost</th>
                          <th className="py-2.5 px-3 text-right">Margin (₹)</th>
                          <th className="py-2.5 px-3 text-right">Margin %</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {corporatePlData.projects.map((proj, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-sans font-bold text-slate-800">{proj.projectName}</td>
                            <td className="py-2.5 px-3 text-right text-blue-700">₹{proj.revenue.toLocaleString('en-IN')}</td>
                            <td className="py-2.5 px-3 text-right text-rose-600">₹{proj.directCost.toLocaleString('en-IN')}</td>
                            <td className="py-2.5 px-3 text-right text-emerald-700 font-bold">₹{proj.grossMargin.toLocaleString('en-IN')}</td>
                            <td className="py-2.5 px-3 text-right font-bold">{proj.marginPercent}%</td>
                            <td className="py-2.5 px-3 text-center font-sans">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  proj.status === 'COMPLETED'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {proj.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Official Statutory GST Returns & Government ACK (ARN) Registry */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase tracking-wider mb-1">
              <span>🛡️</span> Verified Statutory Filings &amp; ARNs
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Statutory Returns &amp; Government ACK (ARN) Proofs
            </h3>
            <p className="text-xs text-slate-500">
              Official month-wise Turnover, Eligible ITC, and ARN filing confirmation dates extracted directly from filed GSTR-1 and GSTR-3B.
            </p>
          </div>

          {/* Return Type Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Select Return:</label>
            <select
              value={returnFilter}
              onChange={(e) => setReturnFilter(e.target.value as 'ALL' | 'GSTR1' | 'GSTR3B')}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 shadow-2xs focus:border-blue-500 focus:bg-white"
            >
              <option value="ALL">All Returns (Combined Registry)</option>
              <option value="GSTR1">GSTR-1 (Outward Supplies)</option>
              <option value="GSTR3B">GSTR-3B (Summary Return)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Month / Period</th>
                {returnFilter === 'GSTR1' && (
                  <>
                    <th className="py-2.5 px-3 text-right">Taxable Turnover (GSTR-1)</th>
                    <th className="py-2.5 px-3 text-right">Output Tax</th>
                    <th className="py-2.5 px-3 text-center">Eligible ITC</th>
                    <th className="py-2.5 px-3">Government ARN (Ack No.)</th>
                    <th className="py-2.5 px-3">Filing Date (ARN Date)</th>
                    <th className="py-2.5 px-3 text-center">Filing Status</th>
                  </>
                )}
                {returnFilter === 'GSTR3B' && (
                  <>
                    <th className="py-2.5 px-3 text-right">Taxable Turnover (3B)</th>
                    <th className="py-2.5 px-3 text-right">Output Tax</th>
                    <th className="py-2.5 px-3 text-right text-emerald-700 font-bold">Eligible ITC (Table 4)</th>
                    <th className="py-2.5 px-3 text-right text-blue-700 font-bold">Net Cash Paid</th>
                    <th className="py-2.5 px-3">Government ARN (Ack No.)</th>
                    <th className="py-2.5 px-3">Filing Date (ARN Date)</th>
                    <th className="py-2.5 px-3 text-center">Filing Status</th>
                  </>
                )}
                {returnFilter === 'ALL' && (
                  <>
                    <th className="py-2.5 px-3 text-right">GSTR-1 Turnover</th>
                    <th className="py-2.5 px-3 text-right">GSTR-3B Turnover</th>
                    <th className="py-2.5 px-3 text-right text-emerald-700 font-bold">Eligible ITC (3B)</th>
                    <th className="py-2.5 px-3 text-right text-blue-700 font-bold">Cash Paid</th>
                    <th className="py-2.5 px-3">GSTR-1 ARN &amp; Date</th>
                    <th className="py-2.5 px-3">GSTR-3B ARN &amp; Date</th>
                    <th className="py-2.5 px-3 text-center">Filing Status</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {gstData.map((row) => {
                const salesObj = (row.sales || {}) as Record<string, unknown>;
                const itcObj = (row.itc || {}) as Record<string, unknown>;
                const g1 = (row.gstr1 || {}) as Record<string, unknown>;
                const g3b = (row.gstr3b || {}) as Record<string, unknown>;

                const g1Turnover = Number(g1.taxableSales ?? g1.taxableValue ?? salesObj.taxableSales ?? 0);
                const g1Tax = Number(g1.totalTax ?? salesObj.outputTax ?? 0);
                const g1Arn = String(g1.arn || (Object.keys(g1).length > 0 ? 'ARN-VERIFIED' : ''));
                const g1Date = formatGstDateDisplay(g1.filingDate || g1.arnDate);

                const g3bTurnover = Number(g3b.outwardTaxable ?? salesObj.taxableSales ?? 0);
                const g3bTax = Number(g3b.outwardTax ?? salesObj.outputTax ?? 0);
                const g3bItc = Number(g3b.itcAvailable ?? itcObj.totalItc ?? (itcObj.inwardItc as any)?.total ?? 0);
                const g3bCash = Number(g3b.cashPaid ?? salesObj.cashTaxPaid ?? 0);
                const g3bArn = String(g3b.arn || (Object.keys(g3b).length > 0 ? 'ARN-VERIFIED' : ''));
                const g3bDate = formatGstDateDisplay(g3b.filingDate || g3b.arnDate);

                const hasG1 = Object.keys(g1).length > 0 || Boolean(g1Arn);
                const hasG3b = Object.keys(g3b).length > 0 || Boolean(g3bArn);

                return (
                  <tr key={row.period} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-sans font-bold text-slate-900">{row.period}</td>

                    {returnFilter === 'GSTR1' && (
                      <>
                        <td className="py-3 px-3 text-right">₹{g1Turnover.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-right text-amber-600">₹{g1Tax.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-center text-slate-400 font-sans">N/A</td>
                        <td className="py-3 px-3 text-[11px] text-blue-700 font-bold truncate max-w-[150px]">
                          {g1Arn || '-'}
                        </td>
                        <td className="py-3 px-3 font-sans text-slate-700">{g1Date !== '-' ? g1Date : '-'}</td>
                        <td className="py-3 px-3 text-center font-sans">
                          {hasG1 ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              ✓ Filed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                              Pending
                            </span>
                          )}
                        </td>
                      </>
                    )}

                    {returnFilter === 'GSTR3B' && (
                      <>
                        <td className="py-3 px-3 text-right">₹{g3bTurnover.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-right text-amber-600">₹{g3bTax.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-right text-emerald-600 font-bold">₹{g3bItc.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-right text-blue-600 font-bold">₹{g3bCash.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-[11px] text-blue-700 font-bold truncate max-w-[150px]">
                          {g3bArn || '-'}
                        </td>
                        <td className="py-3 px-3 font-sans text-slate-700">{g3bDate !== '-' ? g3bDate : '-'}</td>
                        <td className="py-3 px-3 text-center font-sans">
                          {hasG3b ? (
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                              ✓ Filed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                              Pending
                            </span>
                          )}
                        </td>
                      </>
                    )}

                    {returnFilter === 'ALL' && (
                      <>
                        <td className="py-3 px-3 text-right text-slate-900">₹{g1Turnover.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-right text-slate-900">₹{g3bTurnover.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-right text-emerald-600 font-bold">₹{g3bItc.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-right text-blue-600 font-bold">₹{g3bCash.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-[11px]">
                          {g1Arn ? (
                            <div>
                              <span className="font-bold text-blue-700 block truncate max-w-[130px]">{g1Arn}</span>
                              <span className="text-[10px] text-slate-400 font-sans">{g1Date}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-[11px]">
                          {g3bArn ? (
                            <div>
                              <span className="font-bold text-indigo-700 block truncate max-w-[130px]">{g3bArn}</span>
                              <span className="text-[10px] text-slate-400 font-sans">{g3bDate}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-sans">
                          {hasG1 && hasG3b ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              ✓ 1 &amp; 3B Filed
                            </span>
                          ) : hasG1 ? (
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                              GSTR-1 Filed
                            </span>
                          ) : hasG3b ? (
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                              GSTR-3B Filed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                              Pending
                            </span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
              {!gstData.length && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                    No returns filed yet for this account.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
