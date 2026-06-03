import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { LogoHeader } from "@/components/LogoHeader";
import { RegistrationForm } from "./RegistrationForm";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug, isActive: true },
  });

  if (!event) notFound();

  const eventDate = format(event.date, "EEEE، d MMMM yyyy", { locale: ar });

  return (
    <main className="min-h-screen pb-12">
      <LogoHeader subtitle="نموذج تسجيل الحضور" />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <RegistrationForm
          slug={slug}
          eventName={event.name}
          eventDate={eventDate}
        />
      </div>
    </main>
  );
}
