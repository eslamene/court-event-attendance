import { prisma } from "@/lib/db";
import {
  CATALOG_LOCALES,
  TRANSLATION_CATALOG,
  namespaceFromKey,
} from "./catalog";

export async function seedDictionary() {
  for (const meta of CATALOG_LOCALES) {
    const locale = await prisma.locale.upsert({
      where: { code: meta.code },
      update: {
        name: meta.name,
        direction: meta.direction,
        isDefault: meta.isDefault,
        sortOrder: meta.sortOrder,
        isActive: true,
      },
      create: {
        code: meta.code,
        name: meta.name,
        direction: meta.direction,
        isDefault: meta.isDefault,
        sortOrder: meta.sortOrder,
        isActive: true,
      },
    });

    const catalog = TRANSLATION_CATALOG[meta.code];
    if (!catalog) continue;

    for (const [key, value] of Object.entries(catalog)) {
      await prisma.dictionaryEntry.upsert({
        where: {
          localeId_key: { localeId: locale.id, key },
        },
        update: { value, namespace: namespaceFromKey(key) },
        create: {
          localeId: locale.id,
          key,
          value,
          namespace: namespaceFromKey(key),
        },
      });
    }
  }
}

export async function seedDictionaryForLocale(localeCode: string) {
  const catalog = TRANSLATION_CATALOG[localeCode];
  if (!catalog) return { count: 0 };

  const locale = await prisma.locale.findUnique({
    where: { code: localeCode },
  });
  if (!locale) return { count: 0 };

  let count = 0;
  for (const [key, value] of Object.entries(catalog)) {
    await prisma.dictionaryEntry.upsert({
      where: { localeId_key: { localeId: locale.id, key } },
      update: { value, namespace: namespaceFromKey(key) },
      create: {
        localeId: locale.id,
        key,
        value,
        namespace: namespaceFromKey(key),
      },
    });
    count++;
  }
  return { count };
}
