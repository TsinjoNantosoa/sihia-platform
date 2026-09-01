import type { MlForecastResponse, MlMetricsResponse } from "@/lib/api/types";

export const ML_UNAVAILABLE = "—";

export function formatMlModelLabel(model: string): string {
  if (model === "prophet") return "Prophet";
  if (model === "linear-sqlite") return "Régression linéaire";
  return model;
}

export function formatMlSourceLabel(source: string): string {
  if (source === "postgresql") return "PostgreSQL";
  if (source === "sqlite") return "SQLite";
  return source;
}

export function formatMlConfidence(confidence: number, available = true): string {
  if (!available || confidence <= 0) return ML_UNAVAILABLE;
  return `${Math.round(confidence * 100)}%`;
}

export function formatMlConfidenceLevel(
  confidence: number,
  t: (key: string) => string,
  available = true,
): string {
  if (!available || confidence <= 0) return ML_UNAVAILABLE;
  if (confidence >= 0.85) return t("ml.meta.confidenceHigh");
  if (confidence >= 0.7) return t("ml.meta.confidenceModerate");
  return t("ml.meta.confidenceLow");
}

export function hasMeaningfulMetrics(data: MlMetricsResponse): boolean {
  if (data.status === "insufficient_data") return false;
  if (data.mae === null || data.mape === null) return false;
  if (data.samples <= 0) return false;
  return true;
}

export function mlForecastSummary(
  data: Pick<MlForecastResponse, "model" | "confidence" | "source" | "generatedAt">,
) {
  return {
    model: formatMlModelLabel(data.model),
    confidence: formatMlConfidence(data.confidence),
    source: formatMlSourceLabel(data.source),
    generatedAt: data.generatedAt,
  };
}
