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
} from "lucide-react";
import { useT, useI18n } from "@/lib/i18n/store";
import { cn } from "@/lib/utils";

const groups = [
  {
    labelKey: "nav.section.main",
    items: [
      { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, exact: true },
      { to: "/patients", labelKey: "nav.patients", icon: Users },
      { to: "/doctors", labelKey: "nav.doctors", icon: Stethoscope },
      { to: "/appointments", labelKey: "nav.appointments", icon: CalendarDays },
    ],
  },
  {
    labelKey: "nav.section.intelligence",
    items: [
      { to: "/analytics", labelKey: "nav.analytics", icon: BarChart3 },
      { to: "/prediction", labelKey: "nav.prediction", icon: Brain, beta: true },
    ],
  },
  {
    labelKey: "nav.section.system",
    items: [
      { to: "/rbac", labelKey: "nav.rbac", icon: ShieldCheck },
      { to: "/settings", labelKey: "nav.settings", icon: Settings },
    ],
  },
] as const;

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const t = useT();
  const locale = useI18n((s) => s.locale);
  const location = useLocation();
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
            {g.items.map((item) => {
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
        <div className="flex items-center gap-2">
          <span className="size-2 animate-pulse rounded-full bg-success" />
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Système opérationnel
          </span>
        </div>
      </div>
    </aside>
  );
}
