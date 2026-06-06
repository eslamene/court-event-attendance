"use client";

import { useCallback, useState } from "react";
import { ArrowLeft, Circle, RadioButton } from "@phosphor-icons/react";
import { useI18n } from "@/components/I18nProvider";
import { SeatmapVenueView } from "@/components/admin/SeatmapVenueView";
import { SeatingVenueCanvas } from "@/components/admin/SeatingVenueCanvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSeatingRealtime } from "@/hooks/useSeatingRealtime";
import { formatTierPrice } from "@/lib/seat-tier-style";
import { capacityProfileLabelKey } from "@/lib/seating-map-utils";
import { SEAT_STATUS_STYLES } from "@/lib/seat-visual-styles";
import { cn } from "@/lib/utils";

type Props = {
  eventId: string;
  enabled: boolean;
};

export function EventSeatingMap({ eventId, enabled }: Props) {
  const { t, locale } = useI18n();
  const [focusedTierId, setFocusedTierId] = useState<string | null>(null);
  const { map, connection, loading, isRecentSeat } = useSeatingRealtime(
    eventId,
    enabled,
    { tierId: focusedTierId }
  );

  const handleSelectSection = useCallback((tierId: string) => {
    setFocusedTierId(tierId);
  }, []);

  const handleBackToOverview = useCallback(() => {
    setFocusedTierId(null);
  }, []);

  if (!enabled) return null;

  if (loading && !map) {
    return (
      <p className="py-12 text-center text-sm text-bronze">
        {t("admin.registrationForm.loading")}
      </p>
    );
  }

  if (!map?.seatingEnabled) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-bronze">
        {t("seating.notEnabled")}
      </p>
    );
  }

  if (map.tiers.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-bronze">
        {t("seating.noTiersConfigured")}
      </p>
    );
  }

  const focusedTier = focusedTierId
    ? map.tiers.find((tier) => tier.id === focusedTierId)
    : null;
  const isSectionView = map.venue.renderMode === "sections" && !focusedTierId;
  const tierColors = Object.fromEntries(
    map.tiers.map((tier) => [tier.id, tier.color])
  );
  const tierMeta = Object.fromEntries(
    map.tiers.map((tier) => [
      tier.id,
      { color: tier.color, name: tier.name, price: tier.price },
    ])
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-bronze">
          <LegendDot className={SEAT_STATUS_STYLES.free} label={t("seating.seatFree")} />
          <LegendDot
            className={SEAT_STATUS_STYLES.approved}
            label={t("seating.seatApproved")}
          />
          <LegendDot
            className={SEAT_STATUS_STYLES.attended}
            label={t("seating.seatAttended")}
          />
          <Badge variant="outline" className="text-[10px]">
            {t(`seating.layout.${map.layoutType}`)}
          </Badge>
          {map.capacityProfile !== "small" ? (
            <Badge variant="secondary" className="text-[10px]">
              {t(capacityProfileLabelKey(map.capacityProfile))}
            </Badge>
          ) : null}
        </div>
        <ConnectionBadge connection={connection} />
      </div>

      {focusedTier ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={handleBackToOverview}
          >
            <ArrowLeft size={14} />
            {t("seating.sectionBack")}
          </Button>
          <span className="text-sm font-semibold text-gold-dark">
            {focusedTier.name}
          </span>
          <span className="text-xs text-bronze">
            {t("seating.tierStats", {
              assigned: String(focusedTier.assigned),
              total: String(focusedTier.seatCount),
            })}
          </span>
        </div>
      ) : isSectionView ? (
        <p className="text-xs text-bronze">
          {t("seating.largeVenueMapHint", {
            total: String(map.totalSeats),
          })}
        </p>
      ) : null}

      {map.updatedAt ? (
        <p className="text-xs text-bronze/80">
          {t("seating.updatedAt", {
            time: new Date(map.updatedAt).toLocaleTimeString(),
          })}
        </p>
      ) : null}

      {isSectionView ? (
        <SeatingVenueCanvas
          venue={map.venue}
          isRecentSeat={isRecentSeat}
          showTierLabels={false}
          onSelectSection={handleSelectSection}
        />
      ) : (
        <SeatmapVenueView
          venue={map.venue}
          tiers={map.tiers.map((tier) => ({
            id: tier.id,
            name: tier.name,
            color: tier.color,
            price: tier.price,
          }))}
          onBlockSelect={handleSelectSection}
          className="min-h-[min(360px,60vh)]"
        />
      )}

      {map.tiers.length > 1 && !focusedTierId ? (
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          {map.tiers.map((tier) => {
            const priceLabel =
              tier.price != null ? formatTierPrice(tier.price, locale) : null;
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => handleSelectSection(tier.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-[#faf8f5] px-3 py-1.5 text-xs text-bronze transition hover:border-gold/50"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full border border-black/10"
                  style={{ backgroundColor: tier.color }}
                  aria-hidden
                />
                <span className="font-semibold text-gold-dark">{tier.name}</span>
                {priceLabel ? <span>· {priceLabel}</span> : null}
                <span>
                  ·{" "}
                  {t("seating.tierStats", {
                    assigned: String(tier.assigned),
                    total: String(tier.seatCount),
                  })}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold",
          className
        )}
      >
        ·
      </span>
      {label}
    </span>
  );
}

function ConnectionBadge({
  connection,
}: {
  connection: "connecting" | "live" | "polling";
}) {
  const { t } = useI18n();

  if (connection === "live") {
    return (
      <Badge className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-600">
        <RadioButton size={14} weight="fill" className="animate-pulse" />
        {t("seating.liveConnected")}
      </Badge>
    );
  }

  if (connection === "polling") {
    return (
      <Badge variant="outline" className="gap-1.5 text-bronze">
        <Circle size={10} weight="fill" />
        {t("seating.livePolling")}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1.5 text-bronze">
      <Circle size={10} weight="fill" className="animate-pulse" />
      {t("seating.liveConnecting")}
    </Badge>
  );
}
