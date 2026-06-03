"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/components/I18nProvider";
import { PLATFORM_LOGO_PATH } from "@/lib/platform-logo";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { t } = useI18n();
  const role = session?.user?.role ?? "";
  const roleLabel = role ? t(`roles.${role}`) : "";

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between border-b border-border bg-card px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <Image
            src={PLATFORM_LOGO_PATH}
            alt=""
            width={48}
            height={48}
            className="rounded-full object-cover"
          />
          <div>
            <p className="font-bold text-gold-dark">{t("admin.shellTitle")}</p>
            <p className="text-xs text-bronze">
              {session?.user?.name} — {roleLabel || role}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-sm hover:text-gold-dark">
            {t("admin.nav.registrations")}
          </Link>
          {session?.user?.role === "ADMIN" && (
            <>
              <Link href="/admin/events" className="text-sm hover:text-gold-dark">
                {t("admin.nav.events")}
              </Link>
              <Link href="/admin/users" className="text-sm hover:text-gold-dark">
                {t("admin.nav.users")}
              </Link>
              <Link href="/admin/settings" className="text-sm hover:text-gold-dark">
                {t("admin.nav.notifications")}
              </Link>
              <Link
                href="/admin/dictionary"
                className="text-sm hover:text-gold-dark"
              >
                {t("admin.nav.dictionary")}
              </Link>
            </>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-[#f5f0e8]"
          >
            {t("admin.nav.logout")}
          </button>
        </div>
      </nav>
      <div className="mx-auto max-w-7xl px-4 py-8">{children}</div>
    </div>
  );
}
