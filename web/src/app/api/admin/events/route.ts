import { NextResponse } from "next/server";
import { auth, canManageEvents } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiDict, apiT } from "@/lib/i18n/api";
import { createEventSchema } from "@/lib/i18n/schemas";
import {
  AUDIT_ACTIONS,
  auditActorFromSession,
  recordAudit,
} from "@/lib/audit-log";
import { buildRegistrationUrl } from "@/lib/app-url";
import { uniqueEventSlug } from "@/lib/slug";
import type { Prisma } from "@/generated/prisma/client";
import {
  paginatedResponse,
  parseColumnFilters,
  parsePagination,
  parseSort,
} from "@/lib/admin-table-query";

const SORT_COLUMNS = ["name", "date", "slug", "isActive", "registrationCount"] as const;
const FILTER_COLUMNS = ["name", "slug", "isActive"] as const;

function mapEvent(e: {
  id: string;
  name: string;
  date: Date;
  slug: string;
  logoPath: string | null;
  isActive: boolean;
  seatingEnabled: boolean;
  _count: { registrations: number };
}) {
  return {
    id: e.id,
    name: e.name,
    date: e.date.toISOString(),
    slug: e.slug,
    logoPath: e.logoPath,
    isActive: e.isActive,
    seatingEnabled: e.seatingEnabled,
    registrationCount: e._count.registrations,
    registrationUrl: buildRegistrationUrl(e.slug),
  };
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: await apiT("api.unauthorized") }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  if (searchParams.get("compact") === "1") {
    const events = await prisma.event.findMany({
      orderBy: { date: "desc" },
      select: { id: true, name: true },
    });
    return NextResponse.json(events);
  }

  if (!searchParams.has("page")) {
    const events = await prisma.event.findMany({
      orderBy: { date: "desc" },
      include: { _count: { select: { registrations: true } } },
    });
    return NextResponse.json(events.map(mapEvent));
  }

  const { page, pageSize, skip, take } = parsePagination(searchParams);
  const { sort, order } = parseSort(searchParams, SORT_COLUMNS, "date");
  const filters = parseColumnFilters(searchParams, FILTER_COLUMNS);

  const where: Prisma.EventWhereInput = {
    ...(filters.name
      ? { name: { contains: filters.name, mode: "insensitive" } }
      : {}),
    ...(filters.slug
      ? { slug: { contains: filters.slug, mode: "insensitive" } }
      : {}),
    ...(filters.isActive === "true"
      ? { isActive: true }
      : filters.isActive === "false"
        ? { isActive: false }
        : {}),
  };

  const orderBy: Prisma.EventOrderByWithRelationInput =
    sort === "registrationCount"
      ? { registrations: { _count: order } }
      : sort === "name"
        ? { name: order }
        : sort === "slug"
          ? { slug: order }
          : sort === "isActive"
            ? { isActive: order }
            : { date: order };

  const [total, events] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      orderBy,
      skip,
      take,
      include: { _count: { select: { registrations: true } } },
    }),
  ]);

  return NextResponse.json(
    paginatedResponse(events.map(mapEvent), total, page, pageSize)
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !(await canManageEvents(session.user.roleId))) {
    return NextResponse.json({ error: await apiT("api.forbidden") }, { status: 403 });
  }

  const dict = await apiDict();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: await apiT("api.invalidData") }, { status: 400 });
  }

  const parsed = createEventSchema(dict).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? (await apiT("api.invalidData")),
      },
      { status: 400 }
    );
  }

  const slug = await uniqueEventSlug(parsed.data.name, async (s) => {
    const found = await prisma.event.findUnique({ where: { slug: s } });
    return Boolean(found);
  });

  const event = await prisma.event.create({
    data: {
      name: parsed.data.name.trim(),
      date: new Date(parsed.data.date),
      slug,
    },
  });

  await recordAudit({
    action: AUDIT_ACTIONS.EVENT_CREATE,
    actor: auditActorFromSession(session.user),
    entityType: "event",
    entityId: event.id,
    entityLabel: event.name,
    metadata: { slug: event.slug, date: event.date.toISOString() },
    req,
  });

  return NextResponse.json({
    ...event,
    date: event.date.toISOString(),
    registrationUrl: buildRegistrationUrl(event.slug),
  });
}
