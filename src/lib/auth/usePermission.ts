import { useAuth } from "./store";
import { getPermissionsForRole, type Permission } from "./rbac";

/**
 * Returns true if the current user has the given permission.
 * Uses permissions from JWT claims stored in auth state.
 * Falls back to role-based mapping if permissions array is empty.
 */
export function usePermission(permission: Permission): boolean {
  const user = useAuth((s) => s.user);
  const permissions = useAuth((s) => s.permissions);
  if (!user) return false;
  const perms = permissions.length > 0 ? permissions : getPermissionsForRole(user.role);
  return perms.includes(permission);
}

export function usePermissions(): string[] {
  const user = useAuth((s) => s.user);
  const permissions = useAuth((s) => s.permissions);
  if (!user) return [];
  return permissions.length > 0 ? permissions : getPermissionsForRole(user.role);
}
