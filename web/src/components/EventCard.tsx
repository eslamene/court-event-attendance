import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export type EventListItem = {
  id: string;
  name: string;
  date: Date;
  slug: string;
  logoPath: string | null;
};

export function EventCard({ event }: { event: EventListItem }) {
  const dateStr = format(event.date, "EEEE، d MMMM yyyy", { locale: ar });
  const logo = event.logoPath || "/logo.jpeg";

  return (
    <Link
      href={`/register/${event.slug}`}
      className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-gold hover:shadow-md"
    >
      <Image
        src={logo}
        alt={event.name}
        width={64}
        height={64}
        className="h-16 w-16 shrink-0 rounded-full object-cover"
        unoptimized={logo.startsWith("http")}
      />
      <div className="min-w-0 flex-1 text-right">
        <h3 className="font-semibold text-gold-dark">{event.name}</h3>
        <p className="mt-1 text-sm text-bronze">{dateStr}</p>
        <p className="mt-2 text-xs text-gold-dark underline" dir="ltr">
          /register/{event.slug}
        </p>
      </div>
      <span className="shrink-0 text-gold-dark" aria-hidden>
        ←
      </span>
    </Link>
  );
}
