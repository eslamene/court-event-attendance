import { Suspense } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { RegistrationsPanel } from "@/components/admin/RegistrationsPanel";
import { getServerT } from "@/lib/i18n/server";

export default async function RegistrationsPage() {
  const { t } = await getServerT();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AdminPageHeader
        title={t("admin.nav.registrations")}
        className="mb-4 shrink-0"
      />
      <Suspense
        fallback={
          <p className="rounded-xl border border-border bg-card px-6 py-12 text-center text-bronze">
            …
          </p>
        }
      >
        <RegistrationsPanel />
      </Suspense>
    </div>
  );
}
