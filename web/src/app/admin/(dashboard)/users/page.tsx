import { UsersPanel } from "@/components/admin/UsersPanel";

export default function AdminUsersPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gold-dark">إدارة المستخدمين</h1>
      <UsersPanel />
    </div>
  );
}
