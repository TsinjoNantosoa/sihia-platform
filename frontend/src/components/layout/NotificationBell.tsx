import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { Bell, CheckCheck } from "lucide-react";
import { alertsService } from "@/lib/api/services";
import type { Alert } from "@/lib/api/types";
import { useT } from "@/lib/i18n/store";
import {
  alertReadKey,
  getReadAlertKeys,
  isAlertUnread,
  markAllAlertsRead,
  markAlertsRead,
} from "@/lib/notifications/readState";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function levelDot(level: Alert["level"]) {
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
  const [readKeys, setReadKeys] = useState(() => getReadAlertKeys());

  const alerts = useQuery({
    queryKey: ["alerts"],
    queryFn: alertsService.list,
    refetchInterval: 60_000,
  });

  const items = alerts.data ?? [];

  const actionableUnread = useMemo(
    () =>
      items.filter(
        (a) =>
          (a.level === "critical" || a.level === "warning") && isAlertUnread(a, readKeys),
      ),
    [items, readKeys],
  );

  const unreadCount = useMemo(
    () => items.filter((a) => isAlertUnread(a, readKeys)).length,
    [items, readKeys],
  );

  const badgeCount = actionableUnread.length;

  const onOpenChange = (open: boolean) => {
    if (open || items.length === 0) return;
    markAlertsRead(items.map(alertReadKey));
    setReadKeys(getReadAlertKeys());
  };

  const handleMarkAllRead = () => {
    markAllAlertsRead(items);
    setReadKeys(getReadAlertKeys());
  };

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        className="relative inline-flex size-9 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted"
        aria-label={t("notif.aria")}
      >
        <Bell className="size-4" />
        {badgeCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground ring-2 ring-card">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        ) : unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary ring-2 ring-card" />
        ) : null}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[min(100vw-2rem,22rem)] p-0">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">
            {t("notif.title")}
            {unreadCount > 0 ? (
              <span className="ms-2 text-xs font-normal text-muted-foreground">
                ({unreadCount})
              </span>
            ) : null}
          </DropdownMenuLabel>
          {items.length > 0 ? (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <CheckCheck className="size-3.5" />
              {t("notif.markAllRead")}
            </button>
          ) : null}
        </div>

        <DropdownMenuSeparator className="m-0" />

        <div className="max-h-80 overflow-y-auto">
          {alerts.isLoading ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {t("common.loading")}
            </p>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {t("notif.empty")}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((a) => {
                const unread = isAlertUnread(a, readKeys);
                return (
                  <li
                    key={alertReadKey(a)}
                    className={cn(
                      "flex gap-3 px-3 py-3 transition-colors hover:bg-muted/50",
                      unread && "bg-primary-soft/40",
                    )}
                  >
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
                        {unread ? (
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
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DropdownMenuSeparator className="m-0" />
        <div className="p-2">
          <Link
            to="/"
            className="block rounded-md px-2 py-2 text-center text-xs font-semibold text-primary hover:bg-primary-soft"
          >
            {t("notif.viewDashboard")} →
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
