import type { PredictionPoint } from "@/lib/api/types";

export type KpiVisualVariant = "default" | "critical" | "warning" | "success" | "neutral";

export function formatOccupancyRate(rate: number): string {
  if (rate === 0) return "0";
  return Number.isInteger(rate) ? String(rate) : rate.toFixed(1);
}

export function occupancyVariant(rate: number): KpiVisualVariant {
  if (rate >= 85) return "critical";
  if (rate >= 70) return "warning";
  if (rate > 0) return "default";
  return "neutral";
}

export function alertsVariant(count: number): KpiVisualVariant {
  if (count === 0) return "success";
  if (count >= 2) return "critical";
  return "warning";
}

export function estimateOccupiedBeds(rate: number, capacity: number): number {
  return Math.round((rate / 100) * capacity);
}

export function hasMeaningfulForecast(historyDays: number, points: PredictionPoint[]): boolean {
  if (historyDays < 7 || points.length === 0) return false;
  const historical = points.filter((p) => p.actual !== undefined);
  const total = historical.reduce((sum, p) => sum + (p.actual ?? 0), 0);
  return total > 0;
}

export function isDashboardQuiet(kpis: {
  patientsToday: number;
  appointments: number;
  criticalAlerts: number;
  occupancy: number;
}): boolean {
  return (
    kpis.patientsToday === 0 &&
    kpis.appointments === 0 &&
    kpis.criticalAlerts === 0 &&
    kpis.occupancy === 0
  );
}
