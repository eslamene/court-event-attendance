import { NextResponse } from "next/server";
import { auth, canManageEvents } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  EMAIL_TEMPLATE_PLACEHOLDERS,
  ensureDefaultEmailTemplateSeeded,
  getBuiltinDefaultEmailTemplate,
  getDefaultEmailTemplateFromDb,
  getEventEmailTemplateFromDb,
} from "@/lib/email-template";
import { apiT } from "@/lib/i18n/api";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user || !canManageEvents(session.user.role)) {
    return NextResponse.json({ error: await apiT("api.forbidden") }, { status: 403 });
  }

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return NextResponse.json(
      { error: await apiT("api.eventNotFound") },
      { status: 404 }
    );
  }

  await ensureDefaultEmailTemplateSeeded();
  const defaultTemplate =
    (await getDefaultEmailTemplateFromDb()) ?? getBuiltinDefaultEmailTemplate();
  const override = await getEventEmailTemplateFromDb(id);

  return NextResponse.json({
    eventId: id,
    eventName: event.name,
    hasOverride: Boolean(override),
    subject: override?.subject ?? defaultTemplate.subject,
    htmlBody: override?.htmlBody ?? defaultTemplate.htmlBody,
    defaultSubject: defaultTemplate.subject,
    defaultHtmlBody: defaultTemplate.htmlBody,
    placeholders: EMAIL_TEMPLATE_PLACEHOLDERS,
  });
}

export async function PUT(req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user || !canManageEvents(session.user.role)) {
    return NextResponse.json({ error: await apiT("api.forbidden") }, { status: 403 });
  }

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return NextResponse.json(
      { error: await apiT("api.eventNotFound") },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: await apiT("api.invalidData") }, { status: 400 });
  }

  const { subject, htmlBody } = body as { subject?: string; htmlBody?: string };
  if (!subject?.trim() || !htmlBody?.trim()) {
    return NextResponse.json({ error: await apiT("api.invalidData") }, { status: 400 });
  }

  const data = { subject: subject.trim(), htmlBody: htmlBody.trim() };
  const saved = await prisma.emailTemplate.upsert({
    where: { eventId: id },
    create: { eventId: id, ...data },
    update: data,
  });

  return NextResponse.json({
    hasOverride: true,
    subject: saved.subject,
    htmlBody: saved.htmlBody,
    message: await apiT("api.emailTemplateSaved"),
  });
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user || !canManageEvents(session.user.role)) {
    return NextResponse.json({ error: await apiT("api.forbidden") }, { status: 403 });
  }

  const { id } = await params;
  await prisma.emailTemplate.deleteMany({ where: { eventId: id } });

  return NextResponse.json({
    hasOverride: false,
    message: await apiT("api.emailTemplateCleared"),
  });
}
