export type OfflineAppointmentMutationKind =
  | "appointment.status"
  | "appointment.schedule"
  | "appointment.cancel"
  | "appointment.remind";

export type OfflineAppointmentMutation = {
  id: string;
  kind: OfflineAppointmentMutationKind;
  appointmentId: string;
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
  lastError: string | null;
};

type StorageLike = Pick<Storage, "getItem" | "setItem">;

const MAX_QUEUE_SIZE = 100;
export const OFFLINE_QUEUE_EVENT = "sihia:offline-queue-change";
let observedOnline = true;

const queueKey = (userKey: string) => `sihia:offline-appointments:${userKey}`;

function isMutation(value: unknown): value is OfflineAppointmentMutation {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.kind === "string" &&
    [
      "appointment.status",
      "appointment.schedule",
      "appointment.cancel",
      "appointment.remind",
    ].includes(item.kind) &&
    typeof item.appointmentId === "string" &&
    typeof item.payload === "object" &&
    item.payload !== null &&
    typeof item.createdAt === "string" &&
    typeof item.attempts === "number" &&
    (typeof item.lastError === "string" || item.lastError === null)
  );
}

function writeQueue(
  storage: StorageLike,
  userKey: string,
  queue: OfflineAppointmentMutation[],
): void {
  storage.setItem(queueKey(userKey), JSON.stringify(queue));
}

function emitQueueChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_EVENT));
  }
}

export function loadOfflineAppointmentQueue(
  storage: Pick<Storage, "getItem">,
  userKey: string,
): OfflineAppointmentMutation[] {
  try {
    const parsed = JSON.parse(storage.getItem(queueKey(userKey)) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter(isMutation) : [];
  } catch {
    return [];
  }
}

export function enqueueOfflineAppointmentMutation(
  storage: StorageLike,
  userKey: string,
  input: Pick<OfflineAppointmentMutation, "kind" | "appointmentId" | "payload">,
  now = new Date(),
): OfflineAppointmentMutation {
  const item: OfflineAppointmentMutation = {
    ...input,
    id: `offline-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now.toISOString(),
    attempts: 0,
    lastError: null,
  };
  const queue = [...loadOfflineAppointmentQueue(storage, userKey), item].slice(-MAX_QUEUE_SIZE);
  writeQueue(storage, userKey, queue);
  emitQueueChange();
  return item;
}

export type OfflineReplaySummary = {
  processed: number;
  remaining: number;
  failed: number;
};

export async function replayOfflineAppointmentQueue(
  storage: StorageLike,
  userKey: string,
  execute: (mutation: OfflineAppointmentMutation) => Promise<unknown>,
): Promise<OfflineReplaySummary> {
  const queue = loadOfflineAppointmentQueue(storage, userKey);
  let processed = 0;

  for (let index = 0; index < queue.length; index += 1) {
    const mutation = queue[index];
    if (!mutation) continue;
    try {
      await execute(mutation);
      processed += 1;
    } catch (error) {
      const remaining = queue.slice(index);
      remaining[0] = {
        ...mutation,
        attempts: mutation.attempts + 1,
        lastError: error instanceof Error ? error.message : "SYNC_ERROR",
      };
      writeQueue(storage, userKey, remaining);
      emitQueueChange();
      return { processed, remaining: remaining.length, failed: 1 };
    }
  }

  writeQueue(storage, userKey, []);
  emitQueueChange();
  return { processed, remaining: 0, failed: 0 };
}

export class OfflineQueuedError extends Error {
  readonly queueId: string;

  constructor(queueId: string) {
    super("OFFLINE_QUEUED");
    this.name = "OfflineQueuedError";
    this.queueId = queueId;
  }
}

export function isOfflineQueuedError(error: unknown): error is OfflineQueuedError {
  return error instanceof OfflineQueuedError;
}

export function setObservedNetworkOnline(online: boolean): void {
  observedOnline = online;
  if (typeof window !== "undefined") {
    (window as Window & { __SIHIA_NETWORK_ONLINE__?: boolean }).__SIHIA_NETWORK_ONLINE__ = online;
  }
}

export function isObservedNetworkOffline(): boolean {
  const browserOffline = typeof navigator !== "undefined" && !navigator.onLine;
  const globalOffline =
    typeof window !== "undefined" &&
    (window as Window & { __SIHIA_NETWORK_ONLINE__?: boolean }).__SIHIA_NETWORK_ONLINE__ === false;
  return !observedOnline || globalOffline || browserOffline;
}

export function shouldQueueOfflineMutation(error: unknown, online?: boolean): boolean {
  const isOnline = online ?? (typeof navigator === "undefined" ? true : navigator.onLine);
  return !isOnline || error instanceof TypeError;
}
