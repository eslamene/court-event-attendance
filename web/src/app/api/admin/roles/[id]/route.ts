import { NextResponse } from "next/server";
import { auth, canManageRoles } from "@/lib/auth";
import {
  AUDIT_ACTIONS,
  auditActorFromSession,
  recordAudit,
} from "@/lib/audit-log";
import { apiT } from "@/lib/i18n/api";
import { jsonForbidden, jsonInvalidData } from "@/lib/i18n/responses";
import type { RolePermission } from "@/lib/role-permissions";
import { deleteRole, getRoleById, updateRole } from "@/lib/roles-store";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !(await canManageRoles(session.user.roleId))) {
    return jsonForbidden();
  }

  const { id } = await params;
  const existing = await getRoleById(id);
  if (!existing) {
    return NextResponse.json(
      { error: await apiT("api.roleNotFound") },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonInvalidData();
  }

  const input = body as {
    name?: string;
    description?: string | null;
    permissions?: RolePermission[];
  };

  try {
    const role = await updateRole(id, {
      name: input.name,
      description: input.description,
      permissions: input.permissions,
    });

    await recordAudit({
      action: AUDIT_ACTIONS.ROLE_UPDATE,
      actor: auditActorFromSession(session.user),
      entityType: "role",
      entityId: role.id,
      entityLabel: role.name,
      metadata: {
        name: input.name,
        description: input.description,
        permissions: input.permissions,
      },
      req,
    });

    return NextResponse.json({ role });
  } catch {
    return NextResponse.json(
      { error: await apiT("api.operationFailed") },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !(await canManageRoles(session.user.roleId))) {
    return jsonForbidden();
  }

  const { id } = await params;
  const existing = await getRoleById(id);
  if (!existing) {
    return NextResponse.json(
      { error: await apiT("api.roleNotFound") },
      { status: 404 }
    );
  }

  try {
    await deleteRole(id);

    await recordAudit({
      action: AUDIT_ACTIONS.ROLE_DELETE,
      actor: auditActorFromSession(session.user),
      entityType: "role",
      entityId: id,
      entityLabel: existing.name,
      metadata: { code: existing.code },
      req,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "ROLE_DELETE_FAILED";
    const key =
      message === "ROLE_IS_SYSTEM"
        ? "api.roleIsSystem"
        : message === "ROLE_IN_USE"
          ? "api.roleInUse"
          : "api.operationFailed";
    const status = message === "ROLE_IS_SYSTEM" || message === "ROLE_IN_USE" ? 400 : 500;
    return NextResponse.json({ error: await apiT(key) }, { status });
  }
}
