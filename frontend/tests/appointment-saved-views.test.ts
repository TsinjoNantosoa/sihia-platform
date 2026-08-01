import { describe, expect, it } from "vitest";

import type { Appointment, Doctor } from "../src/lib/api/types";
import {
  EMPTY_APPOINTMENT_FILTERS,
  filterAppointments,
  loadSavedAppointmentViews,
  resolveMySpecialty,
  saveAppointmentViews,
  type SavedAppointmentView,
} from "../src/lib/appointments/savedViews";

const appointments: Appointment[] = [
  {
    id: "a-1",
    patientId: "p-1",
    patientName: "Élodie Martin",
    doctorId: "d-1",
    doctorName: "Dr. Amina Diallo",
    date: "2030-01-01T09:00:00Z",
    durationMin: 30,
    reason: "Contrôle cardiaque",
    status: "confirmed",
  },
  {
    id: "a-2",
    patientId: "p-2",
    patientName: "Karim Ali",
    doctorId: "d-2",
    doctorName: "Dr. Youssef Karim",
    date: "2030-01-01T10:00:00Z",
    durationMin: 30,
    reason: "Consultation enfant",
    status: "scheduled",
  },
];

const doctors = [
  { id: "d-1", email: "amina@sihia.health", specialty: "Cardiologie" },
  { id: "d-2", email: "youssef@sihia.health", specialty: "Pédiatrie" },
] as Doctor[];

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("saved appointment views", () => {
  it("combines search, status and specialty filters", () => {
    const result = filterAppointments(appointments, doctors, {
      ...EMPTY_APPOINTMENT_FILTERS,
      search: "elodie",
      status: "confirmed",
      specialty: "Cardiologie",
    });
    expect(result.map((appointment) => appointment.id)).toEqual(["a-1"]);
  });

  it("infers My service from the authenticated doctor's email", () => {
    expect(resolveMySpecialty("youssef@sihia.health", doctors)).toBe("Pédiatrie");
    expect(resolveMySpecialty("unknown@sihia.health", doctors, "Cardiologie")).toBe("Cardiologie");
  });

  it("persists valid views per user", () => {
    const storage = memoryStorage();
    const views: SavedAppointmentView[] = [
      {
        id: "view-1",
        name: "Cardiologie confirmée",
        display: "calendar",
        filters: {
          ...EMPTY_APPOINTMENT_FILTERS,
          status: "confirmed",
          specialty: "Cardiologie",
        },
      },
    ];
    saveAppointmentViews(storage, "u-1", views);
    expect(loadSavedAppointmentViews(storage, "u-1")).toEqual(views);
    expect(loadSavedAppointmentViews(storage, "u-2")).toEqual([]);
  });

  it("ignores corrupted persisted data", () => {
    const storage = memoryStorage();
    storage.setItem("sihia:appointment-views:u-1", "not-json");
    expect(loadSavedAppointmentViews(storage, "u-1")).toEqual([]);
  });
});
