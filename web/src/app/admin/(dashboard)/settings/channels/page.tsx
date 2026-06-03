import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DeliveryChannelsPanel } from "@/components/admin/DeliveryChannelsPanel";
import { getServerT } from "@/lib/i18n/server";

export default async function SettingsChannelsPage() {
  const { t } = await getServerT();
  return (
    <>
      <AdminPageHeader
        title={t("admin.settings.tabChannels")}
        description={t("admin.settings.channelsDescription")}
      />
      <DeliveryChannelsPanel />
    </>
  );
}
