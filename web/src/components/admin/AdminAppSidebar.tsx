"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  BookOpen,
  Calendar,
  ChevronsUpDown,
  ClipboardList,
  LogOut,
  ListChecks,
  Mail,
  Radio,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    icon: ClipboardList,
    labelKey: "admin.nav.registrations" as const,
    exact: true,
  },
  {
    href: "/admin/events",
    icon: Calendar,
    labelKey: "admin.nav.events" as const,
    adminOnly: true,
  },
  {
    href: "/admin/users",
    icon: Users,
    labelKey: "admin.nav.users" as const,
    adminOnly: true,
  },
] as const;

const systemNavItems = [
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
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent"
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
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
                side={side === "right" ? "left" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">{session?.user?.name}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">
                      {session?.user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => signOut({ callbackUrl: "/admin/login" })}
                >
                  <LogOut />
                  {t("admin.nav.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
