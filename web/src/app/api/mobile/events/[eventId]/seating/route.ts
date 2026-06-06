import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSeatingMap } from "@/lib/seating";
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
  const event = await prisma.event.findFirst({
    where: { id: eventId, isActive: true },
    select: { id: true },
  });

  if (!event) {
    return NextResponse.json(
      { error: await apiT("api.eventNotFound") },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(req.url);
  const seatTierId = searchParams.get("seatTierId");
  const seatNumberRaw = searchParams.get("seatNumber");
  const seatNumber = seatNumberRaw ? Number(seatNumberRaw) : undefined;
  const tierId = searchParams.get("tierId") || undefined;

  const focusSeat =
    seatTierId && seatNumber && Number.isInteger(seatNumber) && seatNumber > 0
      ? { tierId: seatTierId, seatNumber }
      : undefined;

  try {
    const map = await getSeatingMap(eventId, { focusSeat, tierId });
    return NextResponse.json(map);
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : await apiT("api.operationFailed"),
      },
      { status: 400 }
    );
  }
}
