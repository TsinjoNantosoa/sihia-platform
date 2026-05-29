import { DICTIONARIES, type Locale } from "./dictionaries";
import { useI18n } from "./store";

const interpolate = (str: string, vars?: Record<string, string | number>) => {
  if (!vars) return str;
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replace(new RegExp(`{{\\s*${k}\\s*}}`, "g"), String(v)),
    str,
  );
};

/** Traduction hors composant React (ex. couche API). */
export function resolveT(key: string, vars?: Record<string, string | number>): string {
  const locale = (useI18n.getState().locale ?? "fr") as Locale;
  const dict = DICTIONARIES[locale] ?? DICTIONARIES.fr;
  return interpolate(dict[key] ?? DICTIONARIES.fr[key] ?? key, vars);
}
