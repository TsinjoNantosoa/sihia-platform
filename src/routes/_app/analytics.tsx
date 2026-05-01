import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Download } from "lucide-react";
import { useT } from "@/lib/i18n/store";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { LoadingState } from "@/components/shared/States";
import { requireRoutePermission } from "@/lib/auth/routeGuard";
import { analyticsService } from "@/lib/api/services";

export const Route = createFileRoute("/_app/analytics")({
  beforeLoad: requireRoutePermission("view_analytics"),
  head: () => ({ meta: [{ title: "Analytique — SIH IA" }] }),
  component: AnalyticsPage,
});

type Period = "3m" | "6m" | "12m";

function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => r[h]).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function AnalyticsPage() {
  const t = useT();
  const [period, setPeriod] = useState<Period>("6m");
  const revenue = useQuery({ queryKey: ["revenue", period], queryFn: () => analyticsService.monthlyRevenue(period) });
  const admissions = useQuery({ queryKey: ["adm"], queryFn: analyticsService.admissionsByDept });
  const satisfaction = useQuery({ queryKey: ["sat"], queryFn: analyticsService.satisfaction });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("analytics.title")}
        subtitle={t("analytics.subtitle")}
        actions={
          <div className="flex items-center gap-2">
            {/* Period filter */}
            <div className="flex rounded-lg border border-border bg-card p-0.5">
              {(["3m", "6m", "12m"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    period === p
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p === "3m" ? "3 mois" : p === "6m" ? "6 mois" : "12 mois"}
                </button>
              ))}
            </div>
            {/* Export CSV */}
            <button
              onClick={() => revenue.data && exportCsv(`revenus-${period}.csv`, revenue.data)}
              disabled={!revenue.data}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              <Download className="size-4" />
              Export CSV
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label={t("analytics.avgStay")} value="4.2" unit="jours" hint="−0.3 vs M-1" />
        <KpiCard label={t("analytics.satisfaction")} value="92" unit="%" variant="success" trend={{ value: 3.1, positive: true }} />
        <KpiCard label={t("analytics.occupancy")} value="87.5" unit="%" variant="warning" progress={87.5} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title={`${t("analytics.revenue")} (${period === "3m" ? "3 mois" : period === "6m" ? "6 mois" : "12 mois"})`}>
          {revenue.isLoading ? <LoadingState /> : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revenue.data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
                <Line type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
        <ChartCard title={t("analytics.admissions")}>
          {admissions.isLoading ? <LoadingState /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={admissions.data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="value" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
        <ChartCard title={t("analytics.satisfaction")}>
          {satisfaction.isLoading ? <LoadingState /> : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={satisfaction.data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} domain={[70, 100]} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
                <Line type="monotone" dataKey="value" stroke="var(--color-success)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
        <ChartCard title="Répartition par âge">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={[
              { label: "0-17", value: 18 }, { label: "18-34", value: 32 }, { label: "35-54", value: 41 },
              { label: "55-74", value: 28 }, { label: "75+", value: 15 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="value" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </div>
  );
}
