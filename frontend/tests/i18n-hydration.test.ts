import { describe, expect, test } from "vitest";

import { DICTIONARIES } from "../src/lib/i18n/dictionaries";

describe("i18n SSR", () => {
  test("default locale fr matches server shell before persist", () => {
    expect(DICTIONARIES.fr["app.tagline"]).toBe("Système Intelligent de Gestion Hospitalière");
    expect(DICTIONARIES.en["app.tagline"]).toBe("Smart Hospital Management Platform");
  });
});
