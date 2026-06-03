import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiDict, apiT } from "@/lib/i18n/api";
import {
  createRegistrationSchemaFromConfig,
  getEnabledFields,
  mapRegistrationSubmitBody,
  resolveRegistrationFormConfigForEvent,
} from "@/lib/registration-form-config";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit-log";
import { isRegistrationOpen } from "@/lib/system-settings";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const dict = await apiDict();
  const event = await prisma.event.findUnique({
    where: { slug, isActive: true },
    include: { seatTiers: { orderBy: { sortOrder: "asc" } } },
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

  const formConfig = await resolveRegistrationFormConfigForEvent(event.id);
  const parsed = createRegistrationSchemaFromConfig(formConfig, dict).safeParse(
    body
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? (await apiT("api.invalidData")),
      },
      { status: 400 }
    );
  }

  const { data, customData } = mapRegistrationSubmitBody(
    formConfig,
    parsed.data as Record<string, unknown>
  );

  let seatTierId: string | undefined;
  if (event.seatingEnabled) {
    const rawTier = (body as Record<string, unknown>).seatTierId;
    if (typeof rawTier !== "string" || !rawTier.trim()) {
      if (event.seatTiers.length === 1) {
        seatTierId = event.seatTiers[0].id;
      } else if (event.seatTiers.length > 1) {
        return NextResponse.json(
          { error: await apiT("seating.tierRequired") },
          { status: 400 }
        );
      }
    } else {
      const tier = event.seatTiers.find((t) => t.id === rawTier.trim());
      if (!tier) {
        return NextResponse.json(
          { error: await apiT("seating.tierNotFound") },
          { status: 400 }
        );
      }
      seatTierId = tier.id;
    }
  }

  const enabledKeys = new Set(
    getEnabledFields(formConfig).map((f) => f.key)
  );
  const duplicateOr: { email?: string; mobile?: string }[] = [];
  if (enabledKeys.has("email") && data.email) {
    duplicateOr.push({ email: data.email });
  }
  if (enabledKeys.has("mobile") && data.mobile) {
    duplicateOr.push({ mobile: data.mobile });
  }

  if (duplicateOr.length > 0) {
    const duplicate = await prisma.registration.findFirst({
      where: {
        eventId: event.id,
        status: { not: "WITHDRAWN" },
        OR: duplicateOr,
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: await apiT("api.duplicateRegistration") },
        { status: 409 }
      );
    }
  }

  const registration = await prisma.registration.create({
    data: {
      eventId: event.id,
      fullName: data.fullName,
      rank: data.rank,
      entity: data.entity,
      email: data.email,
      mobile: data.mobile,
      notes: data.notes,
      customData,
      status: "PENDING",
      ...(seatTierId ? { seatTierId } : {}),
    },
  });

  await recordAudit({
    action: AUDIT_ACTIONS.REGISTRATION_CREATE,
    actorType: "PUBLIC",
    entityType: "registration",
    entityId: registration.id,
    entityLabel: registration.fullName,
    metadata: {
      eventId: event.id,
      eventName: event.name,
      email: registration.email,
    },
    req,
  });

  return NextResponse.json({
    id: registration.id,
    message: await apiT("api.registrationSuccess"),
  });
}
