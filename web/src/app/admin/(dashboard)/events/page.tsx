import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EventsPanel } from "@/components/admin/EventsPanel";

export default function AdminEventsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AdminPageHeader title="إدارة الفعاليات" className="mb-4 shrink-0" />
      <EventsPanel />
    </div>
  );
}
