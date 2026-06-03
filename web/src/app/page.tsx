import { startOfDay } from "date-fns";
import { LogoHeader } from "@/components/LogoHeader";
import { EventCard } from "@/components/EventCard";
import { PastEventsCaret } from "@/components/home/PastEventsCaret";
import { prisma } from "@/lib/db";
import { getServerT } from "@/lib/i18n/server";

export default async function HomePage() {
  const { t } = await getServerT();
  const today = startOfDay(new Date());

  const allEvents = await prisma.event.findMany({
    orderBy: { date: "asc" },
    select: {
      id: true,
      name: true,
      date: true,
      slug: true,
      logoPath: true,
      isActive: true,
    },
  });

  const activeEvents = allEvents.filter(
    (e) => e.isActive && e.date >= today
  );
  const pastEvents = allEvents.filter(
    (e) => !e.isActive || e.date < today
  );

  pastEvents.sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <main className="min-h-screen pb-12">
      <LogoHeader />

      <section className="mx-auto max-w-2xl px-4 py-10">
        <p className="mb-8 text-center leading-relaxed text-bronze">
          {t("home.welcome")}
        </p>

        <div className="mb-6">
          <h2 className="text-lg font-bold text-gold-dark">
            {t("home.activeEvents")}
          </h2>
        </div>

        {activeEvents.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-bronze">
            {t("home.noActiveEvents")}
          </p>
        ) : (
          <ul className="space-y-3">
            {activeEvents.map((event) => (
              <li key={event.id}>
                <EventCard event={event} />
              </li>
            ))}
          </ul>
        )}

        {pastEvents.length > 0 && (
          <details className="group mt-10 rounded-xl border border-border bg-[#f5f0e8]/50">
            <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-gold-dark marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-2">
                <span>
                  {t("home.pastEvents")} ({pastEvents.length})
                </span>
                <PastEventsCaret />
              </span>
            </summary>
            <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
              {pastEvents.map((event) => (
                <div key={event.id} className="opacity-90">
                  <EventCard event={event} />
                  {!event.isActive && (
                    <p className="mt-1 pr-20 text-xs text-bronze">
                      {t("home.registrationClosed")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}
      </section>
    </main>
  );
}
