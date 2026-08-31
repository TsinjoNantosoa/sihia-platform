import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Check, Filter } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState, LoadingState } from "@/components/shared/States";
import { notificationsService } from "@/lib/api/services";
import type { NotificationItem } from "@/lib/api/types";
import { requireRoutePermission } from "@/lib/auth/routeGuard";
import { getAlertDestination } from "@/lib/notifications/alertActions";
import { useT } from "@/lib/i18n/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/notifications")({
  beforeLoad: requireRoutePermission("view_dashboard"),
  head: () => ({ meta: [{ title: "Notifications — SIHIA" }] }),
  component: NotificationsPage,
});

type LevelFilter = "all" | "critical" | "warning" | "info";
type ReadFilter = "all" | "unread" | "read";

function NotificationsPage() {
  const t = useT();
  const qc = useQueryClient();
  const [level, setLevel] = useState<LevelFilter>("all");
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");

  const inbox = useQuery({
    queryKey: ["notifications", level, readFilter],
    queryFn: () =>
      notificationsService.list({
        level: level === "all" ? undefined : level,
        unreadOnly: readFilter === "unread",
      }),
  });

  const markRead = useMutation({
    mutationFn: (ids: string[]) => notificationsService.markRead(ids),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  const markAll = useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => {
      toast.success(t("notif.center.markedAll"));
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  const items = useMemo(() => {
    const list = inbox.data?.items ?? [];
    if (readFilter === "read") return list.filter((i) => i.read);
    return list;
  }, [inbox.data?.items, readFilter]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("notif.center.title")}
        subtitle={t("notif.center.subtitle")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/settings"
              className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted"
            >
              {t("notif.center.openSettings")}
            </Link>
            <button
              type="button"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending || !items.length}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Check className="size-3.5" aria-hidden />
              {t("notif.markAllRead")}
            </button>
          </div>
        }
      />

      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label={t("notif.center.filtersAria")}
      >
        <Filter className="size-4 text-muted-foreground" aria-hidden />
        {(["all", "critical", "warning", "info"] as LevelFilter[]).map((l) => (
          <FilterChip
            key={l}
            active={level === l}
            onClick={() => setLevel(l)}
            label={t(`notif.center.level.${l}`)}
          />
        ))}
        <span className="mx-1 h-4 w-px bg-border" aria-hidden />
        {(["all", "unread", "read"] as ReadFilter[]).map((r) => (
          <FilterChip
            key={r}
            active={readFilter === r}
            onClick={() => setReadFilter(r)}
            label={t(`notif.center.read.${r}`)}
          />
        ))}
        {inbox.data ? (
          <span className="ml-auto text-xs text-muted-foreground">
            {t("notif.center.unreadCount").replace("{{count}}", String(inbox.data.unreadCount))}
          </span>
        ) : null}
      </div>

      <section className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
        {inbox.isLoading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <div className="p-8">
            <EmptyState title={t("notif.empty")} />
          </div>
        ) : (
          <ul className="divide-y divide-border" role="list">
            {items.map((item) => (
              <NotificationRow
                key={item.id}
                item={item}
                onOpen={() => {
                  if (!item.read) markRead.mutate([item.id]);
                }}
                t={t}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-md border px-2.5 py-1 text-xs font-medium",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function NotificationRow({
  item,
  onOpen,
  t,
}: {
  item: NotificationItem;
  onOpen: () => void;
  t: (k: string) => string;
}) {
  const destination = getAlertDestination(item);
  const when = (() => {
    try {
      return format(parseISO(item.createdAt), "dd/MM/yyyy HH:mm");
    } catch {
      return item.createdAt;
    }
  })();

  const content = (
    <div className="flex gap-3 p-4">
      <div
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          item.level === "critical"
            ? "bg-destructive"
            : item.level === "warning"
              ? "bg-warning"
              : "bg-primary",
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={cn("text-sm font-semibold", item.level === "critical" && "text-destructive")}
          >
            {item.title}
          </p>
          {!item.read ? (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {t("notif.center.unreadBadge")}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
          <span>{item.area}</span>
          <span aria-hidden>·</span>
          <span className="normal-case tracking-normal">{when}</span>
          {destination ? (
            <>
              <span aria-hidden>·</span>
              <span className="font-semibold normal-case text-primary">{destination.label}</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (destination) {
    return (
      <li className={cn(!item.read && "bg-primary-soft/30")}>
        <a
          href={destination.href}
          onClick={onOpen}
          className="block outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        >
          {content}
        </a>
      </li>
    );
  }

  return (
    <li className={cn(!item.read && "bg-primary-soft/30")}>
      <button type="button" onClick={onOpen} className="w-full text-left hover:bg-muted/40">
        {content}
      </button>
    </li>
  );
}
