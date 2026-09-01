import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { requireRoutePermission } from "@/lib/auth/routeGuard";
import { voiceApi } from "@/lib/api/services";
import { usePermission } from "@/lib/auth/usePermission";
import { useT } from "@/lib/i18n/store";
import type { VoiceSettings } from "@/lib/api/types";

export const Route = createFileRoute("/_app/voice-ai/settings")({
  beforeLoad: requireRoutePermission("view_voice"),
  head: () => ({ meta: [{ title: "Voice AI settings — SIHIA" }] }),
  component: VoiceSettingsPage,
});

function VoiceSettingsPage() {
  const t = useT();
  const canUpdate = usePermission("voice:update");
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["voice-settings"], queryFn: voiceApi.getVoiceSettings });
  const mutation = useMutation({
    mutationFn: (payload: Partial<VoiceSettings>) => voiceApi.updateVoiceSettings(payload),
    onSuccess: () => {
      toast.success(t("common.save"));
      queryClient.invalidateQueries({ queryKey: ["voice-settings"] });
    },
  });

  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => query.refetch()} />;

  const s = query.data;
  const toggle = (key: keyof VoiceSettings, value: boolean) => {
    if (!canUpdate) return;
    mutation.mutate({ [key]: value } as Partial<VoiceSettings>);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("voice.settings")}
        subtitle={t("voice.demo")}
        actions={
          <Link to="/voice-ai" className="text-sm text-primary hover:underline">
            {t("common.back")}
          </Link>
        }
      />
      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
        <Toggle
          label="Agent enabled"
          checked={s.agentEnabled}
          onChange={(v) => toggle("agentEnabled", v)}
          disabled={!canUpdate}
        />
        <Toggle
          label="Inbound calls"
          checked={s.inboundCallsEnabled}
          onChange={(v) => toggle("inboundCallsEnabled", v)}
          disabled={!canUpdate}
        />
        <Toggle
          label="Outbound calls"
          checked={s.outboundCallsEnabled}
          onChange={(v) => toggle("outboundCallsEnabled", v)}
          disabled={!canUpdate}
        />
        <Toggle
          label="Require confirmation"
          checked={s.requireConfirmation}
          onChange={(v) => toggle("requireConfirmation", v)}
          disabled={!canUpdate}
        />
        <Toggle
          label="Store transcripts"
          checked={s.storeTranscripts}
          onChange={(v) => toggle("storeTranscripts", v)}
          disabled={!canUpdate}
        />
        <Toggle
          label="Store audio"
          checked={s.storeAudio}
          onChange={(v) => toggle("storeAudio", v)}
          disabled={!canUpdate}
        />
        <Info label="Default language" value={s.defaultLanguage} />
        <Info label="Supported languages" value={s.supportedLanguages.join(", ")} />
        <Info label="Max retries" value={String(s.maxRetries)} />
        <Info label="Silence timeout" value={`${s.silenceTimeoutSeconds}s`} />
        <Info
          label="Human transfer configured"
          value={s.humanTransferNumberConfigured ? "yes" : "no"}
        />
        <Info label="Provider mode" value={s.providerMode} />
        <Info label="OpenAI model" value={s.openaiModel} />
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
