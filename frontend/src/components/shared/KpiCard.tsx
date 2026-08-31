import { type ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value?: ReactNode;
  unit?: string;
  trend?: { value: number; positive?: boolean };
  icon?: ReactNode;
  variant?: "default" | "critical" | "warning" | "success" | "neutral";
  progress?: number;
  hint?: string;
  loading?: boolean;
}

const variantStyles = {
  default: "border-border bg-card",
  neutral: "border-border bg-card",
  critical: "border-destructive/25 bg-card",
  warning: "border-warning/25 bg-card",
  success: "border-success/25 bg-card",
};

const variantText = {
  default: "text-foreground",
  neutral: "text-foreground",
  critical: "text-destructive",
  warning: "text-warning",
  success: "text-success",
};

const variantIconBg = {
  default: "bg-primary/10 text-primary",
  neutral: "bg-muted text-muted-foreground",
  critical: "bg-destructive/10 text-destructive",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
};

export function KpiCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div className="h-3 w-28 rounded bg-muted" />
        <div className="size-8 rounded-lg bg-muted" />
      </div>
      <div className="mt-4 h-8 w-20 rounded bg-muted" />
      <div className="mt-2 h-3 w-32 rounded bg-muted" />
    </div>
  );
}

export function KpiCard({
  label,
  value,
  unit,
  trend,
  icon,
  variant = "default",
  progress,
  hint,
  loading = false,
}: KpiCardProps) {
  if (loading) return <KpiCardSkeleton />;

  return (
    <div
      className={cn(
        "rounded-xl border p-5 transition-colors hover:border-border/80",
        variantStyles[variant],
      )}
    >
      <div className="flex items-start justify-between">
        <span
          className={cn(
            "text-xs font-medium uppercase tracking-wide",
            variant === "default" ? "text-muted-foreground" : variantText[variant],
          )}
        >
          {label}
        </span>
        {icon ? (
          <div
            className={cn(
              "flex size-8 items-center justify-center rounded-lg [&_svg]:size-4",
              variantIconBg[variant],
            )}
          >
            {icon}
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span
          className={cn("text-3xl font-semibold tabular-nums tracking-tight", variantText[variant])}
        >
          {value}
        </span>
        {unit ? <span className="text-base text-muted-foreground">{unit}</span> : null}
      </div>
      {trend ? (
        <div className="mt-1 flex items-center gap-2 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              trend.positive ? "text-success" : "text-destructive",
            )}
          >
            {trend.positive ? (
              <TrendingUp className="size-3" aria-hidden />
            ) : (
              <TrendingDown className="size-3" aria-hidden />
            )}
            {Math.abs(trend.value)}%
          </span>
          {hint ? <span className="text-muted-foreground">{hint}</span> : null}
        </div>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
      {typeof progress === "number" ? (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              variant === "warning"
                ? "bg-warning"
                : variant === "critical"
                  ? "bg-destructive"
                  : variant === "success"
                    ? "bg-success"
                    : "bg-primary",
            )}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
