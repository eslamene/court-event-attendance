import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18nManager } from "react-native";
import { ar } from "./translations/ar";
import { en } from "./translations/en";
import type { Locale, TranslationParams, TranslationTree } from "./types";

const LOCALE_KEY = "app_locale";

const catalogs: Record<Locale, TranslationTree> = { ar, en };

export function isRtlLocale(locale: Locale): boolean {
  return locale === "ar";
}

export async function getStoredLocale(): Promise<Locale> {
  const stored = await AsyncStorage.getItem(LOCALE_KEY);
  return stored === "en" ? "en" : "ar";
}

export async function setStoredLocale(locale: Locale) {
  await AsyncStorage.setItem(LOCALE_KEY, locale);
}

export function applyLayoutDirection(locale: Locale) {
  const rtl = isRtlLocale(locale);
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
}

function getNestedValue(
  tree: TranslationTree,
  path: string
): string | Record<string, string> | undefined {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, tree) as string | Record<string, string> | undefined;
}

export function translate(
  locale: Locale,
  key: string,
  params?: TranslationParams
): string {
  const value =
    getNestedValue(catalogs[locale], key) ??
    getNestedValue(catalogs.ar, key) ??
    key;

  if (typeof value !== "string") return key;

  if (!params) return value;

  return value.replace(/\{\{(\w+)\}\}/g, (_, token: string) =>
    String(params[token] ?? "")
  );
}

export type { Locale };

export function getDateLocale(locale: Locale): string {
  return locale === "ar" ? "ar-EG" : "en-GB";
}

export { catalogs };
