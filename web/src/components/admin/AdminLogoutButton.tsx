"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { Button } from "@/components/ui/button";

export function adminSignOut() {
  void signOut({ callbackUrl: "/admin/login", redirect: true });
}

export function AdminLogoutButton({
  showLabel = true,
  className,
}: {
  showLabel?: boolean;
  className?: string;
}) {
  const { t } = useI18n();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={adminSignOut}
    >
      <LogOut className="size-4" aria-hidden />
      {showLabel ? (
        <span>{t("admin.nav.logout")}</span>
      ) : (
        <span className="sr-only">{t("admin.nav.logout")}</span>
      )}
    </Button>
  );
}
