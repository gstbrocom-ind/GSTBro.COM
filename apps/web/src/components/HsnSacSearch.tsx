import { useEffect, useState } from 'react';
import {
  GST_SLAB_OVERVIEW,
  HSN_SAC_DATABASE,
  PREVAILING_SLABS_DATE,
  type GstRateSlab,
  type HsnSacEntry,
  type HsnSacType,
} from '../data/hsnSacRates';
import { API_URL } from '../seo/meta.config';

const SLAB_FILTERS: ('ALL' | GstRateSlab)[] = ['ALL', 0, 3, 5, 18, 40];
const QUICK_EXAMPLES = ['998314', '8471', 'software', 'construction', 'gold', 'solar', 'milk', 'suv'];
const PAGE_SIZE = 25;

interface SearchResultItem {
  code: string;
  type: HsnSacType;
  category: string;
  description: string;
  gstRate: GstRateSlab | number | null;
  keywords: string[];
  note?: string;
}

interface HsnSacStats {
  totalCount: number;
  hsnCount: number;
  sacCount: number;
  ratedCount: number;
  updatedUpTo: string;
  scheduleNote: string;
}

function slabBadgeStyle(rate: number): string {
  switch (rate) {
    case 0:
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 0.25:
    case 3:
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 5:
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 18:
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 40:
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

export function HsnSacSearch() {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | HsnSacType>('ALL');
  const [slabFilter, setSlabFilter] = useState<'ALL' | GstRateSlab>('ALL');
  const [page, setPage] = useState(1);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [updatedUpTo, setUpdatedUpTo] = useState('27 Nov 2026');
  const [scheduleNote, setScheduleNote] = useState(PREVAILING_SLABS_DATE);
  const [stats, setStats] = useState<HsnSacStats | null>(null);
  const [customEntries, setCustomEntries] = useState<HsnSacEntry[]>([]);

  const [items, setItems] = useState<SearchResultItem[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  const hasActiveFilter = query.trim().length > 0 || typeFilter !== 'ALL' || slabFilter !== 'ALL';

  // Load metadata, live catalog counts, and legacy overrides on mount
  useEffect(() => {
    fetch(`${API_URL}/api/hsn-sac/stats?_t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: HsnSacStats | null) => {
        if (!d) return;
        setStats(d);
        if (d.updatedUpTo?.trim()) setUpdatedUpTo(d.updatedUpTo.trim());
        if (d.scheduleNote?.trim()) setScheduleNote(d.scheduleNote.trim());
      })
      .catch(() => {});

    fetch(`${API_URL}/api/settings/hsn-sac?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        if (typeof d.updatedUpTo === 'string' && d.updatedUpTo.trim()) {
          setUpdatedUpTo(d.updatedUpTo.trim());
        }
        if (typeof d.scheduleNote === 'string' && d.scheduleNote.trim()) {
          setScheduleNote(d.scheduleNote.trim());
        }
        if (Array.isArray(d.customEntries)) {
          setCustomEntries(d.customEntries);
        }
      })
      .catch(() => {});
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [query, typeFilter, slabFilter]);

  // Debounced search against live backend catalog (never dumps all 22k+ codes)
  useEffect(() => {
    if (!hasActiveFilter) {
      setItems([]);
      setTotalMatches(0);
      setTotalPages(0);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: query.trim(),
          type: typeFilter,
          rate: String(slabFilter),
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        const res = await fetch(`${API_URL}/api/hsn-sac/search?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('API search failed');
        const data = await res.json();

        if (Array.isArray(data.items) && (data.totalMatches > 0 || (stats && stats.totalCount > 0))) {
          setItems(data.items);
          setTotalMatches(data.totalMatches ?? data.items.length);
          setTotalPages(data.totalPages ?? 1);
          return;
        }
        throw new Error('Empty catalog fallback');
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        // Fallback to local curated GST 2.0 entries if DB is not seeded yet or offline
        const map = new Map<string, HsnSacEntry>();
        for (const item of HSN_SAC_DATABASE) map.set(`${item.type}:${item.code.toUpperCase()}`, item);
        for (const item of customEntries) map.set(`${item.type}:${item.code.toUpperCase()}`, item);
        const q = query.trim().toLowerCase();
        const filtered = Array.from(map.values()).filter((item) => {
          if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;
          if (slabFilter !== 'ALL' && item.gstRate !== slabFilter) return false;
          if (!q) return true;
          return (
            item.code.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            item.category.toLowerCase().includes(q) ||
            item.keywords.some((k) => k.toLowerCase().includes(q))
          );
        });
        const start = (page - 1) * PAGE_SIZE;
        setItems(filtered.slice(start, start + PAGE_SIZE));
        setTotalMatches(filtered.length);
        setTotalPages(Math.ceil(filtered.length / PAGE_SIZE));
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, typeFilter, slabFilter, page, hasActiveFilter, customEntries, stats]);

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode((prev) => (prev === code ? null : prev)), 1500);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const handleClear = () => {
    setQuery('');
    setTypeFilter('ALL');
    setSlabFilter('ALL');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Prominent "Updated Up To" Status Banner */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 sm:mt-0 shrink-0 animate-pulse" />
          <div className="text-xs sm:text-sm text-emerald-950">
            <span className="font-black">Rates Updated Up To: {updatedUpTo}</span>
            <span className="text-emerald-800 ml-2 block sm:inline">• {scheduleNote}</span>
            {stats && stats.totalCount > 0 && (
              <span className="text-emerald-700 font-semibold ml-2 block sm:inline">
                • {stats.totalCount.toLocaleString('en-IN')} GST Portal Codes Indexed ({stats.hsnCount.toLocaleString('en-IN')} HSN / {stats.sacCount.toLocaleString('en-IN')} SAC)
              </span>
            )}
          </div>
        </div>
        <a
          href="https://taxinformation.cbic.gov.in/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline whitespace-nowrap shrink-0"
        >
          Verify CBIC Notifications &rarr;
        </a>
      </div>

      {/* Prevailing GST 2.0 Rate Slabs Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {GST_SLAB_OVERVIEW.map((slab) => (
          <button
            key={slab.rate}
            type="button"
            onClick={() => setSlabFilter((prev) => (prev === slab.rate ? 'ALL' : slab.rate))}
            className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
              slabFilter === slab.rate
                ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20'
                : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300'
            }`}
          >
            <div className="text-xs font-black tracking-tight">{slab.label}</div>
            <p
              className={`text-[11px] mt-1 leading-snug ${
                slabFilter === slab.rate ? 'text-blue-100' : 'text-slate-600'
              }`}
            >
              {slab.summary}
            </p>
          </button>
        ))}
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by HSN/SAC number (e.g. 998314, 8471, 0101) or keyword (software, construction, horses, soap)..."
              aria-label="Search HSN or SAC code and GST rate"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 shrink-0">
            {(['ALL', 'HSN', 'SAC'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  typeFilter === t
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t === 'ALL' ? 'All Codes' : t === 'HSN' ? 'Goods (HSN)' : 'Services (SAC)'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1">
              Filter Rate:
            </span>
            {SLAB_FILTERS.map((slab) => (
              <button
                key={String(slab)}
                type="button"
                onClick={() => setSlabFilter(slab)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                  slabFilter === slab
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {slab === 'ALL' ? 'All Slabs' : `${slab}%`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {hasActiveFilter && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
              >
                Reset Search
              </button>
            )}
            <span className="text-xs font-semibold text-slate-500">
              {hasActiveFilter
                ? `${totalMatches.toLocaleString('en-IN')} matching ${totalMatches === 1 ? 'code' : 'codes'}`
                : 'Search by keyword, code, or rate slab'}
            </span>
          </div>
        </div>

        {/* Search-First Prompt State (does NOT dump all 22,600+ codes upfront) */}
        {!hasActiveFilter ? (
          <div className="py-10 px-4 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/60 space-y-4">
            <div className="max-w-xl mx-auto space-y-1.5">
              <p className="text-sm font-bold text-slate-800">
                Search the Complete GST Portal HSN &amp; SAC Master
              </p>
              <p className="text-xs text-slate-500">
                Type a 2, 4, 6, or 8-digit HSN/SAC code, product or service keyword, or select a GST rate slab above to view matching codes.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Try:</span>
              {QUICK_EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setQuery(example)}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-700 transition cursor-pointer"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : loading ? (
          <div className="py-12 text-center text-sm text-slate-500 border border-slate-200 rounded-2xl">
            <div className="inline-block w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2 align-middle" />
            Searching GST Portal HSN &amp; SAC catalog...
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-2xl">
            No matching HSN/SAC codes found{query ? ` for “${query}”` : ''}. Try a broader keyword or verify on the{' '}
            <a
              href="https://services.gst.gov.in/services/searchhsnsac"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 font-semibold underline"
            >
              Official GST Portal HSN/SAC Search
            </a>
            .
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-bold">Code</th>
                    <th className="py-3 px-4 font-bold">Type</th>
                    <th className="py-3 px-4 font-bold">Description &amp; Category</th>
                    <th className="py-3 px-4 font-bold">Prevailing GST</th>
                    <th className="py-3 px-4 font-bold">CGST + SGST</th>
                    <th className="py-3 px-4 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((item) => {
                    const hasRate = item.gstRate !== null && item.gstRate !== undefined;
                    const half = hasRate ? Number(item.gstRate) / 2 : null;
                    return (
                      <tr key={`${item.type}-${item.code}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {item.code}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                              item.type === 'HSN'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-teal-50 text-teal-700 border-teal-200'
                            }`}
                          >
                            {item.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 min-w-[260px]">
                          <div className="font-semibold text-slate-900">{item.description}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{item.category}</div>
                          {item.note && (
                            <div className="text-[11px] text-blue-700 bg-blue-50/80 border border-blue-100 rounded-md px-2 py-1 mt-1.5 inline-block">
                              {item.note}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {hasRate ? (
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-black border ${slabBadgeStyle(
                                Number(item.gstRate)
                              )}`}
                            >
                              {item.gstRate}% IGST
                            </span>
                          ) : (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border bg-slate-50 text-slate-600 border-slate-200">
                              Portal Master
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono text-slate-600 whitespace-nowrap">
                          {half !== null ? `${half}% + ${half}%` : 'As per CBIC'}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleCopy(item.code)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                          >
                            {copiedCode === item.code ? 'Copied' : 'Copy Code'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500 font-medium">
                  Page {page} of {totalPages} ({totalMatches.toLocaleString('en-IN')} total results)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    &larr; Prev
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    Next &rarr;
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        <p className="text-[11px] text-slate-500 leading-relaxed">
          Note: Rates reflect prevailing CBIC GST 2.0 schedules (5%, 18%, 40%, 3%/0.25% special, and 0% exempt) as of{' '}
          {updatedUpTo}. Final taxability may depend on packaging (pre-packaged vs. loose), valuation thresholds, or
          conditional exemptions under Notification 09/2025-CTR &amp; 10/2025-CTR. Always verify 8-digit classification
          on the{' '}
          <a
            href="https://services.gst.gov.in/services/searchhsnsac"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 font-semibold underline"
          >
            official GST Portal
          </a>{' '}
          or consult a GSTBro Chartered Accountant.
        </p>
      </div>
    </div>
  );
}
