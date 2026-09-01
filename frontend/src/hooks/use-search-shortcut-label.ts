import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function getIsMac(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.platform;
  return /Mac|iPhone|iPad|iPod/i.test(platform);
}

function getSnapshot(): string {
  return getIsMac() ? "⌘ K" : "Ctrl K";
}

function getServerSnapshot(): string {
  return "Ctrl K";
}

/** Raccourci clavier affiché dans la barre de recherche (OS-aware). */
export function useSearchShortcutLabel(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
