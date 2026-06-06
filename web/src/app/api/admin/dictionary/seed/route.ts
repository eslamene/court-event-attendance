import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth, canManageDictionary } from "@/lib/auth";
import { apiT } from "@/lib/i18n/api";
import {
  AUDIT_ACTIONS,
  auditActorFromSession,
  recordAudit,
} from "@/lib/audit-log";
import { seedDictionary, seedDictionaryForLocale } from "@/lib/i18n/seed";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !(await canManageDictionary(session.user.roleId))) {
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
    await recordAudit({
      action: AUDIT_ACTIONS.DICTIONARY_SEED,
      actor: auditActorFromSession(session.user),
      entityType: "dictionary",
      entityLabel: localeCode,
      metadata: { count: result.count },
      req,
    });
    return NextResponse.json(result);
  }

  await seedDictionary();
  revalidateTag("dictionary", "max");
  await recordAudit({
    action: AUDIT_ACTIONS.DICTIONARY_SEED,
    actor: auditActorFromSession(session.user),
    entityType: "dictionary",
    entityLabel: "all",
    req,
  });
  return NextResponse.json({ ok: true });
}
