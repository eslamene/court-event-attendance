import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DictionaryPanel } from "@/components/admin/DictionaryPanel";
import { getServerT } from "@/lib/i18n/server";

export default async function DictionaryPage() {
  const { t } = await getServerT();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AdminPageHeader
        title={t("admin.dictionary.title")}
        description={t("admin.dictionary.description")}
        className="mb-4 shrink-0"
      />
      <DictionaryPanel />
    </div>
  );
}
