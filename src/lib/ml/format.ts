import type { MlForecastResponse } from "@/lib/api/types";

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

export function formatMlConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

export function mlForecastSummary(data: Pick<MlForecastResponse, "model" | "confidence" | "source" | "generatedAt">) {
  return {
    model: formatMlModelLabel(data.model),
    confidence: formatMlConfidence(data.confidence),
    source: formatMlSourceLabel(data.source),
    generatedAt: data.generatedAt,
  };
}
