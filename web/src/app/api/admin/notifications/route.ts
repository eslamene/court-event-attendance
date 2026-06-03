import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiT } from "@/lib/i18n/api";

const RECENT_LIMIT = 12;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: await apiT("api.unauthorized") }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sinceRaw = searchParams.get("since");
  const since = sinceRaw ? new Date(sinceRaw) : null;
  const sinceValid = since && !Number.isNaN(since.getTime()) ? since : null;

  const pendingWhere = { status: "PENDING" as const };

  const [pendingCount, newCount, recent] = await Promise.all([
    prisma.registration.count({ where: pendingWhere }),
    sinceValid
      ? prisma.registration.count({
          where: {
            ...pendingWhere,
            createdAt: { gt: sinceValid },
          },
        })
      : prisma.registration.count({ where: pendingWhere }),
    prisma.registration.findMany({
      where: pendingWhere,
      orderBy: { createdAt: "desc" },
      take: RECENT_LIMIT,
      include: { event: { select: { name: true } } },
    }),
  ]);

  return NextResponse.json({
    pendingCount,
    newCount: sinceValid ? newCount : pendingCount,
    items: recent.map((r) => ({
      id: r.id,
      fullName: r.fullName,
      eventName: r.event.name,
      rank: r.rank,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
