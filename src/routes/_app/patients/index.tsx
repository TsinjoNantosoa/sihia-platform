import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash2, Filter, Eye } from "lucide-react";
import { useT } from "@/lib/i18n/store";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, EmptyState, ErrorState } from "@/components/shared/States";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { patientsService } from "@/lib/api/services";
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

export const Route = createFileRoute("/_app/patients/")({
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

function PatientsListPage() {
  const t = useT();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [showNew, setShowNew] = useState(false);
  const [toDelete, setToDelete] = useState<Patient | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["patients", search, statusFilter],
    queryFn: () => patientsService.list({ search, status: statusFilter }),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => patientsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient supprimé");
    },
  });

  const total = data?.length ?? 0;
  const pageData = data?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) ?? [];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("patients.title")}
        subtitle={t("patients.subtitle")}
        actions={
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4" /> {t("patients.new")}
          </button>
        }
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
            <Search className="size-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t("common.searchPlaceholder")}
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
            <Filter className="size-4 text-muted-foreground" />
            <select
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

        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : pageData.length === 0 ? (
          <EmptyState title={t("patients.empty")} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-start">{t("patients.col.id")}</th>
                    <th className="px-4 py-3 text-start">{t("patients.col.name")}</th>
                    <th className="px-4 py-3 text-start">{t("patients.col.age")}</th>
                    <th className="px-4 py-3 text-start">{t("patients.col.gender")}</th>
                    <th className="px-4 py-3 text-start">{t("patients.col.phone")}</th>
                    <th className="px-4 py-3 text-start">{t("patients.col.lastVisit")}</th>
                    <th className="px-4 py-3 text-start">{t("patients.col.status")}</th>
                    <th className="px-4 py-3 text-end">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pageData.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {p.recordNumber}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {p.firstName} {p.lastName}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{calcAge(p.dob)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {t(`patients.gender.${p.gender.toLowerCase()}`)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{p.phone}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.lastVisit}</td>
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3 text-end">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            to="/patients/$patientId"
                            params={{ patientId: p.id }}
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label="Voir"
                          >
                            <Eye className="size-4" />
                          </Link>
                          <button
                            onClick={() => setToDelete(p)}
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
                            aria-label="Supprimer"
                          >
                            <Trash2 className="size-4" />
                          </button>
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
        description={`Supprimer définitivement le dossier de ${toDelete?.firstName} ${toDelete?.lastName} ?`}
        destructive
        onConfirm={() => toDelete && removeMut.mutate(toDelete.id)}
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
    if (!form.firstName) errs.firstName = "Requis";
    if (!form.lastName) errs.lastName = "Requis";
    if (!form.dob) errs.dob = "Requis";
    if (!form.phone) errs.phone = "Requis";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    createMut.mutate({
      ...form,
      allergies: form.allergies ? form.allergies.split(",").map((a) => a.trim()) : [],
    });
  };

  const field = (key: string, label: string, type = "text") => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium">{label}</label>
      <input
        type={type}
        value={(form as any)[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
      />
      {errors[key] ? <span className="text-[11px] text-destructive">{errors[key]}</span> : null}
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
