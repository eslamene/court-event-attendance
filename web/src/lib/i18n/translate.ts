import type { Dictionary } from "./types";

export function translate(
  dict: Dictionary,
  key: string,
  vars?: Record<string, string | number>
): string {
  let text = dict[key] ?? key;
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
