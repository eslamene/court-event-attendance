import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { UsersPanel } from "@/components/admin/UsersPanel";

export default function AdminUsersPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AdminPageHeader title="إدارة المستخدمين" className="mb-4 shrink-0" />
      <UsersPanel />
    </div>
  );
}
