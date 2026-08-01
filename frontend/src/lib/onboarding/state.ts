export const ONBOARDING_VERSION = 1;
export const ONBOARDING_START_EVENT = "sihia:onboarding:start";

export type OnboardingState = {
  version: number;
  completed: boolean;
  lastStep: number;
};

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "setItem">;

const keyFor = (userKey: string) => `sihia:onboarding:${userKey}`;

export function loadOnboardingState(storage: StorageReader, userKey: string): OnboardingState {
  try {
    const parsed = JSON.parse(storage.getItem(keyFor(userKey)) ?? "null") as unknown;
    if (!parsed || typeof parsed !== "object") {
      return { version: ONBOARDING_VERSION, completed: false, lastStep: 0 };
    }
    const state = parsed as Record<string, unknown>;
    if (
      state.version !== ONBOARDING_VERSION ||
      typeof state.completed !== "boolean" ||
      typeof state.lastStep !== "number"
    ) {
      return { version: ONBOARDING_VERSION, completed: false, lastStep: 0 };
    }
    return {
      version: ONBOARDING_VERSION,
      completed: state.completed,
      lastStep: Math.max(0, Math.floor(state.lastStep)),
    };
  } catch {
    return { version: ONBOARDING_VERSION, completed: false, lastStep: 0 };
  }
}

export function saveOnboardingProgress(
  storage: StorageWriter,
  userKey: string,
  lastStep: number,
): void {
  storage.setItem(
    keyFor(userKey),
    JSON.stringify({ version: ONBOARDING_VERSION, completed: false, lastStep }),
  );
}

export function completeOnboarding(storage: StorageWriter, userKey: string): void {
  storage.setItem(
    keyFor(userKey),
    JSON.stringify({ version: ONBOARDING_VERSION, completed: true, lastStep: 0 }),
  );
}

export function resetOnboarding(storage: StorageWriter, userKey: string): void {
  storage.setItem(
    keyFor(userKey),
    JSON.stringify({ version: ONBOARDING_VERSION, completed: false, lastStep: 0 }),
  );
}

export function requestOnboardingRestart(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ONBOARDING_START_EVENT));
  }
}
