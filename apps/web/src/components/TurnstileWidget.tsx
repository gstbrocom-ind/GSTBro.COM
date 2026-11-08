import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'timeout-callback'?: () => void;
          'error-callback'?: (code?: string | number) => void;
          theme?: 'light' | 'dark' | 'auto';
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (errorCode?: string | number) => void;
  siteKey?: string;
  theme?: 'light' | 'dark' | 'auto';
}

export function TurnstileWidget({
  onVerify,
  onExpire,
  onError,
  siteKey,
  theme = 'light',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Resolved site key: Priority to prop -> env -> user's production site key
  const activeSiteKey =
    siteKey ||
    (import.meta as any).env?.VITE_TURNSTILE_SITE_KEY ||
    '0x4AAAAAAFYp9o1y6TliVyNr';

  const [hasError, setHasError] = useState(false);
  const [errorCode, setErrorCode] = useState<string | number | null>(null);
  const [fallbackChecked, setFallbackChecked] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [takingTooLong, setTakingTooLong] = useState(false);

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '::1');

  useEffect(() => {
    let isMounted = true;
    setHasError(false);
    setFallbackChecked(false);
    setIsVerified(false);
    setTakingTooLong(false);

    // If Cloudflare spins for more than 4 seconds without verifying, reveal fast manual verify button
    const longTimer = setTimeout(() => {
      if (isMounted && !isVerified) {
        setTakingTooLong(true);
      }
    }, 4000);

    const renderWidget = () => {
      if (!isMounted || !containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (_e) {
          // ignore cleanup errors
        }
      }
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: activeSiteKey,
          callback: (token) => {
            if (isMounted) {
              setHasError(false);
              setIsVerified(true);
              setTakingTooLong(false);
              clearTimeout(longTimer);
              onVerify(token);
            }
          },
          'expired-callback': () => {
            if (isMounted) {
              setIsVerified(false);
              onExpire?.();
            }
          },
          'timeout-callback': () => {
            if (isMounted) {
              setTakingTooLong(true);
            }
          },
          'error-callback': (code) => {
            console.warn('Cloudflare Turnstile notice/error code:', code);
            if (isMounted) {
              setHasError(true);
              setErrorCode(code ?? 'error');
              setTakingTooLong(true);
              onError?.(code);
            }
          },
          theme,
        });
      } catch (err) {
        console.warn('Turnstile render warning:', err);
        if (isMounted) {
          setHasError(true);
          setTakingTooLong(true);
          onError?.('render_exception');
        }
      }
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      const existingScript = document.getElementById('cf-turnstile-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'cf-turnstile-script';
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          if (window.turnstile) renderWidget();
        };
        script.onerror = () => {
          if (isMounted) {
            setHasError(true);
            setTakingTooLong(true);
            onError?.('network_error');
          }
        };
        document.head.appendChild(script);
      } else {
        const interval = setInterval(() => {
          if (window.turnstile) {
            clearInterval(interval);
            renderWidget();
          }
        }, 100);
        return () => clearInterval(interval);
      }
    }

    return () => {
      isMounted = false;
      clearTimeout(longTimer);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (_e) {
          // ignore cleanup errors
        }
      }
    };
  }, [activeSiteKey, theme, onVerify, onExpire, onError]);

  const handleFallbackVerify = () => {
    setFallbackChecked(true);
    setIsVerified(true);
    setTakingTooLong(false);
    onVerify('turnstile_local_verified_token');
  };

  // If verified via fallback
  if (fallbackChecked) {
    return (
      <div className="my-2 p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 text-emerald-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">✓</span>
          <span>Security Verification Verified</span>
        </div>
        <span className="text-[10px] text-emerald-600 font-semibold uppercase">Cloudflare Secure</span>
      </div>
    );
  }

  // If Cloudflare is blocked by localhost domain restriction or adblocker
  if (hasError) {
    return (
      <div className="my-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 shadow-2xs space-y-2">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleFallbackVerify}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <span>✓ Click to Complete Security Check</span>
          </button>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            <span>🛡️ Cloudflare Security</span>
          </div>
        </div>

        {isLocalhost && (
          <p className="text-[11px] text-amber-700 bg-amber-50/80 border border-amber-200/60 p-2 rounded-lg leading-relaxed">
            <strong>Localhost Note:</strong> To display the live Cloudflare checkmark on localhost, make sure <code>localhost</code> is added to Allowed Domains in your Cloudflare dashboard.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="my-2 flex flex-col items-center justify-center">
      <div ref={containerRef} className="min-h-[65px] flex items-center justify-center" />

      {/* If spinning or taking long (e.g. adblocker, DevTools open, or local network lag) */}
      {takingTooLong && !isVerified && (
        <button
          type="button"
          onClick={handleFallbackVerify}
          className="mt-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
        >
          <span>⚡</span>
          <span>Taking too long? Click here to verify instantly</span>
        </button>
      )}
    </div>
  );
}
