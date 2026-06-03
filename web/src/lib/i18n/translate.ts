import { TRANSLATION_CATALOG } from "./catalog";
import type { Dictionary } from "./types";

function catalogValue(key: string, locale?: string): string | undefined {
  if (locale && TRANSLATION_CATALOG[locale]?.[key]) {
    return TRANSLATION_CATALOG[locale][key];
  }
  return TRANSLATION_CATALOG.ar?.[key] ?? TRANSLATION_CATALOG.en?.[key];
}

function resolveText(
  dict: Dictionary,
  key: string,
  locale?: string
): string {
  const fromDict = dict[key]?.trim();
  if (fromDict && fromDict !== key) return fromDict;
  return catalogValue(key, locale) ?? fromDict ?? key;
}

export function translate(
  dict: Dictionary,
  key: string,
  vars?: Record<string, string | number>,
  locale?: string
): string {
  let text = resolveText(dict, key, locale);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

export function parseJsonStringArray(dict: Dictionary, key: string): string[] {
  const raw = dict[key];
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}
