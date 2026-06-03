import { SettingsPanel } from "@/components/admin/SettingsPanel";

export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gold-dark">إعدادات الإشعارات</h1>
      <SettingsPanel />
    </div>
  );
}
