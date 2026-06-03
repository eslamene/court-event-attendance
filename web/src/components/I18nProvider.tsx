"use client";

import { createContext, useContext, useMemo } from "react";
import { translate } from "@/lib/i18n/translate";
import type { Dictionary, I18nContextValue, LocaleInfo } from "@/lib/i18n/types";

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  direction,
  dict,
  locales,
  children,
}: {
  locale: string;
  direction: "rtl" | "ltr";
  dict: Dictionary;
  locales?: LocaleInfo[];
  children: React.ReactNode;
}) {
  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      direction,
      dict,
      t: (key, vars) => translate(dict, key, vars),
    }),
    [locale, direction, dict]
  );

  return (
    <I18nContext.Provider value={value}>
      <LocalesContext.Provider value={locales ?? []}>
        {children}
      </LocalesContext.Provider>
    </I18nContext.Provider>
  );
}

const LocalesContext = createContext<LocaleInfo[]>([]);

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}

export function useLocales() {
  return useContext(LocalesContext);
}
