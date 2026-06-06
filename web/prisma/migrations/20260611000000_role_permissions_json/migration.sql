-- Editable role permission grants (JSON map keyed by UserRole)
ALTER TABLE "SystemSettings" ADD COLUMN "rolePermissionsJson" TEXT NOT NULL DEFAULT '{}';
