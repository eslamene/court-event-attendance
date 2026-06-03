"use client";

import { useRouter } from "next/navigation";
import { useI18n, useLocales } from "./I18nProvider";
import { LOCALE_COOKIE } from "@/lib/i18n/constants";

export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const { locale } = useI18n();
  const locales = useLocales();
  const router = useRouter();

  if (locales.length < 2) return null;

  async function onChange(code: string) {
    document.cookie = `${LOCALE_COOKIE}=${code};path=/;max-age=31536000;SameSite=Lax`;
    router.refresh();
  }

  return (
    <label className={`inline-flex items-center gap-2 text-sm text-bronze ${className}`}>
      <select
        value={locale}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border bg-card px-2 py-1 text-gold-dark"
        aria-label="Language"
      >
        {locales.map((l) => (
          <option key={l.code} value={l.code}>
            {l.name}
          </option>
        ))}
      </select>
    </label>
  );
}
