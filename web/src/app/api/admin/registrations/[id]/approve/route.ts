import { NextResponse } from "next/server";
import { auth, canApprove } from "@/lib/auth";
import {
  AUDIT_ACTIONS,
  auditActorFromSession,
  recordAudit,
} from "@/lib/audit-log";
import { approveRegistration } from "@/lib/approval";
import { apiT } from "@/lib/i18n/api";
import { jsonForbidden } from "@/lib/i18n/responses";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canApprove(session.user.role)) {
    return jsonForbidden();
  }

  const { id } = await params;

  try {
    const { registration, notifications } = await approveRegistration(
      id,
      session.user.id
    );
    await recordAudit({
      action: AUDIT_ACTIONS.REGISTRATION_APPROVE,
      actor: auditActorFromSession(session.user),
      entityType: "registration",
      entityId: registration.id,
      entityLabel: registration.fullName,
      metadata: {
        eventId: registration.eventId,
        eventName: registration.event.name,
        notifications: notifications.map((n) => ({
          channel: n.channel,
          sent: n.sent,
        })),
      },
      req,
    });
    return NextResponse.json({
      id: registration.id,
      status: registration.status,
      message: await apiT("api.approveSuccess"),
      notifications: {
        email: notifications.find((n) => n.channel === "email")?.sent ?? false,
        whatsapp:
          notifications.find((n) => n.channel === "whatsapp")?.sent ?? false,
        sms: notifications.find((n) => n.channel === "sms")?.sent ?? false,
        details: notifications,
      },
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : await apiT("api.operationFailed");
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
