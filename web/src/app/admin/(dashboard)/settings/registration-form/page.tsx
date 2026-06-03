import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { RegistrationFormConfigEditor } from "@/components/admin/RegistrationFormConfigEditor";
import { getServerT } from "@/lib/i18n/server";

export default async function SettingsRegistrationFormPage() {
  const { t } = await getServerT();
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <AdminPageHeader
        title={t("admin.registrationForm.title")}
        description={t("admin.registrationForm.pageDescription")}
        className="shrink-0"
      />
      <RegistrationFormConfigEditor mode="default" embedded />
    </div>
  );
}
