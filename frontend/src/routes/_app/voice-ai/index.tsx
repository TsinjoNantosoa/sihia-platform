import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  PhoneCall,
  Settings,
  Phone,
  CheckCircle2,
  CalendarClock,
  UserRound,
  Timer,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { requireRoutePermission } from "@/lib/auth/routeGuard";
import { voiceApi } from "@/lib/api/services";
import { useT } from "@/lib/i18n/store";
import type { VoiceCall } from "@/lib/api/types";

export const Route = createFileRoute("/_app/voice-ai/")({
  beforeLoad: requireRoutePermission("view_voice"),
  head: () => ({ meta: [{ title: "Voice AI — SIH IA" }] }),
  component: VoiceAiPage,
});

function outcomeTone(outcome?: string | null) {
  if (outcome === "booked" || outcome === "rescheduled") return "success" as const;
  if (outcome === "escalated" || outcome === "failed") return "destructive" as const;
  if (outcome === "cancelled") return "warning" as const;
  return "neutral" as const;
}

function formatDuration(seconds?: number | null) {
  if (!seconds && seconds !== 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function VoiceAiPage() {
  const t = useT();
  const stats = useQuery({ queryKey: ["voice-stats"], queryFn: voiceApi.getVoiceStats });
  const calls = useQuery({ queryKey: ["voice-calls"], queryFn: () => voiceApi.getVoiceCalls() });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("voice.title")}
        subtitle={t("voice.subtitle")}
        actions={
          <Link
            to="/voice-ai/settings"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-muted"
          >
            <Settings className="size-4" />
            {t("voice.settings")}
          </Link>
        }
      />
      <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        {stats.data?.demoNotice ?? t("voice.demo")}
      </p>

      {stats.isLoading ? <LoadingState /> : null}
      {stats.isError ? <ErrorState onRetry={() => stats.refetch()} /> : null}
      {stats.data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <KpiCard
            label={t("voice.kpi.callsToday")}
            value={stats.data.callsToday}
            icon={<Phone className="size-4" />}
          />
          <KpiCard
            label={t("voice.kpi.completed")}
            value={stats.data.completedCalls}
            variant="success"
            icon={<CheckCircle2 className="size-4" />}
          />
          <KpiCard
            label={t("voice.kpi.booked")}
            value={stats.data.appointmentsBooked}
            icon={<CalendarClock className="size-4" />}
          />
          <KpiCard label={t("voice.kpi.rescheduled")} value={stats.data.appointmentsRescheduled} />
          <KpiCard label={t("voice.kpi.cancelled")} value={stats.data.appointmentsCancelled} />
          <KpiCard
            label={t("voice.kpi.escalations")}
            value={stats.data.humanEscalations}
            variant="warning"
            icon={<UserRound className="size-4" />}
          />
          <KpiCard
            label={t("voice.kpi.failed")}
            value={stats.data.failedCalls}
            variant="critical"
          />
          <KpiCard
            label={t("voice.kpi.duration")}
            value={stats.data.averageCallDuration}
            unit="s"
            icon={<Timer className="size-4" />}
          />
          <KpiCard
            label={t("voice.kpi.latency")}
            value={stats.data.averageToolLatency}
            unit="ms"
            icon={<Zap className="size-4" />}
          />
        </div>
      ) : null}

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-sm font-medium">
          {t("voice.recent")}
        </div>
        {calls.isLoading ? <LoadingState /> : null}
        {calls.isError ? <ErrorState onRetry={() => calls.refetch()} /> : null}
        {calls.data && calls.data.items.length === 0 ? (
          <EmptyState title={t("voice.empty")} icon={<PhoneCall className="size-5" />} />
        ) : null}
        {calls.data && calls.data.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table
              className="w-full min-w-[720px] text-left text-sm"
              data-testid="voice-calls-table"
            >
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Patient</th>
                  <th className="px-4 py-2 font-medium">Phone</th>
                  <th className="px-4 py-2 font-medium">Direction</th>
                  <th className="px-4 py-2 font-medium">Intent</th>
                  <th className="px-4 py-2 font-medium">Started</th>
                  <th className="px-4 py-2 font-medium">Duration</th>
                  <th className="px-4 py-2 font-medium">Outcome</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {calls.data.items.map((call: VoiceCall) => (
                  <tr key={call.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-2">
                      <Link
                        to="/voice-ai/calls/$callId"
                        params={{ callId: call.id }}
                        className="font-medium text-primary"
                      >
                        {call.patientName ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{call.phoneFrom}</td>
                    <td className="px-4 py-2">{call.direction}</td>
                    <td className="px-4 py-2">{call.intent ?? "—"}</td>
                    <td className="px-4 py-2 text-xs">
                      {new Date(call.startedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">{formatDuration(call.durationSeconds)}</td>
                    <td className="px-4 py-2">
                      <StatusBadge tone={outcomeTone(call.outcome)}>
                        {call.outcome ?? "—"}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge tone={call.escalated ? "warning" : "neutral"} dot>
                        {call.status}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
