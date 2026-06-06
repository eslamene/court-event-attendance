import { NextResponse } from "next/server";
import { auth, canManageSeating } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiT } from "@/lib/i18n/api";
import {
  AUDIT_ACTIONS,
  auditActorFromSession,
  recordAudit,
} from "@/lib/audit-log";
import {
  getTierAvailability,
  saveEventSeating,
  type SeatTierInput,
} from "@/lib/seating";
import {
  normalizeLayoutType,
  parseLayoutConfig,
  type SeatingLayoutConfig,
  type SeatingLayoutType,
} from "@/lib/seating-layout";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: await apiT("api.unauthorized") }, { status: 401 });
    }

    const { id } = await params;
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        seatingEnabled: true,
        seatingLayoutType: true,
        seatingLayoutJson: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: await apiT("api.eventNotFound") },
        { status: 404 }
      );
    }

    const tiers = await getTierAvailability(id);

    return NextResponse.json({
      eventId: event.id,
      eventName: event.name,
      seatingEnabled: event.seatingEnabled,
      layoutType: normalizeLayoutType(event.seatingLayoutType),
      layoutConfig: parseLayoutConfig(event.seatingLayoutJson),
      tiers,
    });
  } catch (e) {
    console.error("[seating GET]", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : await apiT("api.operationFailed"),
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !(await canManageSeating(session.user.roleId))) {
    return NextResponse.json({ error: await apiT("api.forbidden") }, { status: 403 });
  }

  const { id } = await params;
  let body: {
    seatingEnabled?: boolean;
    tiers?: SeatTierInput[];
    layoutType?: SeatingLayoutType;
    layoutConfig?: SeatingLayoutConfig;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: await apiT("api.invalidData") }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return NextResponse.json(
      { error: await apiT("api.eventNotFound") },
      { status: 404 }
    );
  }

  try {
    await saveEventSeating(
      id,
      Boolean(body.seatingEnabled),
      body.tiers ?? [],
      {
        type: body.layoutType,
        config: body.layoutConfig,
      }
    );
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : await apiT("api.operationFailed"),
      },
      { status: 400 }
    );
  }

  const tiers = await getTierAvailability(id);
  const updated = await prisma.event.findUnique({
    where: { id },
    select: {
      seatingEnabled: true,
      name: true,
      seatingLayoutType: true,
      seatingLayoutJson: true,
    },
  });

  await recordAudit({
    action: AUDIT_ACTIONS.EVENT_UPDATE,
    actor: auditActorFromSession(session.user),
    entityType: "event",
    entityId: id,
    entityLabel: event.name,
    metadata: { seatingEnabled: updated?.seatingEnabled, tierCount: tiers.length },
    req,
  });

  return NextResponse.json({
    seatingEnabled: updated?.seatingEnabled ?? false,
    layoutType: normalizeLayoutType(updated?.seatingLayoutType),
    layoutConfig: parseLayoutConfig(updated?.seatingLayoutJson),
    tiers,
    message: await apiT("seating.saved"),
  });
}
