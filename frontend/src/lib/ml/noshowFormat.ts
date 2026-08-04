import type { NoShowRiskLevel } from "@/lib/api/types";

export function formatNoshowPercent(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export function noshowRiskTone(level: NoShowRiskLevel): "destructive" | "warning" | "muted" {
  if (level === "high") return "destructive";
  if (level === "medium") return "warning";
  return "muted";
}

export function noshowRiskBadgeClass(level: NoShowRiskLevel): string {
  if (level === "high") {
    return "bg-destructive/10 text-destructive border-destructive/30";
  }
  if (level === "medium") {
    return "bg-warning/10 text-warning border-warning/30";
  }
  return "bg-muted text-muted-foreground border-border";
}
