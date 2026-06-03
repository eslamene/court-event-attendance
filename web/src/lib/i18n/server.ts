import { cookies } from "next/headers";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { TRANSLATION_CATALOG } from "./catalog";
import { LOCALE_COOKIE } from "./constants";
import { translate } from "./translate";
import type { Dictionary, LocaleInfo } from "./types";

export { LOCALE_COOKIE } from "./constants";

async function loadDictionaryFromDb(localeCode: string): Promise<Dictionary> {
  const locale = await prisma.locale.findFirst({
    where: { code: localeCode, isActive: true },
    include: { entries: true },
  });

  const fallback = TRANSLATION_CATALOG[localeCode] ?? TRANSLATION_CATALOG.ar ?? {};
  const dict: Dictionary = { ...fallback };

  if (locale) {
    for (const entry of locale.entries) {
      dict[entry.key] = entry.value;
    }
  }

  return dict;
}

const cachedLoad = unstable_cache(
  async (localeCode: string) => loadDictionaryFromDb(localeCode),
  ["dictionary"],
  { tags: ["dictionary"], revalidate: 30 }
);

export async function getActiveLocales(): Promise<LocaleInfo[]> {
  const rows = await prisma.locale.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  if (rows.length > 0) {
    return rows.map((l) => ({
      id: l.id,
      code: l.code,
      name: l.name,
      direction: l.direction as "rtl" | "ltr",
      isDefault: l.isDefault,
    }));
  }
  return [{ id: "ar", code: "ar", name: "العربية", direction: "rtl", isDefault: true }];
}

export async function getDefaultLocaleCode(): Promise<string> {
  const def = await prisma.locale.findFirst({
    where: { isDefault: true, isActive: true },
  });
  return def?.code ?? "ar";
}

export async function getLocale(): Promise<string> {
  const cookieStore = await cookies();
  const requested = cookieStore.get(LOCALE_COOKIE)?.value;
  if (requested) {
    const exists = await prisma.locale.findFirst({
      where: { code: requested, isActive: true },
    });
    if (exists) return exists.code;
  }
  return getDefaultLocaleCode();
}

export async function getLocaleMeta(code: string) {
  const locale = await prisma.locale.findFirst({
    where: { code, isActive: true },
  });
  if (locale) {
    return {
      code: locale.code,
      direction: locale.direction as "rtl" | "ltr",
      name: locale.name,
    };
  }
  return { code: "ar", direction: "rtl" as const, name: "العربية" };
}

export async function getDictionary(localeCode?: string): Promise<Dictionary> {
  const code = localeCode ?? (await getLocale());
  return cachedLoad(code);
}

export async function getServerT(localeCode?: string) {
  const locale = localeCode ?? (await getLocale());
  const dict = await getDictionary(locale);
  return {
    locale,
    dict,
    t: (key: string, vars?: Record<string, string | number>) =>
      translate(dict, key, vars),
  };
}

export function invalidateDictionaryCache() {
  // revalidateTag is called from API routes
}
