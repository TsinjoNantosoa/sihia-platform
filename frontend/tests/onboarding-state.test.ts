import { describe, expect, it } from "vitest";

import {
  completeOnboarding,
  loadOnboardingState,
  ONBOARDING_VERSION,
  resetOnboarding,
  saveOnboardingProgress,
} from "../src/lib/onboarding/state";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("onboarding state", () => {
  it("starts incomplete for a new user", () => {
    expect(loadOnboardingState(memoryStorage(), "u-1")).toEqual({
      version: ONBOARDING_VERSION,
      completed: false,
      lastStep: 0,
    });
  });

  it("persists progress and completion per user", () => {
    const storage = memoryStorage();
    saveOnboardingProgress(storage, "u-1", 2);
    expect(loadOnboardingState(storage, "u-1").lastStep).toBe(2);
    completeOnboarding(storage, "u-1");
    expect(loadOnboardingState(storage, "u-1").completed).toBe(true);
    expect(loadOnboardingState(storage, "u-2").completed).toBe(false);
  });

  it("can reset a completed tour", () => {
    const storage = memoryStorage();
    completeOnboarding(storage, "u-1");
    resetOnboarding(storage, "u-1");
    expect(loadOnboardingState(storage, "u-1")).toMatchObject({
      completed: false,
      lastStep: 0,
    });
  });

  it("invalidates an older onboarding version", () => {
    const storage = memoryStorage();
    storage.setItem(
      "sihia:onboarding:u-1",
      JSON.stringify({ version: 0, completed: true, lastStep: 3 }),
    );
    expect(loadOnboardingState(storage, "u-1").completed).toBe(false);
  });
});
