import { createFileRoute } from "@tanstack/react-router";
import { useState, type DragEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BellRing,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  History,
  List,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useT, useI18n } from "@/lib/i18n/store";
import { requireRoutePermission } from "@/lib/auth/routeGuard";
import { usePermission } from "@/lib/auth/usePermission";
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
import { appointmentStatusTone, nextAppointmentStatus } from "@/lib/appointments/workflow";
import {
  appointmentOccursOnDay,
  appointmentStartsInSlot,
  buildSlotDate,
  CALENDAR_SLOTS,
  canRescheduleAppointment,
  formatDateInput,
  type CalendarSlot,
} from "@/lib/appointments/calendar";
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
  const { data: doctors } = useQuery<Doctor[]>({
    queryKey: ["doctors"],
    queryFn: doctorsService.list,
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
                        <AppointmentWorkflowCell appointment={a} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <MultiDoctorCalendar appointments={data ?? []} doctors={doctors ?? []} />
      )}

      <PermissionGuard permission="appointments:create">
        <NewAppointmentDialog open={showNew} onOpenChange={setShowNew} />
      </PermissionGuard>
    </div>
  );
}

function MultiDoctorCalendar({
  appointments,
  doctors,
}: {
  appointments: Appointment[];
  doctors: Doctor[];
}) {
  const t = useT();
  const locale = useI18n((state) => state.locale);
  const canUpdate = usePermission("appointments:update");
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [draggedAppointmentId, setDraggedAppointmentId] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);

  const visibleDoctors =
    doctorFilter === "all" ? doctors : doctors.filter((doctor) => doctor.id === doctorFilter);
  const dayAppointments = appointments.filter((appointment) =>
    appointmentOccursOnDay(appointment.date, selectedDate),
  );

  const moveMutation = useMutation({
    mutationFn: ({
      appointmentId,
      doctorId,
      date,
    }: {
      appointmentId: string;
      doctorId: string;
      date: string;
    }) => appointmentsService.reschedule(appointmentId, { doctorId, date }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appts"] });
      toast.success(t("appts.calendar.moved"));
    },
    onError: (error: Error) => {
      toast.error(
        error.message.toLowerCase().includes("conflit")
          ? t("appts.conflict")
          : t("appts.calendar.moveFailed"),
      );
    },
    onSettled: () => {
      setDraggedAppointmentId(null);
      setActiveDropZone(null);
    },
  });

  const moveDay = (offset: number) => {
    setSelectedDate((current) => {
      const next = new Date(current);
      next.setDate(current.getDate() + offset);
      return next;
    });
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, doctor: Doctor, slot: CalendarSlot) => {
    event.preventDefault();
    const appointmentId =
      draggedAppointmentId || event.dataTransfer.getData("application/x-sihia-appointment");
    const appointment = appointments.find((item) => item.id === appointmentId);
    if (!appointment || !canUpdate || !canRescheduleAppointment(appointment.status)) return;
    const date = buildSlotDate(selectedDate, slot);
    if (appointment.doctorId === doctor.id && appointment.date === date) return;
    moveMutation.mutate({ appointmentId, doctorId: doctor.id, date });
  };

  if (doctors.length === 0) {
    return <EmptyState />;
  }

  const columns = `72px repeat(${visibleDoctors.length}, minmax(190px, 1fr))`;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-3 border-b border-border p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label={t("common.previous")}
            onClick={() => moveDay(-1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <input
            type="date"
            value={formatDateInput(selectedDate)}
            onChange={(event) => {
              if (event.target.value) setSelectedDate(new Date(`${event.target.value}T12:00:00`));
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium"
          />
          <Button variant="outline" onClick={() => setSelectedDate(new Date())}>
            {t("common.today")}
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={t("common.next")}
            onClick={() => moveDay(1)}
          >
            <ChevronRight className="size-4" />
          </Button>
          <span className="text-sm font-semibold capitalize">
            {selectedDate.toLocaleDateString(locale, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="calendar-doctor" className="text-xs font-medium text-muted-foreground">
            {t("appts.calendar.doctorFilter")}
          </label>
          <select
            id="calendar-doctor"
            value={doctorFilter}
            onChange={(event) => setDoctorFilter(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="all">{t("appts.calendar.allDoctors")}</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                Dr. {doctor.firstName} {doctor.lastName}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">{t("appts.calendar.dragHint")}</span>
        </div>
      </div>

      <div className="max-h-[650px] overflow-auto">
        <div className="min-w-max">
          <div
            className="sticky top-0 z-20 grid border-b border-border bg-muted/90 backdrop-blur"
            style={{ gridTemplateColumns: columns }}
          >
            <div className="sticky start-0 z-30 border-e border-border bg-muted/90 p-3 text-center text-xs font-semibold">
              {t("appts.col.time")}
            </div>
            {visibleDoctors.map((doctor) => (
              <div key={doctor.id} className="border-e border-border px-3 py-2 last:border-e-0">
                <div className="truncate text-xs font-semibold">
                  Dr. {doctor.firstName} {doctor.lastName}
                </div>
                <div className="truncate text-[10px] text-muted-foreground">{doctor.specialty}</div>
              </div>
            ))}
          </div>

          {CALENDAR_SLOTS.map((slot) => (
            <div
              key={`${slot.hour}-${slot.minute}`}
              className="grid border-b border-border last:border-b-0"
              style={{ gridTemplateColumns: columns }}
            >
              <div className="sticky start-0 z-10 border-e border-border bg-card p-2 text-end font-mono text-[10px] text-muted-foreground">
                {String(slot.hour).padStart(2, "0")}:{String(slot.minute).padStart(2, "0")}
              </div>
              {visibleDoctors.map((doctor) => {
                const zoneId = `${doctor.id}-${slot.hour}-${slot.minute}`;
                const slotAppointments = dayAppointments.filter(
                  (appointment) =>
                    appointment.doctorId === doctor.id &&
                    appointmentStartsInSlot(appointment.date, slot),
                );
                return (
                  <div
                    key={doctor.id}
                    onDragOver={(event) => {
                      if (!draggedAppointmentId) return;
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setActiveDropZone(zoneId);
                    }}
                    onDragLeave={() =>
                      setActiveDropZone((current) => (current === zoneId ? null : current))
                    }
                    onDrop={(event) => handleDrop(event, doctor, slot)}
                    className={`min-h-16 border-e border-border p-1 transition-colors last:border-e-0 ${
                      activeDropZone === zoneId
                        ? "bg-primary-soft ring-1 ring-inset ring-primary"
                        : ""
                    }`}
                  >
                    {slotAppointments.map((appointment) => {
                      const draggable = canUpdate && canRescheduleAppointment(appointment.status);
                      return (
                        <div
                          key={appointment.id}
                          draggable={draggable}
                          onDragStart={(event) => {
                            if (!draggable) return;
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData(
                              "application/x-sihia-appointment",
                              appointment.id,
                            );
                            setDraggedAppointmentId(appointment.id);
                          }}
                          onDragEnd={() => {
                            setDraggedAppointmentId(null);
                            setActiveDropZone(null);
                          }}
                          className={`mb-1 rounded-md border-s-2 p-1.5 text-[10px] shadow-sm ${
                            appointment.status === "cancelled"
                              ? "border-destructive bg-destructive-soft text-destructive line-through"
                              : appointment.status === "confirmed"
                                ? "border-success bg-success-soft text-success"
                                : "border-primary bg-primary-soft text-primary"
                          } ${draggable ? "cursor-grab active:cursor-grabbing" : "cursor-not-allowed opacity-75"}`}
                          title={
                            draggable ? t("appts.calendar.dragHint") : t("appts.calendar.locked")
                          }
                        >
                          <div className="flex items-start gap-1">
                            {draggable ? <GripVertical className="mt-0.5 size-3 shrink-0" /> : null}
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-semibold">
                                {appointment.patientName}
                              </div>
                              <div className="truncate opacity-80">
                                {new Date(appointment.date).toLocaleTimeString(locale, {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}{" "}
                                · {appointment.durationMin} min
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AppointmentWorkflowCell({ appointment }: { appointment: Appointment }) {
  const t = useT();
  const qc = useQueryClient();
  const nextStatus = nextAppointmentStatus(appointment.status);
  const mutation = useMutation({
    mutationFn: (status: Appointment["status"]) =>
      appointmentsService.updateStatus(appointment.id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appts"] });
      toast.success(t("appts.workflow.updated"));
    },
    onError: () => toast.error(t("common.error")),
  });

  return (
    <div className="flex min-w-36 flex-col items-end gap-1.5">
      <StatusBadge dot tone={appointmentStatusTone(appointment.status)}>
        {t(`appts.status.${appointment.status}`)}
      </StatusBadge>
      {nextStatus ? (
        <PermissionGuard permission="appointments:update">
          <button
            type="button"
            onClick={() => mutation.mutate(nextStatus)}
            disabled={mutation.isPending}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary-soft disabled:opacity-50"
          >
            {t(`appts.workflow.action.${nextStatus}`)}
            <ArrowRight className="size-3" aria-hidden />
          </button>
        </PermissionGuard>
      ) : null}
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
