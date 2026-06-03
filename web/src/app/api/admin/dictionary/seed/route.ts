import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { apiT } from "@/lib/i18n/api";
import { seedDictionary, seedDictionaryForLocale } from "@/lib/i18n/seed";

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: await apiT("api.forbidden") }, { status: 403 });
  }

  let localeCode: string | undefined;
  try {
    const body = await req.json();
    localeCode = body.localeCode;
  } catch {
    /* seed all */
  }

  if (localeCode) {
    const result = await seedDictionaryForLocale(localeCode);
    revalidateTag("dictionary", "max");
    return NextResponse.json(result);
  }

  await seedDictionary();
  revalidateTag("dictionary", "max");
  return NextResponse.json({ ok: true });
}
