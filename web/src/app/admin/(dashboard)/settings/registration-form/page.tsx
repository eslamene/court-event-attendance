import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { RegistrationFormConfigEditor } from "@/components/admin/RegistrationFormConfigEditor";
import { getServerT } from "@/lib/i18n/server";

export default async function SettingsRegistrationFormPage() {
  const { t } = await getServerT();
  return (
    <>
      <AdminPageHeader
        title={t("admin.registrationForm.title")}
        description={t("admin.registrationForm.pageDescription")}
      />
      <RegistrationFormConfigEditor mode="default" embedded />
    </>
  );
}
