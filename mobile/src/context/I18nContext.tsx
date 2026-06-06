import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Alert } from "react-native";
import {
  applyLayoutDirection,
  getDateLocale,
  getStoredLocale,
  isRtlLocale,
  setStoredLocale,
  translate,
} from "../i18n";
import type { Locale, TranslationParams } from "../i18n/types";

type I18nContextValue = {
  locale: Locale;
  isRTL: boolean;
  textAlign: "left" | "right";
  rowDirection: "row" | "row-reverse";
  t: (key: string, params?: TranslationParams) => string;
  setLocale: (locale: Locale) => Promise<void>;
  dateLocale: string;
  ready: boolean;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ar");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      const stored = await getStoredLocale();
      applyLayoutDirection(stored);
      setLocaleState(stored);
      setReady(true);
    }
    void init();
  }, []);

  const setLocale = useCallback(
    async (next: Locale) => {
      if (next === locale) return;

      const wasRtl = isRtlLocale(locale);
      const nextRtl = isRtlLocale(next);

      await setStoredLocale(next);
      setLocaleState(next);

      if (wasRtl !== nextRtl) {
        applyLayoutDirection(next);
        Alert.alert(
          translate(next, "settings.language"),
          translate(next, "settings.languageRestartHint")
        );
      }
    },
    [locale]
  );

  const value = useMemo<I18nContextValue>(() => {
    const isRTL = isRtlLocale(locale);
    return {
      locale,
      isRTL,
      textAlign: isRTL ? "right" : "left",
      rowDirection: isRTL ? "row-reverse" : "row",
      t: (key, params) => translate(locale, key, params),
      setLocale,
      dateLocale: getDateLocale(locale),
      ready,
    };
  }, [locale, ready, setLocale]);

  if (!ready) return null;

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
