import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './store';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const location = useLocation();

  if (!user || !token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export function RequirePermission({
  permission,
  permissions,
  fallback = <Navigate to="/403" replace />,
  children,
}: {
  permission?: string;
  permissions?: string[];
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { hasPermission, hasAnyPermission } = useAuth();

  const allowed = permission
    ? hasPermission(permission)
    : permissions
    ? hasAnyPermission(permissions)
    : true;

  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
