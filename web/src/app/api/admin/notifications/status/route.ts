import { NextResponse } from "next/server";
import { auth, canManageSettings } from "@/lib/auth";
import { getNotificationsSummary } from "@/lib/notifications";

export async function GET() {
  const session = await auth();
  if (!session?.user || !(await canManageSettings(session.user.roleId))) {
    return (await import("@/lib/i18n/responses")).jsonForbidden();
  }

  return NextResponse.json(await getNotificationsSummary());
}
