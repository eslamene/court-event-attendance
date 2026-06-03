import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EventsPanel } from "@/components/admin/EventsPanel";

export default function AdminEventsPage() {
  return (
    <>
      <AdminPageHeader title="إدارة الفعاليات" />
      <EventsPanel />
    </>
  );
}
