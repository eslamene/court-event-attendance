import { NextResponse } from "next/server";
import { auth, canManageEvents } from "@/lib/auth";
import { notificationTestSchema } from "@/lib/i18n/schemas";
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

  const parsed = notificationTestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonInvalidData(parsed.error.issues[0]?.message);
  }

  const result =
    parsed.data.channel === "email"
      ? await sendTestEmail(parsed.data.to)
      : parsed.data.channel === "whatsapp"
        ? await sendTestWhatsApp(parsed.data.to)
        : await sendTestSms(parsed.data.to);

  return NextResponse.json(result, { status: result.sent ? 200 : 400 });
}
