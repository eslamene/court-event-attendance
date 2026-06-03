import { RegistrationsPanel } from "@/components/admin/RegistrationsPanel";

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gold-dark">إدارة التسجيلات</h1>
      <RegistrationsPanel />
    </div>
  );
}
