import type { Alert } from "@/lib/api/types";

export interface AlertDestination {
  href: string;
  label: string;
}

const SAFE_STATIC_TARGETS = new Set([
  "/",
  "/appointments",
  "/analytics",
  "/prediction",
  "/patients",
  "/notifications",
]);

const FALLBACK_DESTINATIONS: Record<string, AlertDestination> = {
  "al-occupancy": { href: "/analytics", label: "Analyser l'occupation" },
  "al-occupancy-warn": { href: "/analytics", label: "Voir les indicateurs" },
  "al-overload": { href: "/prediction", label: "Voir les prévisions" },
  "al-overload-warn": { href: "/appointments", label: "Ouvrir le planning" },
  "al-noshow": { href: "/prediction", label: "Liste à rappeler" },
  "al-backlog": { href: "/appointments", label: "Confirmer les rendez-vous" },
  "al-pending": { href: "/appointments", label: "Voir les rendez-vous" },
  "al-today-appts": { href: "/appointments", label: "Ouvrir le planning" },
  "al-ok": { href: "/", label: "Voir le tableau de bord" },
};

export function isSafeNotificationHref(href: string): boolean {
  if (SAFE_STATIC_TARGETS.has(href)) return true;
  return /^\/patients\/[A-Za-z0-9_-]+$/.test(href);
}

export function getAlertDestination(alert: Alert): AlertDestination | null {
  const href = alert.action?.href?.trim();
  const label = alert.action?.label?.trim();
  if (href && label && isSafeNotificationHref(href)) {
    return { href, label };
  }
  return FALLBACK_DESTINATIONS[alert.id] ?? null;
}
