import { EventsPanel } from "@/components/admin/EventsPanel";

export default function AdminEventsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gold-dark">إدارة الفعاليات</h1>
      <EventsPanel />
    </div>
  );
}
