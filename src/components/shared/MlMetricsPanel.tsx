import { Gauge, Target, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { MlMetricsResponse } from "@/lib/api/types";
import { useT } from "@/lib/i18n/store";
import { formatMlModelLabel } from "@/lib/ml/format";

type MlMetricsPanelProps = {
  data: MlMetricsResponse;
};

export function MlMetricsPanel({ data }: MlMetricsPanelProps) {
  const t = useT();

  const statusTone =
    data.status === "ok"
      ? "border-success/30 bg-success/5 text-success"
      : data.status === "degraded"
        ? "border-warning/30 bg-warning/5 text-warning"
        : "border-muted bg-muted/30 text-muted-foreground";

  const StatusIcon =
    data.status === "ok" ? CheckCircle2 : data.status === "degraded" ? AlertTriangle : Gauge;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{t("ml.metrics.title")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("ml.metrics.subtitle")}</p>
        </div>
        <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusTone}`}>
          <StatusIcon className="size-3.5" />
          {t(`ml.metrics.status.${data.status}`)}
        </div>
      </div>

      {data.status === "insufficient_data" || data.mae === null || data.mape === null ? (
        <p className="text-sm text-muted-foreground">{t("ml.metrics.insufficient")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              <Gauge className="size-3" />
              {t("ml.metrics.mae")}
            </div>
            <div className="text-2xl font-semibold">{data.mae.toFixed(1)}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {t("ml.metrics.holdout", { days: String(data.holdoutDays) })}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              <Target className="size-3" />
              {t("ml.metrics.mape")}
            </div>
            <div className={`text-2xl font-semibold ${data.withinTarget ? "text-success" : "text-warning"}`}>
              {data.mape.toFixed(1)}%
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {t("ml.metrics.target", { percent: String(data.targetMapePercent) })}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              {t("ml.metrics.model")}
            </div>
            <div className="text-sm font-semibold">{formatMlModelLabel(data.model)}</div>
            <div className="mt-1 text-xs text-muted-foreground">{data.model_version}</div>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              {t("ml.metrics.samples")}
            </div>
            <div className="text-2xl font-semibold">{data.samples}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {data.historyDays} {t("ml.meta.days")} {t("ml.metrics.history")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
