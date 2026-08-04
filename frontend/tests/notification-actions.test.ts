import { describe, expect, test } from "vitest";

import { getAlertDestination, isSafeNotificationHref } from "../src/lib/notifications/alertActions";
import type { Alert } from "../src/lib/api/types";

const baseAlert: Alert = {
  id: "al-pending",
  level: "info",
  title: "Rendez-vous à confirmer",
  description: "Trois rendez-vous attendent une confirmation.",
  area: "Accueil",
  createdAt: "2026-08-01T10:00:00Z",
};

describe("notification deep links", () => {
  test("uses a safe explicit API action", () => {
    expect(
      getAlertDestination({
        ...baseAlert,
        action: { href: "/appointments", label: "Ouvrir le planning" },
      }),
    ).toEqual({ href: "/appointments", label: "Ouvrir le planning" });
  });

  test("supports patient detail deep links", () => {
    expect(isSafeNotificationHref("/patients/p-demo-001")).toBe(true);
  });

  test("rejects external and protocol-relative destinations", () => {
    expect(isSafeNotificationHref("https://malicious.example")).toBe(false);
    expect(isSafeNotificationHref("//malicious.example")).toBe(false);
  });

  test("falls back to the known action for legacy alerts", () => {
    expect(getAlertDestination(baseAlert)).toEqual({
      href: "/appointments",
      label: "Voir les rendez-vous",
    });
  });

  test("falls back for proactive no-show and overload alerts", () => {
    expect(
      getAlertDestination({
        ...baseAlert,
        id: "al-noshow",
        title: "Risque d'absences",
        action: undefined,
      }),
    ).toEqual({ href: "/prediction", label: "Liste à rappeler" });
    expect(
      getAlertDestination({
        ...baseAlert,
        id: "al-overload",
        title: "Surcharge",
        action: undefined,
      }),
    ).toEqual({ href: "/prediction", label: "Voir les prévisions" });
  });
});
