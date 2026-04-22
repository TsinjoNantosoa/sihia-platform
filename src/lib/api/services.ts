// Couche services API connectée.
// Remplace les mocks par des appels REST complets (FastAPI).

import type { Appointment, Patient } from "./types";
import { useAuth } from "../auth/store"; // Import the actual store instance
import {
  ALERTS,
  APPOINTMENTS,
  DOCTORS,
  PATIENTS,
  PREDICTION_7D,
  RBAC_USERS,
} from "./mockData";

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";
const IS_PROD = import.meta.env.PROD;
const USE_MOCKS = !IS_PROD && (import.meta.env.VITE_USE_MOCKS as string | undefined) === "true";

let mockPatientsDb: Patient[] = [...PATIENTS];
let mockAppointmentsDb: Appointment[] = [...APPOINTMENTS];

const getMockData = async (endpoint: string, options: RequestInit = {}) => {
  console.warn(`[MODE SECOURS] Récupération des données mockées pour: ${endpoint}`);
  await new Promise((r) => setTimeout(r, 300)); // Latency
  
  if (endpoint.includes("/api/patients")) {
    if (options.method === "POST" && options.body) {
      const p = { ...JSON.parse(options.body as string), id: "p-" + Date.now(), recordNumber: "PT-" + Date.now().toString().slice(-6), status: "active", lastVisit: new Date().toISOString().slice(0, 10) };
      mockPatientsDb = [p, ...mockPatientsDb];
      return p;
    }
    return mockPatientsDb;
  }
  if (endpoint.includes("/api/doctors/")) {
    const id = endpoint.split("/api/doctors/")[1]?.split("?")[0];
    return DOCTORS.find((d) => d.id === id) ?? null;
  }
  if (endpoint.includes("/api/doctors")) return DOCTORS;
  if (endpoint.includes("/api/appointments")) {
    if (options.method === "POST" && options.body) {
      const a = { ...JSON.parse(options.body as string), id: "a-" + Date.now() };
      mockAppointmentsDb = [a, ...mockAppointmentsDb];
      return a;
    }
    return mockAppointmentsDb;
  }
  if (endpoint.includes("/api/analytics/kpis")) return { patientsToday: 142, patientsTrend: 4.2, occupancy: 87.5, occupancyCapacity: 320, appointments: 412, appointmentsCapacity: 450, criticalAlerts: 3 };
  if (endpoint.includes("/api/analytics/revenue")) return ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"].map((m, i) => ({ label: m, value: 80000 + Math.round(Math.sin(i / 2) * 18000 + i * 2200) }));
  if (endpoint.includes("/api/analytics/admissions-dept")) return [ { label: "Urgences", value: 320 }, { label: "Cardio", value: 210 }, { label: "Pédiatrie", value: 180 } ];
  if (endpoint.includes("/api/analytics/satisfaction")) return [ { label: "S1", value: 82 }, { label: "S2", value: 85 }, { label: "S3", value: 88 } ];
  if (endpoint.includes("/api/ml/predict-7d")) return { points: PREDICTION_7D, model: "LSTM-v3", confidence: 0.87, recommendation: "Renforcer l'effectif jeudi." };
  if (endpoint.includes("/api/alerts")) return ALERTS;
  if (endpoint.includes("/api/rbac/users")) return RBAC_USERS;
  
  return [];
};

const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  const token = useAuth.getState().token;
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 204) {
      return null;
    }

    if (!response.ok) {
      if (response.status === 401) {
        useAuth.getState().logout();
        window.location.replace("/login");
      }
      const contentType = response.headers.get("content-type") || "";
      const errorData = contentType.includes("application/json")
        ? await response.json().catch(() => ({}))
        : await response.text().catch(() => "");

      const errorCode =
        typeof errorData === "object" && errorData !== null
          ? (errorData.code ?? errorData.detail)
          : null;
      const errorMessage =
        typeof errorData === "object" && errorData !== null
          ? (errorData.message ?? errorData.detail)
          : errorData;

      throw new Error((errorCode as string) || (errorMessage as string) || "API_ERROR");
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return null;
    }
    return await response.json();
  } catch (error) {
    const isNetworkError = error instanceof TypeError;
    if (USE_MOCKS && isNetworkError) {
      return getMockData(endpoint, options);
    }
    throw error;
  }
};

export const patientsService = {
  list: (query?: { search?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (query?.search) params.append("search", query.search);
    if (query?.status) params.append("status", query.status);
    return fetchWithAuth(`/api/patients?${params.toString()}`);
  },
  get: (id: string) => fetchWithAuth(`/api/patients/${id}`),
  create: (input: Omit<Patient, "id" | "recordNumber" | "lastVisit" | "status">) => 
    fetchWithAuth("/api/patients", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => 
    fetchWithAuth(`/api/patients/${id}`, { method: "DELETE" }),
};

export const doctorsService = {
  list: () => fetchWithAuth("/api/doctors"),
  get: (id: string) => fetchWithAuth(`/api/doctors/${id}`),
};

export const appointmentsService = {
  list: () => fetchWithAuth("/api/appointments"),
  create: (input: Omit<Appointment, "id">) => 
    fetchWithAuth("/api/appointments", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  cancel: (id: string) => 
    fetchWithAuth(`/api/appointments/${id}/cancel`, { method: "POST" }),
};

export const analyticsService = {
  kpis: () => fetchWithAuth("/api/analytics/kpis"),
  monthlyRevenue: () => fetchWithAuth("/api/analytics/revenue"),
  admissionsByDept: () => fetchWithAuth("/api/analytics/admissions-dept"),
  satisfaction: () => fetchWithAuth("/api/analytics/satisfaction"),
};

export const mlService = {
  predict7d: () => fetchWithAuth("/api/ml/predict-7d"),
};

export const alertsService = {
  list: () => fetchWithAuth("/api/alerts"),
};

export const rbacService = {
  list: () => fetchWithAuth("/api/rbac/users"),
};
