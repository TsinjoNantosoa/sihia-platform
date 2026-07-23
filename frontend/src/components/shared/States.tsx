import { type ReactNode } from "react";
import { Inbox, AlertTriangle, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n/store";

export function LoadingState({ label }: { label?: string }) {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
      <Loader2 className="size-6 animate-spin text-primary" />
      <p className="text-sm">{label ?? t("common.loading")}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon ?? <Inbox className="size-5" />}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title ?? t("common.empty")}</p>
        {description ? (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive-soft text-destructive">
        <AlertTriangle className="size-5" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{t("common.error")}</p>
        {message ? <p className="mt-1 text-xs text-muted-foreground">{message}</p> : null}
      </div>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="mt-2 inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          {t("common.retry")}
        </button>
      ) : null}
    </div>
  );
}
