import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiFetch, clearToken, getToken, setToken } from '../lib/api';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'SUPER_ADMIN' | 'FIRM_OWNER' | 'FIRM_PARTNER' | 'FIRM_STAFF' | 'TEAM' | 'CLIENT';
  firm_id?: string | null;
  firm_role?: string | null;
  businessName?: string | null;
  phone?: string | null;
  gstin?: string | null;
  state?: string | null;
  icaiMembershipNo?: string | null;
  icaiMembershipType?: 'FCA' | 'ACA' | null;
  copNumber?: string | null;
  partnerDesignation?: string | null;
  mustResetPassword?: boolean;
  mobileVerified?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = useCallback(async (): Promise<AuthUser | null> => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }

    try {
      const res = await apiFetch<{ user: AuthUser | null }>('/api/auth/me');
      if (res.user) {
        setUser(res.user);
        return res.user;
      } else {
        clearToken();
        setUser(null);
        return null;
      }
    } catch {
      clearToken();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Listen for automatic single-device logout when another device logs in
  useEffect(() => {
    const handleSessionInvalidated = (e: Event) => {
      clearToken();
      setUser(null);
      const detail = (e as CustomEvent)?.detail;
      const msg =
        detail?.message ||
        'Your account was logged into on another device. You have been logged out on this device for your security.';
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        try {
          sessionStorage.setItem('gstbro_logout_reason', msg);
        } catch {}
        window.location.href = '/login';
      }
    };

    window.addEventListener('gstbro:session-invalidated', handleSessionInvalidated);
    return () => window.removeEventListener('gstbro:session-invalidated', handleSessionInvalidated);
  }, []);

  const login = (token: string, userData: AuthUser) => {
    setToken(token);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Clear client state even if backend network call fails
    } finally {
      clearToken();
      setUser(null);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        login,
        logout,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
