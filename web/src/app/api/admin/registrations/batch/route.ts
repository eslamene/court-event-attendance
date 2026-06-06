import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, canApprove } from "@/lib/auth";
import {
  AUDIT_ACTIONS,
  auditActorFromSession,
  recordAudit,
} from "@/lib/audit-log";
import { approveRegistration, rejectRegistration } from "@/lib/approval";
import { prisma } from "@/lib/db";
import { apiT } from "@/lib/i18n/api";
import { jsonForbidden } from "@/lib/i18n/responses";

const MAX_BATCH = 100;

const bodySchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(MAX_BATCH),
  action: z.enum(["approve", "reject"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !(await canApprove(session.user.roleId))) {
    return jsonForbidden();
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json(
      { error: await apiT("api.invalidData") },
      { status: 400 }
    );
  }

  const actor = auditActorFromSession(session.user);
  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const id of body.ids) {
    try {
      if (body.action === "approve") {
        const pending = await prisma.registration.findUnique({
          where: { id },
          select: { seatTierId: true },
        });
        const { registration, notifications, seatLabel } = await approveRegistration(
          id,
          session.user.id,
          { seatTierId: pending?.seatTierId }
        );
        await recordAudit({
          action: AUDIT_ACTIONS.REGISTRATION_APPROVE,
          actor,
          entityType: "registration",
          entityId: registration.id,
          entityLabel: registration.fullName,
          metadata: {
            eventId: registration.eventId,
            eventName: registration.event.name,
            batch: true,
            seatLabel,
            notifications: notifications.map((n) => ({
              channel: n.channel,
              sent: n.sent,
            })),
          },
          req,
        });
      } else {
        const updated = await rejectRegistration(id);
        await recordAudit({
          action: AUDIT_ACTIONS.REGISTRATION_REJECT,
          actor,
          entityType: "registration",
          entityId: updated.id,
          entityLabel: updated.fullName,
          metadata: {
            eventId: updated.eventId,
            eventName: updated.event.name,
            batch: true,
          },
          req,
        });
      }
      results.push({ id, ok: true });
    } catch (e) {
      results.push({
        id,
        ok: false,
        error: e instanceof Error ? e.message : await apiT("api.operationFailed"),
      });
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.length - succeeded;

  return NextResponse.json({
    succeeded,
    failed,
    results,
    message:
      failed === 0
        ? body.action === "approve"
          ? await apiT("api.batchApproveSuccess", { count: succeeded })
          : await apiT("api.batchRejectSuccess", { count: succeeded })
        : await apiT("api.batchPartial", { ok: succeeded, fail: failed }),
  });
}
