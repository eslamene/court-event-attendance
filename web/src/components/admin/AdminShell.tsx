"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Books,
  CalendarBlank,
  ClipboardText,
  Gear,
  SignOut,
  Users,
} from "@phosphor-icons/react";
import { useI18n } from "@/components/I18nProvider";
import { FeedbackProvider } from "@/components/ui/FeedbackProvider";
import { PLATFORM_LOGO_PATH } from "@/lib/platform-logo";

const navItems = [
  { href: "/admin", icon: ClipboardText, labelKey: "admin.nav.registrations" as const },
  { href: "/admin/events", icon: CalendarBlank, labelKey: "admin.nav.events" as const, adminOnly: true },
  { href: "/admin/users", icon: Users, labelKey: "admin.nav.users" as const, adminOnly: true },
  { href: "/admin/settings", icon: Gear, labelKey: "admin.nav.notifications" as const, adminOnly: true },
  { href: "/admin/dictionary", icon: Books, labelKey: "admin.nav.dictionary" as const, adminOnly: true },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { t } = useI18n();
  const pathname = usePathname();
  const role = session?.user?.role ?? "";
  const roleLabel = role ? t(`roles.${role}`) : "";
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <FeedbackProvider>
    <div className="min-h-screen bg-background">
      <nav className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-6 py-4 shadow-sm">
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
        <div className="flex flex-wrap items-center gap-2">
          {navItems
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition ${
                    active
                      ? "bg-[#f5f0e8] font-medium text-gold-dark"
                      : "text-foreground hover:bg-[#f5f0e8] hover:text-gold-dark"
                  }`}
                >
                  <item.icon
                    size={18}
                    weight={active ? "fill" : "regular"}
                    aria-hidden
                  />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-[#f5f0e8]"
          >
            <SignOut size={18} aria-hidden />
            {t("admin.nav.logout")}
          </button>
        </div>
      </nav>
      <div className="mx-auto max-w-7xl px-4 py-8">{children}</div>
    </div>
    </FeedbackProvider>
  );
}
