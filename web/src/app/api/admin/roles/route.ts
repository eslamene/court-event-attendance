import { NextResponse } from "next/server";
import { auth, canManageRoles } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  AUDIT_ACTIONS,
  auditActorFromSession,
  recordAudit,
} from "@/lib/audit-log";
import { apiT } from "@/lib/i18n/api";
import { jsonForbidden, jsonInvalidData } from "@/lib/i18n/responses";
import {
  DEFAULT_SYSTEM_ROLE_PERMISSIONS,
  PERMISSION_CATALOG,
  validateRolePermissionGrants,
  type RolePermission,
} from "@/lib/role-permissions";
import {
  createRole,
  listRoles,
  updateRolePermissionsBulk,
} from "@/lib/roles-store";

export async function GET() {
  const session = await auth();
  if (!session?.user || !(await canManageRoles(session.user.roleId))) {
    return jsonForbidden();
  }

  const roles = await listRoles();

  const counts = await prisma.user.groupBy({
    by: ["roleId"],
    _count: { _all: true },
    where: { isActive: true },
  });
  const activeByRole = new Map(
    counts.map((row) => [row.roleId, row._count._all])
  );

  const totalByRole = await prisma.user.groupBy({
    by: ["roleId"],
    _count: { _all: true },
  });
  const allByRole = new Map(
    totalByRole.map((row) => [row.roleId, row._count._all])
  );

  return NextResponse.json({
    roles: roles.map((role) => ({
      ...role,
      activeUsers: activeByRole.get(role.id) ?? 0,
      totalUsers: allByRole.get(role.id) ?? 0,
    })),
    catalog: PERMISSION_CATALOG,
    defaults: DEFAULT_SYSTEM_ROLE_PERMISSIONS,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !(await canManageRoles(session.user.roleId))) {
    return jsonForbidden();
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonInvalidData();
  }

  const input = body as {
    name?: string;
    code?: string;
    description?: string;
    permissions?: RolePermission[];
  };

  if (!input.name?.trim()) {
    return jsonInvalidData();
  }

  try {
    const role = await createRole({
      name: input.name,
      code: input.code,
      description: input.description ?? null,
      permissions: input.permissions,
    });

    await recordAudit({
      action: AUDIT_ACTIONS.ROLE_CREATE,
      actor: auditActorFromSession(session.user),
      entityType: "role",
      entityId: role.id,
      entityLabel: role.name,
      metadata: { code: role.code, permissions: role.permissions },
      req,
    });

    return NextResponse.json({ role }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: await apiT("api.operationFailed") },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user || !(await canManageRoles(session.user.roleId))) {
    return jsonForbidden();
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonInvalidData();
  }

  const grants =
    body && typeof body === "object" && "grants" in body
      ? ((body as { grants: Record<string, RolePermission[]> }).grants ?? {})
      : {};

  const roles = await listRoles();
  const validation = validateRolePermissionGrants(roles, grants);
  if (!validation.ok) {
    const errorKey =
      validation.reason === "admin_locked"
        ? "api.rolePermissionsAdminLocked"
        : "api.rolePermissionsEmptyRole";
    return NextResponse.json({ error: await apiT(errorKey) }, { status: 400 });
  }

  const previous = Object.fromEntries(
    roles.map((role) => [role.id, role.permissions])
  );

  const updated = await updateRolePermissionsBulk(grants);

  await recordAudit({
    action: AUDIT_ACTIONS.ROLE_PERMISSIONS_UPDATE,
    actor: auditActorFromSession(session.user),
    entityType: "role_permissions",
    entityId: "bulk",
    entityLabel: "Role permissions",
    metadata: { previous, next: grants },
    req,
  });

  return NextResponse.json({ roles: updated });
}
