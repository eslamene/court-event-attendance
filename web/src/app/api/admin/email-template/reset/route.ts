import { NextResponse } from "next/server";
import { auth, canManageSettings } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBuiltinDefaultEmailTemplate } from "@/lib/email-template";
import { apiT } from "@/lib/i18n/api";

export async function POST() {
  const session = await auth();
  if (!session?.user || !(await canManageSettings(session.user.roleId))) {
    return NextResponse.json({ error: await apiT("api.forbidden") }, { status: 403 });
  }

  const builtin = getBuiltinDefaultEmailTemplate();
  const existing = await prisma.emailTemplate.findFirst({
    where: { eventId: null },
  });

  const saved = existing
    ? await prisma.emailTemplate.update({
        where: { id: existing.id },
        data: {
          subject: builtin.subject,
          htmlBody: builtin.htmlBody,
        },
      })
    : await prisma.emailTemplate.create({
        data: {
          eventId: null,
          subject: builtin.subject,
          htmlBody: builtin.htmlBody,
        },
      });

  return NextResponse.json({
    subject: saved.subject,
    htmlBody: saved.htmlBody,
    message: await apiT("api.emailTemplateReset"),
  });
}
