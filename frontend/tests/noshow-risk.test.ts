import { describe, expect, test } from "vitest";
import {
  formatNoshowPercent,
  noshowRiskBadgeClass,
  noshowRiskTone,
} from "../src/lib/ml/noshowFormat";

describe("noshowFormat", () => {
  test("formats percent", () => {
    expect(formatNoshowPercent(0.456)).toBe("46%");
    expect(formatNoshowPercent(0)).toBe("0%");
    expect(formatNoshowPercent(1)).toBe("100%");
  });

  test("maps risk tone", () => {
    expect(noshowRiskTone("high")).toBe("destructive");
    expect(noshowRiskTone("medium")).toBe("warning");
    expect(noshowRiskTone("low")).toBe("muted");
  });

  test("badge classes differ by level", () => {
    expect(noshowRiskBadgeClass("high")).toContain("destructive");
    expect(noshowRiskBadgeClass("medium")).toContain("warning");
    expect(noshowRiskBadgeClass("low")).toContain("muted");
  });
});
