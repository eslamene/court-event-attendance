import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdvancedSystemSettingsPanel } from "@/components/admin/AdvancedSystemSettingsPanel";
import { getServerT } from "@/lib/i18n/server";

export default async function SettingsAdvancedPage() {
  const { t } = await getServerT();
  return (
    <>
      <AdminPageHeader
        title={t("admin.settings.tabAdvanced")}
        description={t("admin.settings.advancedDescription")}
      />
      <AdvancedSystemSettingsPanel />
    </>
  );
}
