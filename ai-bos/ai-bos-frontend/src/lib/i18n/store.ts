import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dictionaries, type Locale, type DictionaryKey } from './dictionaries';

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: DictionaryKey, params?: Record<string, string | number>) => string;
}

function translate(locale: Locale, key: DictionaryKey, params?: Record<string, string | number>): string {
  const dict = dictionaries[locale] || dictionaries.fr;
  const keys = key.split('.');
  let value: unknown = dict;
  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = (value as Record<string, unknown>)[k];
    } else {
      return key;
    }
  }
  let result = typeof value === 'string' ? value : key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      result = result.split(`{${k}}`).join(String(v));
    }
  }
  return result;
}

export const useI18n = create<I18nState>()(
  persist(
    (set, get) => ({
      locale: (import.meta.env.VITE_DEFAULT_LOCALE as Locale) || 'fr',
      setLocale: (locale) => {
        set({ locale });
        document.documentElement.lang = locale;
        document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
      },
      t: (key, params) => translate(get().locale, key, params),
    }),
    {
      name: 'aibos-i18n',
      partialize: (state) => ({ locale: state.locale }),
    }
  )
);

export function useT() {
  const { t, locale, setLocale } = useI18n();
  return { t, locale, setLocale };
}
