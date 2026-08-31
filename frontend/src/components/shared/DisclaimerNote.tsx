import { AlertTriangle } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DisclaimerNote({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("flex items-start gap-2 text-xs text-muted-foreground", className)}>
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
