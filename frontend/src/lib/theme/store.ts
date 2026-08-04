import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "sih-ia-theme";

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === "system") return systemPrefersDark() ? "dark" : "light";
  return mode;
}

export function applyThemeToDocument(mode: ThemeMode): ResolvedTheme {
  const resolved = resolveTheme(mode);
  if (typeof document === "undefined") return resolved;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  root.dataset.theme = resolved;
  return resolved;
}

interface ThemeState {
  mode: ThemeMode;
  hasHydrated: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleLightDark: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: "system",
      hasHydrated: false,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      setMode: (mode) => {
        set({ mode });
        applyThemeToDocument(mode);
      },
      toggleLightDark: () => {
        const current = resolveTheme(get().mode);
        const next: ThemeMode = current === "dark" ? "light" : "dark";
        get().setMode(next);
      },
    }),
    {
      name: STORAGE_KEY,
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyThemeToDocument(state.mode);
          state.setHasHydrated(true);
        }
      },
    },
  ),
);

export function useResolvedTheme(): ResolvedTheme {
  const mode = useTheme((s) => s.mode);
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(mode));

  useEffect(() => {
    setResolved(resolveTheme(mode));
    applyThemeToDocument(mode);

    if (mode !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      setResolved(resolveTheme("system"));
      applyThemeToDocument("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  return resolved;
}

/** Script anti-FOUC à injecter dans <head> avant le paint. */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var k=${JSON.stringify(STORAGE_KEY)};var raw=localStorage.getItem(k);var mode='system';if(raw){var p=JSON.parse(raw);if(p&&p.state&&(p.state.mode==='light'||p.state.mode==='dark'||p.state.mode==='system'))mode=p.state.mode;}var dark=mode==='dark'||(mode==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',dark);r.style.colorScheme=dark?'dark':'light';r.dataset.theme=dark?'dark':'light';}catch(e){}})();`;
