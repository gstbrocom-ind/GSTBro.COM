import { useState, useEffect, useRef } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { FESTIVAL_THEMES, resolveActiveTheme, type FestivalThemeConfig } from './themes.config';
import { FireworksFX } from './fx/FireworksFX';
import { PetalShowerFX } from './fx/PetalShowerFX';
import { FlagRibbonFX } from './fx/FlagRibbonFX';

interface BrandIntroOverlayProps {
  /** If true, bypasses session storage and auto-exit for admin interactive testing */
  preview?: boolean;
  forcedThemeId?: string;
  onPreviewClose?: () => void;
  onIntroActiveChange?: (active: boolean) => void;
}

export function BrandIntroOverlay({
  preview = false,
  forcedThemeId,
  onPreviewClose,
  onIntroActiveChange,
}: BrandIntroOverlayProps) {
  const settings = useSettings();
  const [visible, setVisible] = useState(() => {
    if (preview) return true;
    if (typeof window === 'undefined') return false;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('intro') || urlParams.has('preview')) return true;

      const ua = navigator.userAgent.toLowerCase();
      const isBot = /googlebot|bingbot|yandex|duckduckbot|slurp|baiduspider|lighthouse|headlesschrome|bytespider/i.test(ua);
      if (isBot) return false;
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) return false;
      return !sessionStorage.getItem('gstbro_intro_seen');
    } catch {
      return false;
    }
  });
  const [fadingOut, setFadingOut] = useState(false);
  const [animStep, setAnimStep] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const startedRef = useRef(false);

  // Check if brand intro is enabled globally in settings
  const introConfig = settings?.brandIntro;
  const isEnabled = introConfig?.enabled ?? true;
  const rawTheme = forcedThemeId || introConfig?.theme || 'corporate';
  const durationSec = Math.max(2.5, Math.min(6.0, introConfig?.duration || 3.5));

  // Lock the active theme once started so it never switches themes mid-flight
  const activeThemeRef = useRef<FestivalThemeConfig | null>(null);
  if (!activeThemeRef.current || preview) {
    activeThemeRef.current = forcedThemeId && FESTIVAL_THEMES[forcedThemeId]
      ? FESTIVAL_THEMES[forcedThemeId]
      : resolveActiveTheme(rawTheme);
  }
  const activeTheme: FestivalThemeConfig = activeThemeRef.current;

  const displayGreeting = introConfig?.title || activeTheme.greeting;
  const displayTagline = introConfig?.subtitle || activeTheme.tagline;

  // Sync active status to parent
  useEffect(() => {
    if (onIntroActiveChange) {
      onIntroActiveChange(visible);
    }
  }, [visible, onIntroActiveChange]);

  const dismiss = () => {
    setFadingOut(true);
    setTimeout(() => {
      setVisible(false);
      setFadingOut(false);
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('intro-pending');
      }
      if (!preview && typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('gstbro_intro_seen', 'true');
        } catch {}
      }
      if (onIntroActiveChange) {
        onIntroActiveChange(false);
      }
      if (onPreviewClose) onPreviewClose();
    }, 450);
  };

  useEffect(() => {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const forceIntro = urlParams?.has('intro') || urlParams?.has('preview');

    // 1. Crawlers & Bots detection for zero SEO impact
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      const isBot = /googlebot|bingbot|yandex|duckduckbot|slurp|baiduspider|lighthouse|headlesschrome|bytespider/i.test(ua);
      if (isBot && !preview && !forceIntro) {
        setVisible(false);
        if (typeof document !== 'undefined') {
          document.documentElement.classList.remove('intro-pending');
        }
        if (onIntroActiveChange) onIntroActiveChange(false);
        return;
      }
    }

    // 2. Reduced motion check
    if (typeof window !== 'undefined' && !preview && !forceIntro) {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) {
        try {
          sessionStorage.setItem('gstbro_intro_seen', 'true');
        } catch {}
        setVisible(false);
        if (typeof document !== 'undefined') {
          document.documentElement.classList.remove('intro-pending');
        }
        if (onIntroActiveChange) onIntroActiveChange(false);
        return;
      }

      // 3. SessionStorage Check: only once per session
      const alreadySeen = sessionStorage.getItem('gstbro_intro_seen');
      if (alreadySeen) {
        setVisible(false);
        if (typeof document !== 'undefined') {
          document.documentElement.classList.remove('intro-pending');
        }
        if (onIntroActiveChange) onIntroActiveChange(false);
        return;
      }
    }

    // Wait until settings are loaded or use available fallback
    if (!preview) {
      if (!settings) {
        return;
      }
      if (startedRef.current) {
        return;
      }
      startedRef.current = true;
    }

    if (!isEnabled && !preview && !forceIntro) {
      setVisible(false);
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('intro-pending');
      }
      if (onIntroActiveChange) onIntroActiveChange(false);
      return;
    }

    // Display overlay
    setVisible(true);

    // Staggered cinematic sequence
    const t1 = setTimeout(() => setAnimStep(1), 180);  // FX & Light trails emerge
    const t2 = setTimeout(() => setAnimStep(2), 650);  // Logo & Domain reveal
    const t3 = setTimeout(() => setAnimStep(3), 1350); // Greeting, Flags & Taglines
    const tAuto = setTimeout(() => {
      dismiss();
    }, durationSec * 1000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(tAuto);
    };
  }, [settings, isEnabled, durationSec, preview, forcedThemeId]);

  // Clean up barrier class on component mount and unmount
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('intro-pending');
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('intro-pending');
      }
    };
  }, []);

  // Handle ESC key for instant accessibility skip
  useEffect(() => {
    if (!visible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismiss();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [visible]);

  // Dynamic Procedural Visual FX (Crackers, Petals, or Stardust) - High-DPI & Mobile Optimized
  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const isTouchDevice =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let width = window.innerWidth;
    let height = window.innerHeight;

    const setupCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    setupCanvas();

    // Instantiate appropriate FX engine
    let fireworksEngine: FireworksFX | null = null;
    let petalsEngine: PetalShowerFX | null = null;

    if (activeTheme.fxType === 'fireworks') {
      fireworksEngine = new FireworksFX(ctx, width, height, activeTheme.particleColors);
    } else if (activeTheme.fxType.startsWith('petals_')) {
      const preset = activeTheme.fxType.replace('petals_', '') as 'marigold' | 'rose' | 'jasmine' | 'mixed';
      petalsEngine = new PetalShowerFX(ctx, width, height, preset);
    }

    // Fallback: Ambient Stardust Particle Engine (for Corporate or Subtle backgrounds)
    interface AmbientParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      color: string;
    }

    // Scale particle count based on device capability
    const count = isTouchDevice
      ? Math.min(width < 640 ? 20 : 35, 40)
      : Math.min(width < 640 ? 30 : 55, 65);
    const ambientParticles: AmbientParticle[] = [];
    const colors = activeTheme.particleColors;

    for (let i = 0; i < count; i++) {
      ambientParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: -0.35 - Math.random() * 0.45,
        size: Math.random() * 2.2 + 0.8,
        alpha: Math.random() * 0.7 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      // 1. Render primary FX engine
      if (fireworksEngine) {
        fireworksEngine.updateAndDraw(time);
      } else if (petalsEngine) {
        petalsEngine.updateAndDraw(time);
      } else {
        // Ambient stardust (fast 2-pass drawing without expensive shadowBlur on mobile)
        for (let i = 0; i < ambientParticles.length; i++) {
          const p = ambientParticles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.alpha += Math.sin(time * 0.003 + i) * 0.008;

          if (p.y < -10) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0.1, Math.min(0.9, p.alpha));
          if (!isTouchDevice) {
            ctx.shadowBlur = p.size * 2.5;
            ctx.shadowColor = p.color;
          }
          ctx.fill();
        }
        if (!isTouchDevice) {
          ctx.shadowBlur = 0;
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    const handleResize = () => {
      setupCanvas();
      if (fireworksEngine) fireworksEngine.resize(width, height);
      if (petalsEngine) petalsEngine.resize(width, height);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [visible, activeTheme]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="GSTBro Brand Introduction"
      style={{
        background: activeTheme.bgGradient,
      }}
      className={`fixed inset-0 z-[99999] w-full h-[100dvh] min-h-[100dvh] flex flex-col justify-between overflow-x-hidden overflow-y-auto select-none touch-manipulation transition-opacity duration-500 ease-out ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* 1. Procedural Visual FX Canvas (Crackers / Petals / Stardust) */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0 w-full h-full"
        aria-hidden="true"
      />

      {/* 2. Sweeping Light Trails (Pure SVG Motion) */}
      <svg
        className={`fixed inset-0 w-full h-full pointer-events-none z-0 transition-opacity duration-1000 ${
          animStep >= 1 ? 'opacity-75 scale-100' : 'opacity-0 scale-95'
        }`}
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="trail1" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={activeTheme.trailColors[0]} stopOpacity="0" />
            <stop offset="50%" stopColor={activeTheme.trailColors[0]} stopOpacity="0.85" />
            <stop offset="100%" stopColor={activeTheme.trailColors[1]} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="trail2" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor={activeTheme.trailColors[1]} stopOpacity="0" />
            <stop offset="50%" stopColor={activeTheme.accentColor} stopOpacity="0.8" />
            <stop offset="100%" stopColor={activeTheme.trailColors[0]} stopOpacity="0" />
          </linearGradient>
          <filter id="trailGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <path
          d="M -100 850 C 350 750, 700 450, 1550 150"
          stroke="url(#trail1)"
          strokeWidth="3.5"
          filter="url(#trailGlow)"
          className="animate-pulse"
        />
        <path
          d="M -150 650 C 400 600, 950 300, 1600 -50"
          stroke="url(#trail2)"
          strokeWidth="2.2"
          filter="url(#trailGlow)"
        />
      </svg>

      {/* 3. Skip Button (Safe-Area Aware & Touch-Optimized for all devices) */}
      <div className="fixed top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-40">
        <button
          type="button"
          onClick={dismiss}
          className="group min-h-[44px] min-w-[44px] px-4 py-2.5 sm:px-5 sm:py-2 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-xs font-bold text-white backdrop-blur-lg border border-white/25 shadow-xl transition-all cursor-pointer flex items-center gap-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-400"
          aria-label="Skip brand introduction"
        >
          <span>Skip Intro</span>
          <span className="text-xs transition-transform group-hover:translate-x-1">&rarr;</span>
          <span className="text-[10px] text-white/60 ml-0.5 hidden sm:inline font-mono">[Esc]</span>
        </button>
      </div>

      {/* 4. Central Cinematic Content (Centered, Safe for Landscape & Mobile Viewports) */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 text-center space-y-3 sm:space-y-4 md:space-y-5 my-auto py-6 sm:py-8 w-full flex flex-col items-center justify-center">
        {/* Festive Badge */}
        <div
          className={`transition-all duration-700 transform ${
            animStep >= 1
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 -translate-y-4'
          }`}
        >
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 py-1.5 sm:px-4 sm:py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-white/95 backdrop-blur-md shadow-md max-w-[90vw]">
            {activeTheme.icon && <span className="text-sm shrink-0">{activeTheme.icon}</span>}
            <span className="truncate">{activeTheme.badge}</span>
          </div>
        </div>

        {/* GSTBro Brand Logo & Monogram */}
        <div
          className={`transition-all duration-700 delay-150 transform ${
            animStep >= 2
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-90 translate-y-6'
          }`}
        >
          <div className="relative inline-block">
            {/* Ambient Backlight Halo */}
            <div
              className="absolute -inset-6 sm:-inset-8 blur-3xl opacity-60 rounded-full pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${activeTheme.trailColors[0]} 0%, transparent 70%)`,
              }}
            />

            <h1 className="relative text-4xl xs:text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-none text-white drop-shadow-[0_10px_35px_rgba(0,0,0,0.8)]">
              GST
              <span
                className="text-transparent bg-clip-text"
                style={{
                  backgroundImage: `linear-gradient(135deg, #38BDF8 0%, ${activeTheme.trailColors[1]} 60%, ${activeTheme.accentColor} 100%)`,
                }}
              >
                Bro
              </span>
            </h1>

            {/* Sub-domain Label */}
            <div className="mt-1 flex items-center justify-center gap-1.5">
              <span className="h-[1px] w-4 sm:w-6 bg-gradient-to-r from-transparent to-blue-400" />
              <span className="text-[11px] sm:text-sm font-black tracking-[0.2em] sm:tracking-[0.25em] text-cyan-300 font-mono uppercase">
                GSTBro.com
              </span>
              <span className="h-[1px] w-4 sm:w-6 bg-gradient-to-l from-transparent to-blue-400" />
            </div>
          </div>
        </div>

        {/* Dynamic National Flag Ribbon (If theme has a flag) */}
        {activeTheme.flagCountry && animStep >= 2 && (
          <div
            className={`transition-all duration-700 delay-200 transform w-full flex items-center justify-center ${
              animStep >= 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}
          >
            <FlagRibbonFX country={activeTheme.flagCountry} />
          </div>
        )}

        {/* Gold Accent Divider */}
        <div
          className={`mx-auto h-[1.5px] w-20 sm:w-24 rounded-full transition-all duration-700 delay-300 ${
            animStep >= 2 ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
          }`}
          style={{
            background: `linear-gradient(90deg, transparent, ${activeTheme.accentColor}, transparent)`,
          }}
        />

        {/* Greeting & Tagline */}
        <div
          className={`space-y-1.5 sm:space-y-2 transition-all duration-700 delay-400 transform ${
            animStep >= 3
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          <h2
            className="text-base xs:text-lg sm:text-2xl font-black tracking-tight text-white/95 px-2"
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}
          >
            {displayGreeting}
          </h2>

          <p className="text-[11px] xs:text-xs sm:text-sm font-semibold tracking-wider uppercase text-slate-300 font-mono px-2">
            {displayTagline}
          </p>
        </div>

        {/* Progress Loading Track */}
        <div className="pt-2 sm:pt-3 max-w-xs mx-auto w-full px-4">
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden backdrop-blur-xs">
            <div
              className="h-full rounded-full transition-all ease-linear"
              style={{
                background: `linear-gradient(90deg, ${activeTheme.trailColors[0]}, ${activeTheme.accentColor})`,
                width: animStep >= 1 ? '100%' : '0%',
                transitionDuration: `${durationSec}s`,
              }}
            />
          </div>
        </div>
      </div>

      {/* 5. Safe Area Bottom Spacer */}
      <div className="h-[env(safe-area-inset-bottom,0px)] pointer-events-none" />
    </div>
  );
}
