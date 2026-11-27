import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

type HsnSacStats = {
  totalCount: number;
  hsnCount: number;
  sacCount: number;
  ratedCount: number;
  updatedUpTo: string;
  scheduleNote: string;
  lastUploadFile: string | null;
  lastUploadAt: string | null;
};

type UploadResult = {
  ok: boolean;
  fileName: string;
  mode: 'upsert' | 'replace';
  sheetsProcessed: string[];
  skippedCount: number;
  totalProcessed: number;
  hsnCount: number;
  sacCount: number;
  stats: HsnSacStats;
};

export function HsnSacUploadCard() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [stats, setStats] = useState<HsnSacStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'upsert' | 'replace'>('upsert');
  const [updatedUpTo, setUpdatedUpTo] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const data = await api<HsnSacStats>('/api/super-admin/hsn-sac/stats');
      setStats(data);
      if (data.updatedUpTo && !updatedUpTo) {
        setUpdatedUpTo(data.updatedUpTo);
      }
    } catch {
      // Ignore if migration has not been run yet
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select an Excel (.xlsx / .xls) or CSV file first.');
      return;
    }
    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('mode', mode);
      if (updatedUpTo.trim()) {
        formData.append('updatedUpTo', updatedUpTo.trim());
      }
      formData.append('file', selectedFile);

      const res = await api<UploadResult>('/api/super-admin/hsn-sac/upload', {
        method: 'POST',
        body: formData,
      });

      setResult(res);
      setStats(res.stats);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setError(err?.message || 'Failed to upload HSN/SAC Excel file.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900">
            HSN / SAC Master Catalog (GST Portal Excel Upload)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload the official GST Portal Excel (<code className="font-mono text-[11px] bg-slate-100 px-1 rounded">HSN_MSTR</code> &amp;{' '}
            <code className="font-mono text-[11px] bg-slate-100 px-1 rounded">SAC_MSTR</code>) or a rate-mapped CSV/XLSX to update the live website search.
          </p>
        </div>
        <button
          type="button"
          onClick={loadStats}
          disabled={loadingStats}
          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 shrink-0 cursor-pointer"
        >
          {loadingStats ? 'Refreshing...' : 'Refresh Counts'}
        </button>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Live Catalog Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Indexed</div>
            <div className="text-lg font-black text-slate-900 mt-0.5">
              {stats ? stats.totalCount.toLocaleString('en-IN') : '—'}
            </div>
          </div>
          <div className="rounded-xl border border-indigo-200/70 bg-indigo-50/50 p-3">
            <div className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">Goods (HSN)</div>
            <div className="text-lg font-black text-indigo-900 mt-0.5">
              {stats ? stats.hsnCount.toLocaleString('en-IN') : '—'}
            </div>
          </div>
          <div className="rounded-xl border border-teal-200/70 bg-teal-50/50 p-3">
            <div className="text-[11px] font-semibold text-teal-700 uppercase tracking-wider">Services (SAC)</div>
            <div className="text-lg font-black text-teal-900 mt-0.5">
              {stats ? stats.sacCount.toLocaleString('en-IN') : '—'}
            </div>
          </div>
          <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/50 p-3">
            <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Rate-Mapped</div>
            <div className="text-lg font-black text-emerald-900 mt-0.5">
              {stats ? stats.ratedCount.toLocaleString('en-IN') : '—'}
            </div>
          </div>
        </div>

        {stats?.lastUploadFile && (
          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1 bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2">
            <span>
              Last file: <strong className="text-slate-800">{stats.lastUploadFile}</strong>
            </span>
            {stats.lastUploadAt && (
              <span>
                Uploaded: <strong className="text-slate-800">{new Date(stats.lastUploadAt).toLocaleString()}</strong>
              </span>
            )}
            <span>
              Updated Up To: <strong className="text-slate-800">{stats.updatedUpTo}</strong>
            </span>
          </div>
        )}

        {/* Upload Form */}
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4 space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select GST Portal Excel / CSV File (.xlsx, .xls, .csv)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  setSelectedFile(e.target.files?.[0] || null);
                  setError(null);
                  setResult(null);
                }}
                className="block w-full text-xs text-slate-700 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Import Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'upsert' | 'replace')}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-semibold text-slate-800"
              >
                <option value="upsert">Merge / Upsert (Keep existing rates)</option>
                <option value="replace">Replace Portal Master</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="flex-1 max-w-xs">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Set &ldquo;Updated Up To&rdquo; Date (Optional)
              </label>
              <input
                type="text"
                value={updatedUpTo}
                onChange={(e) => setUpdatedUpTo(e.target.value)}
                placeholder="e.g. 27 Nov 2026"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
              />
            </div>

            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading & Indexing...' : 'Upload & Publish to Website'}
            </button>
          </div>

          <p className="text-[11px] text-slate-500">
            Recognizes GST Portal sheets (<code className="font-mono">HSN_MSTR</code> with{' '}
            <code className="font-mono">HSN_CD, HSN_Description</code> &amp; <code className="font-mono">SAC_MSTR</code> with{' '}
            <code className="font-mono">SAC_CD, SAC_Description</code>) plus optional <code className="font-mono">GST_Rate</code>,{' '}
            <code className="font-mono">Category</code>, <code className="font-mono">Keywords</code>, and <code className="font-mono">Note</code> columns.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-800">
            {error}
          </div>
        )}

        {result && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-900">
            <strong>Upload Complete!</strong> Processed <strong>{result.totalProcessed.toLocaleString('en-IN')}</strong> codes (
            {result.hsnCount.toLocaleString('en-IN')} HSN, {result.sacCount.toLocaleString('en-IN')} SAC) from{' '}
            <code className="font-mono">{result.fileName}</code>. Changes are now live on the website search.
          </div>
        )}
      </div>
    </div>
  );
}
