import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth, useAuthHydrated } from "@/lib/auth/store";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {},
  component: AppLayoutRoute,
});

function AppLayoutRoute() {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const hasHydrated = useAuthHydrated();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      window.location.replace("/login");
    }
  }, [hasHydrated, isAuthenticated]);

  if (!hasHydrated || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
