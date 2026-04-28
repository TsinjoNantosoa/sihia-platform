// Auth store mocké. Token bidon stocké en localStorage. Préparé pour FastAPI.
import { create } from "zustand";
import { persist } from "zustand/middleware";

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
      setToken: (token) => set({ token, isAuthenticated: true }),
      setSession: (token, refreshToken) => set({ token, refreshToken, isAuthenticated: true }),
      login: async (email, password) => {
        const IS_PROD = import.meta.env.PROD;
        const USE_MOCKS = !IS_PROD && (import.meta.env.VITE_USE_MOCKS as string | undefined) === "true";
        try {
          const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
          const res = await fetch(`${API_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.code || err.message || err.detail || "AUTH_FAILED");
          }

          const data = await res.json();
          const token = data.access_token || data.token;
          const refreshToken = data.refresh_token ?? null;
          const claims = parseJwt(token) || {};

          set({
            token,
            refreshToken,
            permissions: Array.isArray(claims.permissions) ? claims.permissions : [],
            isAuthenticated: true,
            user: {
              id: claims.sub || claims.id || "unknown",
              name: claims.name || email.split("@")[0],
              email: claims.email || email,
              role: (claims.role as Role) || "doctor",
              facility: claims.facility || "Hôpital Central",
              avatarColor: claims.avatarColor || "var(--color-primary)",
            },
          });
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
            admin: ["dashboard:read","patients:read","patients:create","patients:update","patients:delete","doctors:read","appointments:read","appointments:create","appointments:update","analytics:read","ml:read","users:read","settings:read"],
            manager: ["dashboard:read","patients:read","doctors:read","appointments:read","analytics:read","ml:read","settings:read"],
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
        state?.setHasHydrated(true);
      },
    },
  ),
);
