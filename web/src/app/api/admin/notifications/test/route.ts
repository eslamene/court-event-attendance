import { NextResponse } from "next/server";
import { auth, canManageEvents } from "@/lib/auth";
import { notificationTestSchema } from "@/lib/validators";
import { sendTestEmail, sendTestSms } from "@/lib/notifications";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canManageEvents(session.user.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const parsed = notificationTestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }

  const result =
    parsed.data.channel === "email"
      ? await sendTestEmail(parsed.data.to)
      : await sendTestSms(parsed.data.to);

  return NextResponse.json(result, { status: result.sent ? 200 : 400 });
}
