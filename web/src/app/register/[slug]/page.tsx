import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { LogoHeader } from "@/components/LogoHeader";
import { RegistrationForm } from "./RegistrationForm";
import { WithdrawRegistrationPanel } from "./WithdrawRegistrationPanel";
import { isRegistrationOpen } from "@/lib/system-settings";
import { resolveRegistrationFormConfigForEvent } from "@/lib/registration-form-config";
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
    select: {
      id: true,
      name: true,
      date: true,
      logoPath: true,
      seatingEnabled: true,
    },
  });

  if (!event) notFound();

  const eventDate = format(event.date, "EEEE، d MMMM yyyy", { locale: ar });
  const [registrationGate, formConfig, seatTiers] = await Promise.all([
    isRegistrationOpen(),
    resolveRegistrationFormConfigForEvent(event.id),
    event.seatingEnabled
      ? prisma.seatTier.findMany({
          where: { eventId: event.id },
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true, seatCount: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <main className="min-h-screen pb-12">
      <LogoHeader
        subtitle={event.name}
        logoSrc={event.logoPath}
        logoAlt={event.name}
      />
      <div className="mx-auto max-w-2xl px-4 py-8">
        {!registrationGate.open ? (
          <div
            className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-8 text-center text-amber-950"
            role="alert"
          >
            <p className="text-lg font-semibold">التسجيل غير متاح حالياً</p>
            {registrationGate.message && (
              <p className="mt-3 text-sm leading-relaxed">
                {registrationGate.message}
              </p>
            )}
          </div>
        ) : (
          <>
            <RegistrationForm
              slug={slug}
              eventName={event.name}
              eventDate={eventDate}
              formConfig={formConfig}
              seatTiers={seatTiers}
            />
            <WithdrawRegistrationPanel slug={slug} formConfig={formConfig} />
          </>
        )}
      </div>
    </main>
  );
}
