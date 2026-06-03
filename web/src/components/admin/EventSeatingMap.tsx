"use client";

import { Armchair, Circle, RadioButton } from "@phosphor-icons/react";
import { useI18n } from "@/components/I18nProvider";
import { SeatingVenueCanvas } from "@/components/admin/SeatingVenueCanvas";
import { Badge } from "@/components/ui/badge";
import { useSeatingRealtime } from "@/hooks/useSeatingRealtime";
import { SEAT_STATUS_STYLES } from "@/lib/seat-visual-styles";
import { cn } from "@/lib/utils";

type Props = {
  eventId: string;
  enabled: boolean;
};

export function EventSeatingMap({ eventId, enabled }: Props) {
  const { t } = useI18n();
  const { map, connection, loading, isRecentSeat } = useSeatingRealtime(
    eventId,
    enabled
  );

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
        </div>
        <ConnectionBadge connection={connection} />
      </div>

      {map.updatedAt ? (
        <p className="text-xs text-bronze/80">
          {t("seating.updatedAt", {
            time: new Date(map.updatedAt).toLocaleTimeString(),
          })}
        </p>
      ) : null}

      <SeatingVenueCanvas
        venue={map.venue}
        isRecentSeat={isRecentSeat}
        showTierLabels={map.tiers.length > 1}
      />

      {map.tiers.length > 1 ? (
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          {map.tiers.map((tier) => (
            <div
              key={tier.id}
              className="rounded-lg border border-border bg-[#faf8f5] px-3 py-1.5 text-xs text-bronze"
            >
              <span className="font-semibold text-gold-dark">{tier.name}</span>
              {" · "}
              {t("seating.tierStats", {
                assigned: String(tier.assigned),
                total: String(tier.seatCount),
              })}
            </div>
          ))}
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
