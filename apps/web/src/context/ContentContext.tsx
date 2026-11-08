import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
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

  const fetchContent = async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings/content`);
      if (res.ok) {
        const data = await res.json();
        setContent(data.content || {});
      }
    } catch {
      // Graceful fallback to default values in code if network offline
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

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
