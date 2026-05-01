import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Stethoscope, Phone, Mail, Star } from "lucide-react";
import { useT } from "@/lib/i18n/store";
import { requireRoutePermission } from "@/lib/auth/routeGuard";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingState, ErrorState } from "@/components/shared/States";
import { doctorsService } from "@/lib/api/services";

export const Route = createFileRoute("/_app/doctors")({
  beforeLoad: requireRoutePermission("view_doctors"),
  head: () => ({
    meta: [
      { title: "Médecins — SIH IA" },
      { name: "description", content: "Annuaire et disponibilités des médecins." },
    ],
  }),
  component: DoctorsPage,
});

function DoctorsPage() {
  const t = useT();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["doctors"],
    queryFn: doctorsService.list,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("doctors.title")} subtitle={t("doctors.subtitle")} />

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((d) => (
            <div
              key={d.id}
              className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-elevated)]"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-base font-bold text-primary-foreground">
                  {d.firstName.charAt(0)}
                  {d.lastName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold">
                      Dr. {d.firstName} {d.lastName}
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <Stethoscope className="me-1 inline size-3" />
                    {d.specialty}
                  </p>
                </div>
                <StatusBadge
                  tone={
                    d.availability === "available"
                      ? "success"
                      : d.availability === "busy"
                        ? "warning"
                        : "neutral"
                  }
                  dot
                >
                  {t(`doctors.availability.${d.availability}`)}
                </StatusBadge>
              </div>

              <div className="grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
                <Stat label={t("doctors.stats.patients")} value={d.patientsCount} />
                <Stat label={t("doctors.stats.appointments")} value={d.weeklyAppointments} />
                <Stat
                  label={t("doctors.stats.satisfaction")}
                  value={
                    <span className="inline-flex items-center gap-1">
                      {d.satisfaction.toFixed(1)}
                      <Star className="size-3 fill-warning text-warning" />
                    </span>
                  }
                />
              </div>

              {/* Weekly schedule */}
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t("doctors.detail.weekly")}
                </div>
                <div className="flex gap-1">
                  {d.schedule.map((s) => (
                    <div
                      key={s.day}
                      className={`flex flex-1 flex-col items-center gap-0.5 rounded-md py-1.5 text-[10px] ${
                        s.slots.length
                          ? "bg-success-soft text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                      title={s.slots.join(", ")}
                    >
                      <span className="font-semibold">{s.day}</span>
                      <span className="font-mono">{s.slots.length}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3" />
                  {d.phone}
                </span>
                <span className="inline-flex items-center gap-1 truncate">
                  <Mail className="size-3" />
                  {d.email}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-base font-semibold">{value}</div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
    </div>
  );
}
