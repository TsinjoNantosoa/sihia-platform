import { describe, expect, it } from "vitest";
import {
  formatMlConfidence,
  formatMlModelLabel,
  formatMlSourceLabel,
  mlForecastSummary,
} from "../src/lib/ml/format";

describe("ml format helpers", () => {
  it("formats model labels", () => {
    expect(formatMlModelLabel("prophet")).toBe("Prophet");
    expect(formatMlModelLabel("linear-sqlite")).toBe("Régression linéaire");
  });

  it("formats source labels", () => {
    expect(formatMlSourceLabel("postgresql")).toBe("PostgreSQL");
    expect(formatMlSourceLabel("sqlite")).toBe("SQLite");
  });

  it("formats confidence percentage", () => {
    expect(formatMlConfidence(0.87)).toBe("87%");
  });

  it("builds forecast summary", () => {
    const summary = mlForecastSummary({
      model: "prophet",
      confidence: 0.9,
      source: "postgresql",
      generatedAt: "2026-06-12T10:00:00.000Z",
    });
    expect(summary.model).toBe("Prophet");
    expect(summary.confidence).toBe("90%");
    expect(summary.source).toBe("PostgreSQL");
  });
});
