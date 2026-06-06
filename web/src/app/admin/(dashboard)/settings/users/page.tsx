import { Suspense } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { UsersPanel } from "@/components/admin/UsersPanel";
import { getServerT } from "@/lib/i18n/server";

export default async function SettingsUsersPage() {
  const { t } = await getServerT();
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <AdminPageHeader
        title={t("admin.settings.tabUsers")}
        description={t("admin.settings.usersDescription")}
        className="mb-0 shrink-0"
      />
      <Suspense fallback={null}>
        <UsersPanel />
      </Suspense>
    </div>
  );
}
