import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { RolesPanel } from "@/components/admin/RolesPanel";
import { getServerT } from "@/lib/i18n/server";

export default async function SettingsRolesPage() {
  const { t } = await getServerT();
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <AdminPageHeader
        title={t("admin.settings.tabRoles")}
        description={t("admin.settings.rolesDescription")}
        className="mb-0 shrink-0"
      />
      <RolesPanel />
    </div>
  );
}
