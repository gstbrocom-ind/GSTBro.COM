import { IndianFlagFormation } from './IndianFlagFormation';

export interface FlagRibbonProps {
  country: 'india' | 'uae' | 'usa' | 'singapore' | 'ca_day';
}

export function FlagRibbonFX({ country }: FlagRibbonProps) {
  if (country === 'india') {
    return <IndianFlagFormation />;
  }

  if (country === 'uae') {
    return (
      <div className="relative inline-flex flex-col items-center justify-center my-2 pointer-events-none">
        <div className="relative w-44 sm:w-56 h-12 rounded-xl overflow-hidden shadow-2xl border border-white/20 flex backdrop-blur-xs">
          {/* Vertical Red Stripe on Left */}
          <div className="w-12 bg-gradient-to-b from-[#FF0000] to-[#CC0000] flex items-center justify-center">
            <span className="text-xs">🇦🇪</span>
          </div>

          {/* 3 Horizontal Bands */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 bg-[#00732F]" />
            <div className="flex-1 bg-white" />
            <div className="flex-1 bg-[#000000]" />
          </div>

          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
        </div>
      </div>
    );
  }

  if (country === 'usa') {
    return (
      <div className="relative inline-flex flex-col items-center justify-center my-2 pointer-events-none">
        <div className="relative w-48 sm:w-60 h-12 rounded-xl overflow-hidden shadow-2xl border border-white/20 flex backdrop-blur-xs">
          {/* Blue Canton with Stars */}
          <div className="w-16 bg-[#002868] flex items-center justify-center text-white text-xs font-black tracking-widest">
            ★ ★ ★
          </div>

          {/* Red & White Stripes */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 bg-[#BF0A30]" />
            <div className="flex-1 bg-white" />
            <div className="flex-1 bg-[#BF0A30]" />
            <div className="flex-1 bg-white" />
            <div className="flex-1 bg-[#BF0A30]" />
          </div>

          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
        </div>
      </div>
    );
  }

  if (country === 'singapore') {
    return (
      <div className="relative inline-flex flex-col items-center justify-center my-2 pointer-events-none">
        <div className="relative w-44 sm:w-56 h-12 rounded-xl overflow-hidden shadow-2xl border border-white/20 flex flex-col backdrop-blur-xs">
          <div className="flex-1 bg-[#ED2939] flex items-center justify-start px-3 text-white text-xs gap-1.5 font-bold">
            <span>🌙</span>
            <span className="text-[9px]">★ ★ ★ ★ ★</span>
          </div>
          <div className="flex-1 bg-white flex items-center justify-end px-3">
            <span className="text-[9px] font-bold text-red-900 font-mono">Singapore 🇸🇬</span>
          </div>
        </div>
      </div>
    );
  }

  // National CA Day & GST Day (July 1st)
  return (
    <div className="relative inline-flex flex-col items-center justify-center my-2 pointer-events-none">
      <div className="relative px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 border border-amber-400/50 shadow-2xl backdrop-blur-md flex items-center gap-3">
        <span className="text-xl">⚖️</span>
        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <strong className="text-xs font-black text-amber-300 uppercase tracking-wider">
              National CA Day &amp; GST Day
            </strong>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30">
              July 1st
            </span>
          </div>
          <span className="text-[10px] text-slate-300 block font-mono">
            Saluting the Pillars of the Indian Economy • ICAI Governance
          </span>
        </div>
        <span className="text-xl">📜</span>
      </div>
    </div>
  );
}
