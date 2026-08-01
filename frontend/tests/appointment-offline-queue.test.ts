import { describe, expect, it, vi } from "vitest";

import {
  enqueueOfflineAppointmentMutation,
  loadOfflineAppointmentQueue,
  replayOfflineAppointmentQueue,
  shouldQueueOfflineMutation,
} from "../src/lib/offline/appointmentQueue";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("offline appointment queue", () => {
  it("persists operations separately for each user", () => {
    const storage = memoryStorage();
    enqueueOfflineAppointmentMutation(
      storage,
      "u-1",
      {
        kind: "appointment.status",
        appointmentId: "a-1",
        payload: { status: "confirmed" },
      },
      new Date("2030-01-01T10:00:00Z"),
    );
    expect(loadOfflineAppointmentQueue(storage, "u-1")).toHaveLength(1);
    expect(loadOfflineAppointmentQueue(storage, "u-2")).toHaveLength(0);
  });

  it("replays queued operations in creation order", async () => {
    const storage = memoryStorage();
    enqueueOfflineAppointmentMutation(storage, "u-1", {
      kind: "appointment.status",
      appointmentId: "a-1",
      payload: { status: "confirmed" },
    });
    enqueueOfflineAppointmentMutation(storage, "u-1", {
      kind: "appointment.schedule",
      appointmentId: "a-1",
      payload: { doctorId: "d-2", date: "2030-01-01T11:00:00Z" },
    });
    const executed: string[] = [];

    const summary = await replayOfflineAppointmentQueue(storage, "u-1", async (mutation) => {
      executed.push(mutation.kind);
    });

    expect(executed).toEqual(["appointment.status", "appointment.schedule"]);
    expect(summary).toEqual({ processed: 2, remaining: 0, failed: 0 });
    expect(loadOfflineAppointmentQueue(storage, "u-1")).toEqual([]);
  });

  it("stops at the first failure and keeps the remaining operations", async () => {
    const storage = memoryStorage();
    enqueueOfflineAppointmentMutation(storage, "u-1", {
      kind: "appointment.status",
      appointmentId: "a-1",
      payload: { status: "confirmed" },
    });
    enqueueOfflineAppointmentMutation(storage, "u-1", {
      kind: "appointment.remind",
      appointmentId: "a-1",
      payload: { channels: ["email"] },
    });
    const execute = vi.fn().mockRejectedValueOnce(new Error("API unavailable"));

    const summary = await replayOfflineAppointmentQueue(storage, "u-1", execute);
    const remaining = loadOfflineAppointmentQueue(storage, "u-1");

    expect(summary).toEqual({ processed: 0, remaining: 2, failed: 1 });
    expect(remaining[0]?.attempts).toBe(1);
    expect(remaining[0]?.lastError).toBe("API unavailable");
  });

  it("queues only offline or network failures", () => {
    expect(shouldQueueOfflineMutation(new TypeError("Failed to fetch"), true)).toBe(true);
    expect(shouldQueueOfflineMutation(new Error("CONFLICT"), true)).toBe(false);
    expect(shouldQueueOfflineMutation(new Error("offline"), false)).toBe(true);
  });
});
