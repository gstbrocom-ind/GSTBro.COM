const API_URL = import.meta.env.VITE_API_URL || '';

export function getToken(): string | null {
  return localStorage.getItem('gst_token');
}

export function setToken(token: string): void {
  localStorage.setItem('gst_token', token);
  localStorage.setItem('gst_admin_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('gst_token');
  localStorage.removeItem('gst_admin_token');
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
  }

  const primaryUrl = API_URL ? `${API_URL}${path}` : path;
  let res: Response;
  try {
    res = await fetch(primaryUrl, { ...options, headers });
  } catch {
    const isLocal =
      typeof window !== 'undefined' &&
      (window.location?.hostname === 'localhost' || window.location?.hostname === '127.0.0.1');
    const fallbackUrl = isLocal
      ? `http://127.0.0.1:3001${path}`
      : `https://gstbro-api.onrender.com${path}`;

    if (primaryUrl !== fallbackUrl) {
      try {
        res = await fetch(fallbackUrl, { ...options, headers });
      } catch {
        throw new Error('Unable to connect to GST Bro server. Please verify your connection or try again later.');
      }
    } else {
      throw new Error('Unable to connect to GST Bro server. Please verify your connection or try again later.');
    }
  }

  if (!res.ok) {
    let errorMessage = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      if (err.error || err.message) {
        errorMessage = err.error || err.message;
      }
    } catch {
      try {
        const text = await res.text();
        if (text && text.length < 200 && !text.includes('<!DOCTYPE')) {
          errorMessage = text;
        }
      } catch {
        // ignore non-json response text error
      }
    }
    throw new Error(errorMessage);
  }
  return res.json();
}
