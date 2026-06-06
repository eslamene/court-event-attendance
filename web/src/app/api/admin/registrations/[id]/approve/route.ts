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
  if (!session?.user || !(await canApprove(session.user.roleId))) {
    return jsonForbidden();
  }

  const { id } = await params;

  let seatTierId: string | undefined;
  try {
    const body = await req.json();
    if (body && typeof body.seatTierId === "string" && body.seatTierId.trim()) {
      seatTierId = body.seatTierId.trim();
    }
  } catch {
    // empty body is fine
  }

  try {
    const { registration, notifications, seatLabel } = await approveRegistration(
      id,
      session.user.id,
      { seatTierId }
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
        seatLabel,
        seatTierId: registration.seatTierId,
        seatNumber: registration.seatNumber,
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
      seatLabel,
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
