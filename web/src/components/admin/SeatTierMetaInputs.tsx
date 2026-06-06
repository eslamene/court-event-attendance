"use client";

import { useId, useRef } from "react";
import { Banknote, Check, Palette, Pipette, X } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatTierPrice,
  normalizeTierColor,
  TIER_COLOR_PALETTE,
} from "@/lib/seat-tier-style";
import { cn } from "@/lib/utils";

type Props = {
  color: string;
  price: number | null | undefined;
  onColorChange: (color: string) => void;
  onPriceChange: (price: number | null) => void;
  className?: string;
  /** Sidebar tier list — single tight row. */
  compact?: boolean;
};

export function SeatTierMetaInputs({
  color,
  price,
  onColorChange,
  onPriceChange,
  className,
  compact = false,
}: Props) {
  const { t, locale } = useI18n();
  const colorInputId = useId();
  const colorInputRef = useRef<HTMLInputElement>(null);
  const normalizedColor = normalizeTierColor(color);
  const isCustomColor = !TIER_COLOR_PALETTE.includes(
    normalizedColor as (typeof TIER_COLOR_PALETTE)[number]
  );
  const pricePreview =
    price != null ? formatTierPrice(price, locale) : null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        compact
          ? "rounded-md bg-[#faf8f5]/50 py-0.5"
          : "rounded-lg border border-border/70 bg-[#faf8f5]/70 px-2 py-1.5",
        className
      )}
    >
      {!compact ? (
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-bronze/70"
          title={t("seating.tierColor")}
          aria-hidden
        >
          <Palette className="size-3.5" />
        </span>
      ) : null}

      <div
        className="flex flex-wrap items-center gap-1"
        role="group"
        aria-label={t("seating.tierColor")}
      >
        {TIER_COLOR_PALETTE.map((swatch) => {
          const selected = normalizedColor === swatch;
          return (
            <Tooltip key={swatch}>
              <TooltipTrigger
                type="button"
                onClick={() => onColorChange(swatch)}
                aria-pressed={selected}
                aria-label={t("seating.tierColor")}
                className={cn(
                  "relative rounded-full border-2 transition-transform hover:scale-110",
                  compact ? "size-4" : "size-5",
                  selected
                    ? "border-foreground shadow-sm"
                    : "border-white/80 hover:border-foreground/30"
                )}
                style={{ backgroundColor: swatch }}
              >
                {selected ? (
                  <Check
                    className="absolute inset-0 m-auto size-3 text-white drop-shadow-sm"
                    strokeWidth={3}
                    aria-hidden
                  />
                ) : null}
              </TooltipTrigger>
              <TooltipContent>{swatch}</TooltipContent>
            </Tooltip>
          );
        })}

        <Tooltip>
          <TooltipTrigger
            type="button"
            onClick={() => colorInputRef.current?.click()}
            aria-pressed={isCustomColor}
            aria-label={t("seating.tierColorCustom")}
            className={cn(
              "relative flex items-center justify-center overflow-hidden rounded-full border-2 transition-transform hover:scale-110",
              compact ? "size-4" : "size-5",
              isCustomColor
                ? "border-foreground shadow-sm"
                : "border-dashed border-bronze/40 bg-card text-bronze/60"
            )}
            style={
              isCustomColor ? { backgroundColor: normalizedColor } : undefined
            }
          >
            {isCustomColor ? (
              <Check
                className="size-3 text-white drop-shadow-sm"
                strokeWidth={3}
                aria-hidden
              />
            ) : (
              <Pipette className="size-2.5" aria-hidden />
            )}
          </TooltipTrigger>
          <TooltipContent>{t("seating.tierColorCustom")}</TooltipContent>
        </Tooltip>
        <input
          ref={colorInputRef}
          id={colorInputId}
          type="color"
          value={normalizedColor}
          onChange={(e) => onColorChange(e.target.value)}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
        />
      </div>

      <div
        className={cn("hidden h-5 w-px shrink-0 bg-border sm:block", compact && "mx-0.5")}
        aria-hidden
      />

      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {!compact ? (
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-bronze/70"
            title={t("seating.tierPrice")}
            aria-hidden
          >
            <Banknote className="size-3.5" />
          </span>
        ) : null}

        <div className={cn("relative flex-1", compact ? "min-w-[4.5rem]" : "min-w-[5.5rem]")}>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={price == null ? "" : String(price)}
            placeholder="—"
            onChange={(e) => {
              const raw = e.target.value.trim();
              onPriceChange(raw === "" ? null : Number(raw) || null);
            }}
            dir="ltr"
            aria-label={t("seating.tierPrice")}
            className="h-7 px-2 pe-7 text-left text-xs"
          />
          {price != null ? (
            <Tooltip>
              <TooltipTrigger
                type="button"
                onClick={() => onPriceChange(null)}
                className="absolute inset-y-0 end-1 flex items-center rounded-sm p-0.5 text-bronze/50 hover:bg-muted hover:text-destructive"
                aria-label={t("seating.tierPriceClear")}
              >
                <X className="size-3" aria-hidden />
              </TooltipTrigger>
              <TooltipContent>{t("seating.tierPriceClear")}</TooltipContent>
            </Tooltip>
          ) : null}
        </div>

        {pricePreview ? (
          <span
            className="hidden shrink-0 rounded-md bg-gold/10 px-1.5 py-0.5 text-[10px] font-medium text-gold-dark sm:inline"
            title={pricePreview}
          >
            {pricePreview}
          </span>
        ) : null}
      </div>
    </div>
  );
}
