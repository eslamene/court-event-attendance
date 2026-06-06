import { NextResponse } from "next/server";
import { auth, canApprove } from "@/lib/auth";
import {
  AUDIT_ACTIONS,
  auditActorFromSession,
  recordAudit,
} from "@/lib/audit-log";
import { rejectRegistration } from "@/lib/approval";
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

  try {
    const updated = await rejectRegistration(id);

    await recordAudit({
      action: AUDIT_ACTIONS.REGISTRATION_REJECT,
      actor: auditActorFromSession(session.user),
      entityType: "registration",
      entityId: updated.id,
      entityLabel: updated.fullName,
      metadata: { eventId: updated.eventId, eventName: updated.event.name },
      req,
    });

    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : await apiT("api.operationFailed");
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
