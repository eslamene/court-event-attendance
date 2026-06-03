"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useI18n } from "@/components/I18nProvider";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const SEEN_KEY = "court_admin_notifications_seen_at";
const POLL_MS = 45_000;

type NotificationItem = {
  id: string;
  fullName: string;
  eventName: string;
  rank: string;
  createdAt: string;
};

type NotificationData = {
  pendingCount: number;
  newCount: number;
  items: NotificationItem[];
};

function getSeenAt(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SEEN_KEY);
}

function markSeen() {
  localStorage.setItem(SEEN_KEY, new Date().toISOString());
}

export function AdminNotificationsBell() {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const dateLocale = locale === "ar" ? ar : enUS;

  const fetchNotifications = useCallback(async () => {
    const since = getSeenAt();
    const params = since ? `?since=${encodeURIComponent(since)}` : "";
    try {
      const res = await fetch(`/api/admin/notifications${params}`);
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, POLL_MS);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  useEffect(() => {
    if (open) {
      markSeen();
      void fetchNotifications();
    }
  }, [open, fetchNotifications]);

  const badgeCount = data?.newCount ?? 0;
  const pendingCount = data?.pendingCount ?? 0;

  function handleMarkAllRead() {
    markSeen();
    void fetchNotifications();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative shrink-0 text-gold-dark hover:bg-[#f5f0e8]"
            aria-label={t("admin.notifications.title")}
          />
        }
      >
        <Bell className="size-5" aria-hidden />
        {badgeCount > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        <div className="border-b border-border px-4 py-3">
          <p className="font-semibold text-gold-dark">
            {t("admin.notifications.title")}
          </p>
          <p className="mt-0.5 text-xs text-bronze">
            {loading
              ? "…"
              : t("admin.notifications.summary", {
                  new: String(badgeCount),
                  pending: String(pendingCount),
                })}
          </p>
        </div>

        <div className="max-h-72 overflow-y-auto">
          {loading ? (
            <p className="px-4 py-6 text-center text-sm text-bronze">
              {t("admin.registrations.loading")}
            </p>
          ) : !data?.items.length ? (
            <p className="px-4 py-6 text-center text-sm text-bronze">
              {t("admin.notifications.empty")}
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {data.items.map((item) => (
                <li key={item.id}>
                  <Link
                    href="/admin/registrations?tab=pending"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 transition hover:bg-[#faf8f5]"
                  >
                    <p className="font-medium text-foreground">
                      {item.fullName}
                    </p>
                    <p className="text-xs text-bronze">{item.eventName}</p>
                    <p className="mt-1 text-[10px] text-bronze">
                      {formatDistanceToNow(new Date(item.createdAt), {
                        addSuffix: true,
                        locale: dateLocale,
                      })}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border p-3">
          <Link
            href="/admin/registrations?tab=pending"
            onClick={() => {
              handleMarkAllRead();
              setOpen(false);
            }}
            className={cn(
              "flex-1 rounded-lg bg-gold-dark px-3 py-2 text-center text-xs font-semibold text-white hover:bg-bronze"
            )}
          >
            {t("admin.notifications.viewAll")}
          </Link>
          {badgeCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-bronze hover:bg-[#f5f0e8]"
            >
              {t("admin.notifications.markRead")}
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
