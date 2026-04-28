import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Brain, RefreshCw, TrendingUp, AlertCircle, Info } from "lucide-react";
import { useT } from "@/lib/i18n/store";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { LoadingState } from "@/components/shared/States";
import { mlService, alertsService } from "@/lib/api/services";

export const Route = createFileRoute("/_app/prediction")({
  head: () => ({ meta: [{ title: "Prédiction IA — SIH IA" }] }),
  component: PredictionPage,
});

type Horizon = "7d" | "30d";

function PredictionPage() {
  const t = useT();
  const [horizon, setHorizon] = useState<Horizon>("7d");

  const pred = useQuery({
    queryKey: ["pred", horizon],
    queryFn: () => (horizon === "7d" ? mlService.predict7d() : mlService.predict30d()),
  });
  const alerts = useQuery({ queryKey: ["alerts"], queryFn: alertsService.list });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("prediction.title")}
        subtitle={t("prediction.subtitle")}
        actions={
          <div className="flex items-center gap-2">
            {/* Horizon toggle */}
            <div className="flex rounded-lg border border-border bg-card p-0.5">
              {(["7d", "30d"] as Horizon[]).map((h) => (
                <button
                  key={h}
                  onClick={() => setHorizon(h)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    horizon === h
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {h === "7d" ? "7 jours" : "30 jours"}
                </button>
              ))}
            </div>
            <button
              onClick={() => pred.refetch()}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              <RefreshCw className={`size-4 ${pred.isFetching ? "animate-spin" : ""}`} />
              {t("prediction.regenerate")}
            </button>
          </div>
        }
      />

      {pred.isLoading || !pred.data ? (
        <LoadingState />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <KpiCard label={t("prediction.model")} value={pred.data.model} icon={<Brain className="size-4" />} />
            <KpiCard label={t("prediction.confidence")} value={`${Math.round(pred.data.confidence * 100)}%`} variant="success" progress={pred.data.confidence * 100} />
            <KpiCard label={t("prediction.peak")} value={pred.data.peak.value} unit={`(${pred.data.peak.date.slice(5)})`} variant="warning" icon={<TrendingUp className="size-4" />} />
            <KpiCard
              label="Horizon"
              value={`${pred.data.horizon ?? (horizon === "7d" ? 7 : 30)} jours`}
              icon={<Info className="size-4" />}
            />
          </div>

          {/* Model metadata */}
          {pred.data.model_version && (
            <div className="flex flex-wrap gap-4 rounded-xl border border-border bg-muted/30 px-5 py-3 text-xs text-muted-foreground">
              <span>Version modèle : <strong className="text-foreground">{pred.data.model_version}</strong></span>
              {pred.data.drift_score !== undefined && (
                <span>Dérive détectée : <strong className={pred.data.drift_score > 0.05 ? "text-warning" : "text-success"}>{(pred.data.drift_score * 100).toFixed(1)}%</strong></span>
              )}
              <span>Confiance intervalle : <strong className="text-foreground">{Math.round(pred.data.confidence * 100)}%</strong></span>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h2 className="mb-3 text-sm font-semibold">
              {t("dash.predictionTitle")} — {horizon === "7d" ? "7 jours" : "30 jours"}
            </h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={pred.data.points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false}
                    tickFormatter={(v) => format(parseISO(v), "dd/MM")}
                    interval={horizon === "30d" ? 4 : 0}
                  />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="upper" stroke="none" fill="url(#bandFill)" />
                  <Area type="monotone" dataKey="lower" stroke="none" fill="var(--color-card)" />
                  <Line type="monotone" dataKey="actual" stroke="var(--color-muted-foreground)" strokeWidth={2.5} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="forecast" stroke="var(--color-primary)" strokeWidth={2.5} strokeDasharray="6 4" dot={{ r: 2 }} />
                  <ReferenceLine
                    x={pred.data.points.find((p: {actual?: number; forecast?: number}) => p.actual && !p.forecast)?.date}
                    stroke="var(--color-border)" strokeDasharray="4 4"
                    label={{ value: t("common.today"), fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/5 to-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Brain className="size-4" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold">{t("prediction.recommendation")}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{pred.data.recommendation}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 className="text-sm font-semibold">{t("dash.alertsTitle")}</h2>
            </div>
            <div className="divide-y divide-border">
              {alerts.data?.map((a) => (
                <div key={a.id} className="flex gap-3 p-4">
                  <AlertCircle className={`mt-0.5 size-4 shrink-0 ${a.level === "critical" ? "text-destructive" : "text-warning"}`} />
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{a.title}</div>
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                    <div className="mt-1 text-[10px] uppercase text-muted-foreground">{a.area}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">⚠ {t("prediction.disclaimer")}</p>
        </>
      )}
    </div>
  );
}
