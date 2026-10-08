import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { STRINGS, type Lang, type StringKey } from './strings';
import type { Localized } from '../data/mock';

export interface I18n {
  lang: Lang;
  isRTL: boolean;
  setLang: (l: Lang) => void;
  t: (key: StringKey, params?: Record<string, string | number>) => string;
  /** Pick the current language from a bilingual record (falls back to English). */
  L: (v: Localized) => string;
  /** Correct day word for a count (Arabic has singular, dual, 3–10 and 11+ forms). */
  dayWord: (n: number) => string;
  /** Locale for Intl formatting; Arabic text with Latin digits, matching the design. */
  locale: string;
}

const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  // Arabic-first product: Arabic is the default regardless of device language.
  const [lang, setLang] = useState<Lang>('ar');

  const t = useCallback<I18n['t']>(
    (key, params) => {
      let v = STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
      if (params) for (const k of Object.keys(params)) v = v.split(`{${k}}`).join(String(params[k]));
      return v;
    },
    [lang],
  );

  const value = useMemo<I18n>(
    () => ({
      lang,
      isRTL: lang === 'ar',
      setLang,
      t,
      L: (v) => v[lang] || v.en,
      dayWord: (n) => (n === 1 ? t('d_1') : n === 2 ? t('d_2') : n <= 10 ? t('d_few') : t('d_many')),
      locale: lang === 'ar' ? 'ar-OM-u-nu-latn' : 'en-GB',
    }),
    [lang, t],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n must be used inside I18nProvider');
  return v;
}
