"use client";

import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Ban,
  CheckCircle2,
  Clock,
  Hand,
  PauseCircle,
} from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/utils";

const REGISTRATION_STATUS = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "ATTENDED",
  "WITHDRAWN",
] as const;

type RegistrationStatus = (typeof REGISTRATION_STATUS)[number];

const registrationStyles: Record<
  RegistrationStatus,
  { icon: LucideIcon; className: string }
> = {
  PENDING: {
    icon: Clock,
    className:
      "border-amber-200/80 bg-amber-50 text-amber-950 ring-amber-200/80",
  },
  APPROVED: {
    icon: BadgeCheck,
    className: "border-sky-200/80 bg-sky-50 text-sky-950 ring-sky-200/80",
  },
  REJECTED: {
    icon: Ban,
    className: "border-red-200/80 bg-red-50 text-red-950 ring-red-200/80",
  },
  ATTENDED: {
    icon: CheckCircle2,
    className:
      "border-emerald-200/80 bg-emerald-50 text-emerald-950 ring-emerald-200/80",
  },
  WITHDRAWN: {
    icon: Hand,
    className:
      "border-violet-200/80 bg-violet-50 text-violet-950 ring-violet-200/80",
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
        <Tag variant="outline" className={props.className}>
          {props.status}
        </Tag>
      );
    }
    return (
      <Tag
        icon={style.icon}
        title={t(`status.${key}`)}
        className={cn("ring-1 ring-inset", style.className, props.className)}
      >
        {t(`status.${key}`)}
      </Tag>
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

  const isUserDisabled = props.kind === "user" && !active;
  const style = active
    ? {
        icon: CheckCircle2,
        className:
          "border-emerald-200/80 bg-emerald-50 text-emerald-950 ring-emerald-200/80",
      }
    : isUserDisabled
      ? {
          icon: Ban,
          className:
            "border-red-200/80 bg-red-50 text-red-950 ring-red-200/80",
        }
      : {
          icon: PauseCircle,
          className:
            "border-slate-200/80 bg-slate-100 text-slate-700 ring-slate-200/80",
        };

  return (
    <Tag
      icon={style.icon}
      title={label}
      className={cn("ring-1 ring-inset", style.className, props.className)}
    >
      {label}
    </Tag>
  );
}
