const STORAGE_KEY = "sihia.notifications.readIds";

function readSet(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function writeSet(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

/** Stable key per alert type (ids are stable across refreshes). */
export function alertReadKey(alert: { id: string; createdAt?: string }): string {
  return alert.id;
}

export function getReadAlertKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  return readSet();
}

export function markAlertsRead(keys: string[]) {
  if (typeof window === "undefined" || keys.length === 0) return;
  const next = readSet();
  for (const key of keys) next.add(key);
  writeSet(next);
}

export function markAllAlertsRead(alerts: Array<{ id: string; createdAt?: string }>) {
  markAlertsRead(alerts.map(alertReadKey));
}

export function isAlertUnread(
  alert: { id: string; createdAt?: string },
  readKeys: Set<string>,
): boolean {
  return !readKeys.has(alertReadKey(alert));
}
