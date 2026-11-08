import { useMemo, useState } from 'react';

interface GstRecord {
  period: string;
  sales: Record<string, unknown>;
  purchases: Record<string, unknown>;
  itc: Record<string, unknown>;
  gstr1: Record<string, unknown>;
  gstr3b: Record<string, unknown>;
}

export function GstFinancialModelling({ gstData }: { gstData: GstRecord[] }) {
  // Historical data extraction
  const historicalAvgTurnover = useMemo(() => {
    if (!gstData.length) return 500000;
    const totals = gstData.slice(0, 6).map((r) => {
      const s = r.sales;
      return Number(s?.total ?? s?.taxableSales ?? s?.taxable_sales ?? 0);
    });
    const sum = totals.reduce((a, b) => a + b, 0);
    return Math.round(sum / Math.max(totals.length, 1)) || 500000;
  }, [gstData]);

  // Simulation parameters
  const [projectedTurnover, setProjectedTurnover] = useState(historicalAvgTurnover);
  const [taxSlab, setTaxSlab] = useState<number>(18);
  const [b2bPurchaseRatio, setB2bPurchaseRatio] = useState<number>(55); // 55% of turnover is eligible inward
  const [itcEfficiency, setItcEfficiency] = useState<number>(95); // 95% 2B supplier compliance
  const [scenario, setScenario] = useState<'conservative' | 'base' | 'aggressive'>('base');

  // Multiplier based on scenario
  const scenarioMultiplier = scenario === 'conservative' ? 0.85 : scenario === 'aggressive' ? 1.25 : 1.0;
  const activeTurnover = Math.round(projectedTurnover * scenarioMultiplier);

  // Calculations
  const outputGst = Math.round(activeTurnover * (taxSlab / 100));
  const estimatedPurchases = Math.round(activeTurnover * (b2bPurchaseRatio / 100));
  const potentialItc = Math.round(estimatedPurchases * (taxSlab / 100));
  const realizableItc = Math.round(potentialItc * (itcEfficiency / 100));
  const netCashPayable = Math.max(0, outputGst - realizableItc);
  const itcCoverageRatio = outputGst > 0 ? Math.min(100, Math.round((realizableItc / outputGst) * 100)) : 100;
  const cashTaxRatio = outputGst > 0 ? Math.round((netCashPayable / outputGst) * 100) : 0;
  const effectiveTaxBurden = activeTurnover > 0 ? ((netCashPayable / activeTurnover) * 100).toFixed(2) : '0.00';

  // 3-Month Projection
  const projections = useMemo(() => {
    return [1, 2, 3].map((monthOffset) => {
      const growthFactor = 1 + (monthOffset * 0.04);
      const mTurnover = Math.round(activeTurnover * growthFactor);
      const mOutput = Math.round(mTurnover * (taxSlab / 100));
      const mItc = Math.round(mTurnover * (b2bPurchaseRatio / 100) * (taxSlab / 100) * (itcEfficiency / 100));
      const mCash = Math.max(0, mOutput - mItc);
      return {
        month: `Month +${monthOffset}`,
        turnover: mTurnover,
        outputGst: mOutput,
        itc: mItc,
        netCash: mCash,
      };
    });
  }, [activeTurnover, taxSlab, b2bPurchaseRatio, itcEfficiency]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2">
            <span>📈</span> Predictive GST Analytics & Tax Optimization
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">GST Financial Modelling & Cash Outflow Forecast</h2>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Simulate future tax liabilities, project working capital required for PMT-06 challans, and model ITC efficiency to prevent cash flow crunches before statutory filing deadlines.
          </p>
        </div>
      </div>

      {/* Scenario Selector & Core Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Column */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Simulation Parameters</h3>
            <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Live Modeler
            </span>
          </div>

          {/* Scenario Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Market Growth Scenario</label>
            <div className="grid grid-cols-3 gap-2">
              {(['conservative', 'base', 'aggressive'] as const).map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => setScenario(sc)}
                  className={`text-xs font-semibold py-1.5 rounded-lg capitalize border transition ${
                    scenario === sc
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {sc}
                </button>
              ))}
            </div>
          </div>

          {/* Projected Monthly Turnover */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-700">Projected Monthly Revenue</span>
              <span className="font-mono text-blue-600">₹{activeTurnover.toLocaleString('en-IN')}</span>
            </div>
            <input
              type="range"
              min={100000}
              max={10000000}
              step={50000}
              value={projectedTurnover}
              onChange={(e) => setProjectedTurnover(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>₹1 Lakh</span>
              <span>₹50 Lakh</span>
              <span>₹1 Crore</span>
            </div>
          </div>

          {/* Primary GST Rate */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Applicable GST Slab</label>
            <div className="grid grid-cols-4 gap-2">
              {[5, 12, 18, 28].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setTaxSlab(rate)}
                  className={`text-xs font-semibold py-1 rounded-md border ${
                    taxSlab === rate
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>
          </div>

          {/* B2B Inward Purchase Ratio */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-700">Inward Supply / Cost Ratio</span>
              <span className="font-mono text-slate-900">{b2bPurchaseRatio}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={90}
              step={5}
              value={b2bPurchaseRatio}
              onChange={(e) => setB2bPurchaseRatio(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <p className="text-[10px] text-slate-400 mt-1">Portion of revenue spent on GST-taxable supplier inputs.</p>
          </div>

          {/* ITC Efficiency */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-700">GSTR-2B ITC Realization Rate</span>
              <span className="font-mono text-emerald-600">{itcEfficiency}%</span>
            </div>
            <input
              type="range"
              min={70}
              max={100}
              step={1}
              value={itcEfficiency}
              onChange={(e) => setItcEfficiency(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <p className="text-[10px] text-slate-400 mt-1">Suppliers filing GSTR-1 on time to allow ITC in your 2B.</p>
          </div>
        </div>

        {/* Results & Key Metrics Cards */}
        <div className="lg:col-span-2 space-y-5">
          {/* 4 Outcome Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gross Turnover</span>
              <strong className="text-lg font-bold text-slate-900 block mt-1 font-mono">
                ₹{activeTurnover.toLocaleString('en-IN')}
              </strong>
              <small className="text-[10px] text-slate-500">Projected monthly</small>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Output GST</span>
              <strong className="text-lg font-bold text-amber-600 block mt-1 font-mono">
                ₹{outputGst.toLocaleString('en-IN')}
              </strong>
              <small className="text-[10px] text-slate-500">{taxSlab}% total output</small>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Eligible ITC</span>
              <strong className="text-lg font-bold text-emerald-600 block mt-1 font-mono">
                ₹{realizableItc.toLocaleString('en-IN')}
              </strong>
              <small className="text-[10px] text-slate-500">{itcCoverageRatio}% offset capability</small>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Net Cash Outflow</span>
              <strong className="text-lg font-bold text-blue-600 block mt-1 font-mono">
                ₹{netCashPayable.toLocaleString('en-IN')}
              </strong>
              <small className="text-[10px] text-slate-500">Payable via PMT-06</small>
            </div>
          </div>

          {/* Working Capital Reserve Recommendation */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/70 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                  Working Capital Advisory
                </span>
                <h4 className="text-base font-bold text-slate-900 mt-0.5">
                  Reserve ₹{netCashPayable.toLocaleString('en-IN')} by the 18th of every month
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Your effective cash tax burden is <strong>{effectiveTaxBurden}%</strong> of revenue. With an ITC offset capability of <strong>{itcCoverageRatio}%</strong>, {cashTaxRatio}% of your output tax must be funded directly from business liquid reserves.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block">Health Rating</span>
                <span className="inline-block px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mt-1">
                  Optimal Flow
                </span>
              </div>
            </div>

            {/* Split Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-[11px] font-semibold mb-1 text-slate-700">
                <span>Credit Offset: {itcCoverageRatio}%</span>
                <span>Cash Payment: {cashTaxRatio}%</span>
              </div>
              <div className="w-full h-3 bg-blue-200 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${itcCoverageRatio}%` }}
                  title={`ITC Credit: ₹${realizableItc.toLocaleString('en-IN')}`}
                />
                <div
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{ width: `${cashTaxRatio}%` }}
                  title={`Cash Paid: ₹${netCashPayable.toLocaleString('en-IN')}`}
                />
              </div>
            </div>
          </div>

          {/* 3-Month Projection Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
            <h4 className="font-bold text-slate-900 text-sm mb-3">Next Quarter Cash Forecast</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Forecast Period</th>
                    <th className="py-2.5 px-3">Projected Turnover</th>
                    <th className="py-2.5 px-3">Output Tax</th>
                    <th className="py-2.5 px-3">Available ITC</th>
                    <th className="py-2.5 px-3">Net Cash Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {projections.map((p) => (
                    <tr key={p.month} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-900">{p.month}</td>
                      <td className="py-2.5 px-3">₹{p.turnover.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-amber-600">₹{p.outputGst.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-emerald-600">₹{p.itc.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 font-bold text-blue-600">₹{p.netCash.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
