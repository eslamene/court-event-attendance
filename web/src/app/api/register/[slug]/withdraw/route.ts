import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiT } from "@/lib/i18n/api";
import { isRegistrationOpen } from "@/lib/system-settings";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit-log";
import {
  canWithdrawRegistration,
  findRegistrationForWithdrawal,
  withdrawRegistration,
} from "@/lib/withdraw-registration";

const bodySchema = z.object({
  email: z.string().trim().optional(),
  mobile: z.string().trim().optional(),
  withdrawalNote: z.string().trim().max(2000).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug, isActive: true },
  });

  if (!event) {
    return NextResponse.json(
      { error: await apiT("api.eventNotFound") },
      { status: 404 }
    );
  }

  const registrationGate = await isRegistrationOpen();
  if (!registrationGate.open) {
    return NextResponse.json(
      {
        error:
          registrationGate.message ??
          (await apiT("system.registrationClosed")),
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: await apiT("api.invalidData") },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: await apiT("api.invalidData") },
      { status: 400 }
    );
  }

  const { email, mobile, withdrawalNote } = parsed.data;
  if (!email && !mobile) {
    return NextResponse.json(
      { error: await apiT("api.withdrawIdentityRequired") },
      { status: 400 }
    );
  }

  const registration = await findRegistrationForWithdrawal({
    eventId: event.id,
    email,
    mobile,
  });

  if (!registration) {
    return NextResponse.json(
      { error: await apiT("api.withdrawNotFound") },
      { status: 404 }
    );
  }

  if (!canWithdrawRegistration(registration)) {
    return NextResponse.json(
      { error: await apiT("api.withdrawNotAllowed") },
      { status: 409 }
    );
  }

  await withdrawRegistration(registration.id, withdrawalNote);

  await recordAudit({
    action: AUDIT_ACTIONS.REGISTRATION_WITHDRAW,
    actorType: "PUBLIC",
    entityType: "registration",
    entityId: registration.id,
    entityLabel: registration.fullName,
    metadata: {
      eventId: event.id,
      eventName: event.name,
      hasNote: Boolean(withdrawalNote?.trim()),
    },
    req,
  });

  return NextResponse.json({
    message: await apiT("api.withdrawSuccess"),
  });
}
