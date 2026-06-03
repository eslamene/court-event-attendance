import { NextResponse } from "next/server";
import { auth, canApprove } from "@/lib/auth";
import {
  AUDIT_ACTIONS,
  auditActorFromSession,
  recordAudit,
} from "@/lib/audit-log";
import { prisma } from "@/lib/db";
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
  const registration = await prisma.registration.findUnique({ where: { id } });

  if (!registration) {
    return NextResponse.json(
      { error: await apiT("api.registrationNotFound") },
      { status: 404 }
    );
  }

  if (registration.status !== "PENDING") {
    return NextResponse.json(
      { error: await apiT("api.cannotReject") },
      { status: 400 }
    );
  }

  const updated = await prisma.registration.update({
    where: { id },
    data: { status: "REJECTED", rejectedAt: new Date() },
    include: { event: true },
  });

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
}
