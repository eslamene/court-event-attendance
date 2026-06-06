"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Shield, Smartphone, UserCog, Users } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RolePermission } from "@/lib/role-permissions";
import type { UserRole } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

type RoleSummary = {
  id: UserRole;
  permissions: RolePermission[];
  activeUsers: number;
  totalUsers: number;
};

const ROLE_ICONS: Record<UserRole, typeof Shield> = {
  ADMIN: Shield,
  APPROVAL_MANAGER: UserCog,
  EVENT_STAFF: Smartphone,
};

export function RolesPanel() {
  const { t } = useI18n();
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/roles");
      const data = await res.json();
      if (!res.ok) {
        setError(String(data.error || t("admin.roles.loadFailed")));
        setRoles([]);
        return;
      }
      setRoles(data.roles ?? []);
    } catch {
      setError(t("admin.roles.loadFailed"));
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <p className="py-12 text-center text-sm text-bronze">
        {t("admin.registrationForm.loading")}
      </p>
    );
  }

  if (error) {
    return (
      <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-error">{error}</p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-bronze">{t("admin.roles.intro")}</p>

      <div className="grid gap-4 lg:grid-cols-3">
        {roles.map((role) => {
          const Icon = ROLE_ICONS[role.id];
          return (
            <article
              key={role.id}
              className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold-dark">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gold-dark">
                    {t(`roles.${role.id}`)}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-bronze">
                    {t(`admin.roles.description.${role.id}`)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-bronze">
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Users className="size-3" aria-hidden />
                  {t("admin.roles.userCount", {
                    active: String(role.activeUsers),
                    total: String(role.totalUsers),
                  })}
                </Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {role.permissions.map((permission) => (
                  <span
                    key={permission}
                    className={cn(
                      "rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-medium text-gold-dark"
                    )}
                  >
                    {t(`admin.roles.permission.${permission}`)}
                  </span>
                ))}
              </div>

              <div className="mt-4 border-t border-border pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  render={
                    <Link
                      href={`/admin/settings/users?role=${role.id}`}
                    />
                  }
                >
                  {t("admin.roles.viewUsers")}
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      <p className="text-xs text-bronze/80">{t("admin.roles.fixedRolesHint")}</p>
    </div>
  );
}
