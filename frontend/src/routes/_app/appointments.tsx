import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  BellRing,
  CalendarDays,
  History,
  List,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useT, useI18n } from "@/lib/i18n/store";
import { requireRoutePermission } from "@/lib/auth/routeGuard";
import { PageHeader } from "@/components/shared/PageHeader";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { ReminderChannelsBanner } from "@/components/shared/ReminderChannelsBanner";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingState, EmptyState } from "@/components/shared/States";
import { appointmentsService, doctorsService, patientsService } from "@/lib/api/services";
import type {
  Appointment as ApiAppointment,
  AppointmentReminderHistoryItem,
  ReminderChannelStatus,
} from "@/lib/api/types";
import {
  failedReminderChannels,
  reminderActionChannels,
  reminderStatusTone,
} from "@/lib/notifications/reminderDisplay";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Appointment = ApiAppointment;

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
};

type Doctor = {
  id: string;
  firstName: string;
  lastName: string;
  specialty?: string;
};

export const Route = createFileRoute("/_app/appointments")({
  beforeLoad: requireRoutePermission("view_appointments"),
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

  const qc = useQueryClient();
  const { data, isLoading } = useQuery<Appointment[]>({
    queryKey: ["appts"],
    queryFn: appointmentsService.list,
  });

  const batchMut = useMutation({
    mutationFn: appointmentsService.runRemindersBatch,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["appts"] });
      toast.success(t("appts.reminder.toastBatch").replace("{sent}", String(result.sent)));
    },
    onError: () => toast.error(t("common.error")),
  });

  const reminderStatus = useQuery({
    queryKey: ["reminder-status"],
    queryFn: appointmentsService.reminderStatus,
    retry: false,
  });

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
                  view === "calendar"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <CalendarDays className="size-3.5" /> {t("appts.view.calendar")}
              </button>
            </div>
            <PermissionGuard permission="appointments:update">
              <button
                onClick={() => batchMut.mutate()}
                disabled={batchMut.isPending}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted/50"
              >
                <BellRing className="size-4" /> {t("appts.reminder.batch")}
              </button>
            </PermissionGuard>
            <PermissionGuard permission="appointments:create">
              <button
                onClick={() => setShowNew(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="size-4" /> {t("appts.new")}
              </button>
            </PermissionGuard>
          </>
        }
      />

      {reminderStatus.data ? <ReminderChannelsBanner status={reminderStatus.data} /> : null}

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
                  <th className="px-4 py-3 text-start">{t("appts.col.reminder")}</th>
                  <th className="px-4 py-3 text-end">{t("appts.col.status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState />
                    </td>
                  </tr>
                ) : (
                  data?.map((a: Appointment) => (
                    <tr key={a.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">
                        {new Date(a.date).toLocaleString(locale, {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium">{a.patientName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.doctorName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.reason}</td>
                      <td className="px-4 py-3">
                        <ReminderCell appointment={a} />
                      </td>
                      <td className="px-4 py-3 text-end">
                        <StatusBadge
                          dot
                          tone={
                            a.status === "confirmed"
                              ? "success"
                              : a.status === "scheduled"
                                ? "primary"
                                : a.status === "cancelled"
                                  ? "destructive"
                                  : a.status === "noshow"
                                    ? "warning"
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
              <div
                key={i}
                className="px-2 py-3 text-center text-[10px] uppercase text-muted-foreground"
              >
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
                {weekDays.map((d: Date, di: number) => {
                  const slot =
                    data?.filter((a: Appointment) => {
                      const ad = new Date(a.date);
                      return (
                        ad.getDate() === d.getDate() &&
                        ad.getMonth() === d.getMonth() &&
                        ad.getHours() === h
                      );
                    }) ?? [];
                  return (
                    <div
                      key={di}
                      className="min-h-[56px] border-e border-border p-1 last:border-e-0"
                    >
                      {slot.map((a: Appointment) => (
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

      <PermissionGuard permission="appointments:create">
        <NewAppointmentDialog open={showNew} onOpenChange={setShowNew} />
      </PermissionGuard>
    </div>
  );
}

function reminderStatusLabel(status: ReminderChannelStatus, t: (key: string) => string) {
  return t(`appts.reminder.${status}`);
}

function ReminderChannelBadge({
  channel,
  status,
}: {
  channel: "Email" | "SMS";
  status: ReminderChannelStatus;
}) {
  const t = useT();
  return (
    <StatusBadge dot tone={reminderStatusTone(status)}>
      {channel}: {reminderStatusLabel(status, t)}
    </StatusBadge>
  );
}

function ReminderCell({ appointment }: { appointment: Appointment }) {
  const t = useT();
  const locale = useI18n((state) => state.locale);
  const qc = useQueryClient();
  const [historyOpen, setHistoryOpen] = useState(false);
  const active = appointment.status === "scheduled" || appointment.status === "confirmed";
  const failedChannels = failedReminderChannels(appointment.reminderSummary);
  const actionChannels = reminderActionChannels(appointment.reminderSummary);

  const mut = useMutation({
    mutationFn: () => appointmentsService.remind(appointment.id, actionChannels),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["appts"] });
      qc.invalidateQueries({ queryKey: ["appt-reminders", appointment.id] });
      const failed = result?.results.some(
        (item) => item.status === "failed" || item.status === "skipped",
      );
      if (failed) toast.error(t("appts.reminder.toastFailed"));
      else
        toast.success(
          t(failedChannels.length > 0 ? "appts.reminder.toastRetryOk" : "appts.reminder.toastOk"),
        );
    },
    onError: () => toast.error(t("common.error")),
  });

  return (
    <>
      <div className="flex min-w-56 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <ReminderChannelBadge
            channel="Email"
            status={appointment.reminderSummary?.email ?? "none"}
          />
          <ReminderChannelBadge channel="SMS" status={appointment.reminderSummary?.sms ?? "none"} />
        </div>
        {appointment.reminderSummary?.lastSentAt ? (
          <span className="text-[10px] text-muted-foreground">
            {t("appts.reminder.lastAttempt")}:{" "}
            {new Date(appointment.reminderSummary.lastSentAt).toLocaleString(locale)}
          </span>
        ) : null}
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <History className="size-3.5" />
            {t("appts.reminder.history")}
          </button>
          {active ? (
            <PermissionGuard permission="appointments:update">
              <button
                type="button"
                onClick={() => mut.mutate()}
                disabled={mut.isPending}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary-soft disabled:opacity-50"
              >
                {failedChannels.length > 0 ? (
                  <RefreshCw className={`size-3.5 ${mut.isPending ? "animate-spin" : ""}`} />
                ) : (
                  <Bell className="size-3.5" />
                )}
                {t(failedChannels.length > 0 ? "appts.reminder.retry" : "appts.reminder.send")}
              </button>
            </PermissionGuard>
          ) : null}
        </div>
      </div>
      <ReminderHistoryDialog
        appointment={appointment}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </>
  );
}

function historyStatusTone(status: AppointmentReminderHistoryItem["status"]) {
  if (status === "sent") return "success" as const;
  if (status === "failed") return "destructive" as const;
  return "warning" as const;
}

function ReminderHistoryDialog({
  appointment,
  open,
  onOpenChange,
}: {
  appointment: Appointment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const locale = useI18n((state) => state.locale);
  const history = useQuery({
    queryKey: ["appt-reminders", appointment.id],
    queryFn: () => appointmentsService.reminderHistory(appointment.id),
    enabled: open,
  });
  const items = history.data?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("appts.reminder.historyTitle")}</DialogTitle>
          <DialogDescription>
            {appointment.patientName} — {new Date(appointment.date).toLocaleString(locale)}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto">
          {history.isLoading ? (
            <LoadingState />
          ) : items.length === 0 ? (
            <EmptyState title={t("appts.reminder.historyEmpty")} />
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">
                        {item.channel === "email" ? "Email" : "SMS"}
                      </span>
                      <StatusBadge dot tone={historyStatusTone(item.status)}>
                        {t(`appts.reminder.${item.status}`)}
                      </StatusBadge>
                      <span className="text-[10px] uppercase text-muted-foreground">
                        {t(`appts.reminder.kind.${item.kind}`)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{item.recipient}</p>
                    {item.error ? (
                      <p className="mt-1 text-xs text-destructive" role="alert">
                        {item.error}
                      </p>
                    ) : null}
                  </div>
                  <time className="shrink-0 text-[10px] text-muted-foreground">
                    {new Date(item.sentAt).toLocaleString(locale)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewAppointmentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const t = useT();
  const qc = useQueryClient();
  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["patients", "", "all"],
    queryFn: () => patientsService.list(),
  });
  const { data: doctors } = useQuery<Doctor[]>({
    queryKey: ["doctors"],
    queryFn: doctorsService.list,
  });
  const [form, setForm] = useState({
    patientId: "",
    doctorId: "",
    date: "",
    time: "09:00",
    reason: "",
  });
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
    const patient = patients?.find((p: Patient) => p.id === form.patientId);
    const doctor = doctors?.find((d: Doctor) => d.id === form.doctorId);
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
            <select
              value={form.patientId}
              onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">— Choisir —</option>
              {patients?.slice(0, 30).map((p: Patient) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <label className="text-xs font-medium">{t("appts.col.doctor")}</label>
            <select
              value={form.doctorId}
              onChange={(e) => setForm((f) => ({ ...f, doctorId: e.target.value }))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">— Choisir —</option>
              {doctors?.map((d: Doctor) => (
                <option key={d.id} value={d.id}>
                  Dr. {d.firstName} {d.lastName} — {d.specialty}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">Heure</label>
            <input
              type="time"
              value={form.time}
              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <label className="text-xs font-medium">{t("appts.col.reason")}</label>
            <input
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Consultation de routine"
            />
          </div>
          {conflict ? (
            <div className="sm:col-span-2 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive-soft px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="size-4" /> {t("appts.conflict")}
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={mut.isPending}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
