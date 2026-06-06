import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatSeatLabel } from "@/lib/seating";
import { getStaffTokenFromRequest, verifyStaffToken } from "@/lib/staff-auth";
import { apiT } from "@/lib/i18n/api";
import { jsonUnauthorized } from "@/lib/i18n/responses";

type Params = { params: Promise<{ eventId: string }> };

export async function GET(req: Request, { params }: Params) {
  const token = getStaffTokenFromRequest(req);
  if (!token) return jsonUnauthorized();

  const staff = await verifyStaffToken(token);
  if (!staff) {
    return NextResponse.json(
      { error: await apiT("api.invalidSession") },
      { status: 401 }
    );
  }

  const { eventId } = await params;
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") === "mine" ? "mine" : "all";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);

  const event = await prisma.event.findFirst({
    where: { id: eventId, isActive: true },
    select: { id: true, name: true },
  });

  if (!event) {
    return NextResponse.json(
      { error: await apiT("api.eventNotFound") },
      { status: 404 }
    );
  }

  const logs = await prisma.scanLog.findMany({
    where: {
      eventId,
      ...(scope === "mine" ? { scannedById: staff.userId } : {}),
    },
    orderBy: { scannedAt: "desc" },
    take: limit,
    include: {
      scannedBy: { select: { id: true, name: true, email: true } },
      registration: {
        select: {
          fullName: true,
          rank: true,
          entity: true,
          seatNumber: true,
          seatTier: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json({
    event: { id: event.id, name: event.name },
    scope,
    scans: logs.map((log) => ({
      id: log.id,
      result: log.result,
      judgeName: log.judgeName,
      qrToken: log.qrToken,
      scannedAt: log.scannedAt.toISOString(),
      scannedBy: {
        id: log.scannedBy.id,
        name: log.scannedBy.name,
        email: log.scannedBy.email,
      },
      registration: log.registration
        ? {
            fullName: log.registration.fullName,
            rank: log.registration.rank,
            entity: log.registration.entity,
            seatLabel:
              log.registration.seatTier && log.registration.seatNumber != null
                ? formatSeatLabel(
                    log.registration.seatTier.name,
                    log.registration.seatNumber
                  )
                : null,
            seatTierId: log.registration.seatTier?.id ?? null,
            seatTierName: log.registration.seatTier?.name ?? null,
            seatNumber: log.registration.seatNumber,
          }
        : null,
    })),
    summary: {
      total: logs.length,
      success: logs.filter((l) => l.result === "SUCCESS").length,
      mine: scope === "mine",
    },
  });
}
