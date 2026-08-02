import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type DragEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BellRing,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  History,
  List,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useT, useI18n } from "@/lib/i18n/store";
import { requireRoutePermission } from "@/lib/auth/routeGuard";
import { usePermission } from "@/lib/auth/usePermission";
import { useAuth } from "@/lib/auth/store";
import { PageHeader } from "@/components/shared/PageHeader";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { ReminderChannelsBanner } from "@/components/shared/ReminderChannelsBanner";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  DataTableToolbar,
  SortableTableHead,
  type TableColumnOption,
} from "@/components/shared/DataTableTools";
import { LoadingState, EmptyState } from "@/components/shared/States";
import { appointmentsService, doctorsService, patientsService } from "@/lib/api/services";
import type {
  Appointment as ApiAppointment,
  AppointmentReminderHistoryItem,
  AppointmentStatus,
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
  EMPTY_APPOINTMENT_FILTERS,
  filterAppointments,
  loadMySpecialty,
  loadSavedAppointmentViews,
  resolveMySpecialty,
  saveAppointmentViews,
  saveMySpecialty,
  type AppointmentFilters,
  type SavedAppointmentView,
} from "@/lib/appointments/savedViews";
import { isOfflineQueuedError } from "@/lib/offline/appointmentQueue";
import { buildCsv, downloadCsv, sortRows, toggleSort, type SortState } from "@/lib/table/dataTable";
import { useTablePreferences } from "@/lib/table/useTablePreferences";
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

type AppointmentColumn = "time" | "patient" | "doctor" | "reason" | "reminder" | "status";
const APPOINTMENT_COLUMN_IDS: AppointmentColumn[] = [
  "time",
  "patient",
  "doctor",
  "reason",
  "reminder",
  "status",
];

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
};

type Doctor = {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  email: string;
};

export const Route = createFileRoute("/_app/appointments")({
  beforeLoad: requireRoutePermission("view_appointments"),
  head: () => ({ meta: [{ title: "Rendez-vous — SIH IA" }] }),
  component: AppointmentsPage,
});

