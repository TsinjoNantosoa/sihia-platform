import type { AppointmentStatus } from "@/lib/api/types";

export type CalendarSlot = {
  hour: number;
  minute: 0 | 30;
};

export const CALENDAR_SLOTS: CalendarSlot[] = Array.from({ length: 20 }, (_, index) => ({
  hour: 8 + Math.floor(index / 2),
  minute: index % 2 === 0 ? 0 : 30,
})) as CalendarSlot[];

export function canRescheduleAppointment(status: AppointmentStatus): boolean {
  return status === "scheduled" || status === "confirmed";
}

export function appointmentOccursOnDay(appointmentDate: string, day: Date): boolean {
  const value = new Date(appointmentDate);
  return (
    value.getFullYear() === day.getFullYear() &&
    value.getMonth() === day.getMonth() &&
    value.getDate() === day.getDate()
  );
}

export function appointmentStartsInSlot(appointmentDate: string, slot: CalendarSlot): boolean {
  const value = new Date(appointmentDate);
  return value.getHours() === slot.hour && Math.floor(value.getMinutes() / 30) * 30 === slot.minute;
}

export function buildSlotDate(day: Date, slot: CalendarSlot): string {
  const value = new Date(day);
  value.setHours(slot.hour, slot.minute, 0, 0);
  return value.toISOString();
}

export function formatDateInput(day: Date): string {
  const year = day.getFullYear();
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}
