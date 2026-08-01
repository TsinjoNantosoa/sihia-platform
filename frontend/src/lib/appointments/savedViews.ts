import type { Appointment, AppointmentStatus, Doctor } from "@/lib/api/types";

export type AppointmentFilters = {
  search: string;
  status: AppointmentStatus | "all";
  specialty: string;
  doctorId: string;
};

export type SavedAppointmentView = {
  id: string;
  name: string;
  display: "list" | "calendar";
  filters: AppointmentFilters;
};

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "setItem">;

export const EMPTY_APPOINTMENT_FILTERS: AppointmentFilters = {
  search: "",
  status: "all",
  specialty: "",
  doctorId: "",
};

const statusValues = new Set<AppointmentFilters["status"]>([
  "all",
  "scheduled",
  "confirmed",
  "arrived",
  "completed",
  "cancelled",
  "noshow",
]);

const storageKey = (userKey: string) => `sihia:appointment-views:${userKey}`;
const serviceStorageKey = (userKey: string) => `sihia:appointment-service:${userKey}`;

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isFilters(value: unknown): value is AppointmentFilters {
  if (!value || typeof value !== "object") return false;
  const filters = value as Record<string, unknown>;
  return (
    typeof filters.search === "string" &&
    typeof filters.status === "string" &&
    statusValues.has(filters.status as AppointmentFilters["status"]) &&
    typeof filters.specialty === "string" &&
    typeof filters.doctorId === "string"
  );
}

export function filterAppointments(
  appointments: Appointment[],
  doctors: Pick<Doctor, "id" | "specialty">[],
  filters: AppointmentFilters,
): Appointment[] {
  const specialtyByDoctor = new Map(doctors.map((doctor) => [doctor.id, doctor.specialty]));
  const search = normalizeText(filters.search);

  return appointments.filter((appointment) => {
    if (filters.status !== "all" && appointment.status !== filters.status) return false;
    if (filters.doctorId && appointment.doctorId !== filters.doctorId) return false;
    if (
      filters.specialty &&
      normalizeText(specialtyByDoctor.get(appointment.doctorId) ?? "") !==
        normalizeText(filters.specialty)
    ) {
      return false;
    }
    if (!search) return true;
    return normalizeText(
      `${appointment.patientName} ${appointment.doctorName} ${appointment.reason}`,
    ).includes(search);
  });
}

export function loadSavedAppointmentViews(
  storage: StorageReader,
  userKey: string,
): SavedAppointmentView[] {
  try {
    const parsed = JSON.parse(storage.getItem(storageKey(userKey)) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is SavedAppointmentView => {
      if (!item || typeof item !== "object") return false;
      const view = item as Record<string, unknown>;
      return (
        typeof view.id === "string" &&
        typeof view.name === "string" &&
        (view.display === "list" || view.display === "calendar") &&
        isFilters(view.filters)
      );
    });
  } catch {
    return [];
  }
}

export function saveAppointmentViews(
  storage: StorageWriter,
  userKey: string,
  views: SavedAppointmentView[],
): void {
  storage.setItem(storageKey(userKey), JSON.stringify(views));
}

export function resolveMySpecialty(
  userEmail: string | undefined,
  doctors: Pick<Doctor, "email" | "specialty">[],
  storedSpecialty?: string | null,
): string {
  const specialties = new Set(doctors.map((doctor) => doctor.specialty));
  if (storedSpecialty && specialties.has(storedSpecialty)) return storedSpecialty;
  const matchingDoctor = doctors.find(
    (doctor) => doctor.email.toLowerCase() === userEmail?.toLowerCase(),
  );
  return matchingDoctor?.specialty ?? [...specialties].sort()[0] ?? "";
}

export function loadMySpecialty(storage: StorageReader, userKey: string): string | null {
  return storage.getItem(serviceStorageKey(userKey));
}

export function saveMySpecialty(storage: StorageWriter, userKey: string, specialty: string): void {
  storage.setItem(serviceStorageKey(userKey), specialty);
}
