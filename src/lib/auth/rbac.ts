import type { Role } from "./store";

export type Permission =
  | "dashboard:read"
  | "patients:read"
  | "patients:create"
  | "patients:update"
  | "patients:delete"
  | "doctors:read"
  | "appointments:read"
  | "appointments:create"
  | "appointments:update"
  | "analytics:read"
  | "ml:read"
  | "users:read"
  | "settings:read";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    "dashboard:read",
    "patients:read",
    "patients:create",
    "patients:update",
    "patients:delete",
    "doctors:read",
    "appointments:read",
    "appointments:create",
    "appointments:update",
    "analytics:read",
    "ml:read",
    "users:read",
    "settings:read",
  ],
  manager: [
    "dashboard:read",
    "patients:read",
    "doctors:read",
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
