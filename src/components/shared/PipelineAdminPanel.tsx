import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, Play, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useT } from "@/lib/i18n/store";
import { usePermission } from "@/lib/auth/usePermission";
import { pipelineService } from "@/lib/api/services";
import { LoadingState } from "@/components/shared/States";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const DAG_IDS = ["patient_import", "analytics_refresh", "ml_features", "sihia_daily"] as const;

const DAG_LABELS: Record<(typeof DAG_IDS)[number], string> = {
  patient_import: "pipeline.dag.patientImport",
  analytics_refresh: "pipeline.dag.analyticsRefresh",
  ml_features: "pipeline.dag.mlFeatures",
  sihia_daily: "pipeline.dag.daily",
};

function statusTone(status: string): string {
  if (status === "success") return "text-success";
  if (status === "failed") return "text-destructive";
  return "text-muted-foreground";
}

export function PipelineAdminPanel() {
  const t = useT();
  const qc = useQueryClient();
  const canRun = usePermission("appointments:update");

  const statusQuery = useQuery({
    queryKey: ["pipeline-status"],
    queryFn: pipelineService.status,
  });

  const runMut = useMutation({
    mutationFn: (dagId: string) => pipelineService.run(dagId),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["pipeline-status"] });
      toast.success(t("pipeline.toastOk").replace("{dag}", result.dagId ?? "pipeline"));
    },
    onError: () => toast.error(t("common.error")),
  });

  if (statusQuery.isLoading || !statusQuery.data) {
    return <LoadingState />;
  }

  const data = statusQuery.data;
  const overallTone =
    data.status === "ok"
      ? "border-success/30 bg-success/5 text-success"
      : "border-warning/30 bg-warning/5 text-warning";

  return (
    <div className="flex flex-col gap-4">
      <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${overallTone}`}>
        <div className="flex items-center gap-2 text-sm font-semibold">
          {data.status === "ok" ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
          {t(`pipeline.status.${data.status}`)}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            {t("pipeline.mlFeatures")}: <strong className="text-foreground">{data.mlFeaturesDays}</strong>
          </span>
          <button
            type="button"
            onClick={() => statusQuery.refetch()}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 hover:bg-muted"
          >
            <RefreshCw className={`size-3 ${statusQuery.isFetching ? "animate-spin" : ""}`} />
            {t("pipeline.refresh")}
          </button>
        </div>
      </div>

      {data.alerts.length > 0 ? (
        <ul className="space-y-1 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-xs text-warning">
          {data.alerts.map((alert) => (
            <li key={alert}>• {alert}</li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-3">
        {DAG_IDS.map((dagId) => {
          const row = data.dags.find((d) => d.dagId === dagId);
          const last = row?.lastRun;
          return (
            <div
              key={dagId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/10 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Database className="size-4 text-primary" />
                  {t(DAG_LABELS[dagId])}
                </div>
                {last ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className={statusTone(last.status)}>{last.status}</span>
                    {" · "}
                    {last.finishedAt ?? last.startedAt}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">{t("pipeline.neverRun")}</p>
                )}
              </div>
              {canRun ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={runMut.isPending}
                  onClick={() => runMut.mutate(dagId)}
                  className="gap-1.5"
                >
                  <Play className="size-3.5" />
                  {t("pipeline.run")}
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
