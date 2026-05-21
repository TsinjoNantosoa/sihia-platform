import { useAuth } from "./store";
import { hasExplicitPermission, resolvePermissions, type Permission } from "./rbac";

/**
 * Returns true if the current user has the given permission.
 * Uses permissions from JWT claims stored in auth state.
 */
export function usePermission(permission: Permission): boolean {
  const user = useAuth((s) => s.user);
  const permissions = useAuth((s) => s.permissions);
  return hasExplicitPermission({ user, permissions }, permission);
}

export function usePermissions(): string[] {
  const user = useAuth((s) => s.user);
  const permissions = useAuth((s) => s.permissions);
  if (!user) return [];
  return resolvePermissions({ user, permissions });
}
