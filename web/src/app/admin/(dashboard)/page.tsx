import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { RegistrationsPanel } from "@/components/admin/RegistrationsPanel";

export default function AdminDashboardPage() {
  return (
    <>
      <AdminPageHeader title="إدارة التسجيلات" />
      <RegistrationsPanel />
    </>
  );
}
