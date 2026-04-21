import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth/store";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    // Note: Zustand persist hydrate côté client. Sur SSR, on laisse passer puis
    // le composant redirige si pas authentifié (évite flash mais reste robuste).
    if (typeof window !== "undefined") {
      const state = useAuth.getState();
      if (!state.isAuthenticated) {
        throw redirect({ to: "/login" });
      }
    }
  },
  component: AppLayoutRoute,
});

function AppLayoutRoute() {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  if (typeof window !== "undefined" && !isAuthenticated) {
    // Fallback côté client si l'état change
    window.location.replace("/login");
    return null;
  }
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
