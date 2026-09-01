// Types domaines SIH IA — partagés entre services et UI.

export type Gender = "M" | "F";

export interface Patient {
  id: string;
  recordNumber: string;
  firstName: string;
  lastName: string;
  dob: string; // ISO date
  gender: Gender;
  phone: string;
  email?: string;
  address: string;
  bloodType: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
  allergies: string[];
  insurance?: string;
  status: "active" | "inactive" | "admitted";
  lastVisit?: string;
  chronicConditions?: string | null;
  currentTreatments?: string | null;
  emergencyContact?: string | null;
}

export interface PatientDocument {
  id: string;
  patientId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  category: string;
  uploadedBy?: string | null;
  uploadedAt: string;
  notes?: string | null;
  downloadUrl: string;
}

export interface PatientHistoryVisit {
  id: string;
  date: string;
  reason: string;
  doctorName: string;
  specialty: string;
  diagnosis: string;
  treatment?: string;
  notes?: string;
}

export interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  phone: string;
  email: string;
  availability: "available" | "busy" | "off";
  patientsCount: number;
  weeklyAppointments: number;
  satisfaction: number;
  schedule: { day: string; slots: string[] }[];
}

export type AppointmentStatus =
  "scheduled" | "confirmed" | "arrived" | "completed" | "cancelled" | "noshow";

export type ReminderChannelStatus = "none" | "sent" | "failed";

export interface AppointmentReminderSummary {
  email: ReminderChannelStatus;
  sms: ReminderChannelStatus;
  lastSentAt: string | null;
}

export type AppointmentReminderStatus = "sent" | "failed" | "skipped";

export interface AppointmentReminderHistoryItem {
  id: string;
  channel: "email" | "sms";
  kind: "manual" | "auto";
  status: AppointmentReminderStatus;
  recipient: string;
  sentAt: string;
  error: string | null;
}

export interface AppointmentReminderHistoryResponse {
  items: AppointmentReminderHistoryItem[];
}

export interface AppointmentReminderSendResponse {
  appointmentId: string;
  results: AppointmentReminderHistoryItem[];
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string; // ISO datetime
  durationMin: number;
  reason: string;
  status: AppointmentStatus;
  reminderSummary?: AppointmentReminderSummary;
}

export interface KpiPoint {
  label: string;
  value: number;
}

export interface PredictionPoint {
  date: string; // ISO date
  actual?: number;
  forecast?: number;
  upper?: number;
  lower?: number;
}

export interface MlForecastResponse {
  points: PredictionPoint[];
  model: string;
  model_version: string;
  confidence: number;
  peak: { date: string; value: number };
  recommendation: string;
  source: "sqlite" | "postgresql" | string;
  historyDays: number;
  engine: "prophet" | "linear" | string;
  horizon: number;
  generatedAt: string;
  drift_score?: number;
}

export interface MlMetricsResponse {
  model: string;
  model_version: string;
  engine: "prophet" | "linear" | string;
  mae: number | null;
  mape: number | null;
  holdoutDays: number;
  samples: number;
  historyDays: number;
  source: "sqlite" | "postgresql" | string;
  generatedAt: string;
  status: "ok" | "degraded" | "insufficient_data";
  targetMapePercent: number;
  withinTarget: boolean | null;
}

export type NoShowRiskLevel = "high" | "medium" | "low";

export interface NoShowRiskFactor {
  code: string;
  weight: number;
  label: string;
}

export interface NoShowRiskItem {
  appointmentId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  status: AppointmentStatus;
  reason: string;
  riskScore: number;
  riskLevel: NoShowRiskLevel;
  factors: NoShowRiskFactor[];
  suggestedAction: "remind" | "confirm_or_call";
  reminderSent: boolean;
  reminderCount: number;
  patientNoshowRate: number;
  patientPastAppointments: number;
  daysUntil: number;
}

export interface NoShowRiskResponse {
  items: NoShowRiskItem[];
  total: number;
  limit: number;
  offset: number;
  horizonDays: number;
  minRisk: number;
  model: string;
  model_version: string;
  engine: string;
  source: "sqlite" | "postgresql" | string;
  generatedAt: string;
  disclaimer: string;
  facilityNoshowRate: number;
  summary: {
    high: number;
    medium: number;
    low: number;
    avgRisk: number;
  };
}

export interface PatientAiSummaryResponse {
  patientId: string;
  patientName: string;
  lines: string[];
  bullets: string[];
  visitCount: number;
  model: string;
  model_version: string;
  engine: "rules" | "openai" | string;
  source: "sqlite" | "postgresql" | string;
  generatedAt: string;
  disclaimer: string;
  allergies: string[];
  bloodType: string;
  status: string;
}

