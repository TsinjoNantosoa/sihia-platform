import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Phone, Mail, MapPin, Droplet, ShieldCheck, Calendar, Plus, Stethoscope, FileText } from "lucide-react";
import { patientsService } from "@/lib/api/services";
import { useT } from "@/lib/i18n/store";
import { LoadingState, ErrorState } from "@/components/shared/States";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/patients/$patientId")({
  head: ({ params }) => ({
    meta: [{ title: `Dossier ${params.patientId} — SIH IA` }],
  }),
  component: PatientDetailPage,
});

function PatientDetailPage() {
  const t = useT();
  const qc = useQueryClient();
  const { patientId } = useParams({ from: "/_app/patients/$patientId" });
  const [showAddVisit, setShowAddVisit] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => patientsService.get(patientId),
  });

  const { data: history, isLoading: histLoading } = useQuery({
    queryKey: ["patient-history", patientId],
    queryFn: () => patientsService.history(patientId),
    enabled: !!patientId,
  });

  const addVisitMut = useMutation({
    mutationFn: (visit: Parameters<typeof patientsService.addVisit>[1]) =>
      patientsService.addVisit(patientId, visit),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient-history", patientId] });
      toast.success("Visite ajoutée avec succès");
      setShowAddVisit(false);
    },
    onError: () => toast.error("Erreur lors de l'ajout de la visite"),
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

      {/* Header card */}
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:flex-row sm:items-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-2xl font-bold text-primary-foreground">
          {data.firstName.charAt(0)}{data.lastName.charAt(0)}
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
            {age} ans · {t(`patients.gender.${data.gender.toLowerCase()}`)} · {data.bloodType}
          </p>
        </div>
      </div>

      {/* Infos grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
                data.allergies.map((a: string) => (
                  <StatusBadge key={a} tone="warning">{a}</StatusBadge>
                ))
              )}
            </div>
          </div>
          {data.insurance ? (
            <Item icon={<ShieldCheck className="size-4" />} label={t("patients.detail.insurance")} value={data.insurance} />
          ) : null}
        </Section>
      </div>

      {/* Medical history */}
      <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Stethoscope className="size-4 text-primary" />
            {t("patients.detail.history")}
          </h2>
          <PermissionGuard permission="patients:update">
            <button
              onClick={() => setShowAddVisit(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="size-3.5" /> Ajouter une visite
            </button>
          </PermissionGuard>
        </div>

        {histLoading ? (
          <div className="p-6"><LoadingState /></div>
        ) : !history || history.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Aucun antécédent enregistré</div>
        ) : (
          <div className="divide-y divide-border">
            {history.map((v: {
              id: string; date: string; reason: string; doctorName: string;
              specialty: string; diagnosis: string; treatment?: string; notes?: string;
            }) => (
              <div key={v.id} className="flex gap-4 p-5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <FileText className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{v.reason}</span>
                    <span className="font-mono text-xs text-muted-foreground">{v.date}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {v.doctorName} · <span className="italic">{v.specialty}</span>
                  </p>
                  <p className="mt-2 text-sm">{v.diagnosis}</p>
                  {v.treatment && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="font-medium">Traitement :</span> {v.treatment}
                    </p>
                  )}
                  {v.notes && (
                    <p className="mt-1 rounded-md bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                      💬 {v.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddVisitDialog
        open={showAddVisit}
        onOpenChange={setShowAddVisit}
        onSubmit={(v) => addVisitMut.mutate(v)}
        isPending={addVisitMut.isPending}
      />
    </div>
  );
}

function AddVisitDialog({
  open, onOpenChange, onSubmit, isPending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (v: { date: string; reason: string; doctorName: string; specialty: string; diagnosis: string; treatment?: string; notes?: string }) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    reason: "",
    doctorName: "",
    specialty: "",
    diagnosis: "",
    treatment: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const field = (key: keyof typeof form, label: string, required = false, multiline = false) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium">
        {label}{required && <span className="text-destructive"> *</span>}
      </label>
      {multiline ? (
        <textarea
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          rows={2}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 resize-none"
        />
      ) : (
        <input
          type={key === "date" ? "date" : "text"}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
        />
      )}
      {errors[key] && <span className="text-[11px] text-destructive">{errors[key]}</span>}
    </div>
  );

  const submit = () => {
    const errs: Record<string, string> = {};
    if (!form.date) errs.date = "Requis";
    if (!form.reason) errs.reason = "Requis";
    if (!form.doctorName) errs.doctorName = "Requis";
    if (!form.specialty) errs.specialty = "Requis";
    if (!form.diagnosis) errs.diagnosis = "Requis";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    onSubmit({
      ...form,
      treatment: form.treatment || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter une visite médicale</DialogTitle>
          <DialogDescription>Renseignez les informations de la consultation.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2">
          {field("date", "Date", true)}
          {field("reason", "Motif de consultation", true)}
          {field("doctorName", "Médecin", true)}
          {field("specialty", "Spécialité", true)}
          <div className="sm:col-span-2">{field("diagnosis", "Diagnostic", true, true)}</div>
          <div className="sm:col-span-2">{field("treatment", "Traitement prescrit", false, true)}</div>
          <div className="sm:col-span-2">{field("notes", "Notes / Suivi", false, true)}</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
