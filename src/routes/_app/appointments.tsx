import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, List, CalendarDays, AlertTriangle } from "lucide-react";
import { useT, useI18n } from "@/lib/i18n/store";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingState, EmptyState } from "@/components/shared/States";
import { appointmentsService, doctorsService, patientsService } from "@/lib/api/services";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/appointments")({
  head: () => ({ meta: [{ title: "Rendez-vous — SIH IA" }] }),
  component: AppointmentsPage,
});

const HOURS = Array.from({ length: 10 }, (_, i) => 8 + i); // 08h-17h
const DAYS_LABEL = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function AppointmentsPage() {
  const t = useT();
  const locale = useI18n((s) => s.locale);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [showNew, setShowNew] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["appts"], queryFn: appointmentsService.list });

  // Build calendar grid for current week
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("appts.title")}
        subtitle={t("appts.subtitle")}
        actions={
          <>
            <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
              <button
                onClick={() => setView("list")}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
                  view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                <List className="size-3.5" /> {t("appts.view.list")}
              </button>
              <button
                onClick={() => setView("calendar")}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
                  view === "calendar" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                <CalendarDays className="size-3.5" /> {t("appts.view.calendar")}
              </button>
            </div>
            <button
              onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="size-4" /> {t("appts.new")}
            </button>
          </>
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : view === "list" ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-start">{t("appts.col.time")}</th>
                  <th className="px-4 py-3 text-start">{t("appts.col.patient")}</th>
                  <th className="px-4 py-3 text-start">{t("appts.col.doctor")}</th>
                  <th className="px-4 py-3 text-start">{t("appts.col.reason")}</th>
                  <th className="px-4 py-3 text-end">{t("appts.col.status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.length === 0 ? (
                  <tr><td colSpan={5}><EmptyState /></td></tr>
                ) : (
                  data?.map((a) => (
                    <tr key={a.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">
                        {new Date(a.date).toLocaleString(locale, {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium">{a.patientName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.doctorName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.reason}</td>
                      <td className="px-4 py-3 text-end">
                        <StatusBadge
                          dot
                          tone={
                            a.status === "confirmed" ? "success"
                              : a.status === "scheduled" ? "primary"
                              : a.status === "cancelled" ? "destructive"
                              : a.status === "noshow" ? "warning"
                              : "neutral"
                          }
                        >
                          {t(`appts.status.${a.status}`)}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-muted/40">
            <div />
            {weekDays.map((d, i) => (
              <div key={i} className="px-2 py-3 text-center text-[10px] uppercase text-muted-foreground">
                <div className="font-semibold">{DAYS_LABEL[i]}</div>
                <div className="text-foreground">{d.getDate()}</div>
              </div>
            ))}
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {HOURS.map((h) => (
              <div key={h} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
                <div className="border-e border-border p-2 text-end font-mono text-[10px] text-muted-foreground">
                  {String(h).padStart(2, "0")}:00
                </div>
                {weekDays.map((d, di) => {
                  const slot = data?.filter((a) => {
                    const ad = new Date(a.date);
                    return (
                      ad.getDate() === d.getDate() &&
                      ad.getMonth() === d.getMonth() &&
                      ad.getHours() === h
                    );
                  }) ?? [];
                  return (
                    <div key={di} className="min-h-[56px] border-e border-border p-1 last:border-e-0">
                      {slot.map((a) => (
                        <div
                          key={a.id}
                          className={`mb-1 rounded-md border-s-2 p-1.5 text-[10px] ${
                            a.status === "cancelled"
                              ? "border-destructive bg-destructive-soft text-destructive line-through"
                              : "border-primary bg-primary-soft text-primary"
                          }`}
                        >
                          <div className="truncate font-semibold">{a.patientName}</div>
                          <div className="truncate opacity-80">{a.doctorName}</div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <NewAppointmentDialog open={showNew} onOpenChange={setShowNew} />
    </div>
  );
}

function NewAppointmentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const qc = useQueryClient();
  const { data: patients } = useQuery({ queryKey: ["patients", "", "all"], queryFn: () => patientsService.list() });
  const { data: doctors } = useQuery({ queryKey: ["doctors"], queryFn: doctorsService.list });
  const [form, setForm] = useState({ patientId: "", doctorId: "", date: "", time: "09:00", reason: "" });
  const [conflict, setConflict] = useState(false);

  const mut = useMutation({
    mutationFn: appointmentsService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appts"] });
      toast.success("Rendez-vous créé");
      onOpenChange(false);
      setConflict(false);
    },
    onError: (e: Error) => {
      if (e.message === "CONFLICT") setConflict(true);
      else toast.error(t("common.error"));
    },
  });

  const submit = () => {
    setConflict(false);
    const patient = patients?.find((p) => p.id === form.patientId);
    const doctor = doctors?.find((d) => d.id === form.doctorId);
    if (!patient || !doctor || !form.date) return;
    const dt = new Date(`${form.date}T${form.time}:00`);
    mut.mutate({
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      doctorId: doctor.id,
      doctorName: `Dr. ${doctor.firstName} ${doctor.lastName}`,
      date: dt.toISOString(),
      durationMin: 30,
      reason: form.reason || "Consultation",
      status: "scheduled",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("appts.new")}</DialogTitle>
          <DialogDescription>Planifier une consultation</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2">
          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <label className="text-xs font-medium">{t("appts.col.patient")}</label>
            <select value={form.patientId} onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="">— Choisir —</option>
              {patients?.slice(0, 30).map((p) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <label className="text-xs font-medium">{t("appts.col.doctor")}</label>
            <select value={form.doctorId} onChange={(e) => setForm((f) => ({ ...f, doctorId: e.target.value }))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="">— Choisir —</option>
              {doctors?.map((d) => (
                <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName} — {d.specialty}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">Heure</label>
            <input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <label className="text-xs font-medium">{t("appts.col.reason")}</label>
            <input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Consultation de routine" />
          </div>
          {conflict ? (
            <div className="sm:col-span-2 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive-soft px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="size-4" /> {t("appts.conflict")}
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={submit} disabled={mut.isPending}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
