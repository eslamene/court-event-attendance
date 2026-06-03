import { NextResponse } from "next/server";
import { auth, canManageEvents } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  AUDIT_ACTIONS,
  auditActorFromSession,
  recordAudit,
} from "@/lib/audit-log";
import { removeEventLogoFiles, saveEventLogo } from "@/lib/event-logo";
import { apiT } from "@/lib/i18n/api";
import { jsonForbidden } from "@/lib/i18n/responses";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canManageEvents(session.user.role)) {
    return jsonForbidden();
  }

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return NextResponse.json(
      { error: await apiT("api.eventNotFound") },
      { status: 404 }
    );
  }

  const form = await req.formData();
  const file = form.get("logo");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: await apiT("api.noImageSelected") },
      { status: 400 }
    );
  }

  await removeEventLogoFiles(id, event.logoPath);
  const saved = await saveEventLogo(id, file);
  if ("error" in saved) {
    return NextResponse.json({ error: saved.error }, { status: 400 });
  }

  const updated = await prisma.event.update({
    where: { id },
    data: { logoPath: saved.logoPath },
  });

  await recordAudit({
    action: AUDIT_ACTIONS.EVENT_LOGO_UPLOAD,
    actor: auditActorFromSession(session.user),
    entityType: "event",
    entityId: id,
    entityLabel: event.name,
    req,
  });

  return NextResponse.json({ logoPath: updated.logoPath });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canManageEvents(session.user.role)) {
    return jsonForbidden();
  }

  const { id } = await params;
  const existing = await prisma.event.findUnique({ where: { id } });
  if (existing?.logoPath) await removeEventLogoFiles(id, existing.logoPath);
  await prisma.event.update({
    where: { id },
    data: { logoPath: null },
  });

  await recordAudit({
    action: AUDIT_ACTIONS.EVENT_LOGO_REMOVE,
    actor: auditActorFromSession(session.user),
    entityType: "event",
    entityId: id,
    entityLabel: existing?.name,
    req,
  });

  return NextResponse.json({ success: true });
}
