import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Stethoscope, Phone, Mail, Star, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/store";
import { requireRoutePermission } from "@/lib/auth/routeGuard";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingState, ErrorState } from "@/components/shared/States";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { doctorsService } from "@/lib/api/services";
import type { Doctor } from "@/lib/api/types";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const WEEK_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;
const DEFAULT_SLOTS = ["09:00", "11:00", "14:00"];

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
  const [editing, setEditing] = useState<Doctor | null>(null);
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
                <div className="flex flex-col items-end gap-2">
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
                  <PermissionGuard permission="doctors:update">
                    <button
                      type="button"
                      onClick={() => setEditing(d)}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium hover:bg-muted"
                    >
                      <Pencil className="size-3" />
                      Planning
                    </button>
                  </PermissionGuard>
                </div>
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

      {editing ? (
        <EditDoctorDialog
          doctor={editing}
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      ) : null}
    </div>
  );
}

function EditDoctorDialog({
  doctor,
  open,
  onOpenChange,
}: {
  doctor: Doctor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [availability, setAvailability] = useState(doctor.availability);
  const [activeDays, setActiveDays] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(doctor.schedule.map((s) => [s.day, s.slots.length > 0])),
  );

  const updateMut = useMutation({
    mutationFn: () =>
      doctorsService.update(doctor.id, {
        availability,
        schedule: WEEK_DAYS.map((day) => ({
          day,
          slots: activeDays[day] ? DEFAULT_SLOTS : [],
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctors"] });
      toast.success("Planning médecin mis à jour");
      onOpenChange(false);
    },
    onError: () => toast.error("Échec de la mise à jour"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Dr. {doctor.firstName} {doctor.lastName}
          </DialogTitle>
          <DialogDescription>Disponibilité et jours de consultation</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <label className="flex flex-col gap-1 text-xs font-medium">
            Disponibilité
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value as Doctor["availability"])}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              <option value="available">Disponible</option>
              <option value="busy">Occupé</option>
              <option value="off">Absent</option>
            </select>
          </label>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium">Jours actifs (créneaux 09h, 11h, 14h)</span>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {WEEK_DAYS.map((day) => (
                <label
                  key={day}
                  className={`flex cursor-pointer flex-col items-center rounded-lg border px-2 py-2 text-xs ${
                    activeDays[day] ? "border-primary bg-primary-soft text-primary" : "border-border"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={!!activeDays[day]}
                    onChange={(e) => setActiveDays((prev) => ({ ...prev, [day]: e.target.checked }))}
                  />
                  <span className="font-semibold">{day}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={() => updateMut.mutate()} disabled={updateMut.isPending}>
            {updateMut.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
