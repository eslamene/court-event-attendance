import type { UserRole } from "@/generated/prisma/client";
import { USER_ROLES } from "@/lib/i18n/schemas";

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

export const ROLE_PERMISSIONS: Record<UserRole, RolePermission[]> = {
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

export const SYSTEM_ROLES = [...USER_ROLES] as const;

export function roleHasPermission(
  role: UserRole,
  permission: RolePermission
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function listRolePermissions(role: UserRole): RolePermission[] {
  return ROLE_PERMISSIONS[role];
}
