import { NextResponse } from "next/server";
import { auth, canViewAudit } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiT } from "@/lib/i18n/api";
import type { Prisma } from "@/generated/prisma/client";
import {
  paginatedResponse,
  parseColumnFilters,
  parsePagination,
  parseSort,
} from "@/lib/admin-table-query";

const SORT_COLUMNS = [
  "createdAt",
  "action",
  "actorName",
  "entityType",
  "entityLabel",
  "ipAddress",
] as const;

const FILTER_COLUMNS = [
  "action",
  "entityType",
  "actorName",
  "entityLabel",
  "ipAddress",
  "q",
] as const;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !(await canViewAudit(session.user.roleId))) {
    return NextResponse.json({ error: await apiT("api.forbidden") }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(searchParams);
  const { sort, order } = parseSort(searchParams, SORT_COLUMNS, "createdAt");
  const filters = parseColumnFilters(searchParams, FILTER_COLUMNS);

  const textFilter = filters.q;
  const where: Prisma.AuditLogWhereInput = {
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.entityType ? { entityType: filters.entityType } : {}),
    ...(filters.actorName
      ? {
          OR: [
            { actorName: { contains: filters.actorName, mode: "insensitive" } },
            { actorEmail: { contains: filters.actorName, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(filters.entityLabel
      ? { entityLabel: { contains: filters.entityLabel, mode: "insensitive" } }
      : {}),
    ...(filters.ipAddress
      ? { ipAddress: { contains: filters.ipAddress, mode: "insensitive" } }
      : {}),
    ...(textFilter
      ? {
          OR: [
            { entityLabel: { contains: textFilter, mode: "insensitive" } },
            { actorName: { contains: textFilter, mode: "insensitive" } },
            { actorEmail: { contains: textFilter, mode: "insensitive" } },
            { action: { contains: textFilter, mode: "insensitive" } },
            { entityType: { contains: textFilter, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.AuditLogOrderByWithRelationInput =
    sort === "action"
      ? { action: order }
      : sort === "actorName"
        ? { actorName: order }
        : sort === "entityType"
          ? { entityType: order }
          : sort === "entityLabel"
            ? { entityLabel: order }
            : sort === "ipAddress"
              ? { ipAddress: order }
              : { createdAt: order };

  const [total, logs, actions, entityTypes] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        actorUser: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
    prisma.auditLog.findMany({
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
    }),
    prisma.auditLog.findMany({
      distinct: ["entityType"],
      select: { entityType: true },
      where: { entityType: { not: null } },
      orderBy: { entityType: "asc" },
    }),
  ]);

  return NextResponse.json({
    ...paginatedResponse(
      logs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        entityLabel: log.entityLabel,
        actorType: log.actorType,
        actorUserId: log.actorUserId,
        actorName: log.actorName ?? log.actorUser?.name,
        actorEmail: log.actorEmail ?? log.actorUser?.email,
        actorRole: log.actorUser?.role,
        metadata: log.metadata,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize
    ),
    filters: {
      actions: actions.map((a) => a.action),
      entityTypes: entityTypes
        .map((e) => e.entityType)
        .filter((t): t is string => Boolean(t)),
    },
  });
}
