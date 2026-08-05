// Couche services API connectée.
// Remplace les mocks par des appels REST complets (FastAPI).

import type {
  Appointment,
  AppointmentStatus,
  AppointmentReminderHistoryResponse,
  AppointmentReminderSendResponse,
  NoShowRiskResponse,
  Patient,
  PatientAiSummaryResponse,
  PatientDocument,
  PatientHistoryVisit,
  NotificationPrefs,
  NotificationsInboxResponse,
  SearchResponse,
  WaitingRoomSnapshot,
  RbacUser,
  Doctor,
  MlForecastResponse,
  MlMetricsResponse,
  ReminderChannelsStatus,
  PipelineStatusResponse,
  Alert,
  KpiPoint,
} from "./types";
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
import { ALERTS, APPOINTMENTS, DOCTORS, PATIENTS, PREDICTION_7D, RBAC_USERS } from "./mockData";
import {
  enqueueOfflineAppointmentMutation,
  isObservedNetworkOffline,
  OfflineQueuedError,
  replayOfflineAppointmentQueue,
  shouldQueueOfflineMutation,
  type OfflineAppointmentMutation,
  type OfflineAppointmentMutationKind,
} from "@/lib/offline/appointmentQueue";

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
      const p = {
        ...JSON.parse(options.body as string),
        id: "p-" + Date.now(),
        recordNumber: "PT-" + Date.now().toString().slice(-6),
        status: "active",
        lastVisit: new Date().toISOString().slice(0, 10),
      };
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
    if (options.method === "PATCH" && options.body && endpoint.endsWith("/schedule")) {
      const id = endpoint.split("/api/appointments/")[1]?.split("/")[0];
      const input = JSON.parse(options.body as string) as { doctorId: string; date: string };
      const index = mockAppointmentsDb.findIndex((appointment) => appointment.id === id);
      const existing = mockAppointmentsDb[index];
      const doctor = DOCTORS.find((item) => item.id === input.doctorId);
      if (!existing || !doctor) return null;
      const updated: Appointment = {
        ...existing,
        doctorId: doctor.id,
        doctorName: `Dr. ${doctor.firstName} ${doctor.lastName}`,
        date: input.date,
      };
      mockAppointmentsDb[index] = updated;
      return updated;
    }
    if (options.method === "PATCH" && options.body && endpoint.endsWith("/status")) {
      const id = endpoint.split("/api/appointments/")[1]?.split("/")[0];
      const input = JSON.parse(options.body as string) as { status: AppointmentStatus };
      const index = mockAppointmentsDb.findIndex((appointment) => appointment.id === id);
      if (index < 0) return null;
      mockAppointmentsDb[index] = { ...mockAppointmentsDb[index], status: input.status };
      return mockAppointmentsDb[index];
    }
    if (options.method === "POST" && options.body) {
      const a = { ...JSON.parse(options.body as string), id: "a-" + Date.now() };
      mockAppointmentsDb = [a, ...mockAppointmentsDb];
      return a;
    }
    return mockAppointmentsDb;
  }
  if (endpoint.includes("/api/analytics/kpis"))
    return {
      patientsToday: 142,
      patientsTrend: 4.2,
      occupancy: 87.5,
      occupancyCapacity: 320,
      appointments: 412,
      appointmentsCapacity: 450,
      criticalAlerts: 3,
    };
  if (endpoint.includes("/api/analytics/revenue"))
    return [
      "Jan",
      "Fév",
      "Mar",
      "Avr",
      "Mai",
      "Juin",
      "Juil",
      "Août",
      "Sep",
      "Oct",
      "Nov",
      "Déc",
    ].map((m, i) => ({ label: m, value: 80000 + Math.round(Math.sin(i / 2) * 18000 + i * 2200) }));
  if (endpoint.includes("/api/analytics/admissions-dept"))
    return [
      { label: "Urgences", value: 320 },
      { label: "Cardio", value: 210 },
      { label: "Pédiatrie", value: 180 },
    ];
  if (endpoint.includes("/api/analytics/satisfaction"))
    return [
      { label: "S1", value: 82 },
      { label: "S2", value: 85 },
      { label: "S3", value: 88 },
    ];
  if (endpoint.includes("/api/admin/pipeline/status")) {
    const now = new Date().toISOString();
    return {
      status: "ok",
      dags: [
        {
          dagId: "patient_import",
          lastRun: {
            id: "run-mock",
            status: "success",
            startedAt: now,
            finishedAt: now,
            metrics: {},
          },
        },
        {
          dagId: "analytics_refresh",
          lastRun: {
            id: "run-mock2",
            status: "success",
            startedAt: now,
            finishedAt: now,
            metrics: {},
          },
        },
        {
          dagId: "ml_features",
          lastRun: {
            id: "run-mock3",
            status: "success",
            startedAt: now,
            finishedAt: now,
            metrics: {},
          },
        },
      ],
      snapshots: { kpis: null },
      mlFeaturesDays: 61,
      alerts: [],
    };
  }
  if (endpoint.includes("/api/admin/pipeline/run/")) {
    const dagId = endpoint.split("/").pop() ?? "pipeline";
    return { dagId, runId: "run-mock", status: "success", metrics: {} };
  }
  if (endpoint.includes("/api/admin/reminders/status")) {
    return {
      email: {
        mode: "log",
        configured: true,
        ready: true,
        smtpHost: null,
        smtpPort: null,
        from: "noreply@sihia.health",
      },
      sms: { mode: "log", configured: true, ready: true },
      hoursBefore: 24,
      logPath: "logs/reminders.jsonl",
    };
  }
  if (endpoint.includes("/api/ml/metrics")) {
    return {
      model: "prophet",
      model_version: "prophet-1.0",
      engine: "prophet",
      mae: 4.2,
      mape: 11.5,
      holdoutDays: 7,
      samples: 7,
      historyDays: 60,
      source: "sqlite",
      generatedAt: new Date().toISOString(),
      status: "ok",
      targetMapePercent: 15,
      withinTarget: true,
    };
  }
  if (endpoint.includes("/api/ml/predict-7d") || endpoint.includes("/api/ml/predict-30d")) {
    const horizon = endpoint.includes("30d") ? 30 : 7;
    return {
      points: PREDICTION_7D,
      model: "prophet",
      model_version: "prophet-1.0",
      confidence: 0.87,
      peak: { date: new Date().toISOString().slice(0, 10), value: 78 },
      recommendation: "Renforcer l'effectif jeudi.",
      source: "sqlite",
      historyDays: 45,
      engine: "prophet",
      horizon,
      generatedAt: new Date().toISOString(),
      ...(horizon === 30 ? { drift_score: 0.04 } : {}),
    };
  }
  if (endpoint.includes("/api/ml/noshow-risk")) {
    return {
      items: [],
      total: 0,
      limit: 50,
      offset: 0,
      horizonDays: 14,
      minRisk: 0.25,
      model: "heuristic-noshow",
      model_version: "heuristic-noshow-1.0",
      engine: "rules",
      source: "sqlite",
      generatedAt: new Date().toISOString(),
      disclaimer: "Score indicatif d'aide à la décision.",
      facilityNoshowRate: 0.12,
      summary: { high: 0, medium: 0, low: 0, avgRisk: 0 },
    };
  }
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
): Promise<T> {
  const headers = buildAuthHeaders(options);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 204) {
      return undefined as T;
    }

    if (!response.ok) {
      return (await handleFailedResponse(response, endpoint, options, hasRetried, () =>
        fetchWithAuth<T>(endpoint, options, true),
      )) as T;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return undefined as T;
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

const currentOfflineUserKey = () => {
  const user = useAuth.getState().user;
  return user?.id || user?.email || "anonymous";
};

async function queueableAppointmentMutation<T>(
  kind: OfflineAppointmentMutationKind,
  appointmentId: string,
  payload: Record<string, unknown>,
  execute: () => Promise<T>,
): Promise<T> {
  const queue = () => {
    const item = enqueueOfflineAppointmentMutation(window.localStorage, currentOfflineUserKey(), {
      kind,
      appointmentId,
      payload,
    });
    throw new OfflineQueuedError(item.id);
  };

  if (typeof window !== "undefined") {
    const globallyOffline =
      (window as Window & { __SIHIA_NETWORK_ONLINE__?: boolean }).__SIHIA_NETWORK_ONLINE__ ===
      false;
    if (globallyOffline || isObservedNetworkOffline()) {
      return queue();
    }
  }

  try {
    return await execute();
  } catch (error) {
    if (typeof window !== "undefined" && shouldQueueOfflineMutation(error)) {
      return queue();
    }
    throw error;
  }
}

async function executeOfflineAppointmentMutation(mutation: OfflineAppointmentMutation) {
  const { appointmentId, payload } = mutation;
  if (mutation.kind === "appointment.status") {
    return fetchWithAuth(`/api/appointments/${appointmentId}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }
  if (mutation.kind === "appointment.schedule") {
    return fetchWithAuth(`/api/appointments/${appointmentId}/schedule`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }
  if (mutation.kind === "appointment.cancel") {
    return fetchWithAuth(`/api/appointments/${appointmentId}/cancel`, { method: "POST" });
  }
  return fetchWithAuth(`/api/appointments/${appointmentId}/remind`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function replayQueuedAppointmentMutations(userKey: string) {
  if (typeof window === "undefined") {
    return Promise.resolve({ processed: 0, remaining: 0, failed: 0 });
  }
  return replayOfflineAppointmentQueue(
    window.localStorage,
    userKey,
    executeOfflineAppointmentMutation,
  );
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
    return fetchWithAuth<Patient[]>(`/api/patients?${params.toString()}`);
  },
  get: (id: string) => fetchWithAuth<Patient>(`/api/patients/${id}`),
  create: (input: Omit<Patient, "id" | "recordNumber" | "lastVisit" | "status">) =>
    fetchWithAuth<Patient>("/api/patients", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (
    id: string,
    input: Partial<Omit<Patient, "id" | "recordNumber" | "lastVisit">> & { lastVisit?: string },
  ) =>
    fetchWithAuth<Patient>(`/api/patients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => fetchWithAuth<null>(`/api/patients/${id}`, { method: "DELETE" }),
  history: (id: string) => fetchWithAuth<PatientHistoryVisit[]>(`/api/patients/${id}/history`),
  aiSummary: (id: string, lang: "fr" | "en" | "ar" = "fr") =>
    fetchWithAuth<PatientAiSummaryResponse>(`/api/patients/${id}/ai-summary?lang=${lang}`, {
      method: "POST",
    }),
  listDocuments: (id: string) => fetchWithAuth<PatientDocument[]>(`/api/patients/${id}/documents`),
  uploadDocument: async (id: string, file: File, category = "other", notes?: string) => {
    const token = useAuth.getState().token;
    const form = new FormData();
    form.append("file", file);
    form.append("category", category);
    if (notes) form.append("notes", notes);
    const res = await fetch(`${API_URL}/api/patients/${id}/documents`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
    if (!res.ok) {
      notifyNetworkError();
      throw new Error("upload failed");
    }
    return (await res.json()) as PatientDocument;
  },
  deleteDocument: (patientId: string, documentId: string) =>
    fetchWithAuth<null>(`/api/patients/${patientId}/documents/${documentId}`, { method: "DELETE" }),
  documentDownloadUrl: (patientId: string, documentId: string) =>
    `${API_URL}/api/patients/${patientId}/documents/${documentId}/download`,
  addVisit: (
    id: string,
    visit: {
      date: string;
      reason: string;
      doctorName: string;
      specialty: string;
      diagnosis: string;
      treatment?: string;
      notes?: string;
    },
  ) =>
    fetchWithAuth<PatientHistoryVisit>(`/api/patients/${id}/history`, {
      method: "POST",
      body: JSON.stringify(visit),
    }),
};

export const doctorsService = {
  list: () => fetchWithAuth<Doctor[]>("/api/doctors"),
  get: (id: string) => fetchWithAuth<Doctor>(`/api/doctors/${id}`),
  update: (
    id: string,
    input: {
      availability?: "available" | "busy" | "off";
      phone?: string;
      schedule?: { day: string; slots: string[] }[];
    },
  ) =>
    fetchWithAuth<Doctor>(`/api/doctors/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
};

export const appointmentsService = {
  list: () => fetchWithAuth<Appointment[]>("/api/appointments"),
  create: (input: Omit<Appointment, "id" | "reminderSummary">) =>
    fetchWithAuth<Appointment>("/api/appointments", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  cancel: (id: string) =>
    queueableAppointmentMutation("appointment.cancel", id, {}, () =>
      fetchWithAuth(`/api/appointments/${id}/cancel`, { method: "POST" }),
    ),
  updateStatus: (id: string, status: AppointmentStatus) =>
    queueableAppointmentMutation("appointment.status", id, { status }, () =>
      fetchWithAuth<Appointment>(`/api/appointments/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    ),
  reschedule: (id: string, input: { doctorId: string; date: string }) =>
    queueableAppointmentMutation("appointment.schedule", id, input, () =>
      fetchWithAuth<Appointment>(`/api/appointments/${id}/schedule`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    ),
  remind: (id: string, channels: Array<"email" | "sms"> = ["email"]) =>
    queueableAppointmentMutation("appointment.remind", id, { channels }, () =>
      fetchWithAuth<AppointmentReminderSendResponse>(`/api/appointments/${id}/remind`, {
        method: "POST",
        body: JSON.stringify({ channels }),
      }),
    ),
  reminderHistory: (id: string) =>
    fetchWithAuth<AppointmentReminderHistoryResponse>(`/api/appointments/${id}/reminders`),
  runRemindersBatch: () =>
    fetchWithAuth<{ processed: number; sent: number; skipped: number; failed: number }>(
      "/api/admin/reminders/run",
      { method: "POST" },
    ),
  reminderStatus: () => fetchWithAuth<ReminderChannelsStatus>("/api/admin/reminders/status"),
};

export const pipelineService = {
  status: () => fetchWithAuth<PipelineStatusResponse>("/api/admin/pipeline/status"),
  run: (dagId: string) =>
    fetchWithAuth<{
      dagId: string;
      runId: string;
      status: string;
      metrics: Record<string, unknown>;
    }>(`/api/admin/pipeline/run/${dagId}`, { method: "POST" }),
};

export const analyticsService = {
  kpis: () =>
    fetchWithAuth<{
      patientsToday: number;
      patientsTrend: number;
      occupancy: number;
      occupancyCapacity: number;
      appointments: number;
      appointmentsCapacity: number;
      criticalAlerts: number;
    }>("/api/analytics/kpis"),
  monthlyRevenue: (period: "3m" | "6m" | "12m" = "6m") =>
    fetchWithAuth<KpiPoint[]>(`/api/analytics/revenue?period=${period}`),
  admissionsByDept: () => fetchWithAuth<KpiPoint[]>("/api/analytics/admissions-dept"),
  satisfaction: () => fetchWithAuth<KpiPoint[]>("/api/analytics/satisfaction"),
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
  predict7d: () => fetchWithAuth<MlForecastResponse>("/api/ml/predict-7d"),
  predict30d: () => fetchWithAuth<MlForecastResponse>("/api/ml/predict-30d"),
  metrics: () => fetchWithAuth<MlMetricsResponse>("/api/ml/metrics"),
  noshowRisk: (params?: {
    horizonDays?: number;
    minRisk?: number;
    riskLevel?: "high" | "medium" | "low";
    limit?: number;
    offset?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.horizonDays != null) q.set("horizonDays", String(params.horizonDays));
    if (params?.minRisk != null) q.set("minRisk", String(params.minRisk));
    if (params?.riskLevel) q.set("riskLevel", params.riskLevel);
    if (params?.limit != null) q.set("limit", String(params.limit));
    if (params?.offset != null) q.set("offset", String(params.offset));
    const qs = q.toString();
    return fetchWithAuth<NoShowRiskResponse>(`/api/ml/noshow-risk${qs ? `?${qs}` : ""}`);
  },
};

export const alertsService = {
  list: () => fetchWithAuth<Alert[]>("/api/alerts"),
};

export const notificationsService = {
  list: (params?: { level?: string; unreadOnly?: boolean; area?: string }) => {
    const q = new URLSearchParams();
    if (params?.level) q.set("level", params.level);
    if (params?.unreadOnly) q.set("unreadOnly", "true");
    if (params?.area) q.set("area", params.area);
    const qs = q.toString();
    return fetchWithAuth<NotificationsInboxResponse>(`/api/notifications${qs ? `?${qs}` : ""}`);
  },
  markRead: (alertIds: string[]) =>
    fetchWithAuth<{ marked: number }>("/api/notifications/read", {
      method: "POST",
      body: JSON.stringify({ alertIds }),
    }),
  markAllRead: () =>
    fetchWithAuth<{ marked: number }>("/api/notifications/read-all", { method: "POST" }),
  getPrefs: () => fetchWithAuth<NotificationPrefs>("/api/notifications/prefs"),
  updatePrefs: (prefs: Partial<NotificationPrefs>) =>
    fetchWithAuth<NotificationPrefs>("/api/notifications/prefs", {
      method: "PATCH",
      body: JSON.stringify(prefs),
    }),
};

export const searchService = {
  search: (q: string, limit = 8) =>
    fetchWithAuth<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}&limit=${limit}`),
};

export const waitingRoomService = {
  snapshot: () => fetchWithAuth<WaitingRoomSnapshot>("/api/waiting-room"),
  callNext: (doctorId?: string) =>
    fetchWithAuth<{ called: unknown; message: string }>(
      `/api/waiting-room/call-next${doctorId ? `?doctorId=${encodeURIComponent(doctorId)}` : ""}`,
      { method: "POST" },
    ),
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
  list: (limit = 100) =>
    fetchWithAuth<{ items: unknown[]; count: number }>(`/api/admin/audit-logs?limit=${limit}`),
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
  remove: (id: string) => fetchWithAuth<null>(`/api/rbac/users/${id}`, { method: "DELETE" }),
};

export const authService = {
  forgotPassword: async (email: string) => {
    const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error("FORGOT_PASSWORD_FAILED");
    return res.json() as Promise<{ status: string; message: string }>;
  },
  verifyResetCode: async (email: string, code: string) => {
    const res = await fetch(`${API_URL}/api/auth/verify-reset-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    if (!res.ok) throw new Error("INVALID_RESET_CODE");
    return res.json() as Promise<{ status: string }>;
  },
  resetPassword: async (email: string, code: string, newPassword: string) => {
    const res = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, newPassword }),
    });
    if (!res.ok) throw new Error("RESET_PASSWORD_FAILED");
    return res.json() as Promise<{ status: string }>;
  },
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
