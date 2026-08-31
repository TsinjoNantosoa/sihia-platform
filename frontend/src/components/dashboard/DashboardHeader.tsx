import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, Plus, TrendingUp } from "lucide-react";
import { useT } from "@/lib/i18n/store";
import { cn } from "@/lib/utils";

type DashboardHeaderProps = {
  greeting: string;
  userName: string;
  canMl: boolean;
};

export function DashboardHeader({ greeting, userName, canMl }: DashboardHeaderProps) {
  const t = useT();

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {greeting}, {userName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("dash.summary")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <ActionLink to="/patients" icon={<Plus className="size-4" aria-hidden />}>
          {t("dash.qa.newPatient")}
        </ActionLink>
        <ActionLink to="/appointments" icon={<CalendarDays className="size-4" aria-hidden />}>
          {t("dash.qa.newAppointment")}
        </ActionLink>
        {canMl ? (
          <ActionLink to="/prediction" primary icon={<TrendingUp className="size-4" aria-hidden />}>
            {t("dash.qa.viewPrediction")}
          </ActionLink>
        ) : null}
      </div>
    </div>
  );
}

function ActionLink({
  to,
  children,
  icon,
  primary,
}: {
  to: string;
  children: ReactNode;
  icon: ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
        primary
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "border border-border bg-card text-foreground hover:bg-muted",
      )}
    >
      {icon}
      {children}
    </Link>
  );
}
