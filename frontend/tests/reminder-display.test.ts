import { describe, expect, test } from "vitest";

import {
  failedReminderChannels,
  reminderActionChannels,
  reminderStatusTone,
} from "../src/lib/notifications/reminderDisplay";

describe("appointment reminder display", () => {
  test("maps each delivery state to a visible tone", () => {
    expect(reminderStatusTone("sent")).toBe("success");
    expect(reminderStatusTone("failed")).toBe("destructive");
    expect(reminderStatusTone("none")).toBe("neutral");
  });

  test("retries only failed channels", () => {
    const summary = { email: "failed", sms: "sent", lastSentAt: "2026-08-01T10:00:00Z" } as const;
    expect(failedReminderChannels(summary)).toEqual(["email"]);
    expect(reminderActionChannels(summary)).toEqual(["email"]);
  });

  test("sends both channels when there is no failure", () => {
    const summary = { email: "none", sms: "none", lastSentAt: null } as const;
    expect(reminderActionChannels(summary)).toEqual(["email", "sms"]);
  });
});
