import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { RegistrationStatus } from "@/generated/prisma/client";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return (await import("@/lib/i18n/responses")).jsonUnauthorized();
  }

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId") || undefined;
  const status = searchParams.get("status") as RegistrationStatus | null;
  const rank = searchParams.get("rank") || undefined;
  const entity = searchParams.get("entity") || undefined;
  const sort = searchParams.get("sort") || "createdAt";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";

  const where = {
    ...(eventId ? { eventId } : {}),
    ...(status ? { status } : {}),
    ...(rank ? { rank } : {}),
    ...(entity ? { entity } : {}),
  };

  const orderBy =
    sort === "fullName"
      ? { fullName: order as "asc" | "desc" }
      : sort === "status"
        ? { status: order as "asc" | "desc" }
        : { createdAt: order as "asc" | "desc" };

  const registrations = await prisma.registration.findMany({
    where,
    orderBy,
    include: {
      event: { select: { name: true, date: true, slug: true } },
      approvedBy: { select: { name: true } },
    },
  });

  return NextResponse.json(
    registrations.map((r) => ({
      id: r.id,
      fullName: r.fullName,
      rank: r.rank,
      entity: r.entity,
      email: r.email,
      mobile: r.mobile,
      notes: r.notes,
      status: r.status,
      eventId: r.eventId,
      eventName: r.event.name,
      eventDate: r.event.date.toISOString(),
      eventSlug: r.event.slug,
      approvedBy: r.approvedBy?.name,
      approvedAt: r.approvedAt?.toISOString(),
      attendedAt: r.attendedAt?.toISOString(),
      withdrawnAt: r.withdrawnAt?.toISOString(),
      withdrawalNote: r.withdrawalNote,
      createdAt: r.createdAt.toISOString(),
    }))
  );
}
