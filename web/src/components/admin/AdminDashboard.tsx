"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { IconProps } from "@phosphor-icons/react";
import {
  Calendar,
  CheckCircle,
  Clock,
  HandWaving,
  Prohibit,
  Scroll,
  Users,
  ArrowLeft,
  ArrowRight,
  Clipboard,
  Radio,
  SealCheck,
  TrendUp,
} from "@phosphor-icons/react";
import { format, formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useI18n } from "@/components/I18nProvider";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { cn } from "@/lib/utils";

type DashboardData = {
  registrations: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    attended: number;
    withdrawn: number;
  };
  events: {
    active: number;
    total: number;
    upcoming: { id: string; name: string; date: string; slug: string; registrationCount: number }[];
  };
  recentPending: {
    id: string;
    fullName: string;
    rank: string;
    eventName: string;
    createdAt: string;
  }[];
  recentAudit: {
    id: string;
    action: string;
    entityLabel: string | null;
    actorName: string | null;
    createdAt: string;
  }[];
};

function actionLabelKey(action: string) {
  return `audit.action.${action.replace(/\./g, "_")}`;
}

function StatCard({
  label,
  value,
  icon: Icon,
  href,
  barClass,
  iconBgClass,
  highlight,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<IconProps>;
  href?: string;
  barClass: string;
  iconBgClass: string;
  highlight?: boolean;
}) {
  const inner = (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm transition hover:shadow-md",
        href && "hover:border-gold/40",
        highlight && "ring-2 ring-amber-400/50"
      )}
    >
      <div
        className={cn("absolute inset-y-0 start-0 w-1 rounded-s-xl", barClass)}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-3 ps-2">
        <div>
          <p className="text-xs font-medium text-bronze">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-gold-dark">
            {value.toLocaleString()}
          </p>
        </div>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            iconBgClass
          )}
        >
          <Icon size={22} className="text-gold-dark" weight="duotone" />
        </span>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}

