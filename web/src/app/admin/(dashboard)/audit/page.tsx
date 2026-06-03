import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AuditLogsPanel } from "@/components/admin/AuditLogsPanel";
import { getServerT } from "@/lib/i18n/server";

export default async function AuditPage() {
  const { t } = await getServerT();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AdminPageHeader
        title={t("admin.nav.audit")}
        description={t("audit.description")}
        className="mb-4 shrink-0"
      />
      <AuditLogsPanel />
    </div>
  );
}
