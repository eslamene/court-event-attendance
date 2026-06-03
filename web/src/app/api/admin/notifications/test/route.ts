import { NextResponse } from "next/server";
import { auth, canManageEvents } from "@/lib/auth";
import { apiDict } from "@/lib/i18n/api";
import { createNotificationTestSchema } from "@/lib/i18n/schemas";
import {
  sendTestEmail,
  sendTestSms,
  sendTestWhatsApp,
} from "@/lib/notifications";
import { jsonForbidden, jsonInvalidData } from "@/lib/i18n/responses";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canManageEvents(session.user.role)) {
    return jsonForbidden();
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonInvalidData();
  }

  const dict = await apiDict();
  const parsed = createNotificationTestSchema(dict).safeParse(body);
  if (!parsed.success) {
    return jsonInvalidData(parsed.error.issues[0]?.message);
  }

  const result =
    parsed.data.channel === "email"
      ? await sendTestEmail(parsed.data.to.trim())
      : parsed.data.channel === "whatsapp"
        ? await sendTestWhatsApp(parsed.data.to.trim())
        : await sendTestSms(parsed.data.to.trim());

  return NextResponse.json(result, {
    status: result.sent ? 200 : 400,
  });
}
