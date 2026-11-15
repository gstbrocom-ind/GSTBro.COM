import { notifySettingsUpdated } from '@gst/ui';

const API_URL = import.meta.env.VITE_API_URL || '';

export function getToken() {
  return localStorage.getItem('gst_admin_token') ?? localStorage.getItem('gst_token');
}

export function setToken(token: string) {
  localStorage.setItem('gst_admin_token', token);
  localStorage.setItem('gst_token', token);
}

export function clearToken() {
  localStorage.removeItem('gst_admin_token');
  localStorage.removeItem('gst_token');
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
  }

  const primaryUrl = API_URL ? `${API_URL}${path}` : path;
  let res: Response;
  const requestInit: RequestInit = {
    cache: 'no-store',
    ...options,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      ...headers,
    },
  };

  try {
    res = await fetch(primaryUrl, requestInit);
  } catch {
    const isLocal =
      typeof window !== 'undefined' &&
      (window.location?.hostname === 'localhost' || window.location?.hostname === '127.0.0.1');
    const fallbackUrl = isLocal
      ? `http://127.0.0.1:3001${path}`
      : `https://gstbro-api.onrender.com${path}`;

    if (primaryUrl !== fallbackUrl) {
      try {
        res = await fetch(fallbackUrl, requestInit);
      } catch {
        throw new Error('Unable to connect to GST Bro server. Please verify your connection or try again later.');
      }
    } else {
      throw new Error('Unable to connect to GST Bro server. Please verify your connection or try again later.');
    }
  }

  if (!res.ok) {
    let errorMessage = `Request failed (${res.status})`;
    let errorCode = '';
    try {
      const err = await res.json();
      if (err.error || err.message) {
        errorMessage = err.error || err.message;
      }
      if (err.code) {
        errorCode = err.code;
      }
    } catch {
      try {
        const text = await res.text();
        if (text && text.length < 200 && !text.includes('<!DOCTYPE')) {
          errorMessage = text;
        }
      } catch {
        // ignore non-json error
      }
    }

    if (res.status === 401 && !path.includes('/api/auth/login')) {
      clearToken();
      if (typeof window !== 'undefined') {
        const reason = errorCode === 'SESSION_REVOKED'
          ? 'Your account was logged into on another device. You have been logged out on this device for your security.'
          : errorMessage;
        window.dispatchEvent(
          new CustomEvent('gstbro:session-invalidated', {
            detail: { message: reason },
          })
        );
      }
    }

    throw new Error(errorMessage);
  }

  const data = await res.json();

  // If this was a successful write operation to site settings, content, or SEO, immediately notify public website listeners
  const method = (options.method || 'GET').toUpperCase();
  if (['PUT', 'POST', 'PATCH', 'DELETE'].includes(method)) {
    if (path.includes('/api/admin/settings/content')) {
      notifySettingsUpdated('CONTENT_UPDATED');
    } else if (path.includes('/api/admin/seo')) {
      notifySettingsUpdated('SEO_UPDATED');
    } else if (path.includes('/api/admin/settings')) {
      notifySettingsUpdated('SETTINGS_UPDATED');
    }
  }

  return data;
}