export function AdminDashboard() {
  const { t, locale, direction } = useI18n();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const dateLocale = locale === "ar" ? ar : enUS;
  const Arrow = direction === "rtl" ? ArrowLeft : ArrowRight;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title={t("admin.dashboard.title")} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-border bg-card"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <p className="rounded-xl border border-border bg-card px-6 py-12 text-center text-bronze">
        {t("admin.dashboard.loadError")}
      </p>
    );
  }

  const { registrations: reg, events } = data;

  const quickActions = [
    {
      href: "/admin/registrations?status=PENDING",
      icon: Clipboard,
      label: t("admin.dashboard.reviewPending"),
      show: reg.pending > 0,
      primary: true,
    },
    {
      href: "/admin/events",
      icon: Calendar,
      label: t("admin.nav.events"),
      show: isAdmin,
    },
    {
      href: "/admin/users",
      icon: Users,
      label: t("admin.nav.users"),
      show: isAdmin,
    },
    {
      href: "/admin/settings/channels",
      icon: Radio,
      label: t("admin.settings.tabChannels"),
      show: isAdmin,
    },
    {
      href: "/admin/audit",
      icon: Scroll,
      label: t("admin.nav.audit"),
      show: isAdmin,
    },
  ].filter((a) => a.show);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pb-4">
      <AdminPageHeader
        title={t("admin.dashboard.title")}
        description={t("admin.dashboard.welcome", {
          name: session?.user?.name ?? "",
        })}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label={t("admin.dashboard.statPending")}
          value={reg.pending}
          icon={Clock}
          href="/admin/registrations?status=PENDING"
          barClass="bg-amber-500"
          iconBgClass="bg-amber-100"
          highlight={reg.pending > 0}
        />
        <StatCard
          label={t("admin.dashboard.statApproved")}
          value={reg.approved}
          icon={SealCheck}
          href="/admin/registrations?status=APPROVED"
          barClass="bg-sky-500"
          iconBgClass="bg-sky-100"
        />
        <StatCard
          label={t("admin.dashboard.statAttended")}
          value={reg.attended}
          icon={CheckCircle}
          href="/admin/registrations?status=ATTENDED"
          barClass="bg-emerald-500"
          iconBgClass="bg-emerald-100"
        />
        <StatCard
          label={t("admin.dashboard.statRejected")}
          value={reg.rejected}
          icon={Prohibit}
          href="/admin/registrations?status=REJECTED"
          barClass="bg-red-500"
          iconBgClass="bg-red-100"
        />
        <StatCard
          label={t("admin.dashboard.statWithdrawn")}
          value={reg.withdrawn}
          icon={HandWaving}
          href="/admin/registrations?status=WITHDRAWN"
          barClass="bg-violet-500"
          iconBgClass="bg-violet-100"
        />
        <StatCard
          label={t("admin.dashboard.statEvents")}
          value={events.active}
          icon={Calendar}
          href={isAdmin ? "/admin/events" : undefined}
          barClass="bg-gold-dark"
          iconBgClass="bg-[#f5f0e8]"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="font-bold text-gold-dark">
                {t("admin.dashboard.pendingTitle")}
              </h2>
              <p className="text-xs text-bronze">
                {t("admin.dashboard.pendingSubtitle")}
              </p>
            </div>
            <Link
              href="/admin/registrations?status=PENDING"
              className="inline-flex items-center gap-1 text-sm font-medium text-gold-dark hover:text-bronze"
            >
              {t("admin.dashboard.viewAll")}
              <Arrow size={16} weight="bold" />
            </Link>
          </div>
          {data.recentPending.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-bronze">
              {t("admin.dashboard.noPending")}
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {data.recentPending.map((r) => (
                <li key={r.id}>
                  <Link
                    href="/admin/registrations?status=PENDING"
                    className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-[#faf8f5]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {r.fullName}
                      </p>
                      <p className="truncate text-xs text-bronze">
                        {r.rank} · {r.eventName}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-bronze">
                      {formatDistanceToNow(new Date(r.createdAt), {
                        addSuffix: true,
                        locale: dateLocale,
                      })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 font-bold text-gold-dark">
              <TrendUp size={20} weight="duotone" className="text-bronze" />
              {t("admin.dashboard.quickActions")}
            </h2>
            <div className="flex flex-col gap-2">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium transition",
                    action.primary
                      ? "border-gold-dark/30 bg-gold-dark text-white hover:bg-bronze"
                      : "border-border bg-[#faf8f5] text-gold-dark hover:bg-[#f5f0e8]"
                  )}
                >
                  <action.icon size={20} weight="duotone" />
                  {action.label}
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 font-bold text-gold-dark">
              {t("admin.dashboard.upcomingEvents")}
            </h2>
            {events.upcoming.length === 0 ? (
              <p className="text-sm text-bronze">{t("admin.dashboard.noEvents")}</p>
            ) : (
              <ul className="space-y-3">
                {events.upcoming.map((e) => (
                  <li
                    key={e.id}
                    className="rounded-lg border border-border/80 bg-[#faf8f5] px-3 py-2"
                  >
                    <p className="font-medium text-foreground">{e.name}</p>
                    <p className="text-xs text-bronze">
                      {format(new Date(e.date), "EEEE d MMM yyyy", {
                        locale: dateLocale,
                      })}
                    </p>
                    <p className="mt-1 text-xs text-bronze">
                      {t("admin.dashboard.registrationCount", {
                        count: String(e.registrationCount),
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {isAdmin && (
              <Link
                href="/admin/events"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-gold-dark hover:text-bronze"
              >
                {t("admin.nav.events")}
                <Arrow size={14} weight="bold" />
              </Link>
            )}
          </section>
        </div>
      </div>

      {isAdmin && data.recentAudit.length > 0 && (
        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-bold text-gold-dark">
              {t("admin.dashboard.recentActivity")}
            </h2>
            <Link
              href="/admin/audit"
              className="inline-flex items-center gap-1 text-sm font-medium text-gold-dark hover:text-bronze"
            >
              {t("admin.dashboard.fullAudit")}
              <Arrow size={16} weight="bold" />
            </Link>
          </div>
          <ul className="divide-y divide-border/60">
            {data.recentAudit.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"
              >
                <div className="min-w-0">
                  <span className="font-medium text-gold-dark">
                    {t(actionLabelKey(a.action)) !== actionLabelKey(a.action)
                      ? t(actionLabelKey(a.action))
                      : a.action}
                  </span>
                  {a.entityLabel && (
                    <span className="text-bronze"> — {a.entityLabel}</span>
                  )}
                  {a.actorName && (
                    <p className="text-xs text-bronze">{a.actorName}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-bronze">
                  {formatDistanceToNow(new Date(a.createdAt), {
                    addSuffix: true,
                    locale: dateLocale,
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="rounded-xl border border-gold/20 bg-gradient-to-br from-[#f5f0e8] to-card px-5 py-4">
        <p className="text-sm text-bronze">
          <span className="font-semibold text-gold-dark">
            {reg.total.toLocaleString()}
          </span>{" "}
          {t("admin.dashboard.totalRegistrations")}
          {" · "}
          <span className="font-semibold text-gold-dark">{events.total}</span>{" "}
          {t("admin.dashboard.totalEventsLabel")}
        </p>
      </div>
    </div>
  );
}
