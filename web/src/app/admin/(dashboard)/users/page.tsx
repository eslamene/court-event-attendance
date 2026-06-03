import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { UsersPanel } from "@/components/admin/UsersPanel";

export default function AdminUsersPage() {
  return (
    <>
      <AdminPageHeader title="إدارة المستخدمين" />
      <UsersPanel />
    </>
  );
}
