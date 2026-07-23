import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

type Tone = "neutral" | "primary" | "success" | "warning" | "destructive" | "info";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-muted text-foreground",
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  destructive: "bg-destructive-soft text-destructive",
  info: "bg-primary-soft text-primary",
};

export function StatusBadge({
  tone = "neutral",
  children,
  dot = false,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        toneClasses[tone],
      )}
    >
      {dot ? (
        <span
          className={cn(
            "size-1.5 rounded-full",
            tone === "success" && "bg-success",
            tone === "warning" && "bg-warning",
            tone === "destructive" && "bg-destructive",
            tone === "primary" && "bg-primary",
            tone === "info" && "bg-primary",
            tone === "neutral" && "bg-muted-foreground",
          )}
        />
      ) : null}
      {children}
    </span>
  );
}
