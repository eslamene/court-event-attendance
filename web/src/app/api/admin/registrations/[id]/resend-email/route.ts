import { NextResponse } from "next/server";
import { auth, canApprove } from "@/lib/auth";
import {
  AUDIT_ACTIONS,
  auditActorFromSession,
  recordAudit,
} from "@/lib/audit-log";
import { resendQrEmail } from "@/lib/approval";
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

  try {
    const { email } = await resendQrEmail(id);
    if (!email.sent) {
      const err = email.error ?? (await apiT("api.resendEmailFailed"));
      const isValidation =
        err.toLowerCase().includes("recipient email") ||
        err.toLowerCase().includes("not valid");
      return NextResponse.json(
        {
          sent: false,
          error: err,
          skipped: email.skipped ?? false,
        },
        { status: isValidation ? 400 : email.skipped ? 503 : 502 }
      );
    }
    const reg = await prisma.registration.findUnique({
      where: { id },
      include: { event: true },
    });
    await recordAudit({
      action: AUDIT_ACTIONS.REGISTRATION_RESEND_EMAIL,
      actor: auditActorFromSession(session.user),
      entityType: "registration",
      entityId: id,
      entityLabel: reg?.fullName,
      metadata: {
        eventName: reg?.event.name,
        provider: email.provider,
      },
      req,
    });
    return NextResponse.json({
      sent: true,
      message: await apiT("api.resendEmailSuccess"),
      provider: email.provider,
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : await apiT("api.operationFailed");
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
