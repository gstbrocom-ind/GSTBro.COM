import React from 'react';

interface PortalLoadingSkeletonProps {
  dark?: boolean;
}

export function PortalLoadingSkeleton({ dark = false }: PortalLoadingSkeletonProps) {
  const bg = dark ? 'bg-[#0b1329]' : 'bg-[#f8fafc]';
  const sidebarBg = dark ? 'bg-[#060b18] border-slate-800' : 'bg-[#0f172a] border-slate-800';
  const cardBg = dark ? 'bg-[#131d38] border-slate-800' : 'bg-white border-slate-200/80';
  const skeletonItem = dark ? 'bg-slate-800/70' : 'bg-slate-200/80';

  return (
    <div className={`min-h-screen flex font-sans ${bg} overflow-hidden`}>
      {/* Sidebar Skeleton (hidden on small screens) */}
      <aside className={`w-64 border-r hidden md:flex flex-col justify-between p-5 shrink-0 ${sidebarBg}`}>
        <div className="space-y-6">
          {/* Brand skeleton */}
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${skeletonItem} animate-shimmer`} />
            <div className={`h-6 w-28 rounded-lg ${skeletonItem} animate-shimmer`} />
          </div>

          {/* Business profile badge skeleton */}
          <div className={`p-3.5 rounded-2xl ${dark ? 'bg-slate-900/60' : 'bg-slate-800/50'} flex items-center gap-3 border border-slate-700/40`}>
            <div className={`w-10 h-10 rounded-xl ${skeletonItem} animate-shimmer shrink-0`} />
            <div className="space-y-2 flex-1">
              <div className={`h-3.5 w-3/4 rounded ${skeletonItem} animate-shimmer`} />
              <div className={`h-2.5 w-1/2 rounded ${skeletonItem} animate-shimmer`} />
            </div>
          </div>

          {/* Navigation link skeletons */}
          <div className="space-y-2 pt-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={i}
                className={`h-10 rounded-xl ${skeletonItem} animate-shimmer flex items-center px-3 gap-3`}
                style={{ opacity: 1 - i * 0.1 }}
              >
                <div className="w-4 h-4 rounded bg-slate-700/50" />
                <div className={`h-3 rounded bg-slate-700/50 ${i % 2 === 0 ? 'w-24' : 'w-32'}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom user profile skeleton */}
        <div className={`pt-4 border-t ${dark ? 'border-slate-800' : 'border-slate-800'} flex items-center gap-3`}>
          <div className={`w-8 h-8 rounded-full ${skeletonItem} animate-shimmer`} />
          <div className="space-y-1.5 flex-1">
            <div className={`h-3 w-20 rounded ${skeletonItem} animate-shimmer`} />
            <div className={`h-2 w-14 rounded ${skeletonItem} animate-shimmer`} />
          </div>
        </div>
      </aside>

      {/* Main Content Skeleton Area */}
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto space-y-6 max-w-7xl mx-auto w-full">
        {/* Top Header Skeleton */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800">
          <div className="space-y-2">
            <div className={`h-7 w-48 rounded-xl ${skeletonItem} animate-shimmer`} />
            <div className={`h-4 w-72 rounded-lg ${skeletonItem} animate-shimmer`} />
          </div>
          <div className="flex items-center gap-3">
            <div className={`h-10 w-36 rounded-xl ${skeletonItem} animate-shimmer`} />
            <div className={`h-10 w-28 rounded-xl ${skeletonItem} animate-shimmer`} />
          </div>
        </div>

        {/* 4 Stat Cards Skeleton Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`p-5 rounded-2xl border ${cardBg} shadow-xs space-y-3`}
            >
              <div className="flex items-center justify-between">
                <div className={`h-3.5 w-24 rounded ${skeletonItem} animate-shimmer`} />
                <div className={`w-7 h-7 rounded-lg ${skeletonItem} animate-shimmer`} />
              </div>
              <div className={`h-7 w-32 rounded-lg ${skeletonItem} animate-shimmer`} />
              <div className={`h-2.5 w-20 rounded ${skeletonItem} animate-shimmer`} />
            </div>
          ))}
        </div>

        {/* Large Analytics / Chart Skeleton Box */}
        <div className={`p-6 rounded-3xl border ${cardBg} shadow-xs space-y-4`}>
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <div className={`h-5 w-40 rounded-lg ${skeletonItem} animate-shimmer`} />
              <div className={`h-3 w-56 rounded ${skeletonItem} animate-shimmer`} />
            </div>
            <div className="flex gap-2">
              <div className={`h-8 w-16 rounded-lg ${skeletonItem} animate-shimmer`} />
              <div className={`h-8 w-16 rounded-lg ${skeletonItem} animate-shimmer`} />
            </div>
          </div>
          <div className={`h-64 rounded-2xl ${skeletonItem} animate-shimmer relative overflow-hidden flex items-end p-4 gap-3`}>
            {[35, 60, 45, 80, 55, 90, 75, 65, 85, 70, 95, 60].map((h, idx) => (
              <div
                key={idx}
                className="flex-1 bg-blue-500/15 rounded-t-lg transition-all"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        {/* Two Columns: Recent Filings & Compliance Notices Skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className={`p-6 rounded-3xl border ${cardBg} shadow-xs space-y-3`}>
            <div className={`h-5 w-36 rounded-lg ${skeletonItem} animate-shimmer mb-4`} />
            {[1, 2, 3].map((i) => (
              <div key={i} className={`p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3`}>
                <div className="space-y-1.5 flex-1">
                  <div className={`h-3.5 w-3/5 rounded ${skeletonItem} animate-shimmer`} />
                  <div className={`h-2.5 w-2/5 rounded ${skeletonItem} animate-shimmer`} />
                </div>
                <div className={`h-6 w-16 rounded-full ${skeletonItem} animate-shimmer`} />
              </div>
            ))}
          </div>

          <div className={`p-6 rounded-3xl border ${cardBg} shadow-xs space-y-3`}>
            <div className={`h-5 w-36 rounded-lg ${skeletonItem} animate-shimmer mb-4`} />
            {[1, 2, 3].map((i) => (
              <div key={i} className={`p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3`}>
                <div className="space-y-1.5 flex-1">
                  <div className={`h-3.5 w-1/2 rounded ${skeletonItem} animate-shimmer`} />
                  <div className={`h-2.5 w-1/3 rounded ${skeletonItem} animate-shimmer`} />
                </div>
                <div className={`h-6 w-20 rounded-lg ${skeletonItem} animate-shimmer`} />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
