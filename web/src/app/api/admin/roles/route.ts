import { NextResponse } from "next/server";
import { auth, canManageEvents } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonForbidden } from "@/lib/i18n/responses";
import {
  listRolePermissions,
  SYSTEM_ROLES,
  type RolePermission,
} from "@/lib/role-permissions";
import type { UserRole } from "@/generated/prisma/client";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canManageEvents(session.user.role)) {
    return jsonForbidden();
  }

  const counts = await prisma.user.groupBy({
    by: ["role"],
    _count: { _all: true },
    where: { isActive: true },
  });

  const activeByRole = new Map<UserRole, number>(
    counts.map((row) => [row.role, row._count._all])
  );

  const totalByRole = await prisma.user.groupBy({
    by: ["role"],
    _count: { _all: true },
  });

  const allByRole = new Map<UserRole, number>(
    totalByRole.map((row) => [row.role, row._count._all])
  );

  const roles = SYSTEM_ROLES.map((role) => ({
    id: role,
    permissions: listRolePermissions(role) as RolePermission[],
    activeUsers: activeByRole.get(role) ?? 0,
    totalUsers: allByRole.get(role) ?? 0,
  }));

  return NextResponse.json({ roles });
}
