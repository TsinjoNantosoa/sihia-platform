import type { AppointmentStatus } from "@/lib/api/types";

const NEXT_WORKFLOW_STATUS: Partial<Record<AppointmentStatus, AppointmentStatus>> = {
  scheduled: "confirmed",
  confirmed: "arrived",
  arrived: "completed",
};

export function nextAppointmentStatus(status: AppointmentStatus): AppointmentStatus | null {
  return NEXT_WORKFLOW_STATUS[status] ?? null;
}

export function isTerminalAppointmentStatus(status: AppointmentStatus): boolean {
  return status === "completed" || status === "cancelled" || status === "noshow";
}

export function appointmentStatusTone(
  status: AppointmentStatus,
): "success" | "primary" | "warning" | "destructive" | "neutral" {
  if (status === "confirmed" || status === "arrived") return "success";
  if (status === "scheduled") return "primary";
  if (status === "cancelled") return "destructive";
  if (status === "noshow") return "warning";
  return "neutral";
}
