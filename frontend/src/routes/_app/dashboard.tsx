import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  BedDouble,
  CalendarDays,
  AlertTriangle,
  ArrowUpRight,
  Activity,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import {
  ComposedChart,
  Area,
  Line,
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
import { usePermission } from "@/lib/auth/usePermission";
import { requireRoutePermission } from "@/lib/auth/routeGuard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState, ErrorState } from "@/components/shared/States";
import { MlForecastMeta } from "@/components/shared/MlForecastMeta";
import { formatMlConfidence } from "@/lib/ml/format";
import {
  alertsService,
  analyticsService,
  appointmentsService,
  mlService,
} from "@/lib/api/services";
import {
  alertsVariant,
  estimateOccupiedBeds,
  formatOccupancyRate,
  hasMeaningfulForecast,
  isDashboardQuiet,
  occupancyVariant,
} from "@/lib/dashboard/kpiHelpers";

export const Route = createFileRoute("/_app/dashboard")({
  beforeLoad: requireRoutePermission("view_dashboard"),
  head: () => ({
    meta: [
      { title: "Tableau de bord — SIHIA" },
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

function ChartSkeleton() {
  return (
    <div className="flex h-full flex-col justify-end gap-2 p-2">
      <div className="flex h-full items-end justify-between gap-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="w-full animate-pulse rounded-t bg-muted"
            style={{ height: `${30 + (i % 4) * 12}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function DashboardPage() {
  const t = useT();
  const locale = useI18n((s) => s.locale);
  const user = useAuth((s) => s.user);
  const canAnalytics = usePermission("analytics:read");
  const canMl = usePermission("ml:read");

  const kpis = useQuery({
    queryKey: ["kpis"],
    queryFn: analyticsService.kpis,
    enabled: canAnalytics,
  });
  const prediction = useQuery({
    queryKey: ["pred7d"],
    queryFn: mlService.predict7d,
    enabled: canMl,
  });
  const alerts = useQuery({ queryKey: ["alerts"], queryFn: alertsService.list });
  const appts = useQuery({ queryKey: ["appts"], queryFn: appointmentsService.list });

  const upcoming = (appts.data ?? [])
    .filter((a) => new Date(a.date) >= new Date() && a.status !== "cancelled")
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))
    .slice(0, 5);

  const criticalAlerts = alerts.data?.filter((a) => a.level === "critical") ?? [];
  const showQuietBanner =
    canAnalytics && kpis.data && !kpis.isLoading && isDashboardQuiet(kpis.data);

  const forecastReady =
    prediction.data && hasMeaningfulForecast(prediction.data.historyDays, prediction.data.points);

  return (
    <div className="flex flex-col gap-6 pb-4 lg:pb-6">
      <DashboardHeader greeting={getGreeting(t)} userName={user?.name ?? "Dr."} canMl={canMl} />

      {showQuietBanner ? (
        <div className="rounded-xl border border-border bg-muted/20 px-4 py-4 sm:px-5">
          <p className="text-sm font-medium text-foreground">{t("dash.emptyActivityTitle")}</p>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            {t("dash.emptyActivityDesc")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/patients"
              className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              {t("dash.qa.newPatient")}
            </Link>
            <Link
              to="/appointments"
              className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              {t("dash.qa.newAppointment")}
            </Link>
          </div>
        </div>
      ) : null}

      {!canAnalytics ? null : kpis.isError ? (
        <ErrorState onRetry={() => kpis.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label={t("dash.kpi.patients")}
            loading={kpis.isLoading}
            value={kpis.data?.patientsToday ?? 0}
            icon={<Users className="size-4" />}
            trend={
              kpis.data
                ? {
                    value: kpis.data.patientsTrend,
                    positive: kpis.data.patientsTrend >= 0,
                  }
                : undefined
            }
            hint={t("dash.kpi.vsYesterday")}
          />
          <KpiCard
            label={t("dash.kpi.occupancy")}
            loading={kpis.isLoading}
            value={kpis.data ? formatOccupancyRate(kpis.data.occupancy) : "—"}
            unit="%"
            icon={<BedDouble className="size-4" />}
            variant={kpis.data ? occupancyVariant(kpis.data.occupancy) : "neutral"}
            progress={kpis.data?.occupancy}
            hint={
              kpis.data
                ? kpis.data.occupancy > 0
                  ? t("dash.kpi.occupancyBeds", {
                      occupied: estimateOccupiedBeds(
                        kpis.data.occupancy,
                        kpis.data.occupancyCapacity,
                      ),
                      capacity: kpis.data.occupancyCapacity,
                    })
                  : t("dash.kpi.occupancyCapacity", { capacity: kpis.data.occupancyCapacity })
                : undefined
            }
          />
          <KpiCard
            label={t("dash.kpi.appointments")}
            loading={kpis.isLoading}
            value={kpis.data?.appointments ?? 0}
            icon={<CalendarDays className="size-4" />}
            hint={
              kpis.data
                ? `${t("dash.kpi.appointmentsContext")} · ${t("dash.kpi.weeklyCapacity", { capacity: kpis.data.appointmentsCapacity })}`
                : undefined
            }
          />
          <KpiCard
            label={t("dash.kpi.alerts")}
            loading={kpis.isLoading}
            value={kpis.data?.criticalAlerts ?? 0}
            icon={<AlertTriangle className="size-4" />}
            variant={kpis.data ? alertsVariant(kpis.data.criticalAlerts) : "neutral"}
            hint={
              kpis.data
                ? kpis.data.criticalAlerts === 0
                  ? t("dash.kpi.alertsNone")
                  : t("dash.kpi.alertsAction")
                : undefined
            }
          />
        </div>
      )}

      <div className={`grid grid-cols-1 gap-4 ${canMl ? "lg:grid-cols-3" : "lg:grid-cols-1"}`}>
        {canMl ? (
          <div className="rounded-xl border border-border bg-card lg:col-span-2">
            <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-primary" aria-hidden />
                <h2 className="text-sm font-semibold">{t("dash.predictionTitle")}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-sm bg-muted-foreground/50" aria-hidden />
                  {t("dash.predictionLegendHist")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-sm bg-primary" aria-hidden />
                  {t("dash.predictionLegendForecast")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-sm bg-primary/30" aria-hidden />
                  {t("dash.predictionLegendBand")}
                </span>
                {prediction.data && forecastReady ? (
                  <span className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium text-foreground">
                    {formatMlConfidence(prediction.data.confidence)}
                  </span>
                ) : null}
              </div>
            </div>

            {prediction.isError ? (
              <ErrorState onRetry={() => prediction.refetch()} />
            ) : prediction.isLoading ? (
              <div className="h-72 p-4">
                <ChartSkeleton />
              </div>
            ) : !forecastReady || !prediction.data ? (
              <EmptyState
                title={t("dash.predictionUnavailable")}
                description={`${t("dash.predictionUnavailableDesc")} ${t("dash.predictionUnavailableHint")}`}
                icon={<Activity className="size-5" />}
              />
            ) : (
              <>
                <MlForecastMeta data={prediction.data} compact />
                <div className="h-72 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={prediction.data.points}
                      margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="dashBandFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--color-border)"
                        vertical={false}
                        opacity={0.6}
                      />
                      <XAxis
                        dataKey="date"
                        stroke="var(--color-muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => format(parseISO(v), "dd/MM")}
                      />
                      <YAxis
                        stroke="var(--color-muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--color-card)",
                          border: "1px solid var(--color-border)",
                          borderRadius: 10,
                          fontSize: 12,
                          boxShadow: "none",
                        }}
                        labelFormatter={(v) => format(parseISO(String(v)), "dd MMM yyyy")}
                      />
                      <ReferenceLine
                        x={
                          prediction.data.points.find((p) => p.actual != null && p.forecast == null)
                            ?.date
                        }
                        stroke="var(--color-border)"
                        strokeDasharray="4 4"
                        label={{
                          value: t("common.today"),
                          fontSize: 10,
                          fill: "var(--color-muted-foreground)",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="upper"
                        stroke="none"
                        fill="url(#dashBandFill)"
                        isAnimationActive={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="lower"
                        stroke="none"
                        fill="var(--color-card)"
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="actual"
                        name={t("dash.predictionLegendHist")}
                        stroke="var(--color-muted-foreground)"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "var(--color-muted-foreground)" }}
                        connectNulls={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="forecast"
                        name={t("dash.predictionLegendForecast")}
                        stroke="var(--color-primary)"
                        strokeWidth={2.5}
                        strokeDasharray="6 4"
                        dot={{ r: 3, fill: "var(--color-primary)" }}
                        connectNulls={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                {prediction.data.recommendation ? (
                  <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {t("dash.predictionRecommendation")} :{" "}
                    </span>
                    {prediction.data.recommendation}
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        <div
          className={`flex min-h-[280px] flex-col rounded-xl border border-border bg-card lg:max-h-[520px] ${canMl ? "" : "lg:col-span-1"}`}
        >
          <div className="flex items-center justify-between border-b border-border p-5">
            <div className="flex items-center gap-2">
              {criticalAlerts.length > 0 ? (
                <AlertTriangle className="size-4 text-destructive" aria-hidden />
              ) : (
                <ShieldCheck className="size-4 text-success" aria-hidden />
              )}
              <h2 className="text-sm font-semibold">{t("dash.alertsTitle")}</h2>
            </div>
            {canMl ? (
              <Link to="/prediction" className="text-xs font-medium text-primary hover:underline">
                {t("common.viewAll")} →
              </Link>
            ) : null}
          </div>
          <div className="flex-1 divide-y divide-border overflow-y-auto">
            {alerts.isLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="h-3 w-2/3 rounded bg-muted" />
                    <div className="h-2 w-full rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : alerts.isError ? (
              <ErrorState onRetry={() => alerts.refetch()} />
            ) : !alerts.data?.length ? (
              <EmptyState
                title={t("dash.alertsEmptyTitle")}
                description={t("dash.alertsEmptyDesc")}
                icon={<CheckCircle2 className="size-5 text-success" />}
              />
            ) : (
              alerts.data.map((a) => (
                <div key={a.id} className="flex gap-3 p-4 transition-colors hover:bg-muted/40">
                  <div
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${
                      a.level === "critical"
                        ? "bg-destructive"
                        : a.level === "warning"
                          ? "bg-warning"
                          : "bg-primary"
                    }`}
                    aria-hidden
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
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <span>{a.area}</span>
                      <span aria-hidden>•</span>
                      <span>
                        {new Date(a.createdAt).toLocaleTimeString(locale, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {a.action?.href ? (
                        <>
                          <span aria-hidden>•</span>
                          <a
                            href={a.action.href}
                            className="font-semibold normal-case text-primary hover:underline"
                          >
                            {a.action.label}
                          </a>
                        </>
                      ) : null}
                    </div>
                    {a.suggestedActions && a.suggestedActions.length > 1 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {a.suggestedActions.slice(0, 3).map((sa) => (
                          <a
                            key={`${a.id}-${sa.href}-${sa.label}`}
                            href={sa.href}
                            className="rounded-md border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-foreground hover:bg-muted"
                          >
                            {sa.label}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" aria-hidden />
            <h2 className="text-sm font-semibold">{t("dash.upcomingTitle")}</h2>
          </div>
          <Link to="/appointments" className="text-xs font-medium text-primary hover:underline">
            {t("common.viewAll")} <ArrowUpRight className="ms-1 inline size-3" aria-hidden />
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
              {appts.isLoading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8">
                    <div className="mx-auto h-4 w-48 animate-pulse rounded bg-muted" />
                  </td>
                </tr>
              ) : upcoming.length === 0 ? (
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
