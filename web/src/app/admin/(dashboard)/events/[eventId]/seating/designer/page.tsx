import { EventSeatingDesignerScreen } from "@/components/admin/EventSeatingDesignerScreen";

type Props = {
  params: Promise<{ eventId: string }>;
};

export default async function EventSeatingDesignerPage({ params }: Props) {
  const { eventId } = await params;
  return <EventSeatingDesignerScreen eventId={eventId} />;
}
