import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ eventId: string }>;
};

export default async function EventSeatingDesignerRedirectPage({ params }: Props) {
  const { eventId } = await params;
  redirect(`/admin/seating/designer?event=${encodeURIComponent(eventId)}`);
}
