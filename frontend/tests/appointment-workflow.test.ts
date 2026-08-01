import { describe, expect, test } from "vitest";

import {
  appointmentStatusTone,
  isTerminalAppointmentStatus,
  nextAppointmentStatus,
} from "../src/lib/appointments/workflow";

describe("appointment workflow", () => {
  test("follows scheduled to confirmed to arrived to completed", () => {
    expect(nextAppointmentStatus("scheduled")).toBe("confirmed");
    expect(nextAppointmentStatus("confirmed")).toBe("arrived");
    expect(nextAppointmentStatus("arrived")).toBe("completed");
    expect(nextAppointmentStatus("completed")).toBeNull();
  });

  test("keeps terminal states without a next action", () => {
    for (const status of ["completed", "cancelled", "noshow"] as const) {
      expect(isTerminalAppointmentStatus(status)).toBe(true);
      expect(nextAppointmentStatus(status)).toBeNull();
    }
  });

  test("exposes a distinct visual tone for workflow states", () => {
    expect(appointmentStatusTone("scheduled")).toBe("primary");
    expect(appointmentStatusTone("arrived")).toBe("success");
    expect(appointmentStatusTone("cancelled")).toBe("destructive");
  });
});
