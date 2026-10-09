/**
 * Per-device display preferences.
 *
 * These change what the viewer sees, never what the server does. The one that
 * matters commercially is `showRecommendation`: the best-deal recommendation
 * is an optional, explainable aid, and a buyer who does not want it can turn
 * it off and work from the comparison table alone. Either way nothing is
 * pre-selected and awarding stays a deliberate action.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export interface Prefs {
  showRecommendation: boolean;
}

const DEFAULTS: Prefs = { showRecommendation: true };
const KEY = 'barq.prefs';

interface Ctx {
  prefs: Prefs;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
}

const C = createContext<Ctx | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const native = Platform.OS !== 'web';

  useEffect(() => {
    if (!native) return;
    SecureStore.getItemAsync(KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const saved = JSON.parse(raw) as Partial<Prefs>;
          setPrefs({ ...DEFAULTS, ...saved });
        } catch {
          // a corrupt value is not worth surfacing: fall back to the defaults
        }
      })
      .catch(() => {});
  }, [native]);

  const setPref = useCallback<Ctx['setPref']>((key, value) => {
    setPrefs((cur) => {
      const next = { ...cur, [key]: value };
      if (native) SecureStore.setItemAsync(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [native]);

  const value = useMemo(() => ({ prefs, setPref }), [prefs, setPref]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function usePrefs(): Ctx {
  const v = useContext(C);
  if (!v) throw new Error('usePrefs must be used inside PrefsProvider');
  return v;
}
