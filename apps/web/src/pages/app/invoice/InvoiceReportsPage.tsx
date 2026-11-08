import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  fetchInvoiceSummary,
  fetchDailySalesReport,
  fetchTaxBreakdown,
  fetchHsnSummary,
  fetchGstr1Report,
} from '../../../lib/invoiceApi';
import { exportGstr1Excel } from '../../../lib/gstr1Export';

export function InvoiceReportsPage({ vendorId }: { vendorId?: string }) {
  const { user } = useAuth();
  const targetVendorId = vendorId || user?.id;

  const currentYear = new Date().getFullYear();
  const firstOfMonth = new Date(currentYear, new Date().getMonth(), 1).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'DAILY' | 'TAX' | 'HSN' | 'GSTR1'>('SUMMARY');

  const [summary, setSummary] = useState<any | null>(null);
  const [daily, setDaily] = useState<any[]>([]);
  const [taxBreakdown, setTaxBreakdown] = useState<any[]>([]);
  const [hsnList, setHsnList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!targetVendorId) return;
    loadReportData();
  }, [targetVendorId, fromDate, toDate, activeTab]);

  async function loadReportData() {
    setLoading(true);
    try {
      if (activeTab === 'SUMMARY') {
        const res = await fetchInvoiceSummary(targetVendorId!, fromDate, toDate);
        setSummary(res.summary);
      } else if (activeTab === 'DAILY') {
        const res = await fetchDailySalesReport(targetVendorId!, fromDate, toDate);
        setDaily(res.daily || []);
      } else if (activeTab === 'TAX') {
        const res = await fetchTaxBreakdown(targetVendorId!, fromDate, toDate);
        setTaxBreakdown(res.breakdown || []);
      } else if (activeTab === 'HSN') {
        const res = await fetchHsnSummary(targetVendorId!, fromDate, toDate);
        setHsnList(res.hsnSummary || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleExportGstr1() {
    if (!targetVendorId) return;
    setExporting(true);
    try {
      const data = await fetchGstr1Report(targetVendorId, fromDate, toDate);
      exportGstr1Excel(data, user?.businessName || 'Vendor');
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner with Quick GSTR-1 Action */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 sm:p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300">
            📊 Statutory Returns & Analytics
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-2">GST Sales & Tax Intelligence</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Audit daily turnover, inspect CGST/SGST/IGST breakdown by tax slab, and export official GSTR-1 multi-sheet Excel files ready for upload.
          </p>
        </div>
        <button
          onClick={handleExportGstr1}
          disabled={exporting}
          className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg transition flex items-center justify-center gap-2 shrink-0"
        >
          <span>📑</span>
          <span>{exporting ? 'Generating Excel...' : 'Export GSTR-1 Excel'}</span>
        </button>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 text-xs">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3 w-full lg:w-auto">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full sm:w-auto border rounded-lg p-2 font-mono text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full sm:w-auto border rounded-lg p-2 font-mono text-xs"
            />
          </div>
        </div>

        {/* Report Sub-Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto scrollbar-none gap-1">
          {[
            { key: 'SUMMARY', label: 'Summary KPIs' },
            { key: 'DAILY', label: 'Daily Sales' },
            { key: 'TAX', label: 'Tax by Slab' },
            { key: 'HSN', label: 'HSN Summary (Table 12)' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg transition whitespace-nowrap shrink-0 ${
                activeTab === key ? 'bg-white text-blue-700 shadow font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Summary KPIs */}
      {activeTab === 'SUMMARY' && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Active Sales</span>
            <div className="text-2xl font-black text-slate-900 font-mono">
              ₹{Number(summary.total_sales || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500">
              Taxable: ₹{Number(summary.total_taxable || 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Tax Collected</span>
            <div className="text-2xl font-black text-blue-700 font-mono">
              ₹{Number(summary.total_tax || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500">
              CGST+SGST: ₹{(Number(summary.total_cgst || 0) + Number(summary.total_sgst || 0)).toLocaleString('en-IN')}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Active Invoices Issued</span>
            <div className="text-2xl font-black text-emerald-700 font-mono">
              {summary.active_invoices || 0}
            </div>
            <div className="text-[11px] text-slate-500">Total Generated: {summary.total_invoices || 0}</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Cancelled Invoices</span>
            <div className="text-2xl font-black text-red-600 font-mono">
              {summary.cancelled_invoices || 0}
            </div>
            <div className="text-[11px] text-slate-500">Audit preserved in vault</div>
          </div>
        </div>
      )}

      {/* Tab 2: Daily Sales */}
      {activeTab === 'DAILY' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[650px] text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Invoices</th>
                  <th className="p-3 text-right">Taxable Turnover</th>
                  <th className="p-3 text-right">CGST</th>
                  <th className="p-3 text-right">SGST</th>
                  <th className="p-3 text-right">IGST</th>
                  <th className="p-3 text-right">Grand Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {daily.map((d) => (
                  <tr key={d.sale_date} className="hover:bg-slate-50">
                    <td className="p-3 font-sans font-semibold text-slate-900">{d.sale_date}</td>
                    <td className="p-3 text-right">{d.invoice_count}</td>
                    <td className="p-3 text-right">₹{Number(d.taxable_total).toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right text-blue-600">₹{Number(d.cgst_total).toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right text-blue-600">₹{Number(d.sgst_total).toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right text-purple-600">₹{Number(d.igst_total).toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      ₹{Number(d.grand_total).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
                {!daily.length && !loading && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                      No sales recorded for this date period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Tax by Slab */}
      {activeTab === 'TAX' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[650px] text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b">
                <tr>
                  <th className="p-3">GST Slab Rate</th>
                  <th className="p-3 text-right">Invoices</th>
                  <th className="p-3 text-right">Taxable Value</th>
                  <th className="p-3 text-right">Central Tax (CGST)</th>
                  <th className="p-3 text-right">State Tax (SGST)</th>
                  <th className="p-3 text-right">Integrated Tax (IGST)</th>
                  <th className="p-3 text-right">Total Tax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {taxBreakdown.map((t) => (
                  <tr key={t.gst_rate} className="hover:bg-slate-50">
                    <td className="p-3 font-sans font-bold text-blue-700">{t.gst_rate}%</td>
                    <td className="p-3 text-right">{t.invoice_count}</td>
                    <td className="p-3 text-right font-medium">₹{Number(t.taxable_total).toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right text-blue-600">₹{Number(t.cgst_total).toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right text-blue-600">₹{Number(t.sgst_total).toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right text-purple-600">₹{Number(t.igst_total).toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      ₹{Number(t.tax_total).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
                {!taxBreakdown.length && !loading && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                      No tax data available for this range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: HSN Summary */}
      {activeTab === 'HSN' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[750px] text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b">
                <tr>
                  <th className="p-3">HSN / SAC</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">UQC</th>
                  <th className="p-3 text-right">Total Qty</th>
                  <th className="p-3 text-right">Taxable Value</th>
                  <th className="p-3 text-right">CGST</th>
                  <th className="p-3 text-right">SGST</th>
                  <th className="p-3 text-right">IGST</th>
                  <th className="p-3 text-right">Total Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {hsnList.map((h) => (
                  <tr key={h.hsn_sac} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-blue-700">{h.hsn_sac}</td>
                    <td className="p-3 font-sans font-medium text-slate-800">{h.description}</td>
                    <td className="p-3 font-sans text-slate-500 uppercase">{h.uqc}</td>
                    <td className="p-3 text-right">{h.total_qty}</td>
                    <td className="p-3 text-right">₹{Number(h.taxable_value).toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right text-blue-600">₹{Number(h.cgst_amount).toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right text-blue-600">₹{Number(h.sgst_amount).toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right text-purple-600">₹{Number(h.igst_amount).toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      ₹{Number(h.total_value).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
                {!hsnList.length && !loading && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 font-sans">
                      No HSN summary data for this range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
