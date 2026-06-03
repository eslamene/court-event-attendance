import Image from "next/image";

export function LogoHeader({ subtitle }: { subtitle?: string }) {
  return (
    <header className="flex flex-col items-center gap-4 border-b border-border bg-card px-6 py-8 shadow-sm">
      <Image
        src="/logo.jpeg"
        alt="اليوبيل الذهبي للنيابة العامة"
        width={140}
        height={140}
        className="rounded-full shadow-md"
        priority
      />
      <div className="text-center">
        <h1 className="text-lg font-bold text-gold-dark md:text-xl">
          نظام تسجيل حضور الفعاليات القضائية
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-bronze">{subtitle}</p>
        )}
      </div>
    </header>
  );
}
