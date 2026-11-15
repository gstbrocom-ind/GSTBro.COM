import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { subscribeToSettingsUpdates } from '@gst/ui';
import { API_URL } from '../seo/meta.config';

type ContentMap = Record<string, string>;

interface ContentContextType {
  content: ContentMap;
  getContent: <T = any>(key: string, fallback: T) => T;
  refreshContent: () => Promise<void>;
}

const ContentContext = createContext<ContentContextType>({
  content: {},
  getContent: (_key, fallback) => fallback,
  refreshContent: async () => {},
});

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ContentMap>({});
  const lastFetchRef = useRef<number>(0);

  const fetchContent = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings/content?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setContent(data.content || {});
        lastFetchRef.current = Date.now();
      }
    } catch {
      // Graceful fallback to default values in code if network offline
    }
  }, []);

  useEffect(() => {
    // Initial fetch on mount
    fetchContent();

    // 1. Subscribe to instant cross-tab (BroadcastChannel / storage) and same-window (CustomEvent) updates
    const unsubscribe = subscribeToSettingsUpdates((payload) => {
      if (!payload || payload.type === 'CONTENT_UPDATED' || payload.type === 'SETTINGS_UPDATED') {
        fetchContent();
      }
    });

    // 2. Tab focus & visibility change revalidation (with 3-second throttle)
    const handleRevalidate = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetchRef.current > 3000) {
        fetchContent();
      }
    };

    window.addEventListener('focus', handleRevalidate);
    document.addEventListener('visibilitychange', handleRevalidate);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleRevalidate);
      document.removeEventListener('visibilitychange', handleRevalidate);
    };
  }, [fetchContent]);

  const getContent = <T = any>(key: string, fallback: T): T => {
    const raw = content[key];
    if (!raw) return fallback;
    try {
      if (typeof fallback === 'string') {
        return raw as unknown as T;
      }
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  };

  return (
    <ContentContext.Provider value={{ content, getContent, refreshContent: fetchContent }}>
      {children}
    </ContentContext.Provider>
  );
}

export function useContent<T = any>(key: string, fallback: T): T {
  const { getContent } = useContext(ContentContext);
  return getContent(key, fallback);
}

export function useContentContext() {
  return useContext(ContentContext);
}
