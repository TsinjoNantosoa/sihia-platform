import { describe, expect, test } from "vitest";
import { shouldUseMocks } from "../src/lib/api/mockPolicy";

describe("mock policy", () => {
  test("returns false in production even when flag is true", () => {
    expect(shouldUseMocks({ PROD: true, VITE_USE_MOCKS: "true" })).toBe(false);
  });

  test("returns true in dev when flag is true", () => {
    expect(shouldUseMocks({ PROD: false, VITE_USE_MOCKS: "true" })).toBe(true);
  });

  test("returns false when flag is missing or false", () => {
    expect(shouldUseMocks({ PROD: false })).toBe(false);
    expect(shouldUseMocks({ PROD: false, VITE_USE_MOCKS: "false" })).toBe(false);
  });
});