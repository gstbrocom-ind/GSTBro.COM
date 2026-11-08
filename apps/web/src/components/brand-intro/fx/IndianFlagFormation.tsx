import { useEffect, useState } from 'react';

export function IndianFlagFormation() {
  const [stage, setStage] = useState<number>(0);

  useEffect(() => {
    // Stage 1: White silk canvas illuminates & initial breezes stir (50ms)
    const t1 = setTimeout(() => setStage(1), 60);
    // Stage 2: Saffron chiffon drapes billow in from top-left across to right (250ms)
    const t2 = setTimeout(() => setStage(2), 250);
    // Stage 3: Emerald green chiffon drapes sweep in across bottom (450ms)
    const t3 = setTimeout(() => setStage(3), 450);
    // Stage 4: 3D Ashoka Chakra awakens at center-left with tactile drop shadows (750ms)
    const t4 = setTimeout(() => setStage(4), 750);
    // Stage 5: Gold seal 'Satyameva Jayate' illuminates & continuous wind physics start (1050ms)
    const t5 = setTimeout(() => setStage(5), 1050);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, []);

  return (
    <div className="relative inline-flex flex-col items-center justify-center my-2 select-none pointer-events-none w-full max-w-[540px] px-2 sm:px-0">
      {/* Outer Ambient Glow radiating Saffron, White & Green */}
      <div
        className={`absolute -inset-8 rounded-3xl blur-3xl transition-opacity duration-1000 pointer-events-none ${
          stage >= 1 ? 'opacity-70 scale-100' : 'opacity-0 scale-80'
        }`}
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.4) 0%, rgba(255,103,31,0.2) 40%, rgba(19,136,8,0.2) 80%, transparent 100%)',
        }}
      />

      {/* Main Photographic Silk Stage Container */}
      <div className="relative w-full h-[200px] sm:h-[240px] rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.65)] border border-white/40 bg-gradient-to-br from-[#FAFCFF] via-[#FFFFFF] to-[#F1F5F9]">
        
        {/* Soft Pearlescent Satin Background Shadow / Creases */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_35%_50%,rgba(255,255,255,1)_0%,rgba(240,244,248,0.8)_60%,rgba(226,232,240,0.9)_100%)]" />

        {/* ========================================================================= */}
        {/* 1. FLOWING SAFFRON (KESARI) CHIFFON SILK DRAPES (TOP & RIGHT SWIRL)      */}
        {/* Translucent overlapping folds curving like real organza dupatta fabric   */}
        {/* ========================================================================= */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10 transition-all duration-1000 ease-out"
          style={{
            transform: stage >= 2 ? 'translate(0, 0) scale(1)' : 'translate(-20px, -40px) scale(0.92)',
            opacity: stage >= 2 ? 1 : 0,
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          viewBox="0 0 540 240"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Saffron Primary Rich Gradient */}
            <linearGradient id="saffronGradient1" x1="0%" y1="0%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="#FF4500" stopOpacity="0.88" />
              <stop offset="35%" stopColor="#FF671F" stopOpacity="0.92" />
              <stop offset="70%" stopColor="#FF9933" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#FFAE5C" stopOpacity="0.75" />
            </linearGradient>

            {/* Saffron Gossamer Translucent Wave 2 */}
            <linearGradient id="saffronGradient2" x1="20%" y1="0%" x2="90%" y2="100%">
              <stop offset="0%" stopColor="#FF671F" stopOpacity="0.65" />
              <stop offset="50%" stopColor="#FF9933" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#FFB347" stopOpacity="0.35" />
            </linearGradient>

            {/* Saffron Deep Shadow for Fabric Folds */}
            <linearGradient id="saffronFoldShadow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D93800" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#FF671F" stopOpacity="0.2" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>

            <filter id="silkShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="2" dy="8" stdDeviation="6" floodColor="#9A2E00" floodOpacity="0.28" />
            </filter>
          </defs>

          {/* Deep Underlying Fabric Fold */}
          <path
            d="M -20 -10 C 120 20, 220 5, 340 45 C 440 80, 520 120, 560 210 L 560 -10 Z"
            fill="url(#saffronFoldShadow)"
          />

          {/* Primary Flowing Saffron Drape (Billowing diagonally across top & right) */}
          <path
            d="M -30 -10 C 90 40, 200 15, 310 65 C 420 110, 480 150, 560 190 L 560 -20 Z"
            fill="url(#saffronGradient1)"
            filter="url(#silkShadow)"
            className="animate-pulse"
            style={{ animationDuration: '6s' }}
          />

          {/* Top Translucent Gossamer Overlap (Swirling organza highlights) */}
          <path
            d="M -10 -15 C 130 55, 230 -10, 370 40 C 470 75, 520 95, 560 130 L 560 -15 Z"
            fill="url(#saffronGradient2)"
          />

          {/* Golden Sheen Highlight Line tracing the fabric crest */}
          <path
            d="M 10 12 C 140 42, 230 18, 330 60 C 420 98, 480 140, 550 175"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="opacity-80"
          />
        </svg>

        {/* ========================================================================= */}
        {/* 2. FLOWING EMERALD GREEN (HARITA) SILK DRAPES (BOTTOM SWIRL)             */}
        {/* Gossamer fabric sweeping across bottom and curling gently upward         */}
        {/* ========================================================================= */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10 transition-all duration-1000 ease-out"
          style={{
            transform: stage >= 3 ? 'translate(0, 0) scale(1)' : 'translate(-20px, 40px) scale(0.92)',
            opacity: stage >= 3 ? 1 : 0,
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          viewBox="0 0 540 240"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="greenGradient1" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#006622" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#00843D" stopOpacity="0.85" />
              <stop offset="75%" stopColor="#138808" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#22C55E" stopOpacity="0.55" />
            </linearGradient>

            <linearGradient id="greenGradient2" x1="0%" y1="80%" x2="80%" y2="0%">
              <stop offset="0%" stopColor="#00843D" stopOpacity="0.65" />
              <stop offset="50%" stopColor="#138808" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#4ADE80" stopOpacity="0.25" />
            </linearGradient>

            <filter id="greenShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="-2" dy="-6" stdDeviation="6" floodColor="#004D1A" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Lower Deep Fabric Wave */}
          <path
            d="M -20 260 C 100 180, 220 230, 360 210 C 440 200, 500 235, 560 245 L 560 260 Z"
            fill="url(#greenGradient1)"
            filter="url(#greenShadow)"
          />

          {/* Translucent Gossamer Green Swirl curling near Chakra */}
          <path
            d="M -15 250 C 90 195, 180 205, 290 220 C 390 235, 470 215, 560 225 L 560 260 L -15 260 Z"
            fill="url(#greenGradient2)"
            className="animate-pulse"
            style={{ animationDuration: '7s' }}
          />

          {/* Green Fabric Crest Highlight */}
          <path
            d="M 5 215 C 95 190, 190 208, 305 222 C 400 232, 475 220, 550 230"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>

        {/* ========================================================================= */}
        {/* 3. PROMINENT 3D TACTILE ASHOKA CHAKRA (LEFT-CENTERED, AS IN PHOTO)        */}
        {/* Navy Blue Wheel with 24 Tapered Spokes, Hub, & Realistic Drop Shadow      */}
        {/* ========================================================================= */}
        <div
          className="absolute left-6 sm:left-12 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center transition-all duration-1000"
          style={{
            transform:
              stage >= 4
                ? 'translateY(-50%) scale(1) rotate(0deg)'
                : 'translateY(-50%) scale(0) rotate(-140deg)',
            opacity: stage >= 4 ? 1 : 0,
            transitionTimingFunction: 'cubic-bezier(0.34, 1.45, 0.64, 1)',
          }}
        >
          {/* Subtle Ambient Blue Radial Aura */}
          <div className="absolute inset-0 -m-4 rounded-full bg-blue-600/15 blur-xl pointer-events-none" />

          {/* Realistic 3D Tactile Ashoka Chakra SVG */}
          <svg
            className="w-28 h-28 sm:w-36 sm:h-36 text-[#002060] filter drop-shadow-[4px_12px_22px_rgba(0,32,96,0.38)] animate-spin"
            style={{
              animationDuration: '24s',
              animationTimingFunction: 'linear',
            }}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="3D Ashoka Chakra Wheel with 24 Tapered Spokes"
          >
            {/* Outer Rim Beveled Tier 1 */}
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke="#001848"
              strokeWidth="4.2"
              fill="none"
            />
            {/* Outer Rim High-Gleam Inner Edge */}
            <circle
              cx="50"
              cy="50"
              r="41.5"
              stroke="#1E3A8A"
              strokeWidth="0.9"
              fill="none"
              opacity="0.8"
            />

            {/* Perimeter Notches / Micro-teeth between spokes (24 decorative dots) */}
            {[...Array(24)].map((_, i) => (
              <circle
                key={`notch-${i}`}
                cx={50 + 44 * Math.cos((i * 15 * Math.PI) / 180)}
                cy={50 + 44 * Math.sin((i * 15 * Math.PI) / 180)}
                r="1.2"
                fill="#002D80"
              />
            ))}

            {/* 24 Authentic Tapered Spokes */}
            {/* Each spoke starts thicker at the hub and tapers gently towards the rim */}
            {[...Array(24)].map((_, i) => (
              <g key={`spoke-${i}`} transform={`rotate(${i * 15} 50 50)`}>
                {/* Tapered Spoke Polygon */}
                <polygon
                  points="48.8,50 49.3,8.5 50.7,8.5 51.2,50"
                  fill="#002060"
                />
                {/* Spoke Specular Lighting Highlight */}
                <line
                  x1="50"
                  y1="50"
                  x2="50"
                  y2="9.5"
                  stroke="#2563EB"
                  strokeWidth="0.7"
                  opacity="0.7"
                />
                {/* Spoke Outer Connector Arrowhead / Pinhead */}
                <circle cx="50" cy="8.2" r="1.3" fill="#001848" />
              </g>
            ))}

            {/* Heavy Central Hub Assembly (Beveled 3-Layer Disc) */}
            <circle cx="50" cy="50" r="11" fill="#001848" />
            <circle cx="50" cy="50" r="9.5" fill="#002060" />
            <circle cx="50" cy="50" r="4.2" fill="#1D4ED8" />
            {/* Center Axis Pin */}
            <circle cx="50" cy="50" r="2.2" fill="#FFFFFF" />
          </svg>
        </div>

        {/* ========================================================================= */}
        {/* 4. TYPOGRAPHY & NATIONAL CREST IN WHITE EXPEDITION FIELD (RIGHT SIDE)      */}
        {/* ========================================================================= */}
        <div
          className="absolute right-4 sm:right-10 top-1/2 -translate-y-1/2 z-20 max-w-[200px] sm:max-w-[260px] text-right space-y-1.5 transition-all duration-1000"
          style={{
            transform: stage >= 4 ? 'translateY(-50%) translate(0, 0)' : 'translateY(-50%) translate(20px, 0)',
            opacity: stage >= 4 ? 1 : 0,
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Saffron & Green Accent Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/85 shadow-md border border-slate-200/80 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#FF671F]" />
            <span className="text-[10px] sm:text-xs font-black tracking-widest text-slate-800 uppercase font-mono">
              BHARAT • भारत
            </span>
            <span className="w-2 h-2 rounded-full bg-[#138808]" />
          </div>

          {/* National Celebration Title */}
          <h2 className="text-sm sm:text-lg font-black tracking-tight text-slate-900 leading-tight">
            Republic of India
          </h2>

          {/* Golden Embossed Motto: Satyameva Jayate */}
          <div className="flex items-center justify-end gap-1.5 pt-0.5">
            <span className="h-[1px] w-6 bg-gradient-to-r from-transparent to-amber-500" />
            <span className="text-xs sm:text-sm font-black text-amber-600 font-serif tracking-widest drop-shadow-[0_1px_4px_rgba(217,119,6,0.3)]">
              सत्यमेव जयते
            </span>
          </div>

          <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium tracking-wider font-mono">
            TRUTH ALONE TRIUMPHS
          </p>
        </div>

        {/* Specular Wave Glaze over entire silk field */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20 z-30"
          style={{
            background:
              'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.8) 50%, transparent 80%)',
            backgroundSize: '200% 100%',
            animation: 'silkSurfaceGleam 6s ease-in-out infinite',
          }}
        />
      </div>

      {/* Surface Gleam Keyframes */}
      <style>{`
        @keyframes silkSurfaceGleam {
          0% { background-position: -150% 0; }
          50% { background-position: 150% 0; }
          100% { background-position: -150% 0; }
        }
      `}</style>
    </div>
  );
}
