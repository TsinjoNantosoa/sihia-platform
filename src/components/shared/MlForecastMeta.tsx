import { Brain, Database, Clock, History } from "lucide-react";
import type { MlForecastResponse } from "@/lib/api/types";
import { useT, useI18n } from "@/lib/i18n/store";
import { formatMlConfidence, formatMlModelLabel, formatMlSourceLabel } from "@/lib/ml/format";

type MlForecastMetaProps = {
  data: Pick<
    MlForecastResponse,
    "model" | "model_version" | "confidence" | "source" | "generatedAt" | "historyDays" | "engine" | "horizon"
  >;
  compact?: boolean;
};

export function MlForecastMeta({ data, compact = false }: MlForecastMetaProps) {
  const t = useT();
  const locale = useI18n((s) => s.locale);

  const updatedLabel = new Date(data.generatedAt).toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const confidenceTone =
    data.confidence >= 0.85 ? "text-success" : data.confidence >= 0.7 ? "text-foreground" : "text-warning";

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-5 py-2.5 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Brain className="size-3" />
          <strong className="text-foreground">{formatMlModelLabel(data.model)}</strong>
          <span className="text-muted-foreground">({data.model_version})</span>
        </span>
        <span>
          {t("ml.meta.confidence")}:{" "}
          <strong className={confidenceTone}>{formatMlConfidence(data.confidence)}</strong>
        </span>
        <span className="inline-flex items-center gap-1">
          <Database className="size-3" />
          {formatMlSourceLabel(data.source)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3" />
          {updatedLabel}
        </span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/30 px-5 py-4 text-xs text-muted-foreground sm:grid-cols-3 lg:grid-cols-6">
      <div>
        <div className="mb-1 flex items-center gap-1 uppercase tracking-wide">
          <Brain className="size-3" />
          {t("ml.meta.model")}
        </div>
        <div className="font-semibold text-foreground">{formatMlModelLabel(data.model)}</div>
        <div className="mt-0.5 text-[10px]">{data.model_version}</div>
      </div>
      <div>
        <div className="mb-1 uppercase tracking-wide">{t("ml.meta.confidence")}</div>
        <div className={`text-lg font-semibold ${confidenceTone}`}>{formatMlConfidence(data.confidence)}</div>
        <div className="mt-0.5 text-[10px]">{t("ml.meta.confidenceBand")}</div>
      </div>
      <div>
        <div className="mb-1 flex items-center gap-1 uppercase tracking-wide">
          <Database className="size-3" />
          {t("ml.meta.source")}
        </div>
        <div className="font-semibold text-foreground">{formatMlSourceLabel(data.source)}</div>
        <div className="mt-0.5 text-[10px]">{data.engine}</div>
      </div>
      <div>
        <div className="mb-1 flex items-center gap-1 uppercase tracking-wide">
          <History className="size-3" />
          {t("ml.meta.history")}
        </div>
        <div className="font-semibold text-foreground">
          {data.historyDays} {t("ml.meta.days")}
        </div>
        <div className="mt-0.5 text-[10px]">
          {data.horizon} {t("ml.meta.horizonDays")}
        </div>
      </div>
      <div>
        <div className="mb-1 flex items-center gap-1 uppercase tracking-wide">
          <Clock className="size-3" />
          {t("ml.meta.updated")}
        </div>
        <div className="font-semibold text-foreground">{updatedLabel}</div>
      </div>
    </div>
  );
}
