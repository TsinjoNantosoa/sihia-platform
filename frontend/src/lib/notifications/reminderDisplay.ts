import type { AppointmentReminderSummary, ReminderChannelStatus } from "@/lib/api/types";

export type ReminderTone = "success" | "destructive" | "neutral";

export function reminderStatusTone(status: ReminderChannelStatus): ReminderTone {
  if (status === "sent") return "success";
  if (status === "failed") return "destructive";
  return "neutral";
}

export function failedReminderChannels(
  summary?: AppointmentReminderSummary,
): Array<"email" | "sms"> {
  if (!summary) return [];
  const channels: Array<"email" | "sms"> = [];
  if (summary.email === "failed") channels.push("email");
  if (summary.sms === "failed") channels.push("sms");
  return channels;
}

export function reminderActionChannels(
  summary?: AppointmentReminderSummary,
): Array<"email" | "sms"> {
  const failed = failedReminderChannels(summary);
  return failed.length > 0 ? failed : ["email", "sms"];
}
