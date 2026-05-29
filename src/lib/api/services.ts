// Couche services API connectée.
// Remplace les mocks par des appels REST complets (FastAPI).

import type { Appointment, Patient, RbacUser } from "./types";
import { useAuth } from "../auth/store"; // Import the actual store instance
import {
  handleAuthHttpError,
  notifyNetworkError,
  notifyServerError,
  parseApiError,
} from "./httpErrors";
import { resolveT } from "@/lib/i18n/resolveT";
import { resolveApiBaseUrl } from "./baseUrl";
import { shouldUseMocks } from "./mockPolicy";
import {
  ALERTS,
  APPOINTMENTS,
  DOCTORS,
  PATIENTS,
  PREDICTION_7D,
  RBAC_USERS,
} from "./mockData";

export const API_URL = resolveApiBaseUrl();
const USE_MOCKS = shouldUseMocks();

let mockPatientsDb: Patient[] = [...PATIENTS];
let mockAppointmentsDb: Appointment[] = [...APPOINTMENTS];
let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  const { refreshToken, setSession, logout } = useAuth.getState();
  if (!refreshToken) return null;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const newToken = data.access_token as string | undefined;
      const newRefreshToken = (data.refresh_token as string | undefined) ?? refreshToken;
      if (!newToken) return null;
      setSession(newToken, newRefreshToken);
      return newToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  const token = await refreshPromise;
  if (!token) logout();
  return token;
};

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

const buildAuthHeaders = (options: RequestInit) => {
  const token = useAuth.getState().token;
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
};

const handleFailedResponse = async (
  response: Response,
  _endpoint: string,
  _options: RequestInit,
  hasRetried: boolean,
  retry: () => Promise<unknown>,
): Promise<unknown> => {
  const parsed = await parseApiError(response);

  if (response.status === 401) {
    if (!hasRetried) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return retry();
      }
    }
    handleAuthHttpError(401, parsed);
  }

  if (response.status === 403) {
    handleAuthHttpError(403, parsed);
  }

  const msg = parsed.message ?? parsed.code ?? "API_ERROR";
  if (response.status >= 500) {
    notifyServerError(msg);
  }
  throw new Error(msg);
};

async function fetchWithAuth<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
  hasRetried = false,
): Promise<T | null> {
  const headers = buildAuthHeaders(options);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 204) {
      return null;
    }

    if (!response.ok) {
      return (await handleFailedResponse(response, endpoint, options, hasRetried, () =>
        fetchWithAuth<T>(endpoint, options, true),
      )) as T | null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    const isNetworkError = error instanceof TypeError;
    if (isNetworkError) {
      notifyNetworkError();
    }
    if (USE_MOCKS && isNetworkError) {
      return getMockData(endpoint, options) as T;
    }
    throw error;
  }
}

async function fetchBlobWithAuth(
  endpoint: string,
  options: RequestInit = {},
  hasRetried = false,
): Promise<Blob> {
  const headers = buildAuthHeaders(options);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

    if (!response.ok) {
      return (await handleFailedResponse(response, endpoint, options, hasRetried, () =>
        fetchBlobWithAuth(endpoint, options, true),
      )) as Blob;
    }

    return response.blob();
  } catch (error) {
    if (error instanceof TypeError) {
      notifyNetworkError();
      throw new Error(resolveT("errors.exportFailed"));
    }
    throw error;
  }
}
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
  update: (
    id: string,
    input: Partial<Omit<Patient, "id" | "recordNumber" | "lastVisit">> & { lastVisit?: string },
  ) =>
    fetchWithAuth(`/api/patients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) =>
    fetchWithAuth(`/api/patients/${id}`, { method: "DELETE" }),
  history: (id: string) => fetchWithAuth(`/api/patients/${id}/history`),
  addVisit: (
    id: string,
    visit: { date: string; reason: string; doctorName: string; specialty: string; diagnosis: string; treatment?: string; notes?: string },
  ) =>
    fetchWithAuth(`/api/patients/${id}/history`, {
      method: "POST",
      body: JSON.stringify(visit),
    }),
};

export const doctorsService = {
  list: () => fetchWithAuth("/api/doctors"),
  get: (id: string) => fetchWithAuth(`/api/doctors/${id}`),
  update: (
    id: string,
    input: {
      availability?: "available" | "busy" | "off";
      phone?: string;
      schedule?: { day: string; slots: string[] }[];
    },
  ) =>
    fetchWithAuth(`/api/doctors/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
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
  monthlyRevenue: (period: "3m" | "6m" | "12m" = "6m") =>
    fetchWithAuth(`/api/analytics/revenue?period=${period}`),
  admissionsByDept: () => fetchWithAuth("/api/analytics/admissions-dept"),
  satisfaction: () => fetchWithAuth("/api/analytics/satisfaction"),
  exportExcel: async (period: "3m" | "6m" | "12m" = "6m") => {
    const blob = await fetchBlobWithAuth(`/api/analytics/export/excel?period=${period}`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics_${period}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },
  exportPdf: async (period: "3m" | "6m" | "12m" = "6m") => {
    const blob = await fetchBlobWithAuth(`/api/analytics/export/pdf?period=${period}`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics_${period}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

export const mlService = {
  predict7d: () => fetchWithAuth("/api/ml/predict-7d"),
  predict30d: () => fetchWithAuth("/api/ml/predict-30d"),
};

export const alertsService = {
  list: () => fetchWithAuth("/api/alerts"),
};

export type RbacUserCreatePayload = {
  name: string;
  email: string;
  password: string;
  role: RbacUser["role"];
  facility?: string;
};

export type RbacUserUpdatePayload = Partial<
  Omit<RbacUserCreatePayload, "password"> & { password?: string; status: RbacUser["status"] }
>;

export const auditService = {
  list: (limit = 100) => fetchWithAuth<{ items: unknown[]; count: number }>(`/api/admin/audit-logs?limit=${limit}`),
  exportJsonl: async (limit = 5000) => {
    const blob = await fetchBlobWithAuth(`/api/admin/audit-logs/export?limit=${limit}`);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sihia_audit_${stamp}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

export const rbacService = {
  list: () => fetchWithAuth<RbacUser[]>("/api/rbac/users"),
  create: (body: RbacUserCreatePayload) =>
    fetchWithAuth<RbacUser>("/api/rbac/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  update: (id: string, body: RbacUserUpdatePayload) =>
    fetchWithAuth<RbacUser>(`/api/rbac/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  remove: (id: string) =>
    fetchWithAuth<null>(`/api/rbac/users/${id}`, { method: "DELETE" }),
};

export const authService = {
  logout: async () => {
    const refreshToken = useAuth.getState().refreshToken;
    if (!refreshToken) return;
    await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }).catch(() => null);
  },
  logoutAll: () => fetchWithAuth("/api/auth/logout-all", { method: "POST" }),
};
