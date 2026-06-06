"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { adminSignOut } from "@/components/admin/AdminLogoutButton";
import {
  BookOpen,
  Calendar,
  ChevronsUpDown,
  ClipboardList,
  LayoutTemplate,
  LayoutDashboard,
  LogOut,
  ListChecks,
  Mail,
  Radio,
  ScrollText,
  Shield,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import type { RolePermission } from "@/lib/role-permissions";
import { PLATFORM_LOGO_PATH } from "@/lib/platform-logo";

const mainNavItems = [
  {
    href: "/admin",
    icon: LayoutDashboard,
    labelKey: "admin.nav.dashboard" as const,
    exact: true,
  },
  {
    href: "/admin/registrations",
    icon: ClipboardList,
    labelKey: "admin.nav.registrations" as const,
    permission: "manage_registrations" as const,
  },
  {
    href: "/admin/events",
    icon: Calendar,
    labelKey: "admin.nav.events" as const,
    permission: "manage_events" as const,
  },
  {
    href: "/admin/seating/designer",
    icon: LayoutTemplate,
    labelKey: "admin.nav.seatingDesigner" as const,
    permission: "manage_seating" as const,
    designerNav: true,
  },
] as const;

const systemNavItems = [
  {
    href: "/admin/settings/users",
    icon: Users,
    labelKey: "admin.settings.tabUsers" as const,
    permission: "manage_users" as const,
  },
  {
    href: "/admin/settings/roles",
    icon: Shield,
    labelKey: "admin.settings.tabRoles" as const,
    permission: "manage_roles" as const,
  },
  {
    href: "/admin/settings/channels",
    icon: Radio,
    labelKey: "admin.settings.tabChannels" as const,
    permission: "manage_settings" as const,
  },
  {
    href: "/admin/settings/email-template",
    icon: Mail,
    labelKey: "admin.settings.tabEmail" as const,
    permission: "manage_settings" as const,
  },
  {
    href: "/admin/settings/registration-form",
    icon: ListChecks,
    labelKey: "admin.settings.tabRegistrationForm" as const,
    permission: "manage_settings" as const,
  },
  {
    href: "/admin/settings/advanced",
    icon: SlidersHorizontal,
    labelKey: "admin.settings.tabAdvanced" as const,
    permission: "manage_settings" as const,
  },
  {
    href: "/admin/dictionary",
    icon: BookOpen,
    labelKey: "admin.nav.dictionary" as const,
    permission: "manage_dictionary" as const,
  },
  {
    href: "/admin/audit",
    icon: ScrollText,
    labelKey: "admin.nav.audit" as const,
    permission: "view_audit" as const,
  },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initials(name?: string | null) {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function AdminAppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t, direction } = useI18n();
  const { has, loading: permissionsLoading } = useUserPermissions();
  const roleCode = session?.user?.roleCode ?? "";
  const roleName = session?.user?.roleName ?? "";
  const roleKey = roleCode ? `roles.${roleCode}` : "";
  const roleTranslated = roleKey ? t(roleKey) : "";
  const roleLabel =
    roleName && roleTranslated === roleKey ? roleName : roleTranslated || roleName;
  const side = direction === "rtl" ? "right" : "left";

  const items = mainNavItems.filter((item) => {
    if (permissionsLoading) return item.href === "/admin";
    if (item.href === "/admin/registrations") {
      return has("manage_registrations") || has("approve_registrations");
    }
    if ("designerNav" in item && item.designerNav) {
      return has("manage_seating") || has("manage_events");
    }
    if ("permission" in item && item.permission) {
      return has(item.permission);
    }
    return true;
  });

  const systemItems = systemNavItems.filter((item) => {
    if (permissionsLoading) return false;
    return has(item.permission);
  });

  return (
    <Sidebar side={side} variant="inset" collapsible="icon" dir={direction}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-active:bg-transparent"
              render={
                <Link href="/admin" className="flex items-center gap-3" />
              }
            >
              <Image
                src={PLATFORM_LOGO_PATH}
                alt=""
                width={36}
                height={36}
                className="size-9 shrink-0 rounded-full object-cover"
              />
              <div className="flex min-w-0 flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold text-sidebar-foreground">
                  {t("admin.shellTitle")}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {t("admin.shellSubtitle")}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("admin.nav.groupMain")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active =
                  "designerNav" in item && item.designerNav
                    ? pathname === item.href ||
                      pathname.includes("/seating/designer")
                    : isActive(
                        pathname,
                        item.href,
                        "exact" in item ? item.exact : false
                      );
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={t(item.labelKey)}
                      render={<Link href={item.href} />}
                    >
                      <item.icon />
                      <span>{t(item.labelKey)}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {systemItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("admin.nav.groupSystem")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {systemItems.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={t(item.labelKey)}
                        render={<Link href={item.href} />}
                      >
                        <item.icon />
                        <span>{t(item.labelKey)}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <Popover>
              <PopoverTrigger
                render={
                  <SidebarMenuButton
                    type="button"
                    size="lg"
                    className="w-full data-[popup-open]:bg-sidebar-accent"
                  />
                }
              >
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-gold-dark/10 text-gold-dark">
                    {initials(session?.user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 text-start text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-medium">
                    {session?.user?.name ?? "—"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {roleLabel || roleCode}
                  </span>
                </div>
                <ChevronsUpDown className="ms-auto size-4 group-data-[collapsible=icon]:hidden" />
              </PopoverTrigger>
              <PopoverContent
                className="min-w-56 p-2"
                side={side === "right" ? "left" : "right"}
                align="end"
                sideOffset={4}
              >
                <div className="border-b border-border px-2 pb-2">
                  <p className="text-sm font-medium">{session?.user?.name}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">
                    {session?.user?.email}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="mt-2 w-full justify-center gap-2"
                  onClick={adminSignOut}
                >
                  <LogOut className="size-4" aria-hidden />
                  {t("admin.nav.logout")}
                </Button>
              </PopoverContent>
            </Popover>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
