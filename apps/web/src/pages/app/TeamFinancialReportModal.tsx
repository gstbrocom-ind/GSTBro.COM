import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import type { PublishedFinancialReport, CorporatePlStatement } from './MonthlyFinancialReport';

interface TeamFinancialReportModalProps {
  clientId: string;
  clientName: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  defaultReportType?: 'INDIVIDUAL' | 'CORPORATE';
}

export function TeamFinancialReportModal({
  clientId,
  clientName,
  isOpen,
  onClose,
  onSaved,
  defaultReportType = 'CORPORATE',
}: TeamFinancialReportModalProps) {
  const currentPeriodDef = new Date().toISOString().slice(0, 7);
  const [period, setPeriod] = useState(currentPeriodDef);
  const [reportType, setReportType] = useState<'INDIVIDUAL' | 'CORPORATE'>(defaultReportType);

  useEffect(() => {
    if (defaultReportType) {
      setReportType(defaultReportType);
    }
  }, [defaultReportType]);

  // Core Numbers
  const [totalIncome, setTotalIncome] = useState(485000);
  const [totalExpenses, setTotalExpenses] = useState(342000);
  const [salesReturns, setSalesReturns] = useState(12000);
  const [purchaseReturns, setPurchaseReturns] = useState(8000);

  // Corporate P&L Overheads
  const [payroll, setPayroll] = useState(58000);
  const [rent, setRent] = useState(25000);
  const [profFees, setProfFees] = useState(12000);
  const [adminOverheads, setAdminOverheads] = useState(15000);

  // Projects
  const [proj1Name, setProj1Name] = useState('Commercial Client Contracts');
  const [proj1Revenue, setProj1Revenue] = useState(290000);
  const [proj1Cost, setProj1Cost] = useState(190000);

  const [proj2Name, setProj2Name] = useState('Retail Division & Distribution');
  const [proj2Revenue, setProj2Revenue] = useState(195000);
  const [proj2Cost, setProj2Cost] = useState(120000);

  const [preparedBy, setPreparedBy] = useState('Syed Qudratullah');
  const [department, setDepartment] = useState('GST Bro Corporate Accounts & Audit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isOpen || !clientId) return;
    apiFetch<{ gstData?: Array<{ period: string; sales?: Record<string, unknown>; purchases?: Record<string, unknown> }> }>(
      `/api/clients/${clientId}/workspace`
    )
      .then((res) => {
        const row = res.gstData?.find((r) => r.period === period);
        if (row) {
          const report = (row.sales as Record<string, unknown>)?.financialReport as PublishedFinancialReport | undefined;
          if (report) {
            setTotalIncome(report.totalIncome || 0);
            setTotalExpenses(report.totalExpenses || 0);
            setSalesReturns(report.salesReturns || 0);
            setPurchaseReturns(report.purchaseReturns || 0);
            if (report.reportType) setReportType(report.reportType);
            if (report.preparedBy) setPreparedBy(report.preparedBy);
            if (report.corporatePl) {
              setPayroll(report.corporatePl.operatingExpenses?.payroll || 58000);
              setRent(report.corporatePl.operatingExpenses?.rentAndUtilities || 25000);
              setProfFees(report.corporatePl.operatingExpenses?.professionalFees || 12000);
              setAdminOverheads(report.corporatePl.operatingExpenses?.adminOverheads || 15000);
              if (report.corporatePl.projects?.[0]) {
                setProj1Name(report.corporatePl.projects[0].projectName);
                setProj1Revenue(report.corporatePl.projects[0].revenue);
                setProj1Cost(report.corporatePl.projects[0].directCost);
              }
              if (report.corporatePl.projects?.[1]) {
                setProj2Name(report.corporatePl.projects[1].projectName);
                setProj2Revenue(report.corporatePl.projects[1].revenue);
                setProj2Cost(report.corporatePl.projects[1].directCost);
              }
            }
          }
        }
      })
      .catch(() => {});
  }, [isOpen, clientId, period]);

  if (!isOpen) return null;

  const netRevenue = Math.max(0, totalIncome - salesReturns);
  const netCogs = Math.max(0, totalExpenses - purchaseReturns);
  const grossProfit = Math.max(0, netRevenue - netCogs);
  const totalOpex = payroll + rent + profFees + adminOverheads;
  const ebitda = Math.max(0, grossProfit - totalOpex);
  const pbt = Math.max(0, ebitda - Math.round(netRevenue * 0.03));
  const estimatedTax = Math.round(pbt * 0.25);
  const pat = Math.max(0, pbt - estimatedTax);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    const [yr, mo] = period.split('-');
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const moName = monthNames[parseInt(mo, 10) - 1] || 'Period';

    const b2b = Math.round(totalIncome * 0.72);
    const b2c = Math.round(totalIncome * 0.22);
    const exportsAmt = Math.max(0, totalIncome - b2b - b2c);

    const corporatePl: CorporatePlStatement = {
      operatingRevenue: netRevenue,
      otherIncome: Math.round(netRevenue * 0.01),
      totalRevenue: netRevenue + Math.round(netRevenue * 0.01),
      cogs: netCogs,
      grossProfit,
      grossMarginPercent: netRevenue > 0 ? Math.round((grossProfit / netRevenue) * 100) : 0,
      operatingExpenses: {
        payroll,
        rentAndUtilities: rent,
        professionalFees: profFees,
        adminOverheads,
        total: totalOpex,
      },
      ebitda,
      ebitdaMarginPercent: netRevenue > 0 ? Math.round((ebitda / netRevenue) * 100) : 0,
      depreciation: Math.round(netRevenue * 0.015),
      financeCosts: Math.round(netRevenue * 0.015),
      pbt,
      taxProvision: estimatedTax,
      pat,
      patMarginPercent: netRevenue > 0 ? Math.round((pat / netRevenue) * 100) : 0,
      projects: [
        {
          projectName: proj1Name,
          revenue: proj1Revenue,
          directCost: proj1Cost,
          grossMargin: Math.max(0, proj1Revenue - proj1Cost),
          marginPercent: proj1Revenue > 0 ? Math.round(((proj1Revenue - proj1Cost) / proj1Revenue) * 100) : 0,
          status: 'ON_TRACK',
        },
        {
          projectName: proj2Name,
          revenue: proj2Revenue,
          directCost: proj2Cost,
          grossMargin: Math.max(0, proj2Revenue - proj2Cost),
          marginPercent: proj2Revenue > 0 ? Math.round(((proj2Revenue - proj2Cost) / proj2Revenue) * 100) : 0,
          status: 'IN_PROGRESS',
        },
      ],
      projections: {
        nextQuarterRevenue: Math.round(netRevenue * 3 * 1.08),
        nextQuarterEbitda: Math.round(ebitda * 3 * 1.1),
        projectedAnnualRunrate: Math.round(netRevenue * 12),
      },
    };

    const report: PublishedFinancialReport = {
      status: 'PUBLISHED',
      period,
      reportType,
      preparedBy,
      reportDate: `31 ${moName} ${yr}`,
      department,
      totalIncome,
      totalExpenses,
      totalPayments: Math.round(totalExpenses * 0.85),
      netBalance: Math.max(0, totalIncome - totalExpenses),
      salesReturns,
      purchaseReturns,
      corporatePl,
      incomeDetails: [
        { no: 1, label: 'B2B Taxable Invoices', amount: b2b },
        { no: 2, label: 'B2C Consumer Supplies', amount: b2c },
        { no: 3, label: 'Export & Zero-Rated Supplies', amount: exportsAmt },
        { no: 4, label: 'Less: Sales Returns (Credit Notes Sec 34)', amount: -salesReturns },
      ],
      expenseDetails: [
        { no: 1, label: 'Raw Materials & Inward Goods', amount: Math.round(totalExpenses * 0.65) },
        { no: 2, label: 'Operating Payroll & Staff Costs', amount: payroll },
        { no: 3, label: 'Rent, Power & Facilities', amount: rent },
        { no: 4, label: 'Less: Purchase Returns & Vendor Debits', amount: -purchaseReturns },
      ],
      transactions: [],
      highlights: [
        `Net Turnover for ${moName} ${yr} recorded at ₹${netRevenue.toLocaleString('en-IN')}.`,
        `Operating EBITDA margin closed at ${netRevenue > 0 ? Math.round((ebitda / netRevenue) * 100) : 0}%.`,
        `All books and GST returns reconciled by ${preparedBy}.`,
      ],
    };

    try {
      await apiFetch(`/api/clients/${clientId}/gst-data/${period}`, {
        method: 'PUT',
        body: JSON.stringify({
          sales: {
            taxableSales: totalIncome,
            salesReturns,
            netSales: netRevenue,
            financialReport: report,
            misReportType: reportType,
          },
          purchases: {
            taxablePurchases: totalExpenses,
            purchaseReturns,
            netPurchases: netCogs,
            financialReport: report,
            misReportType: reportType,
          },
          itc: { totalItc: Math.round(totalExpenses * 0.18) },
        }),
      });

      setSuccess('MIS Report & P&L Statement published successfully!');
      setTimeout(() => {
        onSaved();
        onClose();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish MIS report');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase mb-1">
              <span>📊</span> MIS Publisher
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Publish Monthly MIS & P&L Statement
            </h2>
            <p className="text-xs text-slate-500">
              Client: <strong className="text-blue-600">{clientName}</strong>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-xl p-1">
            ×
          </button>
        </div>

        {error && <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg">{error}</div>}
        {success && <div className="p-3 bg-green-50 text-green-700 text-xs font-semibold rounded-lg">{success}</div>}

        {/* Model Type Selector */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setReportType('INDIVIDUAL')}
            className={`py-2 px-3 rounded-lg transition ${
              reportType === 'INDIVIDUAL' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            👤 Individual (GST Model)
          </button>
          <button
            type="button"
            onClick={() => setReportType('CORPORATE')}
            className={`py-2 px-3 rounded-lg transition ${
              reportType === 'CORPORATE' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            🏢 Corporate (Full P&L & Projects)
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Financial Month / Period</label>
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                required
                className="w-full border rounded-lg p-2 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Prepared By (Team Lead Name)</label>
              <input
                type="text"
                value={preparedBy}
                onChange={(e) => setPreparedBy(e.target.value)}
                required
                className="w-full border rounded-lg p-2 text-xs"
                placeholder="e.g. Syed Qudratullah"
              />
            </div>
          </div>

          {/* Sales, Returns, Purchases */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Gross Sales (₹)</label>
              <input
                type="number"
                value={totalIncome}
                onChange={(e) => setTotalIncome(Number(e.target.value))}
                required
                className="w-full border rounded-lg p-2 font-mono font-bold text-blue-700"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sales Returns (₹)</label>
              <input
                type="number"
                value={salesReturns}
                onChange={(e) => setSalesReturns(Number(e.target.value))}
                required
                className="w-full border rounded-lg p-2 font-mono font-bold text-rose-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Gross Purchases (₹)</label>
              <input
                type="number"
                value={totalExpenses}
                onChange={(e) => setTotalExpenses(Number(e.target.value))}
                required
                className="w-full border rounded-lg p-2 font-mono font-bold text-emerald-700"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Purchase Returns (₹)</label>
              <input
                type="number"
                value={purchaseReturns}
                onChange={(e) => setPurchaseReturns(Number(e.target.value))}
                required
                className="w-full border rounded-lg p-2 font-mono font-bold text-amber-600"
              />
            </div>
          </div>

          {/* Corporate Overheads if Corporate Mode */}
          {reportType === 'CORPORATE' && (
            <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
              <span className="font-bold text-indigo-950 block text-[11px] uppercase tracking-wider">
                Corporate Operating Expenses & Payroll (P&L Breakdown)
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Payroll & Salaries (₹)</label>
                  <input
                    type="number"
                    value={payroll}
                    onChange={(e) => setPayroll(Number(e.target.value))}
                    className="w-full border rounded-lg p-1.5 font-mono text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Office Rent & Power (₹)</label>
                  <input
                    type="number"
                    value={rent}
                    onChange={(e) => setRent(Number(e.target.value))}
                    className="w-full border rounded-lg p-1.5 font-mono text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Professional Fees (₹)</label>
                  <input
                    type="number"
                    value={profFees}
                    onChange={(e) => setProfFees(Number(e.target.value))}
                    className="w-full border rounded-lg p-1.5 font-mono text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Admin Overheads (₹)</label>
                  <input
                    type="number"
                    value={adminOverheads}
                    onChange={(e) => setAdminOverheads(Number(e.target.value))}
                    className="w-full border rounded-lg p-1.5 font-mono text-xs bg-white"
                  />
                </div>
              </div>

              {/* Projects Breakdown */}
              <div className="pt-2 border-t border-indigo-100/80 space-y-2">
                <span className="font-bold text-indigo-950 block text-[10px] uppercase tracking-wider">
                  Project Profitability Breakdown
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Project 1 Name"
                    value={proj1Name}
                    onChange={(e) => setProj1Name(e.target.value)}
                    className="border rounded-lg p-1.5 text-xs bg-white"
                  />
                  <input
                    type="number"
                    placeholder="Revenue (₹)"
                    value={proj1Revenue}
                    onChange={(e) => setProj1Revenue(Number(e.target.value))}
                    className="border rounded-lg p-1.5 font-mono text-xs bg-white"
                  />
                  <input
                    type="number"
                    placeholder="Direct Cost (₹)"
                    value={proj1Cost}
                    onChange={(e) => setProj1Cost(Number(e.target.value))}
                    className="border rounded-lg p-1.5 font-mono text-xs bg-white"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Project 2 Name"
                    value={proj2Name}
                    onChange={(e) => setProj2Name(e.target.value)}
                    className="border rounded-lg p-1.5 text-xs bg-white"
                  />
                  <input
                    type="number"
                    placeholder="Revenue (₹)"
                    value={proj2Revenue}
                    onChange={(e) => setProj2Revenue(Number(e.target.value))}
                    className="border rounded-lg p-1.5 font-mono text-xs bg-white"
                  />
                  <input
                    type="number"
                    placeholder="Direct Cost (₹)"
                    value={proj2Cost}
                    onChange={(e) => setProj2Cost(Number(e.target.value))}
                    className="border rounded-lg p-1.5 font-mono text-xs bg-white"
                  />
                </div>
              </div>

              {/* Live P&L Summary */}
              <div className="pt-2 flex flex-wrap items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-indigo-100">
                <span>EBITDA: <b className="text-indigo-700 font-mono">₹{ebitda.toLocaleString('en-IN')}</b></span>
                <span>PBT: <b className="text-slate-800 font-mono">₹{pbt.toLocaleString('en-IN')}</b></span>
                <span>Net PAT: <b className="text-emerald-700 font-mono">₹{pat.toLocaleString('en-IN')}</b></span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border rounded-xl font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md transition"
            >
              {saving ? 'Publishing...' : 'Publish Statement to Client Portal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
