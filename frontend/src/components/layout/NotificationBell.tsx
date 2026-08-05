import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { ArrowRight, Bell, CheckCheck } from "lucide-react";
import { notificationsService } from "@/lib/api/services";
import type { NotificationItem } from "@/lib/api/types";
import { useT } from "@/lib/i18n/store";
import { getAlertDestination } from "@/lib/notifications/alertActions";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function levelDot(level: NotificationItem["level"]) {
  if (level === "critical") return "bg-destructive";
  if (level === "warning") return "bg-warning";
  return "bg-primary";
}

function formatAlertTime(iso: string) {
  try {
    return format(parseISO(iso), "dd MMM · HH:mm");
  } catch {
    return iso.slice(0, 16);
  }
}

export function NotificationBell() {
  const t = useT();
  const qc = useQueryClient();

  const inbox = useQuery({
    queryKey: ["notifications", "bell"],
    queryFn: () => notificationsService.list(),
    refetchInterval: 60_000,
  });

  const markRead = useMutation({
    mutationFn: (ids: string[]) => notificationsService.markRead(ids),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAll = useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const items = useMemo(() => inbox.data?.items ?? [], [inbox.data?.items]);

  const badgeCount = useMemo(
    () => items.filter((a) => (a.level === "critical" || a.level === "warning") && !a.read).length,
    [items],
  );

  const handleAlertOpen = (alert: NotificationItem) => {
    if (!alert.read) markRead.mutate([alert.id]);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative inline-flex size-9 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted"
        aria-label={t("notif.aria")}
      >
        <Bell className="size-4" />
        {badgeCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2.5">
          <span>{t("notif.title")}</span>
          <button
            type="button"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending || items.every((i) => i.read)}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-40"
          >
            <CheckCheck className="size-3.5" />
            {t("notif.markAllRead")}
          </button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-80 overflow-y-auto">
          {inbox.isLoading ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {t("common.loading")}
            </p>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {t("notif.empty")}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {items.slice(0, 8).map((a) => {
                const destination = getAlertDestination(a);
                const content = (
                  <>
                    <div className={cn("mt-1.5 size-2 shrink-0 rounded-full", levelDot(a.level))} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "text-sm font-semibold leading-snug",
                            a.level === "critical" ? "text-destructive" : "text-foreground",
                          )}
                        >
                          {a.title}
                        </p>
                        {!a.read ? (
                          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                        ) : null}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {a.description}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                        <span>{a.area}</span>
                        <span aria-hidden>·</span>
                        <span className="normal-case tracking-normal">
                          {formatAlertTime(a.createdAt)}
                        </span>
                      </div>
                      {destination ? (
                        <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                          {destination.label}
                          <ArrowRight className="size-3" aria-hidden />
                        </span>
                      ) : null}
                    </div>
                  </>
                );
                return (
                  <li
                    key={a.id}
                    className={cn(
                      "transition-colors hover:bg-muted/50",
                      !a.read && "bg-primary-soft/40",
                    )}
                  >
                    {destination ? (
                      <a
                        href={destination.href}
                        onClick={() => handleAlertOpen(a)}
                        className="flex gap-3 px-3 py-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                        aria-label={`${a.title} — ${destination.label}`}
                      >
                        {content}
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAlertOpen(a)}
                        className="flex w-full gap-3 px-3 py-3 text-left"
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="p-2">
          <Link
            to="/notifications"
            className="block rounded-md px-2 py-2 text-center text-xs font-semibold text-primary hover:bg-primary-soft"
          >
            {t("notif.center.openInbox")} →
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
