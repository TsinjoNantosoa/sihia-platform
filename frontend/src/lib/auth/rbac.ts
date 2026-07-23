import type { Role } from "./store";

export interface AuthStateLike {
  user: { role: Role } | null;
  permissions: string[];
}

export type Permission =
  | "dashboard:read"
  | "patients:read"
  | "patients:create"
  | "patients:update"
  | "patients:delete"
  | "doctors:read"
  | "doctors:update"
  | "appointments:read"
  | "appointments:create"
  | "appointments:update"
  | "analytics:read"
  | "ml:read"
  | "users:read"
  | "users:create"
  | "users:update"
  | "users:delete"
  | "settings:read";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    "dashboard:read",
    "patients:read",
    "patients:create",
    "patients:update",
    "patients:delete",
    "doctors:read",
    "doctors:update",
    "appointments:read",
    "appointments:create",
    "appointments:update",
    "analytics:read",
    "ml:read",
    "users:read",
    "users:create",
    "users:update",
    "users:delete",
    "settings:read",
  ],
  manager: [
    "dashboard:read",
    "patients:read",
    "doctors:read",
    "doctors:update",
    "appointments:read",
    "analytics:read",
    "ml:read",
    "settings:read",
  ],
  doctor: [
    "dashboard:read",
    "patients:read",
    "patients:update",
    "doctors:read",
    "appointments:read",
    "appointments:create",
    "appointments:update",
    "analytics:read",
    "ml:read",
    "settings:read",
  ],
  staff: [
    "dashboard:read",
    "patients:read",
    "patients:create",
    "doctors:read",
    "appointments:read",
    "appointments:create",
    "settings:read",
  ],
};

export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function canAccess(permissions: string[] | undefined, permission: Permission): boolean {
  if (!permissions) return false;
  return permissions.includes(permission);
}

/** Permissions JWT si présentes, sinon permissions par défaut du rôle (pilote / sessions anciennes). */
export function resolvePermissions(state: AuthStateLike): string[] {
  const explicit = state.permissions ?? [];
  if (explicit.length > 0) {
    return explicit;
  }
  if (state.user?.role) {
    return getPermissionsForRole(state.user.role);
  }
  return [];
}

export function hasExplicitPermission(state: AuthStateLike, permission: Permission): boolean {
  if (!state.user) return false;
  return resolvePermissions(state).includes(permission);
}
