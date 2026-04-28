import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  CalendarDays,
  BarChart3,
  Brain,
  ShieldCheck,
  Settings,
  HeartPulse,
  WifiOff,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useT, useI18n } from "@/lib/i18n/store";
import { usePermissions } from "@/lib/auth/usePermission";
import { API_URL } from "@/lib/api/services";
import { cn } from "@/lib/utils";

const groups = [
  {
    labelKey: "nav.section.main",
    items: [
      { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, exact: true, permission: "dashboard:read" },
      { to: "/patients", labelKey: "nav.patients", icon: Users, permission: "patients:read" },
      { to: "/doctors", labelKey: "nav.doctors", icon: Stethoscope, permission: "doctors:read" },
      { to: "/appointments", labelKey: "nav.appointments", icon: CalendarDays, permission: "appointments:read" },
    ],
  },
  {
    labelKey: "nav.section.intelligence",
    items: [
      { to: "/analytics", labelKey: "nav.analytics", icon: BarChart3, permission: "analytics:read" },
      { to: "/prediction", labelKey: "nav.prediction", icon: Brain, beta: true, permission: "ml:read" },
    ],
  },
  {
    labelKey: "nav.section.system",
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
    exact ? location.pathname === to : location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <aside
      className={cn(
        "flex h-full w-64 shrink-0 flex-col border-border bg-sidebar",
        isRtl ? "border-l" : "border-r",
      )}
    >
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[var(--shadow-card)]">
          <HeartPulse className="size-5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">{t("app.name")}</div>
          <div className="text-[10px] text-muted-foreground">Hôpital Central</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto p-3">
        {groups.map((g) => (
          <div key={g.labelKey} className="flex flex-col gap-1">
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t(g.labelKey)}
            </div>
            {g.items.filter((item) => permissions.includes(item.permission)).map((item) => {
              const active = isActive(item.to, "exact" in item ? item.exact : false);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary-soft text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                    )}
                  />
                  <span className="flex-1 truncate">{t(item.labelKey)}</span>
                  {"beta" in item && item.beta ? (
                    <span className="rounded-md bg-accent/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-accent">
                      Beta
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <ApiHealthIndicator />
      </div>
    </aside>
  );
}

type ApiStatus = "ok" | "degraded" | "down" | "checking";

function ApiHealthIndicator() {
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
      setLastChecked(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
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
    ok: "Système opérationnel",
    degraded: "Latence élevée",
    down: "API hors ligne",
    checking: "Vérification…",
  };

  return (
    <div className="flex items-center gap-2" title={lastChecked ? `Vérifié à ${lastChecked}` : undefined}>
      {status === "down" ? (
        <WifiOff className="size-3.5 text-destructive" />
      ) : (
        <span className={`size-2 rounded-full ${dot[status]} ${status === "ok" ? "animate-pulse" : ""}`} />
      )}
      <span className={`text-[10px] font-medium uppercase tracking-wide ${status === "down" ? "text-destructive" : "text-muted-foreground"}`}>
        {label[status]}
      </span>
    </div>
  );
}
