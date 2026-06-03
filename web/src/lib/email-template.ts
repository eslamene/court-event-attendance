import { prisma } from "./db";
import {
  type EmailTemplateRecord,
  getBuiltinDefaultEmailTemplate,
} from "./email-template-render";

export {
  EMAIL_TEMPLATE_PLACEHOLDERS,
  type EmailTemplateRecord,
  type RenderEmailTemplateInput,
  buildEmailTemplateVars,
  getBuiltinDefaultEmailTemplate,
  getSampleEmailPreviewInput,
  renderEmailTemplate,
} from "./email-template-render";

export async function getDefaultEmailTemplateFromDb(): Promise<EmailTemplateRecord | null> {
  const row = await prisma.emailTemplate.findFirst({
    where: { eventId: null },
  });
  if (!row) return null;
  return {
    subject: row.subject,
    htmlBody: row.htmlBody,
    source: "default",
  };
}

export async function getEventEmailTemplateFromDb(
  eventId: string
): Promise<EmailTemplateRecord | null> {
  const row = await prisma.emailTemplate.findUnique({
    where: { eventId },
  });
  if (!row) return null;
  return {
    subject: row.subject,
    htmlBody: row.htmlBody,
    source: "event",
  };
}

export async function resolveEmailTemplateForEvent(
  eventId?: string | null
): Promise<EmailTemplateRecord> {
  if (eventId) {
    const eventTpl = await getEventEmailTemplateFromDb(eventId);
    if (eventTpl) return eventTpl;
  }
  const defaultTpl = await getDefaultEmailTemplateFromDb();
  if (defaultTpl) return defaultTpl;
  return getBuiltinDefaultEmailTemplate();
}

export async function ensureDefaultEmailTemplateSeeded(): Promise<void> {
  const existing = await prisma.emailTemplate.findFirst({
    where: { eventId: null },
  });
  if (existing) return;

  const builtin = getBuiltinDefaultEmailTemplate();
  await prisma.emailTemplate.create({
    data: {
      eventId: null,
      subject: builtin.subject,
      htmlBody: builtin.htmlBody,
    },
  });
}
