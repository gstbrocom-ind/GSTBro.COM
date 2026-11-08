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
          size?: 'normal' | 'flexible' | 'compact';
          action?: string;
          retry?: 'auto' | 'never';
          'retry-interval'?: number;
          'refresh-expired'?: 'auto' | 'manual' | 'never';
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
  resetKey?: string | number;
  action?: string;
}

export function TurnstileWidget({
  onVerify,
  onExpire,
  onError,
  siteKey,
  theme = 'light',
  resetKey,
  action = 'login',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Keep callback references stable across parent re-renders so form inputs do not re-mount Turnstile
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onExpireRef.current = onExpire;
    onErrorRef.current = onError;
  });

  const activeSiteKey =
    siteKey ||
    import.meta.env.VITE_TURNSTILE_SITE_KEY ||
    '0x4AAAAAAFYp9o1y6TliVyNr';

  const [hasError, setHasError] = useState(false);
  const [errorCode, setErrorCode] = useState<string | number | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [takingTooLong, setTakingTooLong] = useState(false);

  // Handle explicit reset triggered by parent (e.g. after invalid password attempt)
  useEffect(() => {
    if (resetKey !== undefined && widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
        setIsVerified(false);
        setHasError(false);
        setTakingTooLong(false);
      } catch (_e) {
        // ignore reset errors
      }
    }
  }, [resetKey]);

  useEffect(() => {
    let isMounted = true;
    let timer: NodeJS.Timeout | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    setHasError(false);
    setIsVerified(false);
    setTakingTooLong(false);

    timer = setTimeout(() => {
      if (isMounted && !isVerified) {
        setTakingTooLong(true);
      }
    }, 6000);

    const renderWidget = () => {
      if (!isMounted || !containerRef.current || !window.turnstile) return;

      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (_e) {
          // ignore
        }
        widgetIdRef.current = null;
      }

      containerRef.current.innerHTML = '';

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: activeSiteKey,
          action,
          theme,
          size: 'normal',
          retry: 'auto',
          'retry-interval': 1500,
          'refresh-expired': 'auto',
          callback: (token: string) => {
            if (isMounted) {
              setHasError(false);
              setIsVerified(true);
              setTakingTooLong(false);
              if (timer) clearTimeout(timer);
              onVerifyRef.current(token);
            }
          },
          'expired-callback': () => {
            if (isMounted) {
              setIsVerified(false);
              onExpireRef.current?.();
            }
          },
          'timeout-callback': () => {
            if (isMounted) {
              setTakingTooLong(true);
              onExpireRef.current?.();
            }
          },
          'error-callback': (code?: string | number) => {
            console.warn('Cloudflare Turnstile notice/error code:', code);
            if (isMounted) {
              setHasError(true);
              setErrorCode(code ?? 'error');
              setTakingTooLong(true);
              onErrorRef.current?.(code);
            }
          },
        });
        widgetIdRef.current = id;
      } catch (err) {
        console.warn('Turnstile render warning:', err);
        if (isMounted) {
          setHasError(true);
          setTakingTooLong(true);
          onErrorRef.current?.('render_exception');
        }
      }
    };

    if (typeof window !== 'undefined') {
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
              onErrorRef.current?.('network_error');
            }
          };
          document.head.appendChild(script);
        } else {
          pollInterval = setInterval(() => {
            if (window.turnstile) {
              if (pollInterval) clearInterval(pollInterval);
              renderWidget();
            }
          }, 100);
        }
      }
    }

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
      if (pollInterval) clearInterval(pollInterval);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (_e) {
          // ignore cleanup errors
        }
        widgetIdRef.current = null;
      }
    };
  }, [activeSiteKey, theme, action]);

  const handleManualRetry = () => {
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
        setHasError(false);
        setTakingTooLong(false);
        setIsVerified(false);
      } catch (_e) {
        // ignore
      }
    }
  };

  return (
    <div className="my-2 flex flex-col items-center justify-center">
      <div ref={containerRef} className="min-h-[65px] flex items-center justify-center" />

      {/* Domain restriction warning if error code 300030 or 110200 */}
      {hasError && (errorCode === 300030 || errorCode === '300030' || errorCode === 110200 || errorCode === '110200') && (
        <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs text-center max-w-sm">
          <p className="font-semibold">Turnstile Domain Notice (Code {String(errorCode)}):</p>
          <p className="mt-0.5 text-[11px] leading-tight">
            Please verify that <code>gstbro.com</code> and <code>www.gstbro.com</code> are listed under Allowed Domains in your Cloudflare Turnstile dashboard.
          </p>
        </div>
      )}

      {/* Manual retry control if taking long or generic error */}
      {(takingTooLong || hasError) && !isVerified && (
        <button
          type="button"
          onClick={handleManualRetry}
          className="mt-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border border-slate-300"
        >
          <span>🔄</span>
          <span>Verification taking a while? Click to retry</span>
        </button>
      )}
    </div>
  );
}
