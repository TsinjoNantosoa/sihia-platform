import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  BedDouble,
  CalendarDays,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  Brain,
  Activity,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import { useT, useI18n } from "@/lib/i18n/store";
import { useAuth } from "@/lib/auth/store";
import { requireRoutePermission } from "@/lib/auth/routeGuard";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingState, ErrorState } from "@/components/shared/States";
import {
  alertsService,
  analyticsService,
  appointmentsService,
  mlService,
} from "@/lib/api/services";

export const Route = createFileRoute("/_app/dashboard")({
  beforeLoad: requireRoutePermission("view_dashboard"),
  head: () => ({
    meta: [
      { title: "Tableau de bord — SIH IA" },
      { name: "description", content: "KPIs temps réel et alertes hospitalières." },
    ],
  }),
  component: DashboardPage,
});

function getGreeting(t: (k: string) => string) {
  const h = new Date().getHours();
  if (h < 12) return t("dash.greetingMorning");
  if (h < 18) return t("dash.greetingAfternoon");
  return t("dash.greetingEvening");
}

function DashboardPage() {
  const t = useT();
  const locale = useI18n((s) => s.locale);
  const user = useAuth((s) => s.user);

  const kpis = useQuery({ queryKey: ["kpis"], queryFn: analyticsService.kpis });
  const prediction = useQuery({ queryKey: ["pred7d"], queryFn: mlService.predict7d });
  const alerts = useQuery({ queryKey: ["alerts"], queryFn: alertsService.list });
  const appts = useQuery({ queryKey: ["appts"], queryFn: appointmentsService.list });

  const upcoming = (appts.data ?? [])
    .filter((a) => new Date(a.date) >= new Date() && a.status !== "cancelled")
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      {/* Greeting */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {getGreeting(t)}, {user?.name ?? "Dr."} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("dash.summary")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/patients"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <Plus className="size-4" /> {t("dash.qa.newPatient")}
          </Link>
          <Link
            to="/appointments"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <CalendarDays className="size-4" /> {t("dash.qa.newAppointment")}
          </Link>
          <Link
            to="/prediction"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Brain className="size-4" /> {t("dash.qa.viewPrediction")}
          </Link>
        </div>
      </div>

      {/* KPIs */}
      {kpis.isLoading ? (
        <LoadingState />
      ) : kpis.isError ? (
        <ErrorState onRetry={() => kpis.refetch()} />
      ) : kpis.data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label={t("dash.kpi.patients")}
            value={kpis.data.patientsToday}
            icon={<Users className="size-4" />}
            trend={{ value: kpis.data.patientsTrend, positive: true }}
            hint="vs hier"
          />
          <KpiCard
            label={t("dash.kpi.occupancy")}
            value={kpis.data.occupancy.toFixed(1)}
            unit="%"
            icon={<BedDouble className="size-4" />}
            variant="warning"
            progress={kpis.data.occupancy}
            hint={`${kpis.data.occupancyCapacity} lits`}
          />
          <KpiCard
            label={t("dash.kpi.appointments")}
            value={kpis.data.appointments}
            icon={<CalendarDays className="size-4" />}
            hint={`/ ${kpis.data.appointmentsCapacity} capacité`}
          />
          <KpiCard
            label={t("dash.kpi.alerts")}
            value={String(kpis.data.criticalAlerts).padStart(2, "0")}
            icon={<AlertTriangle className="size-4" />}
            variant="critical"
            hint="nécessitent une action"
          />
        </div>
      ) : null}

      {/* Chart + Alerts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Forecast chart */}
        <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border p-5">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">{t("dash.predictionTitle")}</h2>
            </div>
            <div className="flex items-center gap-3 text-[10px] uppercase text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-muted-foreground/40" />
                {t("dash.predictionLegendHist")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-primary" />
                {t("dash.predictionLegendForecast")}
              </span>
            </div>
          </div>
          <div className="h-72 p-4">
            {prediction.isLoading ? (
              <LoadingState />
            ) : prediction.data ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={prediction.data.points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-muted-foreground)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-muted-foreground)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => format(parseISO(v), "dd/MM")}
                  />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <ReferenceLine
                    x={prediction.data.points.find((p) => p.actual && !p.forecast)?.date}
                    stroke="var(--color-border)"
                    strokeDasharray="4 4"
                    label={{ value: t("common.today"), fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke="var(--color-muted-foreground)"
                    strokeWidth={2}
                    fill="url(#colorActual)"
                  />
                  <Area
                    type="monotone"
                    dataKey="forecast"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    fill="url(#colorForecast)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>

        {/* Alerts */}
        <div className="flex flex-col rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between border-b border-border p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" />
              <h2 className="text-sm font-semibold">{t("dash.alertsTitle")}</h2>
            </div>
            <Link to="/prediction" className="text-xs font-semibold text-primary hover:underline">
              {t("common.viewAll")} →
            </Link>
          </div>
          <div className="flex-1 divide-y divide-border overflow-y-auto">
            {alerts.isLoading ? (
              <LoadingState />
            ) : (
              alerts.data?.map((a) => (
                <div key={a.id} className="flex gap-3 p-4 transition-colors hover:bg-muted/50">
                  <div
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${
                      a.level === "critical"
                        ? "bg-destructive"
                        : a.level === "warning"
                          ? "bg-warning"
                          : "bg-primary"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`truncate text-sm font-semibold ${
                          a.level === "critical" ? "text-destructive" : "text-foreground"
                        }`}
                      >
                        {a.title}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {a.description}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <span>{a.area}</span>
                      <span>•</span>
                      <span>
                        {new Date(a.createdAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Upcoming appointments */}
      <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">{t("dash.upcomingTitle")}</h2>
          </div>
          <Link to="/appointments" className="text-xs font-semibold text-primary hover:underline">
            {t("common.viewAll")} <ArrowUpRight className="ms-1 inline size-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-start">{t("appts.col.time")}</th>
                <th className="px-5 py-3 text-start">{t("appts.col.patient")}</th>
                <th className="px-5 py-3 text-start">{t("appts.col.doctor")}</th>
                <th className="px-5 py-3 text-start">{t("appts.col.reason")}</th>
                <th className="px-5 py-3 text-end">{t("appts.col.status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {upcoming.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-xs text-muted-foreground">
                    {t("common.empty")}
                  </td>
                </tr>
              ) : (
                upcoming.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/30">
                    <td className="px-5 py-3 font-mono text-xs">
                      {new Date(a.date).toLocaleString(locale, {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3 font-medium">{a.patientName}</td>
                    <td className="px-5 py-3 text-muted-foreground">{a.doctorName}</td>
                    <td className="px-5 py-3 text-muted-foreground">{a.reason}</td>
                    <td className="px-5 py-3 text-end">
                      <StatusBadge
                        tone={
                          a.status === "confirmed"
                            ? "success"
                            : a.status === "scheduled"
                              ? "primary"
                              : a.status === "cancelled"
                                ? "destructive"
                                : "neutral"
                        }
                        dot
                      >
                        {t(`appts.status.${a.status}`)}
                      </StatusBadge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
