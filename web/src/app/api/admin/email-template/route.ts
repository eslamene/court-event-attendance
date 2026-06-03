import { NextResponse } from "next/server";
import { auth, canManageEvents } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  EMAIL_TEMPLATE_PLACEHOLDERS,
  ensureDefaultEmailTemplateSeeded,
  getBuiltinDefaultEmailTemplate,
  getDefaultEmailTemplateFromDb,
} from "@/lib/email-template";
import { repairCorruptedTemplateHtml } from "@/lib/email-template-placeholders";
import { apiT } from "@/lib/i18n/api";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canManageEvents(session.user.role)) {
    return NextResponse.json({ error: await apiT("api.forbidden") }, { status: 403 });
  }

  await ensureDefaultEmailTemplateSeeded();
  const template =
    (await getDefaultEmailTemplateFromDb()) ?? getBuiltinDefaultEmailTemplate();

  return NextResponse.json({
    subject: template.subject,
    htmlBody: repairCorruptedTemplateHtml(template.htmlBody),
    source: template.source,
    placeholders: EMAIL_TEMPLATE_PLACEHOLDERS,
  });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user || !canManageEvents(session.user.role)) {
    return NextResponse.json({ error: await apiT("api.forbidden") }, { status: 403 });
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

  await ensureDefaultEmailTemplateSeeded();
  const existing = await prisma.emailTemplate.findFirst({
    where: { eventId: null },
  });

  const data = {
    subject: subject.trim(),
    htmlBody: repairCorruptedTemplateHtml(htmlBody.trim()),
  };
  const saved = existing
    ? await prisma.emailTemplate.update({ where: { id: existing.id }, data })
    : await prisma.emailTemplate.create({ data: { ...data, eventId: null } });

  return NextResponse.json({
    subject: saved.subject,
    htmlBody: saved.htmlBody,
    message: await apiT("api.emailTemplateSaved"),
  });
}
