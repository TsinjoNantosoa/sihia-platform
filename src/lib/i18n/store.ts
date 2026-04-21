// Store i18n léger basé sur Zustand. Persiste la langue et applique dir=rtl.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DICTIONARIES, LOCALES, type Locale } from "./dictionaries";

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
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
      onRehydrateStorage: () => (state) => {
        if (state && typeof document !== "undefined") {
          const meta = LOCALES.find((l) => l.code === state.locale);
          document.documentElement.lang = state.locale;
          document.documentElement.dir = meta?.dir ?? "ltr";
        }
      },
    },
  ),
);

export const useT = () => useI18n((s) => s.t);
