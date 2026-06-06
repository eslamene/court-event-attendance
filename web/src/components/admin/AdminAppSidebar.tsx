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
  },
  {
    href: "/admin/events",
    icon: Calendar,
    labelKey: "admin.nav.events" as const,
    adminOnly: true,
  },
] as const;

const systemNavItems = [
  {
    href: "/admin/settings/users",
    icon: Users,
    labelKey: "admin.settings.tabUsers" as const,
  },
  {
    href: "/admin/settings/roles",
    icon: Shield,
    labelKey: "admin.settings.tabRoles" as const,
  },
  {
    href: "/admin/settings/channels",
    icon: Radio,
    labelKey: "admin.settings.tabChannels" as const,
  },
  {
    href: "/admin/settings/email-template",
    icon: Mail,
    labelKey: "admin.settings.tabEmail" as const,
  },
  {
    href: "/admin/settings/registration-form",
    icon: ListChecks,
    labelKey: "admin.settings.tabRegistrationForm" as const,
  },
  {
    href: "/admin/settings/advanced",
    icon: SlidersHorizontal,
    labelKey: "admin.settings.tabAdvanced" as const,
  },
  {
    href: "/admin/dictionary",
    icon: BookOpen,
    labelKey: "admin.nav.dictionary" as const,
  },
  {
    href: "/admin/audit",
    icon: ScrollText,
    labelKey: "admin.nav.audit" as const,
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
  const isAdmin = session?.user?.role === "ADMIN";
  const role = session?.user?.role ?? "";
  const roleLabel = role ? t(`roles.${role}`) : "";
  const side = direction === "rtl" ? "right" : "left";

  const items = mainNavItems.filter(
    (item) => !("adminOnly" in item) || isAdmin
  );

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
                const active = isActive(
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

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("admin.nav.groupSystem")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {systemNavItems.map((item) => {
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
                    {roleLabel || role}
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
