"use client";

import { useState } from "react";
import { Armchair, Banknote, Check } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import {
  formatTierPrice,
  normalizeTierColor,
} from "@/lib/seat-tier-style";
import { cn } from "@/lib/utils";

export type SeatTierOption = {
  id: string;
  name: string;
  seatCount: number;
  color: string;
  price: number | null;
};

type Props = {
  tiers: SeatTierOption[];
  name?: string;
  required?: boolean;
  defaultTierId?: string;
};

export function SeatTierPicker({
  tiers,
  name = "seatTierId",
  required = false,
  defaultTierId,
}: Props) {
  const { t, locale } = useI18n();
  const [selectedId, setSelectedId] = useState(
    defaultTierId ?? tiers[0]?.id ?? ""
  );

  if (tiers.length === 0) return null;

  if (tiers.length === 1) {
    const tier = tiers[0];
    const priceLabel =
      tier.price != null ? formatTierPrice(tier.price, locale) : null;
    return (
      <>
        <input type="hidden" name={name} value={tier.id} />
        <div
          className="flex items-center gap-3 rounded-xl border border-border bg-[#faf8f5] px-4 py-3"
          title={t("register.seatTier")}
        >
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: normalizeTierColor(tier.color, 0) }}
            aria-hidden
          >
            <Armchair className="size-4 text-white drop-shadow-sm" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gold-dark">{tier.name}</p>
            {priceLabel ? (
              <p className="mt-0.5 flex items-center gap-1 text-sm text-bronze">
                <Banknote className="size-3.5 shrink-0" aria-hidden />
                {priceLabel}
              </p>
            ) : null}
          </div>
        </div>
      </>
    );
  }

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 flex items-center gap-2 text-sm font-medium text-foreground">
        <Armchair className="size-4 text-gold-dark" aria-hidden />
        {t("register.seatTier")}
        {required ? <span className="text-destructive">*</span> : null}
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {tiers.map((tier, index) => {
          const selected = selectedId === tier.id;
          const priceLabel =
            tier.price != null ? formatTierPrice(tier.price, locale) : null;
          return (
            <label
              key={tier.id}
              className={cn(
                "relative flex cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-3 transition-colors",
                selected
                  ? "border-gold bg-gold/5 shadow-sm"
                  : "border-border bg-card hover:border-gold/40 hover:bg-[#faf8f5]"
              )}
            >
              <input
                type="radio"
                name={name}
                value={tier.id}
                checked={selected}
                required={required}
                onChange={() => setSelectedId(tier.id)}
                className="sr-only"
              />
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-white shadow-sm"
                style={{
                  backgroundColor: normalizeTierColor(tier.color, index),
                }}
                aria-hidden
              >
                <Armchair className="size-3.5 text-white drop-shadow-sm" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-gold-dark">
                  {tier.name}
                </span>
                {priceLabel ? (
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-bronze">
                    <Banknote className="size-3 shrink-0" aria-hidden />
                    {priceLabel}
                  </span>
                ) : null}
              </span>
              {selected ? (
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gold text-white">
                  <Check className="size-3" strokeWidth={3} aria-hidden />
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
