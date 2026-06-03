import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Prisma, RegistrationStatus } from "@/generated/prisma/client";
import {
  paginatedResponse,
  parseColumnFilters,
  parsePagination,
  parseSort,
} from "@/lib/admin-table-query";
import { statusesForRegistrationTab } from "@/lib/registration-tabs";

const SORT_COLUMNS = [
  "fullName",
  "rank",
  "entity",
  "status",
  "email",
  "mobile",
  "createdAt",
  "eventName",
  "eventId",
] as const;

const FILTER_COLUMNS = [
  "fullName",
  "rank",
  "entity",
  "email",
  "mobile",
  "eventId",
] as const;

function mapRegistration(r: {
  id: string;
  fullName: string;
  rank: string;
  entity: string;
  email: string;
  mobile: string;
  notes: string | null;
  status: RegistrationStatus;
  eventId: string;
  approvedAt: Date | null;
  attendedAt: Date | null;
  withdrawnAt: Date | null;
  withdrawalNote: string | null;
  createdAt: Date;
  event: { name: string; date: Date; slug: string };
  approvedBy: { name: string } | null;
}) {
  return {
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
  };
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return (await import("@/lib/i18n/responses")).jsonUnauthorized();
  }

  const { searchParams } = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(searchParams);
  const { sort, order } = parseSort(searchParams, SORT_COLUMNS, "createdAt");
  const filters = parseColumnFilters(searchParams, FILTER_COLUMNS);
  const tabStatuses = statusesForRegistrationTab(searchParams.get("tab"));

  const where: Prisma.RegistrationWhereInput = {
    status: { in: tabStatuses },
    ...(filters.fullName
      ? { fullName: { contains: filters.fullName, mode: "insensitive" } }
      : {}),
    ...(filters.rank ? { rank: filters.rank } : {}),
    ...(filters.entity ? { entity: filters.entity } : {}),
    ...(filters.email
      ? { email: { contains: filters.email, mode: "insensitive" } }
      : {}),
    ...(filters.mobile
      ? { mobile: { contains: filters.mobile, mode: "insensitive" } }
      : {}),
    ...(filters.eventId ? { eventId: filters.eventId } : {}),
  };

  const orderBy: Prisma.RegistrationOrderByWithRelationInput =
    sort === "eventName" || sort === "eventId"
      ? { event: { name: order } }
      : sort === "fullName"
        ? { fullName: order }
        : sort === "rank"
          ? { rank: order }
          : sort === "entity"
            ? { entity: order }
            : sort === "status"
              ? { status: order }
              : sort === "email"
                ? { email: order }
                : sort === "mobile"
                  ? { mobile: order }
                  : { createdAt: order };

  const [total, registrations] = await Promise.all([
    prisma.registration.count({ where }),
    prisma.registration.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        event: { select: { name: true, date: true, slug: true } },
        approvedBy: { select: { name: true } },
      },
    }),
  ]);

  return NextResponse.json(
    paginatedResponse(
      registrations.map(mapRegistration),
      total,
      page,
      pageSize
    )
  );
}
