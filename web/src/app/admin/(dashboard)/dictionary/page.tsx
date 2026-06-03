import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DictionaryPanel } from "@/components/admin/DictionaryPanel";
import { getServerT } from "@/lib/i18n/server";

export default async function DictionaryPage() {
  const { t } = await getServerT();
  return (
    <>
      <AdminPageHeader title={t("admin.dictionary.title")} />
      <DictionaryPanel />
    </>
  );
}
