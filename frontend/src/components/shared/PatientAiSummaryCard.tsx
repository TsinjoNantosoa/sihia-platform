import { useMutation } from "@tanstack/react-query";
import { Brain, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { patientsService } from "@/lib/api/services";
import type { PatientAiSummaryResponse } from "@/lib/api/types";
import { useI18n, useT } from "@/lib/i18n/store";
import { useState } from "react";

export function PatientAiSummaryCard({ patientId }: { patientId: string }) {
  const t = useT();
  const locale = useI18n((s) => s.locale);
  const [summary, setSummary] = useState<PatientAiSummaryResponse | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      patientsService.aiSummary(
        patientId,
        locale === "en" || locale === "ar" ? locale : "fr",
      ),
    onSuccess: (data) => {
      setSummary(data);
      toast.success(t("patients.aiSummary.ok"));
    },
    onError: () => toast.error(t("patients.aiSummary.fail")),
  });

  return (
    <section
      aria-labelledby="ai-summary-heading"
      className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/5 to-card p-5 shadow-[var(--shadow-card)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Brain className="size-4" aria-hidden />
          </div>
          <div>
            <h2 id="ai-summary-heading" className="text-sm font-semibold">
              {t("patients.aiSummary.title")}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("patients.aiSummary.subtitle")}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RefreshCw className={`size-3.5 ${mut.isPending ? "animate-spin" : ""}`} aria-hidden />
          {summary ? t("patients.aiSummary.refresh") : t("patients.aiSummary.generate")}
        </button>
      </div>

      {summary ? (
        <div className="mt-4">
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-foreground">
            {summary.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
          <p className="mt-3 text-[11px] text-muted-foreground">
            ⚠ {summary.disclaimer} · {summary.engine} · {summary.model}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">{t("patients.aiSummary.hint")}</p>
      )}
    </section>
  );
}
