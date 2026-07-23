import type { ReactNode } from "react";
import type { Permission } from "@/lib/auth/rbac";
import { usePermission } from "@/lib/auth/usePermission";

interface PermissionGuardProps {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renders children only if the current user has the given permission.
 * Use `fallback` to display an alternative (e.g. disabled button, null).
 */
export function PermissionGuard({ permission, children, fallback = null }: PermissionGuardProps) {
  const allowed = usePermission(permission);
  return allowed ? <>{children}</> : <>{fallback}</>;
}
