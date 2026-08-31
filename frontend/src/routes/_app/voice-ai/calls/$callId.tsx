import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { requireRoutePermission } from "@/lib/auth/routeGuard";
import { voiceApi } from "@/lib/api/services";
import { useT } from "@/lib/i18n/store";

export const Route = createFileRoute("/_app/voice-ai/calls/$callId")({
  beforeLoad: requireRoutePermission("view_voice"),
  head: () => ({ meta: [{ title: "Voice call — SIHIA" }] }),
  component: VoiceCallDetailPage,
});

function speakerTone(speaker: string) {
  if (speaker === "agent") return "primary" as const;
  if (speaker === "patient") return "success" as const;
  return "neutral" as const;
}

function VoiceCallDetailPage() {
  const t = useT();
  const { callId } = Route.useParams();
  const query = useQuery({
    queryKey: ["voice-call", callId],
    queryFn: () => voiceApi.getVoiceCall(callId),
  });

  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => query.refetch()} />;

  const call = query.data;
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("voice.detail")}
        subtitle={call.id}
        actions={
          <Link to="/voice-ai" className="text-sm text-primary hover:underline">
            {t("common.back")}
          </Link>
        }
      />
      <p className="text-xs text-muted-foreground">{t("voice.demo")}</p>

      <section className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="Patient" value={call.patientName ?? call.patientId ?? "—"} />
        <Info label="Phone" value={call.phoneFrom} />
        <Info label="Direction" value={call.direction} />
        <Info label="Language" value={call.language} />
        <Info label="Intent" value={call.intent ?? "—"} />
        <Info label="Outcome" value={call.outcome ?? "—"} />
        <Info label="Duration" value={String(call.durationSeconds ?? "—")} />
        <Info label="Identity" value={call.identityStatus} />
      </section>

      {call.appointmentId ? (
        <Link
          to="/appointments"
          className="inline-flex text-sm text-primary hover:underline"
          data-testid="voice-appointment-link"
        >
          {t("voice.openAppointment")} ({call.appointmentId})
        </Link>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">{t("voice.timeline")}</h2>
        <ol className="space-y-2">
          {call.events.map((event) => (
            <li key={event.id} className="flex gap-3 text-sm">
              <span className="w-40 shrink-0 text-xs text-muted-foreground">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
              <span>{event.eventType}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">{t("voice.transcript")}</h2>
        <div className="space-y-2" data-testid="voice-transcript">
          {call.transcript.map((segment) => (
            <div key={segment.id} className="rounded-lg bg-muted/40 p-3">
              <StatusBadge tone={speakerTone(segment.speaker)}>{segment.speaker.toUpperCase()}</StatusBadge>
              <p className="mt-2 text-sm">{segment.content}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">{t("voice.tools")}</h2>
        <div className="overflow-x-auto" data-testid="voice-tools">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-2">Tool</th>
                <th>Status</th>
                <th>Latency</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {call.toolCalls.map((tool) => (
                <tr key={tool.id} className="border-t border-border">
                  <td className="py-2 font-mono text-xs">{tool.toolName}</td>
                  <td>
                    <StatusBadge tone={tool.success ? "success" : "destructive"}>
                      {tool.success ? "ok" : tool.errorCode ?? "error"}
                    </StatusBadge>
                  </td>
                  <td>{tool.durationMs} ms</td>
                  <td className="text-xs">{new Date(tool.createdAt).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
