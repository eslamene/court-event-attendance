import { DictionaryPanel } from "@/components/admin/DictionaryPanel";
import { getServerT } from "@/lib/i18n/server";

export default async function DictionaryPage() {
  const { t } = await getServerT();
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gold-dark">
        {t("admin.dictionary.title")}
      </h1>
      <DictionaryPanel />
    </div>
  );
}
