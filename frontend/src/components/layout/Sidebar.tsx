import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  CalendarDays,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Settings,
  WifiOff,
  Bell,
  Armchair,
  BookOpenText,
  PhoneCall,
} from "lucide-react";
import { useEffect, useState } from "react";
import { SidebarBrand } from "@/components/brand/SidebarBrand";
import { useT, useI18n } from "@/lib/i18n/store";
import { usePermissions } from "@/lib/auth/usePermission";
import { API_URL } from "@/lib/api/services";
import { cn } from "@/lib/utils";

const groups = [
  {
    labelKey: "nav.section.overview",
    items: [
      {
        to: "/",
        labelKey: "nav.dashboard",
        icon: LayoutDashboard,
        exact: true,
        permission: "dashboard:read",
      },
      {
        to: "/notifications",
        labelKey: "nav.notifications",
        icon: Bell,
        permission: "dashboard:read",
      },
      {
        to: "/analytics",
        labelKey: "nav.analytics",
        icon: BarChart3,
        permission: "analytics:read",
      },
    ],
  },
  {
    labelKey: "nav.section.hospital",
    items: [
      { to: "/patients", labelKey: "nav.patients", icon: Users, permission: "patients:read" },
      { to: "/doctors", labelKey: "nav.doctors", icon: Stethoscope, permission: "doctors:read" },
      {
        to: "/appointments",
        labelKey: "nav.appointments",
        icon: CalendarDays,
        permission: "appointments:read",
      },
      {
        to: "/waiting-room",
        labelKey: "nav.waitingRoom",
        icon: Armchair,
        permission: "appointments:read",
      },
    ],
  },
  {
    labelKey: "nav.section.ai",
    items: [
      {
        to: "/prediction",
        labelKey: "nav.prediction",
        icon: TrendingUp,
        beta: true,
        permission: "ml:read",
      },
      {
        to: "/voice-ai",
        labelKey: "nav.voiceAi",
        icon: PhoneCall,
        permission: "voice:read",
      },
      {
        to: "/knowledge",
        labelKey: "nav.knowledge",
        icon: BookOpenText,
        permission: "users:read",
      },
    ],
  },
  {
    labelKey: "nav.section.admin",
    items: [
      { to: "/rbac", labelKey: "nav.rbac", icon: ShieldCheck, permission: "users:read" },
      { to: "/settings", labelKey: "nav.settings", icon: Settings, permission: "settings:read" },
    ],
  },
] as const;

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const t = useT();
  const locale = useI18n((s) => s.locale);
  const location = useLocation();
  const permissions = usePermissions();
  const isRtl = locale === "ar";

  const isActive = (to: string, exact?: boolean) =>
    exact
      ? location.pathname === to
      : location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <aside
      data-onboarding="navigation"
      aria-label={t("a11y.sidebar")}
      className={cn(
        "flex h-full w-64 shrink-0 flex-col border-border bg-sidebar",
        isRtl ? "border-l" : "border-r",
      )}
    >
      <div className="flex min-h-14 items-center border-b border-border px-4 py-3">
        <SidebarBrand onNavigate={onNavigate} />
      </div>

      <nav
        aria-label={t("a11y.primaryNavigation")}
        className="flex flex-1 flex-col gap-5 overflow-y-auto p-3"
      >
        {groups.map((g) => {
          const visibleItems = g.items.filter((item) => permissions.includes(item.permission));
          if (visibleItems.length === 0) return null;

          return (
            <div key={g.labelKey} className="flex flex-col gap-0.5">
              <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {t(g.labelKey)}
              </div>
              {visibleItems.map((item) => {
                const active = isActive(item.to, "exact" in item ? item.exact : false);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                      active
                        ? "border border-primary/20 bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <Icon
                      aria-hidden
                      className={cn(
                        "size-[18px] shrink-0",
                        active
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-foreground",
                      )}
                    />
                    <span className="flex-1 truncate">{t(item.labelKey)}</span>
                    {"beta" in item && item.beta ? (
                      <span className="rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Beta
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <ApiHealthIndicator />
      </div>
    </aside>
  );
}

type ApiStatus = "ok" | "degraded" | "down" | "checking";

function ApiHealthIndicator() {
  const t = useT();
  const [status, setStatus] = useState<ApiStatus>("checking");
  const [lastChecked, setLastChecked] = useState<string>("");

  useEffect(() => {
    const check = async () => {
      try {
        const start = Date.now();
        const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(4000) });
        const ms = Date.now() - start;
        setStatus(res.ok ? (ms > 2000 ? "degraded" : "ok") : "down");
      } catch {
        setStatus("down");
      }
      setLastChecked(
        new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      );
    };

    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, []);

  const dot: Record<ApiStatus, string> = {
    ok: "bg-success",
    degraded: "bg-warning",
    down: "bg-destructive",
    checking: "bg-muted-foreground",
  };
  const label: Record<ApiStatus, string> = {
    ok: t("a11y.systemOk"),
    degraded: t("a11y.systemDegraded"),
    down: t("a11y.systemDown"),
    checking: t("a11y.systemChecking"),
  };

  return (
    <div
      className="flex items-center gap-2"
      role="status"
      aria-live="polite"
      title={lastChecked ? `Vérifié à ${lastChecked}` : undefined}
    >
      {status === "down" ? (
        <WifiOff className="size-3.5 text-destructive" aria-hidden />
      ) : (
        <span
          aria-hidden
          className={`size-2 rounded-full ${dot[status]} ${status === "ok" ? "animate-pulse" : ""}`}
        />
      )}
      <span
        className={`text-xs font-medium ${status === "down" ? "text-destructive" : "text-muted-foreground"}`}
      >
        {label[status]}
      </span>
    </div>
  );
}
