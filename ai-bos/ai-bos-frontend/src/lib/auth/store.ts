import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Organization } from '@/lib/api/types';
import { login as apiLogin, getOrganizations } from '@/lib/api/services';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  orgId: string | null;
  organizations: Organization[];
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  logoutAll: () => void;
  setTokens: (token: string, refreshToken: string) => void;
  setOrg: (orgId: string) => void;
  loadOrganizations: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      orgId: null,
      organizations: [],
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await apiLogin(email, password);
          set({
            user: res.user,
            token: res.token,
            refreshToken: res.refreshToken,
            orgId: res.user.orgId,
            isLoading: false,
          });
          await get().loadOrganizations();
        } catch (err) {
          set({ isLoading: false, error: (err as Error).message });
          throw err;
        }
      },

      logout: () => {
        set({ user: null, token: null, refreshToken: null, orgId: null, organizations: [] });
      },

      logoutAll: () => {
        set({ user: null, token: null, refreshToken: null, orgId: null, organizations: [] });
      },

      setTokens: (token, refreshToken) => set({ token, refreshToken }),

      setOrg: (orgId) => set({ orgId }),

      loadOrganizations: async () => {
        try {
          const orgs = await getOrganizations();
          set({ organizations: orgs });
        } catch {
          // silent fail in mock mode
        }
      },

      hasPermission: (permission: string) => {
        const { user } = get();
        if (!user) return false;
        if (user.role === 'owner' || user.role === 'admin') return true;
        return user.permissions.includes(permission);
      },

      hasAnyPermission: (permissions: string[]) => {
        const { user } = get();
        if (!user) return false;
        if (user.role === 'owner' || user.role === 'admin') return true;
        return permissions.some((p) => user.permissions.includes(p));
      },
    }),
    {
      name: 'aibos-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        orgId: state.orgId,
        organizations: state.organizations,
      }),
    }
  )
);
