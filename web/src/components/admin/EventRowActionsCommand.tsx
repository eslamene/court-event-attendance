"use client";

import { useMemo, useState } from "react";
import {
  Armchair,
  MapTrifold,
  DotsThreeVertical,
  EnvelopeSimple,
  ListBullets,
  PencilSimple,
  Trash,
  ArrowSquareOut,
  type Icon,
} from "@phosphor-icons/react";
import { useI18n } from "@/components/I18nProvider";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type EventRowAction =
  | "edit"
  | "emailTemplate"
  | "registrationForm"
  | "seating"
  | "seatMap"
  | "openRegistration"
  | "clearData"
  | "deleteEvent";

type EventRow = {
  id: string;
  name: string;
  registrationCount: number;
  registrationUrl: string;
};

type ActionDef = {
  id: EventRowAction;
  label: string;
  keywords: string;
  icon: Icon;
  destructive?: boolean;
};

type Props = {
  event: EventRow;
  onAction: (action: EventRowAction) => void;
};

export function EventRowActionsCommand({ event, onAction }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const { general, danger } = useMemo(() => {
    const generalActions: ActionDef[] = [
      {
        id: "edit",
        label: t("admin.events.edit"),
        keywords: "edit تعديل",
        icon: PencilSimple,
      },
      {
        id: "emailTemplate",
        label: t("admin.events.emailTemplate"),
        keywords: "email template mail بريد قالب",
        icon: EnvelopeSimple,
      },
      {
        id: "registrationForm",
        label: t("admin.events.registrationForm"),
        keywords: "form registration نموذج تسجيل",
        icon: ListBullets,
      },
      {
        id: "seating",
        label: t("admin.events.seating"),
        keywords: "seating seats tiers مقاعد",
        icon: Armchair,
      },
      {
        id: "seatMap",
        label: t("admin.events.seatMap"),
        keywords: "seat map live visual خريطة مقاعد",
        icon: MapTrifold,
      },
      {
        id: "openRegistration",
        label: t("admin.events.openRegistration"),
        keywords: "open link url register تسجيل رابط",
        icon: ArrowSquareOut,
      },
    ];

    const dangerActions: ActionDef[] =
      event.registrationCount > 0
        ? [
            {
              id: "clearData",
              label: t("admin.events.clearData"),
              keywords: "clear delete data مسح بيانات",
              icon: Trash,
              destructive: true,
            },
          ]
        : [
            {
              id: "deleteEvent",
              label: t("admin.events.deleteEvent"),
              keywords: "delete remove حذف فعالية",
              icon: Trash,
              destructive: true,
            },
          ];

    return { general: generalActions, danger: dangerActions };
  }, [event.registrationCount, t]);

  function run(action: EventRowAction) {
    setOpen(false);
    if (action === "openRegistration") {
      window.open(event.registrationUrl, "_blank", "noopener,noreferrer");
      return;
    }
    onAction(action);
  }

  function renderItem(action: ActionDef) {
    const IconComp = action.icon;
    return (
      <CommandItem
        key={action.id}
        value={`${action.label} ${action.keywords}`}
        onSelect={() => run(action.id)}
        className={cn(
          action.destructive &&
            "text-destructive data-[selected=true]:bg-destructive/10 data-[selected=true]:text-destructive"
        )}
      >
        <IconComp size={18} className="shrink-0 opacity-80" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{action.label}</span>
      </CommandItem>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-9 gap-2 border-gold/35 bg-[#faf8f5] px-3 text-gold-dark shadow-sm hover:border-gold/60 hover:bg-[#f5f0e8] data-[popup-open]:border-gold data-[popup-open]:bg-[#f5f0e8]"
            aria-label={t("admin.events.actionsMenu")}
          />
        }
      >
        <DotsThreeVertical size={22} weight="bold" aria-hidden />
        <span className="text-sm font-semibold">
          {t("admin.events.actionsShort")}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <Command>
          <CommandInput placeholder={t("admin.events.searchActions")} />
          <CommandList>
            <CommandEmpty>{t("admin.events.noActionsFound")}</CommandEmpty>
            <CommandGroup heading={t("admin.events.actionsGroupGeneral")}>
              {general.map(renderItem)}
            </CommandGroup>
            {danger.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading={t("admin.events.actionsGroupDanger")}>
                  {danger.map(renderItem)}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
