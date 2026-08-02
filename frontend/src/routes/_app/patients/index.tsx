import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash2, Filter, Eye } from "lucide-react";
import { useI18n, useT } from "@/lib/i18n/store";
import { useAuth } from "@/lib/auth/store";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, EmptyState, ErrorState } from "@/components/shared/States";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import {
  DataTableToolbar,
  SortableTableHead,
  type TableColumnOption,
} from "@/components/shared/DataTableTools";
import { patientsService } from "@/lib/api/services";
import { requireRoutePermission } from "@/lib/auth/routeGuard";
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
import type { Patient } from "@/lib/api/types";
import { buildCsv, downloadCsv, sortRows, toggleSort, type SortState } from "@/lib/table/dataTable";
import { useTablePreferences } from "@/lib/table/useTablePreferences";
import { UNDOABLE_ACTION_DELAY_MS } from "@/lib/actions/undoableAction";
import { scheduleUndoableToast } from "@/lib/actions/undoableToast";

export const Route = createFileRoute("/_app/patients/")({
  beforeLoad: requireRoutePermission("view_patients"),
  head: () => ({
    meta: [
      { title: "Patients — SIH IA" },
      { name: "description", content: "Liste et gestion des dossiers patients." },
    ],
  }),
  component: PatientsListPage,
});

function calcAge(dob: string) {
  const d = new Date(dob);
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 86400000));
}

type PatientColumn = "id" | "name" | "age" | "gender" | "phone" | "lastVisit" | "status";
const PATIENT_COLUMN_IDS: PatientColumn[] = [
  "id",
  "name",
  "age",
  "gender",
  "phone",
  "lastVisit",
  "status",
];

