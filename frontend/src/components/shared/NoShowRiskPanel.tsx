import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { BellRing, PhoneCall, UserRound } from "lucide-react";
import { toast } from "sonner";
import { LoadingState, EmptyState } from "@/components/shared/States";
import { appointmentsService, mlService } from "@/lib/api/services";
import type { NoShowRiskItem, NoShowRiskLevel } from "@/lib/api/types";
import { useT } from "@/lib/i18n/store";
import { formatNoshowPercent, noshowRiskBadgeClass } from "@/lib/ml/noshowFormat";
import { DisclaimerNote } from "@/components/shared/DisclaimerNote";

type FilterLevel = "all" | NoShowRiskLevel;

function riskLabel(t: (k: string) => string, level: NoShowRiskLevel): string {
  if (level === "high") return t("prediction.noshow.levelHigh");
  if (level === "medium") return t("prediction.noshow.levelMedium");
  return t("prediction.noshow.levelLow");
}

export function NoShowRiskPanel() {
  const t = useT();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterLevel>("all");

  const query = useQuery({
    queryKey: ["noshow-risk", filter],
    queryFn: () =>
      mlService.noshowRisk({
        horizonDays: 14,
        minRisk:
          filter === "all" ? 0.25 : filter === "high" ? 0.45 : filter === "medium" ? 0.25 : 0,
        riskLevel: filter === "all" ? undefined : filter,
        limit: 40,
      }),
  });

  const remind = useMutation({
    mutationFn: (appointmentId: string) =>
      appointmentsService.remind(appointmentId, ["email", "sms"]),
    onSuccess: () => {
      toast.success(t("prediction.noshow.remindOk"));
      void queryClient.invalidateQueries({ queryKey: ["noshow-risk"] });
      void queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: () => {
      toast.error(t("prediction.noshow.remindFail"));
    },
  });

  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) {
    return <EmptyState title={t("prediction.noshow.error")} />;
  }

  const data = query.data;
  const items = data.items;

  return (
    <section
      id="noshow"
      aria-labelledby="noshow-heading"
      className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]"
    >
      <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="noshow-heading" className="text-sm font-semibold">
            {t("prediction.noshow.title")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("prediction.noshow.subtitle")}</p>
        </div>
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label={t("prediction.noshow.filterAria")}
        >
          {(["all", "high", "medium", "low"] as FilterLevel[]).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setFilter(level)}
              aria-pressed={filter === level}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === level
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {level === "all" ? t("prediction.noshow.filterAll") : riskLabel(t, level)}
              {level !== "all" ? (
                <span className="ml-1 opacity-80">({data.summary[level]})</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-border p-4 sm:grid-cols-4">
        <Stat
          label={t("prediction.noshow.statHigh")}
          value={String(data.summary.high)}
          tone="destructive"
        />
        <Stat
          label={t("prediction.noshow.statMedium")}
          value={String(data.summary.medium)}
          tone="warning"
        />
        <Stat
          label={t("prediction.noshow.statAvg")}
          value={formatNoshowPercent(data.summary.avgRisk)}
        />
        <Stat
          label={t("prediction.noshow.statFacility")}
          value={formatNoshowPercent(data.facilityNoshowRate)}
        />
      </div>

      {items.length === 0 ? (
        <div className="p-6">
          <EmptyState title={t("prediction.noshow.empty")} />
        </div>
      ) : (
        <ul className="divide-y divide-border" role="list">
          {items.map((item) => (
            <NoShowRow
              key={item.appointmentId}
              item={item}
              reminding={remind.isPending && remind.variables === item.appointmentId}
              onRemind={() => remind.mutate(item.appointmentId)}
              t={t}
            />
          ))}
        </ul>
      )}

      <DisclaimerNote className="border-t border-border px-5 py-3">
        {data.disclaimer || t("prediction.noshow.disclaimer")}
      </DisclaimerNote>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "destructive" | "warning";
}) {
  const valueClass =
    tone === "destructive"
      ? "text-destructive"
      : tone === "warning"
        ? "text-warning"
        : "text-foreground";
  return (
    <div className="rounded-xl border border-border/80 bg-muted/20 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold tabular-nums ${valueClass}`}>{value}</div>
    </div>
  );
}

function NoShowRow({
  item,
  reminding,
  onRemind,
  t,
}: {
  item: NoShowRiskItem;
  reminding: boolean;
  onRemind: () => void;
  t: (k: string) => string;
}) {
  const when = (() => {
    try {
      return format(parseISO(item.date), "dd/MM/yyyy HH:mm");
    } catch {
      return item.date;
    }
  })();

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${noshowRiskBadgeClass(item.riskLevel)}`}
          >
            {riskLabel(t, item.riskLevel)} · {formatNoshowPercent(item.riskScore)}
          </span>
          <Link
            to="/patients/$patientId"
            params={{ patientId: item.patientId }}
            className="inline-flex items-center gap-1 text-sm font-semibold text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <UserRound className="size-3.5" aria-hidden />
            {item.patientName}
          </Link>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {when} · {item.doctorName}
          {item.reason ? ` · ${item.reason}` : ""}
        </p>
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={t("prediction.noshow.factorsAria")}>
          {item.factors.slice(0, 4).map((f) => (
            <li
              key={`${item.appointmentId}-${f.code}`}
              className="rounded-md bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {f.label}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Link
          to="/appointments"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PhoneCall className="size-3.5" aria-hidden />
          {t("prediction.noshow.openAppt")}
        </Link>
        <button
          type="button"
          disabled={reminding || item.reminderSent}
          onClick={onRemind}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BellRing className={`size-3.5 ${reminding ? "animate-pulse" : ""}`} aria-hidden />
          {item.reminderSent
            ? t("prediction.noshow.alreadyReminded")
            : t("prediction.noshow.remind")}
        </button>
      </div>
    </li>
  );
}
