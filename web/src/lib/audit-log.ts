import type { AuditActorType } from "@/generated/prisma/client";
import { prisma } from "./db";

export const AUDIT_ACTIONS = {
  AUTH_SIGN_IN: "auth.sign_in",
  REGISTRATION_CREATE: "registration.create",
  REGISTRATION_WITHDRAW: "registration.withdraw",
  REGISTRATION_APPROVE: "registration.approve",
  REGISTRATION_REJECT: "registration.reject",
  REGISTRATION_RESEND_EMAIL: "registration.resend_email",
  EVENT_CREATE: "event.create",
  EVENT_UPDATE: "event.update",
  EVENT_DELETE: "event.delete",
  EVENT_CLEAR_DATA: "event.clear_data",
  EVENT_LOGO_UPLOAD: "event.logo_upload",
  EVENT_LOGO_REMOVE: "event.logo_remove",
  USER_CREATE: "user.create",
  USER_UPDATE: "user.update",
  SETTINGS_UPDATE: "settings.update",
  EMAIL_TEMPLATE_UPDATE: "email_template.update",
  EMAIL_TEMPLATE_RESET: "email_template.reset",
  REGISTRATION_FORM_UPDATE: "registration_form.update",
  DICTIONARY_UPDATE: "dictionary.update",
  DICTIONARY_SEED: "dictionary.seed",
  SCAN_SUCCESS: "scan.success",
  SCAN_INVALID: "scan.invalid",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export type AuditActor = {
  id: string;
  name: string;
  email: string;
};

export type RecordAuditInput = {
  action: AuditAction | string;
  actor?: AuditActor | null;
  actorType?: AuditActorType;
  entityType?: string;
  entityId?: string;
  entityLabel?: string;
  metadata?: Record<string, unknown>;
  req?: Request;
};

export function auditActorFromSession(user?: {
  id: string;
  name?: string | null;
  email?: string | null;
} | null): AuditActor | null {
  if (!user?.id) return null;
  return {
    id: user.id,
    name: user.name ?? "",
    email: user.email ?? "",
  };
}

export function auditContextFromRequest(req?: Request): {
  ipAddress?: string;
  userAgent?: string;
} {
  if (!req) return {};
  const forwarded = req.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined;
  return {
    ipAddress: ip,
    userAgent: req.headers.get("user-agent") ?? undefined,
  };
}

/** Non-blocking audit write — failures are logged, never thrown to callers. */
export async function recordAudit(input: RecordAuditInput): Promise<void> {
  try {
    const { ipAddress, userAgent } = auditContextFromRequest(input.req);
    const actorType = input.actorType ?? (input.actor ? "USER" : "SYSTEM");

    await prisma.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        entityLabel: input.entityLabel,
        actorType,
        actorUserId: input.actor?.id,
        actorName: input.actor?.name,
        actorEmail: input.actor?.email,
        metadata: input.metadata ? (input.metadata as object) : undefined,
        ipAddress,
        userAgent,
      },
    });
  } catch (err) {
    console.error("[audit]", input.action, err);
  }
}
