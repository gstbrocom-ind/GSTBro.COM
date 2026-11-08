import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  FESTIVAL_THEMES,
  resolveActiveTheme,
  type FestivalThemeConfig,
  type ThemeCategory,
} from '../../../web/src/components/brand-intro/themes.config';
import { BrandIntroOverlay } from '../../../web/src/components/brand-intro/BrandIntroOverlay';

export function BrandIntroSettingsPage() {
  const [enabled, setEnabled] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState('auto');
  const [duration, setDuration] = useState(3.5);
  const [customTitle, setCustomTitle] = useState('');
  const [customSubtitle, setCustomSubtitle] = useState('');
  const [deferLoading, setDeferLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'all' | ThemeCategory>('all');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);
  const [previewThemeId, setPreviewThemeId] = useState<string | null>(null);

  // Load existing settings
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/settings/public`)
      .then((r) => r.json())
      .then((d) => {
        if (d.brandIntro) {
          setEnabled(d.brandIntro.enabled ?? true);
          setSelectedTheme(d.brandIntro.theme || 'auto');
          setDuration(d.brandIntro.duration || 3.5);
          setCustomTitle(d.brandIntro.title || '');
          setCustomSubtitle(d.brandIntro.subtitle || '');
          setDeferLoading(d.brandIntro.deferLoading ?? false);
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async (isApply = false) => {
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        brand_intro_enabled: enabled ? 'true' : 'false',
        brand_intro_theme: selectedTheme,
        brand_intro_duration: duration.toString(),
        brand_intro_title: customTitle,
        brand_intro_subtitle: customSubtitle,
        brand_intro_defer_loading: deferLoading ? 'true' : 'false',
      };

      await api('/api/admin/settings/site', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (isApply) {
        setApplied(true);
        setTimeout(() => setApplied(false), 4000);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update brand intro settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToCorporate = () => {
    setEnabled(true);
    setSelectedTheme('corporate');
    setDuration(3.5);
    setCustomTitle('');
    setCustomSubtitle('');
    setDeferLoading(false);
  };

  const currentActive = resolveActiveTheme(selectedTheme);

  const filteredThemes = Object.values(FESTIVAL_THEMES).filter((t) => {
    if (categoryFilter === 'all') return true;
    return t.category === categoryFilter;
  });

  const getFxBadge = (fxType: string) => {
    switch (fxType) {
      case 'fireworks':
        return '🎆 Crackers & Fireworks';
      case 'petals_marigold':
      case 'petals_jasmine':
      case 'petals_rose':
      case 'petals_mixed':
        return '🌸 Flower Petal Shower';
      case 'flag_india':
        return '🇮🇳 Indian Silk Flag';
      case 'flag_uae':
        return '🇦🇪 UAE National Flag';
      case 'flag_usa':
        return '🇺🇸 USA Star Flag';
      case 'flag_singapore':
        return '🇸🇬 Singapore Flag';
      case 'flag_ca_day':
        return '⚖️ CA & GST Day Seal';
      default:
        return '⚡ Vector Light Trails';
    }
  };

  return (
    <div className="space-y-6">
      {/* Live Preview Modal */}
      {previewThemeId && (
        <BrandIntroOverlay
          preview={true}
          forcedThemeId={previewThemeId === 'auto' ? undefined : previewThemeId}
          onPreviewClose={() => setPreviewThemeId(null)}
        />
      )}

      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Brand Intro &amp; Festival Theme Engine
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Live Celebration Suite
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure procedural fireworks, crackers, flower petals, national freedom flags, and tax landmark celebrations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setPreviewThemeId(selectedTheme)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>▶ Test Live Animation</span>
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(true)}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Applying...' : applied ? '✓ Applied Live!' : saved ? '✓ Saved' : 'Save & Deploy'}
          </button>
        </div>
      </div>

      {/* Master Toggle Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Intro Sequence Status</span>
              {enabled ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active for 1st-time Visitors
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                  Turned Off (Immediate Site Load)
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500">
              When enabled, visitors see a seamless 3.5s cinematic intro with crackers, flowers, or flags once per browser session with an instant Skip button.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Deferred Loading & Speed Optimization Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1 pr-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Deferred Page Loading (High-Performance Intro Mode)</span>
              {deferLoading ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  ⚡ 60fps Full Hardware Dedication
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                  Standard Concurrent Load
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500">
              When enabled, the homepage background computations and layout are held dormant while the brand intro plays.
              100% of GPU/CPU resources are dedicated to the cinematic animation, crackers, and flower showers.
              The live website smoothly reveals the instant the intro finishes or when &apos;Skip Intro&apos; is clicked.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={deferLoading}
              onChange={(e) => setDeferLoading(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Theme Selector Grid & Category Tabs */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Celebration Presets (Crackers, Petals, Flags &amp; Tax Days)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select Automatic Calendar Matching or force any occasion manually.
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetToCorporate}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline text-left sm:text-right"
          >
            Reset to Corporate Default
          </button>
        </div>

        {/* Category Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              categoryFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Themes ({Object.keys(FESTIVAL_THEMES).length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('festival')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              categoryFilter === 'festival'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🪔 Indian Festivals
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('national_day')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              categoryFilter === 'national_day'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🇮🇳 Global Freedom Days
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('tax_ca_day')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              categoryFilter === 'tax_ca_day'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ⚖️ Tax &amp; CA Days
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('corporate')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              categoryFilter === 'corporate'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ⚡ Corporate Year-Round
          </button>
        </div>

        {/* Auto Option Banner */}
        <div
          onClick={() => setSelectedTheme('auto')}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
            selectedTheme === 'auto'
              ? 'bg-blue-50/70 border-blue-500 shadow-sm'
              : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shrink-0">
              🗓️
            </div>
            <div>
              <strong className="text-xs font-bold text-slate-900 block">
                Automatic Smart Calendar (Recommended)
              </strong>
              <span className="text-[11px] text-slate-500 leading-relaxed">
                Automatically activates Diwali, Holi, Onam, Dussehra, Independence Day, Republic Day, USA 4th of July, UAE National Day, or National CA/GST Day on their exact dates. Falls back to Corporate Default for the rest of the year.
              </span>
            </div>
          </div>
          <span
            className={`text-xs font-bold font-mono px-3 py-1.5 rounded-md border shrink-0 ${
              selectedTheme === 'auto'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-300'
            }`}
          >
            {selectedTheme === 'auto' ? 'Active ✓' : 'Select'}
          </span>
        </div>

        {/* Theme Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {filteredThemes.map((theme) => {
            const isSelected = selectedTheme === theme.id;
            return (
              <div
                key={theme.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 cursor-pointer group ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/30 shadow-md ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                }`}
                onClick={() => setSelectedTheme(theme.id)}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{theme.icon || '⚡'}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                      {theme.badge}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900">{theme.name}</h3>

                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      {getFxBadge(theme.fxType)}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    &quot;{theme.greeting}&quot; — {theme.tagline}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {theme.particleColors.slice(0, 3).map((c, i) => (
                      <span
                        key={i}
                        className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block shadow-2xs"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewThemeId(theme.id);
                      }}
                      className="text-[10px] font-bold text-slate-600 hover:text-blue-600 underline"
                    >
                      Preview FX
                    </button>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {isSelected ? 'Selected ✓' : 'Choose'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Messaging & Timing Controls */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Custom Text Overrides */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Custom Typography Overrides (Optional)</h2>
          <p className="text-xs text-slate-500">
            Leave blank to use the active theme&apos;s standard greeting, or specify custom words for your campaign.
          </p>

          <div className="space-y-3 pt-1">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Headline / Greeting
              </label>
              <input
                type="text"
                placeholder={currentActive.greeting}
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Secondary Subtitle / Tagline
              </label>
              <input
                type="text"
                placeholder={currentActive.tagline}
                value={customSubtitle}
                onChange={(e) => setCustomSubtitle(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>
          </div>
        </div>

        {/* Animation Duration & Speed Slider */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Animation Timing &amp; Speed</h2>
          <p className="text-xs text-slate-500">
            Controls how long the intro plays before automatically fading into the live website.
          </p>

          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Display Duration:</span>
              <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {duration.toFixed(1)} seconds
              </span>
            </div>

            <input
              type="range"
              min="2.5"
              max="5.0"
              step="0.5"
              value={duration}
              onChange={(e) => setDuration(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />

            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>2.5s (Snappy)</span>
              <span>3.5s (Standard)</span>
              <span>5.0s (Cinematic)</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
              <span className="font-bold text-slate-700 block">Performance &amp; User Experience SLA:</span>
              <span>
                • Displayed strictly once per browsing session.<br />
                • Instant &apos;Skip Intro&apos; and Escape key always available.<br />
                • Automated search engine bot detection bypasses crawlers for zero SEO delay.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
