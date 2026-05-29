// Session JWT (access + refresh) persistée en localStorage.
import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { resolveApiBaseUrl } from "../api/baseUrl";
import { shouldUseMocks } from "../api/mockPolicy";
import { getPermissionsForRole } from "./rbac";

export type Role = "admin" | "doctor" | "staff" | "manager";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  facility: string;
  avatarColor: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  hasHydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  setToken: (token: string) => void;
  setSession: (token: string, refreshToken: string | null) => void;
  logout: () => void;
  setHasHydrated: (value: boolean) => void;
}

const parseJwt = (token: string) => {
  try {
    const base64Url = token.split(".")[1] ?? "";
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const permissionsFromClaims = (claims: Record<string, unknown>, role: Role): string[] => {
  if (Array.isArray(claims.permissions) && claims.permissions.length > 0) {
    return claims.permissions.filter((p): p is string => typeof p === "string");
  }
  return getPermissionsForRole(role);
};

const buildSessionFromToken = (
  token: string,
  refreshToken: string | null,
  fallbackEmail?: string,
): Pick<AuthState, "token" | "refreshToken" | "permissions" | "isAuthenticated" | "user"> => {
  const claims = parseJwt(token) || {};
  const role = (claims.role as Role) || "doctor";
  const email =
    (typeof claims.email === "string" && claims.email) || fallbackEmail || "user@sihia.health";

  return {
    token,
    refreshToken,
    permissions: permissionsFromClaims(claims, role),
    isAuthenticated: true,
    user: {
      id: (claims.sub as string) || (claims.id as string) || "unknown",
      name: (claims.name as string) || email.split("@")[0],
      email,
      role,
      facility: (claims.facility as string) || "Hôpital Central",
      avatarColor: (claims.avatarColor as string) || "var(--color-primary)",
    },
  };
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      permissions: [],
      isAuthenticated: false,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setToken: (token) => set(buildSessionFromToken(token, useAuth.getState().refreshToken)),
      setSession: (token, refreshToken) => set(buildSessionFromToken(token, refreshToken)),
      login: async (email, password) => {
        const USE_MOCKS = shouldUseMocks();
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedPassword = password;
        try {
          const API_URL = resolveApiBaseUrl();
          const res = await fetch(`${API_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: normalizedEmail, password: normalizedPassword }),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            const detail = err.detail;
            const message =
              (typeof err.message === "string" && err.message) ||
              (typeof detail === "string" && detail) ||
              (typeof detail === "object" && detail?.message) ||
              err.code ||
              `HTTP_${res.status}`;
            throw new Error(message);
          }

          const data = await res.json();
          const token = data.access_token || data.token;
          const refreshToken = data.refresh_token ?? null;
          set(buildSessionFromToken(token, refreshToken, normalizedEmail));
        } catch (error) {
          const isNetworkError = error instanceof TypeError;
          if (!USE_MOCKS || !isNetworkError) {
            throw error;
          }
          console.warn("API indisponible, basculement sur le mode mock explicite", error);
          await new Promise((r) => setTimeout(r, 600)); // Simulate latency
          const role: Role = email.includes("admin")
            ? "admin"
            : email.includes("manager")
              ? "manager"
              : email.includes("staff")
                ? "staff"
                : "doctor";
          const name = email.split("@")[0].replace(/\./g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          
          const mockPermissions: Record<string, string[]> = {
            admin: ["dashboard:read","patients:read","patients:create","patients:update","patients:delete","doctors:read","doctors:update","appointments:read","appointments:create","appointments:update","analytics:read","ml:read","users:read","users:create","users:update","users:delete","settings:read"],
            manager: ["dashboard:read","patients:read","doctors:read","doctors:update","appointments:read","analytics:read","ml:read","settings:read"],
            doctor: ["dashboard:read","patients:read","patients:update","doctors:read","appointments:read","appointments:create","appointments:update","analytics:read","ml:read","settings:read"],
            staff: ["dashboard:read","patients:read","patients:create","doctors:read","appointments:read","appointments:create","settings:read"],
          };
          set({
            token: "mock-jwt-" + Math.random().toString(36).slice(2),
            refreshToken: "mock-refresh-" + Math.random().toString(36).slice(2),
            permissions: mockPermissions[role] ?? [],
            isAuthenticated: true,
            user: {
              id: "u-" + Math.random().toString(36).slice(2, 8),
              name: name || "Dr. Demo",
              email,
              role,
              facility: "Hôpital Central (Mock)",
              avatarColor: "var(--color-primary)",
            },
          });
        }
      },
      logout: () => set({ user: null, token: null, refreshToken: null, permissions: [], isAuthenticated: false }),
    }),
    {
      name: "sih-ia-auth",
      onRehydrateStorage: () => (state) => {
        if (state?.token && (!state.permissions || state.permissions.length === 0)) {
          const session = buildSessionFromToken(state.token, state.refreshToken, state.user?.email);
          useAuth.setState(session);
        }
        state?.setHasHydrated(true);
      },
    },
  ),
);

/** Attend la réhydratation persist (client uniquement, compatible SSR). */
export function useAuthHydrated() {
  const storeHydrated = useAuth((s) => s.hasHydrated);
  const [persistReady, setPersistReady] = useState(false);

  useEffect(() => {
    const persist = useAuth.persist;
    if (!persist) {
      setPersistReady(true);
      return;
    }
    if (persist.hasHydrated()) {
      setPersistReady(true);
      return;
    }
    return persist.onFinishHydration(() => setPersistReady(true));
  }, []);

  return persistReady && storeHydrated;
}
