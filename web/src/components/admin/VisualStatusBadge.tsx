"use client";

import {
  CheckCircle,
  Clock,
  PauseCircle,
  Prohibit,
  SealCheck,
  type Icon,
} from "@phosphor-icons/react";
import { useI18n } from "@/components/I18nProvider";
import { cn } from "@/lib/utils";

const REGISTRATION_STATUS = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "ATTENDED",
] as const;

type RegistrationStatus = (typeof REGISTRATION_STATUS)[number];

const registrationStyles: Record<
  RegistrationStatus,
  { icon: Icon; ring: string; bg: string; text: string; dot: string }
> = {
  PENDING: {
    icon: Clock,
    ring: "ring-amber-200/80",
    bg: "bg-amber-50",
    text: "text-amber-950",
    dot: "bg-amber-500",
  },
  APPROVED: {
    icon: SealCheck,
    ring: "ring-sky-200/80",
    bg: "bg-sky-50",
    text: "text-sky-950",
    dot: "bg-sky-500",
  },
  REJECTED: {
    icon: Prohibit,
    ring: "ring-red-200/80",
    bg: "bg-red-50",
    text: "text-red-950",
    dot: "bg-red-500",
  },
  ATTENDED: {
    icon: CheckCircle,
    ring: "ring-emerald-200/80",
    bg: "bg-emerald-50",
    text: "text-emerald-950",
    dot: "bg-emerald-500",
  },
};

type RegistrationProps = {
  kind: "registration";
  status: string;
  className?: string;
};

type ActiveProps = {
  kind: "event" | "user";
  active: boolean;
  className?: string;
};

type Props = RegistrationProps | ActiveProps;

export function VisualStatusBadge(props: Props) {
  const { t } = useI18n();

  if (props.kind === "registration") {
    const key = props.status as RegistrationStatus;
    const style = registrationStyles[key];
    if (!style) {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground",
            props.className
          )}
        >
          {props.status}
        </span>
      );
    }
    const IconComp = style.icon;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
          style.ring,
          style.bg,
          style.text,
          props.className
        )}
        title={t(`status.${key}`)}
      >
        <span
          className={cn("size-1.5 shrink-0 rounded-full", style.dot)}
          aria-hidden
        />
        <IconComp size={14} weight="duotone" className="shrink-0 opacity-90" aria-hidden />
        <span>{t(`status.${key}`)}</span>
      </span>
    );
  }

  const active = props.active;
  const label =
    props.kind === "event"
      ? active
        ? t("admin.events.active")
        : t("admin.events.inactive")
      : active
        ? t("admin.users.active")
        : t("admin.users.inactive");

  const IconComp = active ? CheckCircle : PauseCircle;
  const isUserDisabled = props.kind === "user" && !active;
  const style = active
    ? {
        ring: "ring-emerald-200/80",
        bg: "bg-emerald-50",
        text: "text-emerald-950",
        dot: "bg-emerald-500",
        border: "border-emerald-200/60",
      }
    : isUserDisabled
      ? {
          ring: "ring-red-200/80",
          bg: "bg-red-50",
          text: "text-red-950",
          dot: "bg-red-500",
          border: "border-red-200/60",
        }
      : {
          ring: "ring-slate-200/80",
          bg: "bg-slate-100",
          text: "text-slate-700",
          dot: "bg-slate-400",
          border: "border-slate-200/80",
        };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        style.ring,
        style.bg,
        style.text,
        style.border,
        props.className
      )}
      title={label}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", style.dot)}
        aria-hidden
      />
      <IconComp size={14} weight="duotone" className="shrink-0 opacity-90" aria-hidden />
      <span>{label}</span>
    </span>
  );
}

