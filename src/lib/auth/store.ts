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
  isAuthenticated: boolean;
  hasHydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
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
      isAuthenticated: false,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
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
          const claims = parseJwt(token) || {};

          set({
            token,
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
          
          set({
            token: "mock-jwt-" + Math.random().toString(36).slice(2),
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
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: "sih-ia-auth",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