export interface NotificationItem extends Alert {
  read: boolean;
}

export interface NotificationPrefs {
  alertsEnabled: boolean;
  remindersEnabled: boolean;
  weeklyDigestEnabled: boolean;
  updatedAt?: string | null;
}

export interface NotificationsInboxResponse {
  items: NotificationItem[];
  total: number;
  unreadCount: number;
  prefs: NotificationPrefs;
}

export interface SearchResultItem {
  type: "patient" | "doctor" | "appointment";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  patientId?: string;
}

export interface SearchResponse {
  query: string;
  items: SearchResultItem[];
  total: number;
}

export interface WaitingRoomItem {
  appointmentId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  status: string;
  reason: string;
  durationMin: number;
}

export interface WaitingRoomSnapshot {
  date: string;
  waiting: WaitingRoomItem[];
  inProgress: WaitingRoomItem[];
  upcoming: WaitingRoomItem[];
  counts: { waiting: number; inProgress: number; upcoming: number };
  generatedAt: string;
}

export interface ReminderChannelsStatus {
  email: {
    mode: string;
    configured: boolean;
    ready: boolean;
    smtpHost: string | null;
    smtpPort: number | null;
    from: string;
  };
  sms: {
    mode: string;
    configured: boolean;
    ready: boolean;
  };
  hoursBefore: number;
  logPath: string;
}

export interface PipelineDagRun {
  id: string;
  status: string;
  startedAt: string;
  finishedAt?: string | null;
  metrics?: Record<string, unknown>;
  error?: string | null;
}

export interface PipelineStatusResponse {
  status: "ok" | "degraded" | string;
  dags: Array<{
    dagId: string;
    lastRun: PipelineDagRun | null;
  }>;
  snapshots: { kpis: unknown };
  mlFeaturesDays: number;
  alerts: string[];
}

export interface Alert {
  id: string;
  level: "critical" | "warning" | "info";
  title: string;
  description: string;
  area: string;
  createdAt: string;
  action?: {
    href: string;
    label: string;
  };
  suggestedActions?: Array<{
    href: string;
    label: string;
  }>;
}

export interface RbacUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "doctor" | "staff" | "manager";
  facility?: string;
  status: "active" | "suspended";
  lastLogin: string | null;
}

export type VoiceDirection = "inbound" | "outbound";
export type VoiceCallStatus =
  "initiated" | "ringing" | "active" | "completed" | "failed" | "no_answer" | "busy" | "cancelled";
export type VoiceSpeaker = "agent" | "patient" | "system";

export interface VoiceCall {
  id: string;
  providerCallId?: string | null;
  conversationId?: string | null;
  direction: VoiceDirection | string;
  phoneFrom: string;
  phoneTo: string;
  patientId?: string | null;
  patientName?: string | null;
  startedAt: string;
  endedAt?: string | null;
  durationSeconds?: number | null;
  status: VoiceCallStatus | string;
  intent?: string | null;
  outcome?: string | null;
  language: string;
  escalated: boolean;
  appointmentId?: string | null;
}

export interface VoiceEvent {
  id: string;
  eventType: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface VoiceToolCall {
  id: string;
  toolName: string;
  arguments: Record<string, unknown>;
  result: Record<string, unknown>;
  success: boolean;
  errorCode?: string | null;
  durationMs: number;
  createdAt: string;
}

export interface VoiceTranscriptSegment {
  id: string;
  speaker: VoiceSpeaker | string;
  content: string;
  startedAt?: string | null;
  endedAt?: string | null;
  sequenceNumber: number;
}

export interface VoiceCallDetail extends VoiceCall {
  answeredAt?: string | null;
  escalationReason?: string | null;
  state: string;
  identityStatus: string;
  events: VoiceEvent[];
  toolCalls: VoiceToolCall[];
  transcript: VoiceTranscriptSegment[];
}

export interface VoiceStats {
  callsToday: number;
  completedCalls: number;
  appointmentsBooked: number;
  appointmentsRescheduled: number;
  appointmentsCancelled: number;
  humanEscalations: number;
  failedCalls: number;
  averageCallDuration: number;
  averageToolLatency: number;
  demoNotice: string;
}

export interface VoiceSettings {
  agentEnabled: boolean;
  inboundCallsEnabled: boolean;
  outboundCallsEnabled: boolean;
  defaultLanguage: string;
  supportedLanguages: string[];
  humanTransferNumberConfigured: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  maxRetries: number;
  silenceTimeoutSeconds: number;
  requireConfirmation: boolean;
  storeTranscripts: boolean;
  storeAudio: boolean;
  providerMode: string;
  openaiModel: string;
}
