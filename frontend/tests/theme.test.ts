import { afterEach, describe, expect, test, vi } from "vitest";
import { resolveTheme } from "../src/lib/theme/store";

function stubMatchMedia(matches: boolean) {
  const matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal("matchMedia", matchMedia);
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: { ...(globalThis.window ?? {}), matchMedia },
  });
}

describe("theme resolveTheme", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("respects explicit light and dark", () => {
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
  });

  test("system follows matchMedia when dark", () => {
    stubMatchMedia(true);
    expect(resolveTheme("system")).toBe("dark");
  });

  test("system follows matchMedia when light", () => {
    stubMatchMedia(false);
    expect(resolveTheme("system")).toBe("light");
  });
});
