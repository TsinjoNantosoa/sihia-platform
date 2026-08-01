import { describe, expect, it } from "vitest";

import {
  appointmentOccursOnDay,
  appointmentStartsInSlot,
  buildSlotDate,
  CALENDAR_SLOTS,
  canRescheduleAppointment,
  formatDateInput,
} from "../src/lib/appointments/calendar";

describe("multi-doctor appointment calendar", () => {
  it("builds thirty-minute slots between 08:00 and 17:30", () => {
    expect(CALENDAR_SLOTS).toHaveLength(20);
    expect(CALENDAR_SLOTS[0]).toEqual({ hour: 8, minute: 0 });
    expect(CALENDAR_SLOTS.at(-1)).toEqual({ hour: 17, minute: 30 });
  });

  it("only allows active appointments to be dragged", () => {
    expect(canRescheduleAppointment("scheduled")).toBe(true);
    expect(canRescheduleAppointment("confirmed")).toBe(true);
    expect(canRescheduleAppointment("arrived")).toBe(false);
    expect(canRescheduleAppointment("completed")).toBe(false);
    expect(canRescheduleAppointment("cancelled")).toBe(false);
  });

  it("groups appointments by local day and half-hour slot", () => {
    const day = new Date(2032, 5, 14);
    const value = new Date(2032, 5, 14, 9, 45).toISOString();
    expect(appointmentOccursOnDay(value, day)).toBe(true);
    expect(appointmentStartsInSlot(value, { hour: 9, minute: 30 })).toBe(true);
    expect(appointmentStartsInSlot(value, { hour: 10, minute: 0 })).toBe(false);
  });

  it("creates an ISO date from the selected day and destination slot", () => {
    const selectedDay = new Date(2032, 5, 14, 12, 15);
    const result = new Date(buildSlotDate(selectedDay, { hour: 10, minute: 30 }));
    expect(result.getFullYear()).toBe(2032);
    expect(result.getMonth()).toBe(5);
    expect(result.getDate()).toBe(14);
    expect(result.getHours()).toBe(10);
    expect(result.getMinutes()).toBe(30);
    expect(formatDateInput(selectedDay)).toBe("2032-06-14");
  });
});
