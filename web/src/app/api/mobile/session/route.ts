import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStaffTokenFromRequest, verifyStaffToken } from "@/lib/staff-auth";
import { apiT } from "@/lib/i18n/api";
import { jsonUnauthorized } from "@/lib/i18n/responses";

export async function GET(req: Request) {
  const token = getStaffTokenFromRequest(req);
  if (!token) {
    return jsonUnauthorized();
  }

  const staff = await verifyStaffToken(token);
  if (!staff) {
    return NextResponse.json(
      { error: await apiT("api.invalidSession") },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: staff.userId },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: await apiT("api.invalidSession") },
      { status: 401 }
    );
  }

  const events = await prisma.event.findMany({
    where: { isActive: true },
    orderBy: { date: "desc" },
    select: { id: true, name: true, date: true, slug: true },
  });

  return NextResponse.json({
    user,
    events: events.map((e) => ({ ...e, date: e.date.toISOString() })),
  });
}
