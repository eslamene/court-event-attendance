/** Client-safe role permission catalog and validation (no DB imports). */

export type RolePermission =
  | "manage_events"
  | "manage_users"
  | "manage_roles"
  | "manage_settings"
  | "manage_registrations"
  | "approve_registrations"
  | "view_audit"
  | "manage_seating"
  | "manage_dictionary"
  | "mobile_scan";

export type PermissionDefinition = {
  id: RolePermission;
  group: "events" | "users" | "registrations" | "system" | "mobile";
};

export const PERMISSION_CATALOG: PermissionDefinition[] = [
  { id: "manage_events", group: "events" },
  { id: "manage_seating", group: "events" },
  { id: "manage_registrations", group: "registrations" },
  { id: "approve_registrations", group: "registrations" },
  { id: "view_audit", group: "registrations" },
  { id: "manage_users", group: "users" },
  { id: "manage_roles", group: "users" },
  { id: "manage_settings", group: "system" },
  { id: "manage_dictionary", group: "system" },
  { id: "mobile_scan", group: "mobile" },
];

export const ALL_ROLE_PERMISSIONS = PERMISSION_CATALOG.map((p) => p.id);

export const SYSTEM_ROLE_CODES = [
  "ADMIN",
  "APPROVAL_MANAGER",
  "EVENT_STAFF",
] as const;

export type SystemRoleCode = (typeof SYSTEM_ROLE_CODES)[number];

export const DEFAULT_SYSTEM_ROLE_PERMISSIONS: Record<
  SystemRoleCode,
  RolePermission[]
> = {
  ADMIN: [
    "manage_events",
    "manage_users",
    "manage_roles",
    "manage_settings",
    "manage_registrations",
    "approve_registrations",
    "view_audit",
    "manage_seating",
    "manage_dictionary",
  ],
  APPROVAL_MANAGER: [
    "manage_registrations",
    "approve_registrations",
    "view_audit",
  ],
  EVENT_STAFF: ["mobile_scan"],
};

const ADMIN_PANEL_PERMISSIONS: RolePermission[] = ALL_ROLE_PERMISSIONS.filter(
  (p) => p !== "mobile_scan"
);

export type RoleSummary = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  sortOrder: number;
  permissions: RolePermission[];
};

export function isRolePermission(value: string): value is RolePermission {
  return ALL_ROLE_PERMISSIONS.includes(value as RolePermission);
}

export function parsePermissionsJson(raw: string | null | undefined): RolePermission[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return [
      ...new Set(
        parsed.filter((item): item is RolePermission =>
          isRolePermission(String(item))
        )
      ),
    ];
  } catch {
    return [];
  }
}

export function permissionsToJson(permissions: RolePermission[]): string {
  return JSON.stringify(permissions);
}

export function roleCanAccessAdminPanel(
  permissions: RolePermission[]
): boolean {
  return permissions.some((p) => ADMIN_PANEL_PERMISSIONS.includes(p));
}

export function slugifyRoleCode(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return slug || "custom_role";
}

/** Admin system role must retain role/user management so permissions stay editable. */
export function validateRolePermissionGrants(
  roles: Pick<RoleSummary, "id" | "code">[],
  grants: Record<string, RolePermission[]>
): { ok: true } | { ok: false; reason: "admin_locked" | "empty_role" } {
  for (const role of roles) {
    if ((grants[role.id] ?? []).length === 0) {
      return { ok: false, reason: "empty_role" };
    }
  }

  const adminRole = roles.find((role) => role.code === "ADMIN");
  if (adminRole) {
    const admin = grants[adminRole.id] ?? [];
    if (!admin.includes("manage_roles") || !admin.includes("manage_users")) {
      return { ok: false, reason: "admin_locked" };
    }
  }

  return { ok: true };
}
