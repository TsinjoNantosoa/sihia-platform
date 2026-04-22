import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth/store";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {},
  component: AppLayoutRoute,
});

function AppLayoutRoute() {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const hasHydrated = useAuth((s) => s.hasHydrated);

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
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
