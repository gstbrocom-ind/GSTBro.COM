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
    // If relative proxy fetch failed, try direct connection to backend port 3001
    const fallbackHost = typeof window !== 'undefined' && window.location?.hostname ? window.location.hostname : 'localhost';
    const fallbackUrl = `http://${fallbackHost}:3001${path}`;
    try {
      res = await fetch(fallbackUrl, { ...options, headers });
    } catch {
      throw new Error('Unable to connect to GST Bro server. Please verify the backend is running.');
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error ?? 'Request failed');
  }
  return res.json();
}
