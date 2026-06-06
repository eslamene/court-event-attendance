-- Custom roles: move from UserRole enum to Role table with per-role permissions.

CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "permissionsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

INSERT INTO "Role" ("id", "code", "name", "description", "isSystem", "sortOrder", "permissionsJson", "updatedAt")
VALUES
  (
    'role_system_admin',
    'ADMIN',
    'System administrator',
    'Full admin access: events, users, settings, and audit logs.',
    true,
    0,
    '["manage_events","manage_users","manage_roles","manage_settings","manage_registrations","approve_registrations","view_audit","manage_seating","manage_dictionary"]',
    CURRENT_TIMESTAMP
  ),
  (
    'role_system_approval_manager',
    'APPROVAL_MANAGER',
    'Approval manager',
    'Review and approve registrations; view audit logs.',
    true,
    1,
    '["manage_registrations","approve_registrations","view_audit"]',
    CURRENT_TIMESTAMP
  ),
  (
    'role_system_event_staff',
    'EVENT_STAFF',
    'Event staff',
    'Check-in via the mobile app.',
    true,
    2,
    '["mobile_scan"]',
    CURRENT_TIMESTAMP
  );

-- Apply customized permissions from SystemSettings if present.
UPDATE "Role" r
SET "permissionsJson" = (s."rolePermissionsJson"::jsonb -> r."code")::text
FROM "SystemSettings" s
WHERE s."id" = 'global'
  AND s."rolePermissionsJson" IS NOT NULL
  AND s."rolePermissionsJson" <> '{}'
  AND (s."rolePermissionsJson"::jsonb ? r."code");

ALTER TABLE "User" ADD COLUMN "roleId" TEXT;

UPDATE "User" u
SET "roleId" = r."id"
FROM "Role" r
WHERE r."code" = u."role"::text;

UPDATE "User" SET "roleId" = 'role_system_approval_manager' WHERE "roleId" IS NULL;

ALTER TABLE "User" ALTER COLUMN "roleId" SET NOT NULL;

ALTER TABLE "User" DROP COLUMN "role";
DROP TYPE "UserRole";

ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "User_roleId_idx" ON "User"("roleId");

ALTER TABLE "SystemSettings" DROP COLUMN "rolePermissionsJson";
