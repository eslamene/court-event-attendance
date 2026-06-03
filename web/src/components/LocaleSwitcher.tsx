"use client";

import { useRouter } from "next/navigation";
import { Globe } from "@phosphor-icons/react";
import { IconSelect } from "@/components/ui/icon-select";
import { useI18n, useLocales } from "./I18nProvider";
import { LOCALE_COOKIE } from "@/lib/i18n/constants";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  variant?: "pills" | "select";
};

export function LocaleSwitcher({ className = "", variant = "pills" }: Props) {
  const { locale, t } = useI18n();
  const locales = useLocales();
  const router = useRouter();

  if (locales.length < 2) return null;

  async function onChange(code: string) {
    if (code === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${code};path=/;max-age=31536000;SameSite=Lax`;
    router.refresh();
  }

  if (variant === "select") {
    return (
      <IconSelect
        fieldKey="locale"
        size="sm"
        value={locale}
        onValueChange={onChange}
        triggerClassName="min-w-[8rem]"
        className={className}
        options={locales.map((l) => ({
          value: l.code,
          label: l.name,
        }))}
        aria-label={t("header.switchLanguage")}
      />
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-border bg-card p-0.5 shadow-sm",
        className
      )}
      role="group"
      aria-label={t("header.switchLanguage")}
    >
      <Globe
        size={16}
        className="ms-1.5 shrink-0 text-gold-dark"
        aria-hidden
      />
      {locales.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => onChange(l.code)}
          title={l.name}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-semibold uppercase transition",
            locale === l.code
              ? "bg-gold-dark text-white shadow-sm"
              : "text-bronze hover:bg-[#f5f0e8]"
          )}
        >
          {l.code}
        </button>
      ))}
    </div>
  );
}
