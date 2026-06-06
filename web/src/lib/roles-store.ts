import { prisma } from "@/lib/db";
import {
  DEFAULT_SYSTEM_ROLE_PERMISSIONS,
  parsePermissionsJson,
  permissionsToJson,
  roleCanAccessAdminPanel,
  slugifyRoleCode,
  type RolePermission,
  type RoleSummary,
  type SystemRoleCode,
} from "@/lib/role-permissions";

const SYSTEM_ROLE_SEED: Array<{
  id: string;
  code: SystemRoleCode;
  name: string;
  description: string;
  sortOrder: number;
}> = [
  {
    id: "role_system_admin",
    code: "ADMIN",
    name: "System administrator",
    description: "Full admin access: events, users, settings, and audit logs.",
    sortOrder: 0,
  },
  {
    id: "role_system_approval_manager",
    code: "APPROVAL_MANAGER",
    name: "Approval manager",
    description: "Review and approve registrations; view audit logs.",
    sortOrder: 1,
  },
  {
    id: "role_system_event_staff",
    code: "EVENT_STAFF",
    name: "Event staff",
    description: "Check-in via the mobile app.",
    sortOrder: 2,
  },
];

let cache: { roles: RoleSummary[]; at: number } | null = null;
const CACHE_MS = 10_000;

function rowToRole(row: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  sortOrder: number;
  permissionsJson: string;
}): RoleSummary {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    isSystem: row.isSystem,
    sortOrder: row.sortOrder,
    permissions: parsePermissionsJson(row.permissionsJson),
  };
}

export function invalidateRolesCache(): void {
  cache = null;
}

export async function ensureRolesSeeded(): Promise<void> {
  for (const seed of SYSTEM_ROLE_SEED) {
    await prisma.role.upsert({
      where: { code: seed.code },
      update: {},
      create: {
        id: seed.id,
        code: seed.code,
        name: seed.name,
        description: seed.description,
        isSystem: true,
        sortOrder: seed.sortOrder,
        permissionsJson: permissionsToJson(
          DEFAULT_SYSTEM_ROLE_PERMISSIONS[seed.code]
        ),
      },
    });
  }
}

export async function listRoles(): Promise<RoleSummary[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return cache.roles;
  }

  await ensureRolesSeeded();
  const rows = await prisma.role.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const roles = rows.map(rowToRole);
  cache = { roles, at: Date.now() };
  return roles;
}

export async function getRoleById(id: string): Promise<RoleSummary | null> {
  const roles = await listRoles();
  return roles.find((role) => role.id === id) ?? null;
}

export async function getRoleByCode(code: string): Promise<RoleSummary | null> {
  const roles = await listRoles();
  return roles.find((role) => role.code === code) ?? null;
}

export async function roleHasPermission(
  roleId: string | undefined | null,
  permission: RolePermission
): Promise<boolean> {
  if (!roleId) return false;
  const role = await getRoleById(roleId);
  return role?.permissions.includes(permission) ?? false;
}

export async function listRolePermissions(
  roleId: string | undefined | null
): Promise<RolePermission[]> {
  if (!roleId) return [];
  const role = await getRoleById(roleId);
  return role?.permissions ?? [];
}

export async function userCanAccessAdminPanel(
  roleId: string | undefined | null
): Promise<boolean> {
  const permissions = await listRolePermissions(roleId);
  return roleCanAccessAdminPanel(permissions);
}

export async function updateRolePermissionsBulk(
  grants: Record<string, RolePermission[]>
): Promise<RoleSummary[]> {
  await ensureRolesSeeded();

  await prisma.$transaction(
    Object.entries(grants).map(([roleId, permissions]) =>
      prisma.role.update({
        where: { id: roleId },
        data: { permissionsJson: permissionsToJson(permissions) },
      })
    )
  );

  invalidateRolesCache();
  return listRoles();
}

export async function createRole(input: {
  name: string;
  code?: string;
  description?: string | null;
  permissions?: RolePermission[];
}): Promise<RoleSummary> {
  await ensureRolesSeeded();

  const baseCode = input.code?.trim() || slugifyRoleCode(input.name);
  let code = baseCode.toUpperCase();
  let suffix = 1;

  while (await prisma.role.findUnique({ where: { code } })) {
    code = `${baseCode}_${suffix}`.toUpperCase();
    suffix += 1;
  }

  const maxOrder = await prisma.role.aggregate({ _max: { sortOrder: true } });
  const permissions = input.permissions?.length
    ? input.permissions
    : (["manage_registrations"] as RolePermission[]);

  const row = await prisma.role.create({
    data: {
      code,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      isSystem: false,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      permissionsJson: permissionsToJson(permissions),
    },
  });

  invalidateRolesCache();
  return rowToRole(row);
}

export async function updateRole(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    permissions?: RolePermission[];
  }
): Promise<RoleSummary> {
  const existing = await prisma.role.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("ROLE_NOT_FOUND");
  }

  const row = await prisma.role.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() || null }
        : {}),
      ...(input.permissions !== undefined
        ? { permissionsJson: permissionsToJson(input.permissions) }
        : {}),
    },
  });

  invalidateRolesCache();
  return rowToRole(row);
}

export async function deleteRole(id: string): Promise<void> {
  const existing = await prisma.role.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });

  if (!existing) {
    throw new Error("ROLE_NOT_FOUND");
  }
  if (existing.isSystem) {
    throw new Error("ROLE_IS_SYSTEM");
  }
  if (existing._count.users > 0) {
    throw new Error("ROLE_IN_USE");
  }

  await prisma.role.delete({ where: { id } });
  invalidateRolesCache();
}
