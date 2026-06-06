"use client";

import { useSession } from "next-auth/react";
import { useI18n } from "@/components/I18nProvider";
import { FeedbackProvider } from "@/components/ui/FeedbackProvider";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminAppSidebar } from "@/components/admin/AdminAppSidebar";
import { AdminNotificationsBell } from "@/components/admin/AdminNotificationsBell";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { t, direction } = useI18n();
  const roleCode = session?.user?.roleCode ?? "";
  const roleName = session?.user?.roleName ?? "";
  const roleKey = roleCode ? `roles.${roleCode}` : "";
  const roleTranslated = roleKey ? t(roleKey) : "";
  const roleLabel =
    roleName && roleTranslated === roleKey ? roleName : roleTranslated || roleName;

  return (
    <FeedbackProvider>
      <TooltipProvider delay={0}>
        <SidebarProvider defaultOpen>
          <AdminAppSidebar />
          <SidebarInset dir={direction} className="max-h-svh min-h-0 overflow-hidden">
            <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
              <SidebarTrigger className="-ms-1" />
              <Separator
                orientation="vertical"
                className="mx-1 data-[orientation=vertical]:h-4"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {session?.user?.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {roleLabel || roleCode}
                </p>
              </div>
              <LocaleSwitcher className="shrink-0" />
              <AdminNotificationsBell />
            </header>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-6">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </FeedbackProvider>
  );
}
