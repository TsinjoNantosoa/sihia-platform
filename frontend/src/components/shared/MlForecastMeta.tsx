import type { ReactNode } from "react";
import { LineChart, Database, Clock, History, Info } from "lucide-react";
import type { MlForecastResponse } from "@/lib/api/types";
import { useT, useI18n } from "@/lib/i18n/store";
import {
  formatMlConfidence,
  formatMlConfidenceLevel,
  formatMlModelLabel,
  formatMlSourceLabel,
} from "@/lib/ml/format";

type MlForecastMetaProps = {
  data: Pick<
    MlForecastResponse,
    | "model"
    | "model_version"
    | "confidence"
    | "source"
    | "generatedAt"
    | "historyDays"
    | "engine"
    | "horizon"
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
    data.confidence >= 0.85
      ? "text-success"
      : data.confidence >= 0.7
        ? "text-foreground"
        : "text-warning";

  if (compact) {
    return (
      <div className="grid gap-3 border-b border-border px-5 py-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetaItem
          label={t("ml.meta.model")}
          value={formatMlModelLabel(data.model)}
          hint={data.model_version}
          icon={<LineChart className="size-3.5" aria-hidden />}
        />
        <MetaItem
          label={t("ml.meta.confidence")}
          value={formatMlConfidence(data.confidence)}
          hint={formatMlConfidenceLevel(data.confidence, t)}
          valueClassName={confidenceTone}
          icon={<Info className="size-3.5" aria-hidden />}
        />
        <MetaItem
          label={t("ml.meta.source")}
          value={formatMlSourceLabel(data.source)}
          hint={`${data.historyDays} ${t("ml.meta.days")}`}
          icon={<Database className="size-3.5" aria-hidden />}
        />
        <MetaItem
          label={t("ml.meta.updated")}
          value={updatedLabel}
          hint={`${data.horizon} ${t("ml.meta.horizonDays")}`}
          icon={<Clock className="size-3.5" aria-hidden />}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/30 px-5 py-4 text-xs text-muted-foreground sm:grid-cols-3 lg:grid-cols-6">
      <div>
        <div className="mb-1 flex items-center gap-1 uppercase tracking-wide">
          <LineChart className="size-3" aria-hidden />
          {t("ml.meta.model")}
        </div>
        <div className="font-semibold text-foreground">{formatMlModelLabel(data.model)}</div>
        <div className="mt-0.5 text-[10px]" title={data.model_version}>
          {t("ml.meta.version")} {data.model_version}
        </div>
      </div>
      <div>
        <div className="mb-1 uppercase tracking-wide">{t("ml.meta.confidence")}</div>
        <div className={`text-lg font-semibold ${confidenceTone}`}>
          {formatMlConfidence(data.confidence)}
        </div>
        <div className="mt-0.5 text-[10px]">{formatMlConfidenceLevel(data.confidence, t)}</div>
      </div>
      <div>
        <div className="mb-1 flex items-center gap-1 uppercase tracking-wide">
          <Database className="size-3" aria-hidden />
          {t("ml.meta.source")}
        </div>
        <div className="font-semibold text-foreground">{formatMlSourceLabel(data.source)}</div>
        <div className="mt-0.5 text-[10px]">{data.engine}</div>
      </div>
      <div>
        <div className="mb-1 flex items-center gap-1 uppercase tracking-wide">
          <History className="size-3" aria-hidden />
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
          <Clock className="size-3" aria-hidden />
          {t("ml.meta.updated")}
        </div>
        <div className="font-semibold text-foreground">{updatedLabel}</div>
      </div>
    </div>
  );
}

function MetaItem({
  label,
  value,
  hint,
  icon,
  valueClassName = "text-foreground",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-sm font-semibold ${valueClassName}`}>{value}</div>
      {hint ? (
        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  );
}
