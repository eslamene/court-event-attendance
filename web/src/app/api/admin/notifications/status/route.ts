import { NextResponse } from "next/server";
import { auth, canManageEvents } from "@/lib/auth";
import { getNotificationsSummary } from "@/lib/notifications";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canManageEvents(session.user.role)) {
    return (await import("@/lib/i18n/responses")).jsonForbidden();
  }

  return NextResponse.json(await getNotificationsSummary());
}