function AppointmentsPage() {
  const t = useT();
  const locale = useI18n((s) => s.locale);
  const user = useAuth((state) => state.user);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [showNew, setShowNew] = useState(false);
  const [filters, setFilters] = useState<AppointmentFilters>(EMPTY_APPOINTMENT_FILTERS);
  const [savedViews, setSavedViews] = useState<SavedAppointmentView[]>([]);
  const [mySpecialty, setMySpecialty] = useState("");
  const [sort, setSort] = useState<SortState<AppointmentColumn>>({
    key: "time",
    direction: "asc",
  });
  const columns: TableColumnOption<AppointmentColumn>[] = [
    { id: "time", label: t("appts.col.time") },
    { id: "patient", label: t("appts.col.patient") },
    { id: "doctor", label: t("appts.col.doctor") },
    { id: "reason", label: t("appts.col.reason") },
    { id: "reminder", label: t("appts.col.reminder") },
    { id: "status", label: t("appts.col.status") },
  ];

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

  const userKey = user?.id || user?.email || "anonymous";
  const table = useTablePreferences("appointments", userKey, APPOINTMENT_COLUMN_IDS);
  const specialties = [...new Set((doctors ?? []).map((doctor) => doctor.specialty))].sort();
  const filteredAppointments = filterAppointments(data ?? [], doctors ?? [], filters);
  const sortedAppointments = sortRows(
    filteredAppointments,
    sort,
    {
      time: (appointment) => new Date(appointment.date),
      patient: (appointment) => appointment.patientName,
      doctor: (appointment) => appointment.doctorName,
      reason: (appointment) => appointment.reason,
      reminder: (appointment) => appointment.reminderSummary?.lastSentAt,
      status: (appointment) => appointment.status,
    },
    locale,
  );
  const filteredDoctors = (doctors ?? []).filter(
    (doctor) =>
      (!filters.specialty || doctor.specialty === filters.specialty) &&
      (!filters.doctorId || doctor.id === filters.doctorId),
  );

  useEffect(() => {
    if (typeof window === "undefined" || !doctors?.length) return;
    setSavedViews(loadSavedAppointmentViews(window.localStorage, userKey));
    setMySpecialty(
      resolveMySpecialty(user?.email, doctors, loadMySpecialty(window.localStorage, userKey)),
    );
  }, [doctors, user?.email, userKey]);

  const persistViews = (next: SavedAppointmentView[]) => {
    setSavedViews(next);
    if (typeof window !== "undefined") {
      saveAppointmentViews(window.localStorage, userKey, next);
    }
  };

  const saveCurrentView = (name: string) => {
    const normalizedName = name.trim();
    if (!normalizedName) return;
    const existing = savedViews.find(
      (saved) => saved.name.toLowerCase() === normalizedName.toLowerCase(),
    );
    const saved: SavedAppointmentView = {
      id: existing?.id ?? `view-${Date.now()}`,
      name: normalizedName,
      display: view,
      filters: { ...filters },
    };
    const next = existing
      ? savedViews.map((item) => (item.id === existing.id ? saved : item))
      : [...savedViews, saved];
    persistViews(next);
    toast.success(t("appts.filters.savedToast"));
  };

  const deleteSavedView = (id: string) => {
    persistViews(savedViews.filter((saved) => saved.id !== id));
    toast.success(t("appts.filters.deletedToast"));
  };

  const updateMySpecialty = (specialty: string) => {
    setMySpecialty(specialty);
    if (typeof window !== "undefined") {
      saveMySpecialty(window.localStorage, userKey, specialty);
    }
  };

  const exportAppointments = () => {
    const csvColumns = {
      time: {
        header: t("appts.col.time"),
        value: (appointment: Appointment) => new Date(appointment.date).toLocaleString(locale),
      },
      patient: {
        header: t("appts.col.patient"),
        value: (appointment: Appointment) => appointment.patientName,
      },
      doctor: {
        header: t("appts.col.doctor"),
        value: (appointment: Appointment) => appointment.doctorName,
      },
      reason: {
        header: t("appts.col.reason"),
        value: (appointment: Appointment) => appointment.reason,
      },
      reminder: {
        header: t("appts.col.reminder"),
        value: (appointment: Appointment) =>
          `Email: ${appointment.reminderSummary?.email ?? "none"}, SMS: ${appointment.reminderSummary?.sms ?? "none"}`,
      },
      status: {
        header: t("appts.col.status"),
        value: (appointment: Appointment) => t(`appts.status.${appointment.status}`),
      },
    };
    downloadCsv(
      `rendez-vous-${new Date().toISOString().slice(0, 10)}.csv`,
      buildCsv(
        sortedAppointments,
        table.visibleColumns.map((column) => csvColumns[column]),
      ),
    );
  };

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

      <AppointmentFiltersBar
        filters={filters}
        onFiltersChange={setFilters}
        doctors={doctors ?? []}
        specialties={specialties}
        mySpecialty={mySpecialty}
        onMySpecialtyChange={updateMySpecialty}
        savedViews={savedViews}
        onSaveView={saveCurrentView}
        onApplyView={(saved) => {
          setFilters({ ...saved.filters });
          setView(saved.display);
        }}
        onDeleteView={deleteSavedView}
        resultCount={filteredAppointments.length}
      />

      {isLoading ? (
        <LoadingState />
      ) : view === "list" ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <DataTableToolbar
            columns={columns}
            visibleColumns={table.visibleColumns}
            onToggleColumn={table.toggleColumn}
            dense={table.dense}
            onDenseChange={table.setDense}
            rowCount={sortedAppointments.length}
            onExport={exportAppointments}
          />
          <div className="overflow-x-auto">
            <table
              className="min-w-full text-sm"
              data-testid="appointments-table"
              data-density={table.dense ? "compact" : "comfortable"}
            >
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  {columns.map((column) =>
                    table.isVisible(column.id) ? (
                      <SortableTableHead
                        key={column.id}
                        column={column.id}
                        label={column.label}
                        sort={sort}
                        onSort={(nextColumn) =>
                          setSort((current) => toggleSort(current, nextColumn))
                        }
                        align={column.id === "status" ? "end" : "start"}
                      />
                    ) : null,
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={table.visibleColumns.length}>
                      <EmptyState />
                    </td>
                  </tr>
                ) : (
                  sortedAppointments.map((a: Appointment) => (
                    <tr key={a.id} className="hover:bg-muted/30">
                      {table.isVisible("time") ? (
                        <td
                          className={`${table.dense ? "px-3 py-2" : "px-4 py-3"} font-mono text-xs`}
                        >
                          {new Date(a.date).toLocaleString(locale, {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      ) : null}
                      {table.isVisible("patient") ? (
                        <td className={`${table.dense ? "px-3 py-2" : "px-4 py-3"} font-medium`}>
                          {a.patientName}
                        </td>
                      ) : null}
                      {table.isVisible("doctor") ? (
                        <td
                          className={`${table.dense ? "px-3 py-2" : "px-4 py-3"} text-muted-foreground`}
                        >
                          {a.doctorName}
                        </td>
                      ) : null}
                      {table.isVisible("reason") ? (
                        <td
                          className={`${table.dense ? "px-3 py-2" : "px-4 py-3"} text-muted-foreground`}
                        >
                          {a.reason}
                        </td>
                      ) : null}
                      {table.isVisible("reminder") ? (
                        <td className={table.dense ? "px-3 py-2" : "px-4 py-3"}>
                          <ReminderCell appointment={a} />
                        </td>
                      ) : null}
                      {table.isVisible("status") ? (
                        <td className={`${table.dense ? "px-3 py-2" : "px-4 py-3"} text-end`}>
                          <AppointmentWorkflowCell appointment={a} />
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <MultiDoctorCalendar appointments={filteredAppointments} doctors={filteredDoctors} />
      )}

      <PermissionGuard permission="appointments:create">
        <NewAppointmentDialog open={showNew} onOpenChange={setShowNew} />
      </PermissionGuard>
    </div>
  );
}

const FILTER_STATUSES: Array<AppointmentStatus | "all"> = [
  "all",
  "scheduled",
  "confirmed",
  "arrived",
  "completed",
  "cancelled",
  "noshow",
];

function AppointmentFiltersBar({
  filters,
  onFiltersChange,
  doctors,
  specialties,
  mySpecialty,
  onMySpecialtyChange,
  savedViews,
  onSaveView,
  onApplyView,
  onDeleteView,
  resultCount,
}: {
  filters: AppointmentFilters;
  onFiltersChange: (filters: AppointmentFilters) => void;
  doctors: Doctor[];
  specialties: string[];
  mySpecialty: string;
  onMySpecialtyChange: (specialty: string) => void;
  savedViews: SavedAppointmentView[];
  onSaveView: (name: string) => void;
  onApplyView: (view: SavedAppointmentView) => void;
  onDeleteView: (id: string) => void;
  resultCount: number;
}) {
  const t = useT();
  const [viewName, setViewName] = useState("");

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filters.search}
            onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
            placeholder={t("appts.filters.searchPlaceholder")}
            className="w-full rounded-lg border border-border bg-background py-2 pe-3 ps-9 text-sm"
          />
        </div>
        <select
          value={filters.status}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              status: event.target.value as AppointmentFilters["status"],
            })
          }
          aria-label={t("appts.col.status")}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          {FILTER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status === "all" ? t("appts.filters.allStatuses") : t(`appts.status.${status}`)}
            </option>
          ))}
        </select>
        <select
          value={filters.specialty}
          onChange={(event) =>
            onFiltersChange({ ...filters, specialty: event.target.value, doctorId: "" })
          }
          aria-label={t("appts.filters.specialty")}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">{t("appts.filters.allSpecialties")}</option>
          {specialties.map((specialty) => (
            <option key={specialty} value={specialty}>
              {specialty}
            </option>
          ))}
        </select>
        <select
          value={filters.doctorId}
          onChange={(event) => onFiltersChange({ ...filters, doctorId: event.target.value })}
          aria-label={t("appts.col.doctor")}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">{t("appts.calendar.allDoctors")}</option>
          {doctors
            .filter((doctor) => !filters.specialty || doctor.specialty === filters.specialty)
            .map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                Dr. {doctor.firstName} {doctor.lastName}
              </option>
            ))}
        </select>
        <Button
          variant={filters.specialty === mySpecialty && mySpecialty ? "default" : "outline"}
          disabled={!mySpecialty}
          onClick={() => onFiltersChange({ ...filters, specialty: mySpecialty, doctorId: "" })}
        >
          <BriefcaseBusiness className="size-4" />
          {t("appts.filters.myService")}
        </Button>
        <Button variant="ghost" onClick={() => onFiltersChange({ ...EMPTY_APPOINTMENT_FILTERS })}>
          <X className="size-4" />
          {t("appts.filters.clear")}
        </Button>
        <span className="ms-auto text-xs font-medium text-muted-foreground">
          {t("appts.filters.results").replace("{count}", String(resultCount))}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <label htmlFor="my-service" className="text-xs font-medium text-muted-foreground">
          {t("appts.filters.defineService")}
        </label>
        <select
          id="my-service"
          value={mySpecialty}
          onChange={(event) => onMySpecialtyChange(event.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs"
        >
          {specialties.map((specialty) => (
            <option key={specialty} value={specialty}>
              {specialty}
            </option>
          ))}
        </select>

        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

        <select
          defaultValue=""
          onChange={(event) => {
            const saved = savedViews.find((item) => item.id === event.target.value);
            if (saved) onApplyView(saved);
            event.target.value = "";
          }}
          aria-label={t("appts.filters.savedViews")}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs"
        >
          <option value="">{t("appts.filters.savedViews")}</option>
          {savedViews.map((saved) => (
            <option key={saved.id} value={saved.id}>
              {saved.name}
            </option>
          ))}
        </select>
        <input
          value={viewName}
          onChange={(event) => setViewName(event.target.value)}
          placeholder={t("appts.filters.viewName")}
          className="min-w-40 rounded-lg border border-border bg-background px-3 py-1.5 text-xs"
        />
        <Button
          size="sm"
          variant="outline"
          disabled={!viewName.trim()}
          onClick={() => {
            onSaveView(viewName);
            setViewName("");
          }}
        >
          <Save className="size-3.5" />
          {t("appts.filters.saveView")}
        </Button>

        {savedViews.map((saved) => (
          <span
            key={saved.id}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px]"
          >
            <button type="button" onClick={() => onApplyView(saved)} className="font-medium">
              {saved.name}
            </button>
            <button
              type="button"
              onClick={() => onDeleteView(saved.id)}
              aria-label={`${t("common.delete")} ${saved.name}`}
              className="rounded-full p-0.5 text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
            >
              <Trash2 className="size-3" />
            </button>
          </span>
        ))}
      </div>
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
    networkMode: "always",
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
    onError: (error: Error, variables) => {
      if (isOfflineQueuedError(error)) {
        const targetDoctor = doctors.find((doctor) => doctor.id === variables.doctorId);
        qc.setQueryData<Appointment[]>(["appts"], (current) =>
          current?.map((appointment) =>
            appointment.id === variables.appointmentId
              ? {
                  ...appointment,
                  doctorId: variables.doctorId,
                  doctorName: targetDoctor
                    ? `Dr. ${targetDoctor.firstName} ${targetDoctor.lastName}`
                    : appointment.doctorName,
                  date: variables.date,
                }
              : appointment,
          ),
        );
        toast.success(t("offline.queuedToast"));
        return;
      }
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
    networkMode: "always",
    mutationFn: (status: Appointment["status"]) =>
      appointmentsService.updateStatus(appointment.id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appts"] });
      toast.success(t("appts.workflow.updated"));
    },
    onError: (error, status) => {
      if (isOfflineQueuedError(error)) {
        qc.setQueryData<Appointment[]>(["appts"], (current) =>
          current?.map((item) => (item.id === appointment.id ? { ...item, status } : item)),
        );
        toast.success(t("offline.queuedToast"));
        return;
      }
      toast.error(t("common.error"));
    },
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
    networkMode: "always",
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
    onError: (error) => {
      if (isOfflineQueuedError(error)) {
        toast.success(t("offline.queuedToast"));
        return;
      }
      toast.error(t("common.error"));
    },
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
