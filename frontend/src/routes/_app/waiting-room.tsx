import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState, LoadingState } from "@/components/shared/States";
import { requireRoutePermission } from "@/lib/auth/routeGuard";
import { waitingRoomService } from "@/lib/api/services";
import { useT } from "@/lib/i18n/store";
import { usePermission } from "@/lib/auth/usePermission";

export const Route = createFileRoute("/_app/waiting-room")({
  beforeLoad: requireRoutePermission("view_appointments"),
  head: () => ({ meta: [{ title: "Salle d'attente — SIH IA" }] }),
  component: WaitingRoomPage,
});

function WaitingRoomPage() {
  const t = useT();
  const qc = useQueryClient();
  const canCall = usePermission("appointments:update");

  const snap = useQuery({
    queryKey: ["waiting-room"],
    queryFn: waitingRoomService.snapshot,
    refetchInterval: 15_000,
  });

  const callNext = useMutation({
    mutationFn: () => waitingRoomService.callNext(),
    onSuccess: (data) => {
      if (!data?.message) return;
      toast.success(data.message);
      void qc.invalidateQueries({ queryKey: ["waiting-room"] });
      void qc.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: () => toast.error(t("waiting.callFail")),
  });

  if (snap.isLoading) return <LoadingState />;
  if (!snap.data) return <EmptyState title={t("waiting.error")} />;

  const data = snap.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("waiting.title")}
        subtitle={t("waiting.subtitle").replace("{{date}}", data.date)}
        actions={
          canCall ? (
            <button
              type="button"
              onClick={() => callNext.mutate()}
              disabled={callNext.isPending || data.counts.waiting === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Megaphone className="size-4" aria-hidden />
              {t("waiting.callNext")}
            </button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label={t("waiting.statWaiting")} value={data.counts.waiting} />
        <Stat label={t("waiting.statInProgress")} value={data.counts.inProgress} />
        <Stat label={t("waiting.statUpcoming")} value={data.counts.upcoming} />
      </div>

      <QueueSection
        title={t("waiting.queueWaiting")}
        items={data.waiting}
        empty={t("waiting.emptyWaiting")}
      />
      <QueueSection
        title={t("waiting.queueInProgress")}
        items={data.inProgress}
        empty={t("waiting.emptyInProgress")}
      />
      <QueueSection
        title={t("waiting.queueUpcoming")}
        items={data.upcoming}
        empty={t("waiting.emptyUpcoming")}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-2 text-2xl font-semibold tabular-nums">
        <Users className="size-5 text-primary" aria-hidden />
        {value}
      </div>
    </div>
  );
}

function QueueSection({
  title,
  items,
  empty,
}: {
  title: string;
  items: Array<{
    appointmentId: string;
    patientName: string;
    doctorName: string;
    date: string;
    status: string;
    reason: string;
  }>;
  empty: string;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="border-b border-border px-5 py-3 text-sm font-semibold">{title}</div>
      {items.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li
              key={item.appointmentId}
              className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"
            >
              <div>
                <p className="text-sm font-semibold">{item.patientName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.doctorName} · {item.reason} · {item.date.slice(11, 16) || item.date}
                </p>
              </div>
              <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase">
                {item.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
