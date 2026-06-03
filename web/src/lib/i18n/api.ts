import { getDictionary, getDefaultLocaleCode } from "./server";
import { translate } from "./translate";

/** API routes: resolve message in default (or requested) locale. */
export async function apiT(
  key: string,
  vars?: Record<string, string | number>,
  localeCode?: string
) {
  const code = localeCode ?? (await getDefaultLocaleCode());
  const dict = await getDictionary(code);
  return translate(dict, key, vars);
}

export async function apiDict(localeCode?: string) {
  const code = localeCode ?? (await getDefaultLocaleCode());
  return getDictionary(code);
}
