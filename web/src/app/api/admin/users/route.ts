import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth, canManageUsers } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiDict, apiT } from "@/lib/i18n/api";
import {
  AUDIT_ACTIONS,
  auditActorFromSession,
  recordAudit,
} from "@/lib/audit-log";
import { createUserSchema } from "@/lib/i18n/schemas";
import { jsonForbidden, jsonInvalidData } from "@/lib/i18n/responses";
import { getRoleById } from "@/lib/roles-store";
import type { Prisma } from "@/generated/prisma/client";
import {
  paginatedResponse,
  parseColumnFilters,
  parsePagination,
  parseSort,
} from "@/lib/admin-table-query";

const SORT_COLUMNS = ["name", "email", "role", "isActive", "createdAt"] as const;
const FILTER_COLUMNS = ["name", "email", "role", "isActive"] as const;

function serializeUser(u: {
  id: string;
  email: string;
  name: string;
  roleId: string;
  isActive: boolean;
  createdAt: Date;
  role: { code: string; name: string };
  _count?: { approvedRegistrations: number; scanLogs: number };
}) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    roleId: u.roleId,
    roleCode: u.role.code,
    roleName: u.role.name,
    role: u.role.code,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
    approvalsCount: u._count?.approvedRegistrations ?? 0,
    scansCount: u._count?.scanLogs ?? 0,
  };
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !(await canManageUsers(session.user.roleId))) {
    return jsonForbidden();
  }

  const { searchParams } = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(searchParams);
  const { sort, order } = parseSort(searchParams, SORT_COLUMNS, "createdAt");
  const filters = parseColumnFilters(searchParams, FILTER_COLUMNS);

  const where: Prisma.UserWhereInput = {
    ...(filters.name
      ? { name: { contains: filters.name, mode: "insensitive" } }
      : {}),
    ...(filters.email
      ? { email: { contains: filters.email, mode: "insensitive" } }
      : {}),
    ...(filters.role
      ? {
          role: {
            OR: [{ code: filters.role }, { id: filters.role }],
          },
        }
      : {}),
    ...(filters.isActive === "true"
      ? { isActive: true }
      : filters.isActive === "false"
        ? { isActive: false }
        : {}),
  };

  const orderBy: Prisma.UserOrderByWithRelationInput =
    sort === "name"
      ? { name: order }
      : sort === "email"
        ? { email: order }
        : sort === "role"
          ? { role: { name: order } }
          : sort === "isActive"
            ? { isActive: order }
            : { createdAt: order };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        email: true,
        name: true,
        roleId: true,
        isActive: true,
        createdAt: true,
        role: { select: { code: true, name: true } },
        _count: { select: { approvedRegistrations: true, scanLogs: true } },
      },
    }),
  ]);

  return NextResponse.json(
    paginatedResponse(users.map(serializeUser), total, page, pageSize)
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !(await canManageUsers(session.user.roleId))) {
    return jsonForbidden();
  }

  const dict = await apiDict();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonInvalidData();
  }

  const parsed = createUserSchema(dict).safeParse(body);
  if (!parsed.success) {
    return jsonInvalidData(parsed.error.issues[0]?.message);
  }

  const role = await getRoleById(parsed.data.roleId);
  if (!role) {
    return jsonInvalidData(await apiT("api.roleNotFound"));
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  if (existing) {
    return NextResponse.json(
      { error: await apiT("api.emailInUse") },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email.toLowerCase().trim(),
      name: parsed.data.name.trim(),
      roleId: parsed.data.roleId,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      name: true,
      roleId: true,
      isActive: true,
      createdAt: true,
      role: { select: { code: true, name: true } },
    },
  });

  await recordAudit({
    action: AUDIT_ACTIONS.USER_CREATE,
    actor: auditActorFromSession(session.user),
    entityType: "user",
    entityId: user.id,
    entityLabel: user.name,
    metadata: { email: user.email, roleId: user.roleId, roleCode: user.role.code },
    req,
  });

  return NextResponse.json(serializeUser(user));
}
