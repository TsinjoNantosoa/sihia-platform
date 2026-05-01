import { redirect } from "@tanstack/react-router";

import { type Permission, getPermissionsForRole } from "./rbac";
import { useAuth } from "./store";

type RouteAccessKey =
  | "view_dashboard"
  | "view_patients"
  | "view_doctors"
  | "view_appointments"
  | "view_analytics"
  | "view_prediction"
  | "view_settings"
  | "manage_roles";

const ROUTE_PERMISSION_MAP: Record<RouteAccessKey, Permission> = {
  view_dashboard: "dashboard:read",
  view_patients: "patients:read",
  view_doctors: "doctors:read",
  view_appointments: "appointments:read",
  view_analytics: "analytics:read",
  view_prediction: "ml:read",
  view_settings: "settings:read",
  manage_roles: "users:read",
};

function waitForAuthHydration(timeoutMs = 1500): Promise<void> {
  const state = useAuth.getState();
  if (state.hasHydrated) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      unsubscribe();
      resolve();
    };

    const unsubscribe = useAuth.subscribe((nextState) => {
      if (nextState.hasHydrated) {
        finish();
      }
    });

    timer = setTimeout(() => {
      finish();
    }, timeoutMs);
  });
}

function getEffectivePermissions() {
  const { user, permissions } = useAuth.getState();
  if (!user) return permissions;
  return permissions.length > 0 ? permissions : getPermissionsForRole(user.role);
}

export function requireRoutePermission(accessKey: RouteAccessKey) {
  const requiredPermission = ROUTE_PERMISSION_MAP[accessKey];

  return async () => {
    await waitForAuthHydration();

    const { user, isAuthenticated } = useAuth.getState();
    if (!isAuthenticated || !user) {
      console.warn(`[RBAC] Access denied for ${accessKey}: unauthenticated user`);
      throw redirect({ to: "/login" });
    }

    const permissions = getEffectivePermissions();
    if (!permissions.includes(requiredPermission)) {
      console.warn(
        `[RBAC] Access denied for ${accessKey}: missing permission ${requiredPermission} for role ${user.role}`,
      );
      throw redirect({ to: "/403" });
    }
  };
}