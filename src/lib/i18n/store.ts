// Store i18n léger basé sur Zustand. Persiste la langue et applique dir=rtl.
import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DICTIONARIES, LOCALES, type Locale } from "./dictionaries";

interface I18nState {
  locale: Locale;
  hasHydrated: boolean;
  setLocale: (locale: Locale) => void;
  setHasHydrated: (value: boolean) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const interpolate = (str: string, vars?: Record<string, string | number>) => {
  if (!vars) return str;
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replace(new RegExp(`{{\\s*${k}\\s*}}`, "g"), String(v)),
    str,
  );
};

export const useI18n = create<I18nState>()(
  persist(
    (set, get) => ({
      locale: "fr",
      hasHydrated: false,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      setLocale: (locale) => {
        set({ locale });
        if (typeof document !== "undefined") {
          const meta = LOCALES.find((l) => l.code === locale);
          document.documentElement.lang = locale;
          document.documentElement.dir = meta?.dir ?? "ltr";
        }
      },
      t: (key, vars) => {
        const dict = DICTIONARIES[get().locale];
        return interpolate(dict[key] ?? key, vars);
      },
    }),
    {
      name: "sih-ia-locale",
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        if (state && typeof document !== "undefined") {
          const meta = LOCALES.find((l) => l.code === state.locale);
          document.documentElement.lang = state.locale;
          document.documentElement.dir = meta?.dir ?? "ltr";
        }
        state?.setHasHydrated(true);
      },
    },
  ),
);

export const useT = () => useI18n((s) => s.t);

/** Locale persistée chargée (évite texte SSR ≠ client). */
export function useI18nHydrated() {
  const storeHydrated = useI18n((s) => s.hasHydrated);
  const [persistReady, setPersistReady] = useState(false);

  useEffect(() => {
    const persistApi = useI18n.persist;
    if (!persistApi) {
      setPersistReady(true);
      return;
    }
    if (persistApi.hasHydrated()) {
      setPersistReady(true);
      return;
    }
    return persistApi.onFinishHydration(() => setPersistReady(true));
  }, []);

  return persistReady && storeHydrated;
}
