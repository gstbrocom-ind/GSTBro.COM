import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiFetch, clearToken, getToken, setToken } from '../lib/api';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'TEAM' | 'CLIENT';
  businessName?: string | null;
  phone?: string | null;
  gstin?: string | null;
  state?: string | null;
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
