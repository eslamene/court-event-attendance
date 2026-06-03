import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmailTemplateEditor } from "@/components/admin/EmailTemplateEditor";
import { getServerT } from "@/lib/i18n/server";

export default async function SettingsEmailTemplatePage() {
  const { t } = await getServerT();
  return (
    <>
      <AdminPageHeader
        title={t("admin.settings.tabEmail")}
        description={t("admin.emailTemplate.intro")}
      />
      <EmailTemplateEditor mode="default" embedded />
    </>
  );
}
