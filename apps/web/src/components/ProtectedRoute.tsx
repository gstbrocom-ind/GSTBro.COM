import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: ('ADMIN' | 'TEAM' | 'CLIENT')[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // 1. Prevent protected content from being briefly displayed before authentication is verified
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-sans select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-xs font-semibold tracking-wide">
            Verifying authorized session...
          </p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated user -> Immediate redirect to login with saved return path
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. User must reset password before proceeding to any protected area
  if (user.mustResetPassword && location.pathname !== '/admin/force-reset') {
    return <Navigate to="/admin/force-reset" replace />;
  }

  // 4. Role-Based Access Control: strictly enforce authorized roles
  if (!allowedRoles.includes(user.role)) {
    if (user.role === 'CLIENT') {
      return <Navigate to="/dashboard" replace />;
    }
    if (user.role === 'TEAM') {
      return <Navigate to="/team" replace />;
    }
    if (user.role === 'ADMIN') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 5. Authenticated and role-authorized -> render protected viewport
  return <>{children}</>;
}
