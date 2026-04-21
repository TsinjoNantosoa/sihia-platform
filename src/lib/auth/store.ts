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
  login: (email: string, _password: string) => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: async (email) => {
        // Mock latency
        await new Promise((r) => setTimeout(r, 500));
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
            facility: "Hôpital Central",
            avatarColor: "var(--color-primary)",
          },
        });
      },
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    { name: "sih-ia-auth" },
  ),
);
