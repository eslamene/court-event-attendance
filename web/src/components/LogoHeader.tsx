import Image from "next/image";

type Props = {
  subtitle?: string;
  logoSrc?: string | null;
  logoAlt?: string;
};

export function LogoHeader({ subtitle, logoSrc, logoAlt }: Props) {
  const src = logoSrc || "/logo.jpeg";
  const alt = logoAlt || "شعار الفعالية";

  return (
    <header className="flex flex-col items-center gap-4 border-b border-border bg-card px-6 py-8 shadow-sm">
      <Image
        src={src}
        alt={alt}
        width={140}
        height={140}
        className="rounded-full object-cover shadow-md"
        style={{ width: 140, height: 140 }}
        priority
        unoptimized={src.startsWith("http")}
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
