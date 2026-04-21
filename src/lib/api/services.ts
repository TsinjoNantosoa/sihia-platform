// Couche services API centralisée.
// Aujourd'hui: mocks. Demain: brancher FastAPI via API_URL.
// Toutes les fonctions retournent des promesses pour faciliter le swap.

import {
  ALERTS,
  APPOINTMENTS,
  DOCTORS,
  PATIENTS,
  PREDICTION_7D,
  RBAC_USERS,
} from "./mockData";
import type { Appointment, Patient } from "./types";

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";

const delay = <T,>(data: T, ms = 250): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), ms));

// In-memory mutable copies pour simuler les writes
let patientsDb: Patient[] = [...PATIENTS];
let appointmentsDb: Appointment[] = [...APPOINTMENTS];

export const patientsService = {
  list: (query?: { search?: string; status?: string }) => {
    let res = patientsDb;
    if (query?.search) {
      const q = query.search.toLowerCase();
      res = res.filter(
        (p) =>
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          p.recordNumber.toLowerCase().includes(q),
      );
    }
    if (query?.status && query.status !== "all") {
      res = res.filter((p) => p.status === query.status);
    }
    return delay(res);
  },
  get: (id: string) => delay(patientsDb.find((p) => p.id === id) ?? null),
  create: (input: Omit<Patient, "id" | "recordNumber" | "lastVisit" | "status">) => {
    const p: Patient = {
      ...input,
      id: "p-" + Date.now(),
      recordNumber: `PT-${String(900000 + patientsDb.length).padStart(6, "0")}`,
      status: "active",
      lastVisit: new Date().toISOString().slice(0, 10),
    };
    patientsDb = [p, ...patientsDb];
    return delay(p);
  },
  remove: (id: string) => {
    patientsDb = patientsDb.filter((p) => p.id !== id);
    return delay(true);
  },
};

export const doctorsService = {
  list: () => delay(DOCTORS),
  get: (id: string) => delay(DOCTORS.find((d) => d.id === id) ?? null),
};

export const appointmentsService = {
  list: () => delay(appointmentsDb),
  create: (input: Omit<Appointment, "id">) => {
    // Détection conflit naïve: même médecin, même heure
    const conflict = appointmentsDb.find(
      (a) =>
        a.doctorId === input.doctorId &&
        Math.abs(new Date(a.date).getTime() - new Date(input.date).getTime()) < 30 * 60000 &&
        a.status !== "cancelled",
    );
    if (conflict) {
      return Promise.reject(new Error("CONFLICT"));
    }
    const a: Appointment = { ...input, id: "a-" + Date.now() };
    appointmentsDb = [a, ...appointmentsDb];
    return delay(a);
  },
  cancel: (id: string) => {
    appointmentsDb = appointmentsDb.map((a) =>
      a.id === id ? { ...a, status: "cancelled" } : a,
    );
    return delay(true);
  },
};

export const analyticsService = {
  kpis: () =>
    delay({
      patientsToday: 142,
      patientsTrend: 4.2,
      occupancy: 87.5,
      occupancyCapacity: 320,
      appointments: 412,
      appointmentsCapacity: 450,
      criticalAlerts: 3,
    }),
  monthlyRevenue: () =>
    delay(
      ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"].map(
        (m, i) => ({ label: m, value: 80000 + Math.round(Math.sin(i / 2) * 18000 + i * 2200) }),
      ),
    ),
  admissionsByDept: () =>
    delay([
      { label: "Urgences", value: 320 },
      { label: "Cardio", value: 210 },
      { label: "Pédiatrie", value: 180 },
      { label: "Chirurgie", value: 165 },
      { label: "Maternité", value: 142 },
      { label: "Neurologie", value: 98 },
    ]),
  satisfaction: () =>
    delay([
      { label: "S1", value: 82 },
      { label: "S2", value: 85 },
      { label: "S3", value: 88 },
      { label: "S4", value: 86 },
      { label: "S5", value: 90 },
      { label: "S6", value: 92 },
    ]),
};

export const mlService = {
  predict7d: () =>
    delay({
      points: PREDICTION_7D,
      model: "LSTM-v3.2",
      confidence: 0.87,
      peak: { date: PREDICTION_7D[10]?.date ?? "", value: PREDICTION_7D[10]?.forecast ?? 0 },
      recommendation:
        "Renforcer l'effectif Réanimation jeudi soir. Anticiper +12 lits sur 48h.",
    }),
};

export const alertsService = {
  list: () => delay(ALERTS),
};

export const rbacService = {
  list: () => delay(RBAC_USERS),
};
