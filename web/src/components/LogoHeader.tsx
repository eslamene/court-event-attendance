"use client";

import Image from "next/image";
import { PLATFORM_LOGO_PATH } from "@/lib/platform-logo";
import { useI18n } from "./I18nProvider";

type Props = {
  subtitle?: string;
  logoSrc?: string | null;
  logoAlt?: string;
};

export function LogoHeader({ subtitle, logoSrc, logoAlt }: Props) {
  const { t } = useI18n();
  const src = logoSrc || PLATFORM_LOGO_PATH;
  const isDefaultLogo = !logoSrc;
  const alt =
    logoAlt ||
    (isDefaultLogo ? t("header.logoAltCourt") : t("header.logoAltEvent"));

  return (
    <header className="flex flex-col items-center gap-4 border-b border-border bg-card px-6 py-8 shadow-sm">
      <Image
        src={src}
        alt={alt}
        width={140}
        height={140}
        className={`shadow-md ${isDefaultLogo ? "object-contain" : "rounded-full object-cover"}`}
        style={{ width: 140, height: 140 }}
        priority
        unoptimized={src.startsWith("http")}
      />
      <div className="text-center">
        <h1 className="text-lg font-bold text-gold-dark md:text-xl">
          {t("header.title")}
        </h1>
        <p className="mt-1 text-sm text-bronze">
          {subtitle ?? t("header.subtitle")}
        </p>
      </div>
    </header>
  );
}