function PatientsListPage() {
  const t = useT();
  const locale = useI18n((state) => state.locale);
  const user = useAuth((state) => state.user);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [showNew, setShowNew] = useState(false);
  const [toDelete, setToDelete] = useState<Patient | null>(null);
  const [pendingDeletionIds, setPendingDeletionIds] = useState<Set<string>>(() => new Set());
  const [sort, setSort] = useState<SortState<PatientColumn>>({ key: "name", direction: "asc" });
  const columns: TableColumnOption<PatientColumn>[] = [
    { id: "id", label: t("patients.col.id") },
    { id: "name", label: t("patients.col.name") },
    { id: "age", label: t("patients.col.age") },
    { id: "gender", label: t("patients.col.gender") },
    { id: "phone", label: t("patients.col.phone") },
    { id: "lastVisit", label: t("patients.col.lastVisit") },
    { id: "status", label: t("patients.col.status") },
  ];
  const table = useTablePreferences(
    "patients",
    user?.id || user?.email || "anonymous",
    PATIENT_COLUMN_IDS,
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["patients", search, statusFilter],
    queryFn: () => patientsService.list({ search, status: statusFilter }),
  });

  const schedulePatientDeletion = (patient: Patient) => {
    const name = `${patient.firstName} ${patient.lastName}`;
    setPendingDeletionIds((current) => new Set(current).add(patient.id));
    scheduleUndoableToast({
      message: t("undo.deleteScheduled", { name }),
      description: t("undo.deleteDescription", {
        seconds: UNDOABLE_ACTION_DELAY_MS / 1_000,
      }),
      undoLabel: t("undo.action"),
      committingMessage: t("undo.committing"),
      undoneMessage: t("undo.cancelled"),
      successMessage: t("patients.deleted"),
      errorMessage: t("undo.failed"),
      execute: async () => {
        await patientsService.remove(patient.id);
        await qc.invalidateQueries({ queryKey: ["patients"] });
      },
      onSettled: () =>
        setPendingDeletionIds((current) => {
          const next = new Set(current);
          next.delete(patient.id);
          return next;
        }),
    });
  };

  const sortedPatients = useMemo(
    () =>
      sortRows(
        data ?? [],
        sort,
        {
          id: (patient) => patient.recordNumber,
          name: (patient) => `${patient.lastName} ${patient.firstName}`,
          age: (patient) => calcAge(patient.dob),
          gender: (patient) => patient.gender,
          phone: (patient) => patient.phone,
          lastVisit: (patient) => patient.lastVisit,
          status: (patient) => patient.status,
        },
        locale,
      ),
    [data, locale, sort],
  );
  const total = sortedPatients.length;
  const pageData = sortedPatients.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rowClassName = table.dense ? "px-3 py-2" : "px-4 py-3";

  const exportPatients = () => {
    const csvColumns = {
      id: { header: t("patients.col.id"), value: (patient: Patient) => patient.recordNumber },
      name: {
        header: t("patients.col.name"),
        value: (patient: Patient) => `${patient.firstName} ${patient.lastName}`,
      },
      age: { header: t("patients.col.age"), value: (patient: Patient) => calcAge(patient.dob) },
      gender: {
        header: t("patients.col.gender"),
        value: (patient: Patient) => t(`patients.gender.${patient.gender.toLowerCase()}`),
      },
      phone: { header: t("patients.col.phone"), value: (patient: Patient) => patient.phone },
      lastVisit: {
        header: t("patients.col.lastVisit"),
        value: (patient: Patient) => patient.lastVisit,
      },
      status: {
        header: t("patients.col.status"),
        value: (patient: Patient) => t(`patients.status.${patient.status}`),
      },
    };
    downloadCsv(
      `patients-${new Date().toISOString().slice(0, 10)}.csv`,
      buildCsv(
        sortedPatients,
        table.visibleColumns.map((column) => csvColumns[column]),
      ),
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("patients.title")}
        subtitle={t("patients.subtitle")}
        actions={
          <PermissionGuard permission="patients:create">
            <button
              onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="size-4" /> {t("patients.new")}
            </button>
          </PermissionGuard>
        }
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
            <Search className="size-4 text-muted-foreground" aria-hidden />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t("common.searchPlaceholder")}
              aria-label={t("common.search")}
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
            <Filter className="size-4 text-muted-foreground" aria-hidden />
            <select
              aria-label={t("common.status")}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-sm focus:outline-none"
            >
              <option value="all">Tous statuts</option>
              <option value="active">{t("patients.status.active")}</option>
              <option value="admitted">{t("patients.status.admitted")}</option>
              <option value="inactive">{t("patients.status.inactive")}</option>
            </select>
          </div>
        </div>

        <DataTableToolbar
          columns={columns}
          visibleColumns={table.visibleColumns}
          onToggleColumn={table.toggleColumn}
          dense={table.dense}
          onDenseChange={table.setDense}
          rowCount={total}
          onExport={exportPatients}
        />

        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : pageData.length === 0 ? (
          <EmptyState title={t("patients.empty")} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table
                className="min-w-full text-sm"
                data-testid="patients-table"
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
                          onSort={(nextColumn) => {
                            setSort((current) => toggleSort(current, nextColumn));
                            setPage(1);
                          }}
                        />
                      ) : null,
                    )}
                    <th scope="col" className="px-3 py-2 text-end">
                      {t("common.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pageData.map((p: Patient) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      {table.isVisible("id") ? (
                        <td className={`${rowClassName} font-mono text-xs text-muted-foreground`}>
                          {p.recordNumber}
                        </td>
                      ) : null}
                      {table.isVisible("name") ? (
                        <td className={`${rowClassName} font-medium`}>
                          {p.firstName} {p.lastName}
                        </td>
                      ) : null}
                      {table.isVisible("age") ? (
                        <td className={`${rowClassName} text-muted-foreground`}>
                          {calcAge(p.dob)}
                        </td>
                      ) : null}
                      {table.isVisible("gender") ? (
                        <td className={`${rowClassName} text-muted-foreground`}>
                          {t(`patients.gender.${p.gender.toLowerCase()}`)}
                        </td>
                      ) : null}
                      {table.isVisible("phone") ? (
                        <td className={`${rowClassName} font-mono text-xs`}>{p.phone}</td>
                      ) : null}
                      {table.isVisible("lastVisit") ? (
                        <td className={`${rowClassName} text-muted-foreground`}>{p.lastVisit}</td>
                      ) : null}
                      {table.isVisible("status") ? (
                        <td className={rowClassName}>
                          <StatusBadge
                            tone={
                              p.status === "active"
                                ? "success"
                                : p.status === "admitted"
                                  ? "warning"
                                  : "neutral"
                            }
                            dot
                          >
                            {t(`patients.status.${p.status}`)}
                          </StatusBadge>
                        </td>
                      ) : null}
                      <td className={`${rowClassName} text-end`}>
                        <div className="inline-flex items-center gap-1">
                          <Link
                            to="/patients/$patientId"
                            params={{ patientId: p.id }}
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label="Voir"
                          >
                            <Eye className="size-4" />
                          </Link>
                          <PermissionGuard permission="patients:delete">
                            <button
                              onClick={() => setToDelete(p)}
                              disabled={pendingDeletionIds.has(p.id)}
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
                              aria-label="Supprimer"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </PermissionGuard>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} sur {total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-md border border-border bg-background px-2.5 py-1 hover:bg-muted disabled:opacity-50"
                >
                  {t("common.previous")}
                </button>
                <span className="px-2">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-md border border-border bg-background px-2.5 py-1 hover:bg-muted disabled:opacity-50"
                >
                  {t("common.next")}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <NewPatientDialog open={showNew} onOpenChange={setShowNew} />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Supprimer le patient"
        description={`Supprimer le dossier de ${toDelete?.firstName} ${toDelete?.lastName} ? ${t(
          "undo.confirmDescription",
          { seconds: UNDOABLE_ACTION_DELAY_MS / 1_000 },
        )}`}
        confirmLabel={t("common.delete")}
        destructive
        onConfirm={() => toDelete && schedulePatientDeletion(toDelete)}
      />
    </div>
  );
}

function NewPatientDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const t = useT();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    dob: "",
    gender: "M" as "M" | "F",
    phone: "",
    email: "",
    address: "",
    bloodType: "O+" as Patient["bloodType"],
    allergies: "",
    insurance: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMut = useMutation({
    mutationFn: patientsService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      toast.success(t("patients.created"));
      onOpenChange(false);
      setForm({
        firstName: "",
        lastName: "",
        dob: "",
        gender: "M",
        phone: "",
        email: "",
        address: "",
        bloodType: "O+",
        allergies: "",
        insurance: "",
      });
    },
  });

  const submit = () => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = "Requis";
    if (!form.lastName.trim()) errs.lastName = "Requis";
    if (!form.dob) {
      errs.dob = "Requis";
    } else {
      const dob = new Date(form.dob);
      const today = new Date();
      if (dob > today) errs.dob = "La date de naissance ne peut pas être dans le futur";
      else if (today.getFullYear() - dob.getFullYear() > 150)
        errs.dob = "Date de naissance invalide";
    }
    if (!form.phone.trim()) {
      errs.phone = "Requis";
    } else if (!/^\+?[\d\s\-()]{7,20}$/.test(form.phone.trim())) {
      errs.phone = "Numéro de téléphone invalide";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Adresse email invalide";
    }
    if (!form.address.trim()) errs.address = "Requis";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    createMut.mutate({
      ...form,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      allergies: form.allergies
        ? form.allergies
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean)
        : [],
    });
  };

  const field = (key: keyof typeof form, label: string, type = "text") => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`new-patient-${key}`} className="text-xs font-medium">
        {label}
      </label>
      <input
        id={`new-patient-${key}`}
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        aria-invalid={Boolean(errors[key])}
        aria-describedby={errors[key] ? `new-patient-${key}-error` : undefined}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
      />
      {errors[key] ? (
        <span id={`new-patient-${key}-error`} role="alert" className="text-[11px] text-destructive">
          {errors[key]}
        </span>
      ) : null}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("patients.new")}</DialogTitle>
          <DialogDescription>Renseignez les informations principales du patient.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2">
          {field("firstName", t("patients.form.firstName"))}
          {field("lastName", t("patients.form.lastName"))}
          {field("dob", t("patients.form.dob"), "date")}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">{t("patients.form.gender")}</label>
            <select
              value={form.gender}
              onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as "M" | "F" }))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none"
            >
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </div>
          {field("phone", t("patients.form.phone"), "tel")}
          {field("email", t("patients.form.email"), "email")}
          <div className="sm:col-span-2">{field("address", t("patients.form.address"))}</div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">{t("patients.form.bloodType")}</label>
            <select
              value={form.bloodType}
              onChange={(e) =>
                setForm((f) => ({ ...f, bloodType: e.target.value as Patient["bloodType"] }))
              }
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none"
            >
              {(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const).map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          {field("insurance", t("patients.form.insurance"))}
          <div className="sm:col-span-2">
            {field("allergies", t("patients.form.allergies") + " (séparées par virgule)")}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={createMut.isPending}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
