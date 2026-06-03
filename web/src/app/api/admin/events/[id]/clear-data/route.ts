import { NextResponse } from "next/server";
import { auth, canManageEvents } from "@/lib/auth";
import {
  AUDIT_ACTIONS,
  auditActorFromSession,
  recordAudit,
} from "@/lib/audit-log";
import { verifyAdminPassword } from "@/lib/admin-password";
import { prisma } from "@/lib/db";
import { apiDict, apiT } from "@/lib/i18n/api";
import { createClearEventDataSchema } from "@/lib/i18n/schemas";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canManageEvents(session.user.role)) {
    return NextResponse.json({ error: await apiT("api.forbidden") }, { status: 403 });
  }

  const { id } = await params;
  const dict = await apiDict();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: await apiT("api.invalidData") }, { status: 400 });
  }

  const parsed = createClearEventDataSchema(dict).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? (await apiT("api.invalidData")),
      },
      { status: 400 }
    );
  }

  const authCheck = await verifyAdminPassword(
    session.user.id,
    parsed.data.adminPassword
  );
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: 403 });
  }

  const event = await prisma.event.findUnique({
    where: { id },
    include: { _count: { select: { registrations: true } } },
  });
  if (!event) {
    return NextResponse.json(
      { error: await apiT("api.eventNotFound") },
      { status: 404 }
    );
  }

  const [scanResult, regResult] = await prisma.$transaction([
    prisma.scanLog.deleteMany({ where: { eventId: id } }),
    prisma.registration.deleteMany({ where: { eventId: id } }),
  ]);

  await recordAudit({
    action: AUDIT_ACTIONS.EVENT_CLEAR_DATA,
    actor: auditActorFromSession(session.user),
    entityType: "event",
    entityId: id,
    entityLabel: event.name,
    metadata: {
      deletedRegistrations: regResult.count,
      deletedScanLogs: scanResult.count,
    },
    req,
  });

  return NextResponse.json({
    success: true,
    deletedRegistrations: regResult.count,
    deletedScanLogs: scanResult.count,
    message: await apiT("api.clearDataSuccess", {
      registrations: regResult.count,
      scans: scanResult.count,
    }),
  });
}
