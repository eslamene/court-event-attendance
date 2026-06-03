"use client";

import { useState } from "react";
import { Braces } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatPlaceholderToken } from "@/lib/email-template-placeholders";
import { cn } from "@/lib/utils";

type Placeholder = { key: string; descriptionKey: string };

type ActiveField = "subject" | "body";

type Props = {
  placeholders: Placeholder[];
  activeField: ActiveField;
  onActiveFieldChange: (field: ActiveField) => void;
  onInsert: (key: string) => void;
};

export function EmailTemplatePlaceholderCommand({
  placeholders,
  activeField,
  onActiveFieldChange,
  onInsert,
}: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-gold-dark"
            />
          }
        >
          <Braces className="size-3.5" aria-hidden />
          <span>{t("admin.emailTemplate.insertField")}</span>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command>
            <CommandInput
              placeholder={t("admin.emailTemplate.searchFields")}
            />
            <CommandList>
              <CommandEmpty>
                {t("admin.emailTemplate.noFieldsFound")}
              </CommandEmpty>
              <CommandGroup heading={t("admin.emailTemplate.placeholders")}>
                {placeholders.map((ph) => (
                  <CommandItem
                    key={ph.key}
                    value={`${t(ph.descriptionKey)} ${ph.key} ${formatPlaceholderToken(ph.key)}`}
                    onSelect={() => {
                      onInsert(ph.key);
                      setOpen(false);
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {t(ph.descriptionKey)}
                    </span>
                    <span
                      className="shrink-0 font-mono text-[10px] text-muted-foreground"
                      dir="ltr"
                    >
                      {formatPlaceholderToken(ph.key)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <div
        className="inline-flex rounded-lg border border-border bg-card p-0.5"
        role="group"
        aria-label={t("admin.emailTemplate.insertTarget")}
      >
        {(["subject", "body"] as const).map((field) => (
          <button
            key={field}
            type="button"
            onClick={() => onActiveFieldChange(field)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition",
              activeField === field
                ? "bg-gold-dark text-white"
                : "text-bronze hover:bg-[#f5f0e8]"
            )}
          >
            {field === "subject"
              ? t("admin.emailTemplate.subject")
              : t("admin.emailTemplate.htmlBody")}
          </button>
        ))}
      </div>
    </div>
  );
}
