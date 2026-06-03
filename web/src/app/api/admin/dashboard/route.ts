import { NextResponse } from "next/server";
import { startOfDay } from "date-fns";
import { auth, canManageEvents, canViewAudit } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiT } from "@/lib/i18n/api";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: await apiT("api.unauthorized") }, { status: 401 });
  }

  const today = startOfDay(new Date());
  const isAdmin = canManageEvents(session.user.role);
  const viewAudit = canViewAudit(session.user.role);

  const [
    statusGroups,
    totalRegistrations,
    activeEvents,
    totalEvents,
    upcomingEvents,
    recentPending,
    recentAudit,
  ] = await Promise.all([
    prisma.registration.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.registration.count(),
    prisma.event.count({ where: { isActive: true } }),
    prisma.event.count(),
    prisma.event.findMany({
      where: { isActive: true, date: { gte: today } },
      orderBy: { date: "asc" },
      take: 5,
      include: { _count: { select: { registrations: true } } },
    }),
    prisma.registration.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { event: { select: { name: true, slug: true } } },
    }),
    viewAudit
      ? prisma.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 6,
          select: {
            id: true,
            action: true,
            entityLabel: true,
            actorName: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const byStatus = Object.fromEntries(
    statusGroups.map((g) => [g.status, g._count._all])
  ) as Record<string, number>;

  return NextResponse.json({
    registrations: {
      total: totalRegistrations,
      pending: byStatus.PENDING ?? 0,
      approved: byStatus.APPROVED ?? 0,
      rejected: byStatus.REJECTED ?? 0,
      attended: byStatus.ATTENDED ?? 0,
      withdrawn: byStatus.WITHDRAWN ?? 0,
    },
    events: {
      active: activeEvents,
      total: totalEvents,
      upcoming: upcomingEvents.map((e) => ({
        id: e.id,
        name: e.name,
        date: e.date.toISOString(),
        slug: e.slug,
        registrationCount: e._count.registrations,
      })),
    },
    recentPending: recentPending.map((r) => ({
      id: r.id,
      fullName: r.fullName,
      rank: r.rank,
      eventName: r.event.name,
      createdAt: r.createdAt.toISOString(),
    })),
    recentAudit: recentAudit.map((a) => ({
      id: a.id,
      action: a.action,
      entityLabel: a.entityLabel,
      actorName: a.actorName,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}
