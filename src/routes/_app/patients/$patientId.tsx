import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Phone, Mail, MapPin, Droplet, ShieldCheck, Calendar } from "lucide-react";
import { patientsService } from "@/lib/api/services";
import { useT } from "@/lib/i18n/store";
import { LoadingState, ErrorState } from "@/components/shared/States";
import { StatusBadge } from "@/components/shared/StatusBadge";

export const Route = createFileRoute("/_app/patients/$patientId")({
  head: ({ params }) => ({
    meta: [{ title: `Dossier ${params.patientId} — SIH IA` }],
  }),
  component: PatientDetailPage,
});

function PatientDetailPage() {
  const t = useT();
  const { patientId } = useParams({ from: "/_app/patients/$patientId" });
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => patientsService.get(patientId),
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!data)
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground">Patient introuvable</p>
        <Link to="/patients" className="mt-4 inline-block text-sm font-semibold text-primary">
          ← {t("common.back")}
        </Link>
      </div>
    );

  const age = Math.floor((Date.now() - new Date(data.dob).getTime()) / (365.25 * 86400000));

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/patients"
        className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {t("common.back")}
      </Link>

      <div className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:flex-row sm:items-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-2xl font-bold text-primary-foreground">
          {data.firstName.charAt(0)}
          {data.lastName.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {data.firstName} {data.lastName}
            </h1>
            <StatusBadge
              tone={data.status === "active" ? "success" : data.status === "admitted" ? "warning" : "neutral"}
              dot
            >
              {t(`patients.status.${data.status}`)}
            </StatusBadge>
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{data.recordNumber}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {age} ans · {t(`patients.gender.${data.gender.toLowerCase()}`)} ·{" "}
            {data.bloodType}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Section title={t("patients.detail.demographics")}>
          <Item icon={<Calendar className="size-4" />} label={t("patients.detail.dob")} value={data.dob} />
          <Item icon={<Phone className="size-4" />} label={t("patients.col.phone")} value={data.phone} />
          {data.email ? <Item icon={<Mail className="size-4" />} label="Email" value={data.email} /> : null}
          <Item icon={<MapPin className="size-4" />} label={t("patients.detail.address")} value={data.address} />
        </Section>

        <Section title={t("patients.detail.medical")}>
          <Item icon={<Droplet className="size-4" />} label={t("patients.detail.bloodType")} value={data.bloodType} />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase text-muted-foreground">
              {t("patients.detail.allergies")}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {data.allergies.length === 0 ? (
                <span className="text-sm text-muted-foreground">Aucune connue</span>
              ) : (
                data.allergies.map((a) => (
                  <StatusBadge key={a} tone="warning">
                    {a}
                  </StatusBadge>
                ))
              )}
            </div>
          </div>
          {data.insurance ? (
            <Item icon={<ShieldCheck className="size-4" />} label={t("patients.detail.insurance")} value={data.insurance} />
          ) : null}
        </Section>

        <Section title={t("patients.detail.history")}>
          <ul className="flex flex-col gap-3">
            {[
              { date: "2025-03-12", reason: "Bilan annuel", doctor: "Dr. Mansouri" },
              { date: "2024-11-04", reason: "Consultation ORL", doctor: "Dr. Cherkaoui" },
              { date: "2024-08-21", reason: "Vaccination", doctor: "Dr. Benali" },
            ].map((v, i) => (
              <li key={i} className="flex items-start gap-3 border-s-2 border-primary/20 ps-3">
                <div className="flex-1">
                  <div className="text-sm font-medium">{v.reason}</div>
                  <div className="text-xs text-muted-foreground">
                    {v.doctor} · {v.date}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h2 className="mb-4 text-sm font-semibold">{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function Item({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="truncate text-sm">{value}</div>
      </div>
    </div>
  );
}
