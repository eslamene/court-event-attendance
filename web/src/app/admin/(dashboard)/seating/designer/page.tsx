import { EventSeatingDesignerScreen } from "@/components/admin/EventSeatingDesignerScreen";

type Props = {
  searchParams: Promise<{ event?: string }>;
};

export default async function SeatingDesignerPage({ searchParams }: Props) {
  const { event } = await searchParams;
  return <EventSeatingDesignerScreen initialEventId={event} />;
}
