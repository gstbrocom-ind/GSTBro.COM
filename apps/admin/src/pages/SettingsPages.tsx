import { useEffect, useState, useMemo } from 'react';
import { SocialLinks } from '@gst/ui';
import { api } from '../lib/api';

const getLiveWebUrl = (path: string = '') => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (typeof window !== 'undefined') {
    // In dev, admin is typically on port 5174 or 5173, web is on 5173
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) {
      return `http://localhost:5173${cleanPath}`;
    }
    return `${window.location.origin}${cleanPath}`;
  }
  return cleanPath;
};

// =========================================================================
// 1. SOCIAL SETTINGS PAGE
// =========================================================================
export function SocialSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Record<string, string>>('/api/admin/settings/social').then(setSettings).catch(() => {});
  }, []);

  const handleSave = async (isApply = false) => {
    setSaving(true);
    try {
      await api('/api/admin/settings/social', { method: 'PUT', body: JSON.stringify(settings) });
      if (isApply) {
        setApplied(true);
        setTimeout(() => setApplied(false), 4000);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save social settings');
    } finally {
      setSaving(false);
    }
  };

  const platforms = [
    { key: 'whatsapp', label: 'WhatsApp Direct Chat', placeholder: '919876543210 or https://wa.me/...' },
    { key: 'instagram', label: 'Instagram Profile', placeholder: 'https://instagram.com/gstbro' },
    { key: 'x', label: 'X (Twitter)', placeholder: 'https://x.com/gstbro' },
    { key: 'facebook', label: 'Facebook Official Page', placeholder: 'https://facebook.com/gstbro' },
  ];

  const previewLinks = platforms.map((p) => ({
    platform: p.key as 'whatsapp' | 'instagram' | 'x' | 'facebook',
    url: settings[`social_${p.key}_url`] ?? '',
    iconUrl: settings[`social_${p.key}_icon`] || null,
    enabled: settings[`social_${p.key}_enabled`] === 'true' && !!settings[`social_${p.key}_url`],
  }));

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Social Channels & Communications</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Live Webpage Sync
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure public communication links shown across the website header, footer, and support widgets
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(false)}
            className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-sm"
          >
            {saved ? '✓ Saved' : 'Save'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(true)}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
          >
            <span>🚀</span>
            {applied ? '✓ Applied Live' : 'Save & Apply'}
          </button>
        </div>
      </div>

      {applied && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2 font-medium">
            <span className="text-base">✓</span>
            <span>Social channel settings successfully applied live to all public web pages!</span>
          </div>
          <a
            href={getLiveWebUrl('/')}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1 rounded-lg bg-emerald-700 text-white font-bold text-[11px] hover:bg-emerald-800 transition"
          >
            View Live Webpage ↗
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {platforms.map((p) => (
            <div key={p.key} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">{p.label}</span>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings[`social_${p.key}_enabled`] === 'true'}
                    onChange={(e) =>
                      setSettings({ ...settings, [`social_${p.key}_enabled`]: e.target.checked ? 'true' : 'false' })
                    }
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  Active Channel
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Target URL or Handle</label>
                <input
                  placeholder={p.placeholder}
                  value={settings[`social_${p.key}_url`] ?? ''}
                  onChange={(e) => setSettings({ ...settings, [`social_${p.key}_url`]: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Custom Icon URL (Optional CDN / Cloudinary)</label>
                <input
                  placeholder="https://res.cloudinary.com/..."
                  value={settings[`social_${p.key}_icon`] ?? ''}
                  onChange={(e) => setSettings({ ...settings, [`social_${p.key}_icon`]: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                />
              </div>
            </div>
          ))}

          {/* Bottom Action Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false)}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-sm"
            >
              {saved ? '✓ Changes Saved' : 'Save'}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(true)}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
            >
              <span>🚀</span>
              {applied ? '✓ Applied Live' : 'Apply to Live Webpage'}
            </button>
          </div>
        </div>

        {/* Live Preview Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm h-fit space-y-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Live Website Preview</h2>
            <p className="text-xs text-slate-400 mt-0.5">Rendered appearance in public header, footer, and drawer</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center min-h-[90px]">
            <SocialLinks links={previewLinks} />
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Enabled links with valid URLs will automatically reflect across all public pages, the mobile navigation drawer, and floating WhatsApp support buttons.
          </p>

          <div className="pt-2 border-t border-slate-100">
            <a
              href={getLiveWebUrl('/')}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold text-center block transition"
            >
              Preview Live Website ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 2. SEO SETTINGS PAGE (ALL 27 WEBPAGES WITH CATEGORIES, PREVIEW & SAVE/APPLY)
// =========================================================================
type SeoRecord = {
  route_path: string;
  meta_title: string;
  meta_description: string;
  meta_keywords?: string;
  og_title?: string;
  og_description?: string;
  og_image_url?: string;
  robots?: string;
};

export function SeoSettingsPage() {
  const [pages, setPages] = useState<SeoRecord[]>([]);
  const [selected, setSelected] = useState<string>('/');
  const [filterCategory, setFilterCategory] = useState<'all' | 'core' | 'gst' | 'license'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState<SeoRecord>({
    route_path: '/',
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
    og_title: '',
    og_description: '',
    og_image_url: '',
    robots: 'index, follow',
  });
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ pages: SeoRecord[] }>('/api/admin/seo').then((d) => {
      setPages(d.pages || []);
      const home = d.pages?.find((p) => p.route_path === '/');
      if (home) {
        setSelected(home.route_path);
        setForm({
          route_path: home.route_path,
          meta_title: home.meta_title ?? '',
          meta_description: home.meta_description ?? '',
          meta_keywords: home.meta_keywords ?? '',
          og_title: home.og_title ?? '',
          og_description: home.og_description ?? '',
          og_image_url: home.og_image_url ?? '',
          robots: home.robots ?? 'index, follow',
        });
      }
    }).catch(() => {});
  }, []);

  const selectPage = (path: string) => {
    const page = pages.find((p) => p.route_path === path);
    setSelected(path);
    setForm({
      route_path: path,
      meta_title: page?.meta_title ?? '',
      meta_description: page?.meta_description ?? '',
      meta_keywords: page?.meta_keywords ?? '',
      og_title: page?.og_title ?? '',
      og_description: page?.og_description ?? '',
      og_image_url: page?.og_image_url ?? '',
      robots: page?.robots ?? 'index, follow',
    });
    setSaved(false);
    setApplied(false);
  };

  const handleSave = async (isApply = false) => {
    if (!selected) return;
    setSaving(true);
    try {
      const payload = {
        meta_title: form.meta_title,
        meta_description: form.meta_description,
        meta_keywords: form.meta_keywords || undefined,
        og_title: form.og_title || undefined,
        og_description: form.og_description || undefined,
        og_image_url: form.og_image_url || undefined,
        robots: form.robots || 'index, follow',
      };

      await api(`/api/admin/seo/${encodeURIComponent(selected)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      // Update local state in pages list
      setPages((curr) =>
        curr.map((p) => (p.route_path === selected ? { ...p, ...payload } : p))
      );

      if (isApply) {
        setApplied(true);
        setTimeout(() => setApplied(false), 4000);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update SEO tags');
    } finally {
      setSaving(false);
    }
  };

  // Route categorization
  const filteredRoutes = useMemo(() => {
    return pages.filter((p) => {
      const matchesSearch = searchQuery === '' || p.route_path.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filterCategory === 'core') {
        const corePaths = ['/', '/services', '/pricing', '/how-it-works', '/resources', '/contact', '/login', '/signup', '/privacy', '/terms'];
        return corePaths.includes(p.route_path);
      }
      if (filterCategory === 'gst') {
        return p.route_path.startsWith('/services/gst-');
      }
      if (filterCategory === 'license') {
        return p.route_path.startsWith('/services/business-licenses');
      }
      return true;
    });
  }, [pages, filterCategory, searchQuery]);

  const titleLength = form.meta_title.length;
  const descLength = form.meta_description.length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Search Engine Optimization (SEO)</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {pages.length} Webpages Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage meta tags, target keywords, Google snippets, and OpenGraph social cards for every public route
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={saving || !selected}
            onClick={() => handleSave(false)}
            className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-sm"
          >
            {saved ? '✓ Saved' : 'Save'}
          </button>
          <button
            type="button"
            disabled={saving || !selected}
            onClick={() => handleSave(true)}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
          >
            <span>🚀</span>
            {applied ? '✓ Applied Live' : 'Save & Apply'}
          </button>
        </div>
      </div>

      {applied && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2 font-medium">
            <span className="text-base">✓</span>
            <span>SEO metadata successfully updated and applied live to <strong>{selected}</strong>!</span>
          </div>
          <a
            href={getLiveWebUrl(selected)}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1 rounded-lg bg-emerald-700 text-white font-bold text-[11px] hover:bg-emerald-800 transition"
          >
            View Live Webpage ↗
          </a>
        </div>
      )}

      {/* Main Grid: Left routes list, Right metadata editor & Google preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Routes Navigator */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-3 flex flex-col h-fit">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Indexed Webpages</span>
              <span className="text-[11px] font-mono text-slate-400">Showing {filteredRoutes.length} of {pages.length}</span>
            </div>

            {/* Filter Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl text-[11px] font-bold">
              <button
                onClick={() => setFilterCategory('all')}
                className={`py-1 rounded-lg transition ${filterCategory === 'all' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilterCategory('core')}
                className={`py-1 rounded-lg transition ${filterCategory === 'core' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Core (10)
              </button>
              <button
                onClick={() => setFilterCategory('gst')}
                className={`py-1 rounded-lg transition ${filterCategory === 'gst' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                GST (8)
              </button>
              <button
                onClick={() => setFilterCategory('license')}
                className={`py-1 rounded-lg transition ${filterCategory === 'license' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Licenses (9)
              </button>
            </div>

            {/* Search Box */}
            <input
              type="text"
              placeholder="Search route (e.g. refund, fssai)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="max-h-[560px] overflow-y-auto space-y-1 pr-1">
            {filteredRoutes.map((p) => {
              const isSelected = selected === p.route_path;
              return (
                <button
                  key={p.route_path}
                  onClick={() => selectPage(p.route_path)}
                  className={`text-xs w-full text-left px-3 py-2.5 rounded-xl font-mono transition flex items-center justify-between group ${
                    isSelected
                      ? 'bg-blue-50 text-blue-800 font-bold border-l-4 border-blue-600 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate pr-2">{p.route_path}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 group-hover:bg-slate-200 shrink-0 font-sans">
                    Edit
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Metadata Editor & Live Google Search / Social Previews */}
        <div className="lg:col-span-8 space-y-6">
          {selected ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      Target Webpage
                    </span>
                    <a
                      href={getLiveWebUrl(selected)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1"
                    >
                      Open Live Route ↗
                    </a>
                  </div>
                  <h2 className="text-base font-extrabold text-slate-900 mt-1 font-mono">{selected}</h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSave(false)}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-sm"
                  >
                    {saved ? '✓ Saved' : 'Save'}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSave(true)}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                  >
                    <span>🚀</span>
                    {applied ? '✓ Applied Live' : 'Apply to Live Webpage'}
                  </button>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                {/* Meta Title */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-700">Meta Page Title</label>
                    <span className={`text-[11px] font-mono font-semibold ${titleLength > 60 ? 'text-amber-600' : 'text-slate-400'}`}>
                      {titleLength}/60 chars (Recommended: 50-60)
                    </span>
                  </div>
                  <input
                    placeholder="E.g. GST Registration Services India | Fast & Compliant | GSTBro"
                    value={form.meta_title}
                    onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                  />
                </div>

                {/* Meta Description */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-700">Meta Description</label>
                    <span className={`text-[11px] font-mono font-semibold ${descLength > 160 ? 'text-amber-600' : 'text-slate-400'}`}>
                      {descLength}/160 chars (Recommended: 150-160)
                    </span>
                  </div>
                  <textarea
                    placeholder="Full-scope professional GST filing, monthly GSTR-1 & 3B compliance, and end-to-end statutory assistance..."
                    value={form.meta_description}
                    onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
                    rows={3}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium leading-relaxed"
                  />
                </div>

                {/* Keywords & Robots */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Target Keywords (Comma Separated)</label>
                    <input
                      placeholder="gst filing, gstr-1, gst returns, fssai license"
                      value={form.meta_keywords}
                      onChange={(e) => setForm({ ...form, meta_keywords: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Search Engine Robots Directive</label>
                    <select
                      value={form.robots || 'index, follow'}
                      onChange={(e) => setForm({ ...form, robots: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                    >
                      <option value="index, follow">index, follow (Default - Recommended)</option>
                      <option value="noindex, follow">noindex, follow (Do not index, follow links)</option>
                      <option value="noindex, nofollow">noindex, nofollow (Private)</option>
                      <option value="index, nofollow">index, nofollow</option>
                    </select>
                  </div>
                </div>

                {/* OpenGraph Overrides */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Social Card Title (OG:Title Override)</label>
                    <input
                      placeholder="Leave blank to use Meta Title"
                      value={form.og_title}
                      onChange={(e) => setForm({ ...form, og_title: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Social Card Image URL (OG:Image)</label>
                    <input
                      placeholder="https://... (1200x630 banner)"
                      value={form.og_image_url}
                      onChange={(e) => setForm({ ...form, og_image_url: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-[11px]"
                    />
                  </div>
                </div>

                {/* GOOGLE SEARCH CARD LIVE PREVIEW */}
                <div className="mt-5 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Google Search Snippet Preview
                    </span>
                    <span className="text-[10px] text-slate-400">Desktop & Mobile View</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-700">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-extrabold text-[10px] flex items-center justify-center">
                      G
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-slate-800">GSTBro India</div>
                      <div className="text-[10px] text-slate-500 font-mono">https://gstbro.in{selected}</div>
                    </div>
                  </div>

                  <p className="text-[#1a0dab] hover:underline font-semibold text-base cursor-pointer leading-snug">
                    {form.meta_title || 'GSTBro - Chartered Accountant Tax & GST Solutions'}
                  </p>

                  <p className="text-xs text-[#4d5156] leading-relaxed line-clamp-2">
                    {form.meta_description || 'India’s trusted GST compliance platform for businesses and CA practices.'}
                  </p>
                </div>

                {/* BOTTOM SAVE & APPLY BAR */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <a
                    href={getLiveWebUrl(selected)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1"
                  >
                    Open Live Webpage ↗
                  </a>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleSave(false)}
                      className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-sm"
                    >
                      {saved ? '✓ Changes Saved' : 'Save'}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleSave(true)}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                    >
                      <span>🚀</span>
                      {applied ? '✓ Applied Live' : 'Apply to Live Webpage'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-12 text-center text-slate-400">
              <p className="text-xs font-semibold">Select an indexed route from the left to edit its meta tags and SEO card.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 3. SITE SETTINGS PAGE (WEBPAGE CUSTOMIZATION & SAVE / APPLY BUTTONS)
// =========================================================================
export function SiteSettingsPage() {
  const [settings, setSettings] = useState({
    site_name: '',
    contact_email: '',
    contact_phone: '',
    favicon_url: '',
    logo_url: '',
    office_address: '',
    office_city: '',
    google_maps_url: '',
    map_embed_url: '',
    announcement_bar_text: '',
    announcement_bar_enabled: 'false',
    announcement_bar_url: '',
    footer_tagline: '',
    business_hours: '',
    home_trust_badge: '',
    home_hero_eyebrow: '',
    home_hero_title: '',
    home_hero_subtitle: '',
    home_hero_cta_primary: '',
    home_hero_cta_secondary: '',
    home_hero_image_url: '',
    home_stat_clients: '',
    home_stat_returns: '',
    home_stat_experience: '',
    home_stat_satisfaction: '',
    home_cta_title: '',
    home_cta_subtitle: '',
  });

  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/settings/public`)
      .then((r) => r.json())
      .then((d) =>
        setSettings({
          site_name: d.siteName ?? '',
          contact_email: d.contactEmail ?? '',
          contact_phone: d.contactPhone ?? '',
          favicon_url: d.faviconUrl ?? '',
          logo_url: d.logoUrl ?? '',
          office_address: d.officeAddress ?? '',
          office_city: d.officeCity ?? '',
          google_maps_url: d.googleMapsUrl ?? '',
          map_embed_url: d.mapEmbedUrl ?? '',
          announcement_bar_text: d.announcementBarText ?? '',
          announcement_bar_enabled: d.announcementBarEnabled ? 'true' : 'false',
          announcement_bar_url: d.announcementBarUrl ?? '',
          footer_tagline: d.footerTagline ?? '',
          business_hours: d.businessHours ?? '',
          home_trust_badge: d.homepage?.heroTrustBadge ?? '',
          home_hero_eyebrow: d.homepage?.heroEyebrow ?? '',
          home_hero_title: d.homepage?.heroTitle ?? '',
          home_hero_subtitle: d.homepage?.heroSubtitle ?? '',
          home_hero_cta_primary: d.homepage?.heroCtaPrimary ?? '',
          home_hero_cta_secondary: d.homepage?.heroCtaSecondary ?? '',
          home_hero_image_url: d.homepage?.heroImageUrl ?? '',
          home_stat_clients: d.homepage?.statClients ?? '',
          home_stat_returns: d.homepage?.statReturns ?? '',
          home_stat_experience: d.homepage?.statExperience ?? '',
          home_stat_satisfaction: d.homepage?.statSatisfaction ?? '',
          home_cta_title: d.homepage?.ctaTitle ?? '',
          home_cta_subtitle: d.homepage?.ctaSubtitle ?? '',
        })
      )
      .catch(() => {});
  }, []);

  const handleSave = async (isApply = false) => {
    setSaving(true);
    try {
      await api('/api/admin/settings/site', { method: 'PUT', body: JSON.stringify(settings) });
      if (isApply) {
        setApplied(true);
        setTimeout(() => setApplied(false), 4000);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save site configuration');
    } finally {
      setSaving(false);
    }
  };

  const uploadFavicon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/settings/favicon`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('gst_admin_token') || localStorage.getItem('gst_token')}` },
        body: form,
      });
      const data = await res.json();
      if (data.faviconUrl) {
        setSettings((curr) => ({ ...curr, favicon_url: data.faviconUrl }));
      }
    } catch {
      alert('Failed to upload favicon.');
    }
  };

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/settings/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('gst_admin_token') || localStorage.getItem('gst_token')}` },
        body: form,
      });
      const data = await res.json();
      if (data.logoUrl) {
        setSettings((curr) => ({ ...curr, logo_url: data.logoUrl }));
      }
    } catch {
      alert('Failed to upload logo.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Website Customizer & CMS Control</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Live Webpage Sync
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Modify all public website elements including top announcement banner, brand headers, hero copy, and contact info
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(false)}
            className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-sm"
          >
            {saved ? '✓ Saved' : 'Save'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(true)}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
          >
            <span>🚀</span>
            {applied ? '✓ Applied Live' : 'Save & Apply'}
          </button>
        </div>
      </div>

      {/* Applied Live Confirmation Banner */}
      {applied && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2 font-medium">
            <span className="text-base">✓</span>
            <span>All webpage changes saved and applied live! Visitors will immediately see the updated content.</span>
          </div>
          <a
            href={getLiveWebUrl('/')}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1 rounded-lg bg-emerald-700 text-white font-bold text-[11px] hover:bg-emerald-800 transition"
          >
            View Live Website ↗
          </a>
        </div>
      )}

      <div className="max-w-4xl space-y-6">
        {/* SECTION 1: GLOBAL TOP ANNOUNCEMENT BAR */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Top Announcement Banner</h2>
              <p className="text-xs text-slate-400 mt-0.5">Displays a prominent alert/offer banner across the top of all public pages</p>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.announcement_bar_enabled === 'true'}
                onChange={(e) =>
                  setSettings({ ...settings, announcement_bar_enabled: e.target.checked ? 'true' : 'false' })
                }
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              Enable Banner on Website
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Banner Announcement Text</label>
              <input
                placeholder="⚡ Free 15-Min CA Compliance Review & Notice Defense Consultation — Book Now"
                value={settings.announcement_bar_text}
                onChange={(e) => setSettings({ ...settings, announcement_bar_text: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Action Link URL or Route</label>
              <input
                placeholder="/contact or https://wa.me/91..."
                value={settings.announcement_bar_url}
                onChange={(e) => setSettings({ ...settings, announcement_bar_url: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-xs"
              />
            </div>
          </div>

          {/* Announcement Bar Live Preview */}
          {settings.announcement_bar_enabled === 'true' && settings.announcement_bar_text && (
            <div className="p-3 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm">
              <span className="truncate pr-2">{settings.announcement_bar_text}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/20 uppercase tracking-wider shrink-0">
                Action Link ↗
              </span>
            </div>
          )}
        </div>

        {/* SECTION 2: BUSINESS IDENTITY & CONTACT */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Business Identity & Contact Points</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Site / Company Name</label>
              <input
                value={settings.site_name}
                onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Helpline Phone Number</label>
              <input
                placeholder="+91 98765 43210"
                value={settings.contact_phone}
                onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Support Email Address</label>
              <input
                type="email"
                placeholder="support@gstbro.in"
                value={settings.contact_email}
                onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Operating Business Hours</label>
              <input
                placeholder="Mon - Sat: 9:00 AM - 7:00 PM IST"
                value={settings.business_hours}
                onChange={(e) => setSettings({ ...settings, business_hours: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 mb-3"
              />
              <label className="block text-xs font-bold text-slate-700 mb-1">Footer Brand Tagline</label>
              <input
                placeholder="Institutional Tax Operations & Practice Automation."
                value={settings.footer_tagline}
                onChange={(e) => setSettings({ ...settings, footer_tagline: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Physical Office Address</label>
              <textarea
                rows={4}
                placeholder="Plot No. 42, Cyber Towers Area, Hitech City, Madhapur, Hyderabad 500081"
                value={settings.office_address}
                onChange={(e) => setSettings({ ...settings, office_address: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Office City & State</label>
              <input
                placeholder="Hyderabad, Telangana"
                value={settings.office_city}
                onChange={(e) => setSettings({ ...settings, office_city: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Google Maps Direct Link</label>
              <input
                placeholder="https://maps.google.com/?q=..."
                value={settings.google_maps_url}
                onChange={(e) => setSettings({ ...settings, google_maps_url: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-xs"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Google Maps Iframe Embed URL (Contact Page Map)
            </label>
            <input
              placeholder="https://www.google.com/maps/embed?pb=..."
              value={settings.map_embed_url}
              onChange={(e) => setSettings({ ...settings, map_embed_url: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 mb-2 font-mono text-xs"
            />
            {settings.map_embed_url && (
              <div className="w-full h-32 rounded-xl overflow-hidden border border-slate-200 mt-2 bg-slate-50">
                <iframe
                  title="Admin Map Preview"
                  src={settings.map_embed_url}
                  className="w-full h-full border-0"
                  loading="lazy"
                />
              </div>
            )}
          </div>

          {/* Logo & Favicon upload */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Website Brand Logo</label>
              {settings.logo_url && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-2 flex items-center justify-between">
                  <img src={settings.logo_url} alt="Logo" className="h-8 max-w-48 object-contain" />
                  <span className="text-[10px] text-emerald-600 font-bold uppercase">Active Logo</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={uploadLogo} className="text-xs text-slate-600 block mb-2" />
              <input
                placeholder="Or paste direct logo URL"
                value={settings.logo_url}
                onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Favicon Icon (32x32)</label>
              {settings.favicon_url && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-2 flex items-center gap-2">
                  <img src={settings.favicon_url} alt="Favicon" className="w-6 h-6 object-contain" />
                  <span className="text-xs text-slate-500 font-mono">Current favicon active</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={uploadFavicon} className="text-xs text-slate-600 block mb-2" />
              <input
                placeholder="Or paste direct favicon URL"
                value={settings.favicon_url}
                onChange={(e) => setSettings({ ...settings, favicon_url: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: HOMEPAGE HERO SECTION */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Homepage Hero Section</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Trust Badge Pill (Top Hero)</label>
              <input
                placeholder="★ 4.9/5 Rating • Supervised by Real Chartered Accountants"
                value={settings.home_trust_badge}
                onChange={(e) => setSettings({ ...settings, home_trust_badge: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hero Eyebrow Tagline</label>
                <input
                  placeholder="Your Trusted Partner for GST Compliance"
                  value={settings.home_hero_eyebrow}
                  onChange={(e) => setSettings({ ...settings, home_hero_eyebrow: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hero Illustration / Image URL</label>
                <input
                  placeholder="https://... (Optional hero image)"
                  value={settings.home_hero_image_url}
                  onChange={(e) => setSettings({ ...settings, home_hero_image_url: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Main Value Proposition Headline (H1)</label>
              <input
                placeholder="Never Worry About GST Deadlines, Penalties or Notices Again."
                value={settings.home_hero_title}
                onChange={(e) => setSettings({ ...settings, home_hero_title: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Hero Descriptive Subtitle</label>
              <textarea
                placeholder="Automate monthly GSTR-1 & 3B filings, lock down 100% of eligible 2B Input Tax Credit..."
                value={settings.home_hero_subtitle}
                onChange={(e) => setSettings({ ...settings, home_hero_subtitle: e.target.value })}
                rows={3}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Primary Hero CTA Button Label</label>
                <input
                  placeholder="Book Free 15-Min CA Strategy Call"
                  value={settings.home_hero_cta_primary}
                  onChange={(e) => setSettings({ ...settings, home_hero_cta_primary: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Secondary Hero CTA Button Label</label>
                <input
                  placeholder="View Transparent Plans"
                  value={settings.home_hero_cta_secondary}
                  onChange={(e) => setSettings({ ...settings, home_hero_cta_secondary: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: HOMEPAGE PROOF COUNTERS */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Homepage Proof Counters</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Clients Metric</label>
              <input
                value={settings.home_stat_clients}
                onChange={(e) => setSettings({ ...settings, home_stat_clients: e.target.value })}
                placeholder="500+"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-center"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Returns Filed</label>
              <input
                value={settings.home_stat_returns}
                onChange={(e) => setSettings({ ...settings, home_stat_returns: e.target.value })}
                placeholder="10,000+"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-center"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Years Experience</label>
              <input
                value={settings.home_stat_experience}
                onChange={(e) => setSettings({ ...settings, home_stat_experience: e.target.value })}
                placeholder="12+ Yrs"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-center"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Satisfaction Rate</label>
              <input
                value={settings.home_stat_satisfaction}
                onChange={(e) => setSettings({ ...settings, home_stat_satisfaction: e.target.value })}
                placeholder="99.4%"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-center"
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: BOTTOM CONSULTATION & PRE-FOOTER CTA */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Pre-Footer Consultation CTA Bar</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">CTA Headline</label>
              <input
                placeholder="Stop Stressing Over Monthly GST Deadlines."
                value={settings.home_cta_title}
                onChange={(e) => setSettings({ ...settings, home_cta_title: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">CTA Subtitle</label>
              <textarea
                placeholder="Transition your Indirect Tax compliance to a dedicated Chartered Accountant team..."
                value={settings.home_cta_subtitle}
                onChange={(e) => setSettings({ ...settings, home_cta_subtitle: e.target.value })}
                rows={2}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <a
            href={getLiveWebUrl('/')}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1"
          >
            Open Live Website ↗
          </a>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false)}
              className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-sm"
            >
              {saved ? '✓ Changes Saved' : 'Save'}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(true)}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
            >
              <span>🚀</span>
              {applied ? '✓ Applied Live' : 'Apply to Live Webpage'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
