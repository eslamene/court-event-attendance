import Link from "next/link";
import { startOfDay } from "date-fns";
import { LogoHeader } from "@/components/LogoHeader";
import { EventCard } from "@/components/EventCard";
import { prisma } from "@/lib/db";

export default async function HomePage() {
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

  // Upcoming first; past most recent first
  pastEvents.sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <main className="min-h-screen pb-12">
      <LogoHeader subtitle="اليوبيل الذهبي للنيابة العامة لدى محكمة النقض" />

      <section className="mx-auto max-w-2xl px-4 py-10">
        <p className="mb-8 text-center leading-relaxed text-bronze">
          مرحباً بكم في نظام تسجيل حضور الفعاليات. اختروا الفعالية المناسبة
          لإتمام التسجيل.
        </p>

        <h2 className="mb-4 text-lg font-bold text-gold-dark">
          الفعاليات المتاحة للتسجيل
        </h2>

        {activeEvents.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-bronze">
            لا توجد فعاليات مفتوحة للتسجيل حالياً.
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
                <span>الفعاليات السابقة ({pastEvents.length})</span>
                <span
                  className="text-bronze transition group-open:rotate-180"
                  aria-hidden
                >
                  ▼
                </span>
              </span>
            </summary>
            <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
              {pastEvents.map((event) => (
                <div key={event.id} className="opacity-90">
                  <EventCard event={event} />
                  {!event.isActive && (
                    <p className="mt-1 pr-20 text-xs text-bronze">
                      التسجيل مغلق
                    </p>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}

        <p className="mt-10 text-center text-sm text-bronze">
          <Link href="/admin/login" className="underline hover:text-gold-dark">
            دخول الإدارة
          </Link>
        </p>
      </section>
    </main>
  );
}
