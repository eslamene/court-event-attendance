"use client";

import { useMemo } from "react";
import { useI18n } from "@/components/I18nProvider";
import { useDesignerViewport } from "@/components/admin/DesignerViewportContext";
import type { SectionBound } from "@/lib/seating-map-utils";
import {
  shouldPreferTierOverview,
  tierSectionBoundsForDesigner,
} from "@/lib/seating-viewport-utils";
import type { PositionedSeat, VenueLayout } from "@/lib/seating-layout";
import { cn } from "@/lib/utils";

type Props = {
  seats: PositionedSeat[];
  tiers: { id: string; name: string; seatCount: number }[];
  seatCount: number;
  venueExtents: Pick<VenueLayout, "widthM" | "depthM">;
  className?: string;
};

export function DesignerTierOverviewOverlay({
  seats,
  tiers,
  seatCount,
  venueExtents,
  className,
}: Props) {
  const { t } = useI18n();
  const viewport = useDesignerViewport();
  const sections = useMemo(
    () => tierSectionBoundsForDesigner(seats, tiers, venueExtents),
    [seats, tiers, venueExtents]
  );

  if (!viewport) return null;

  const show = shouldPreferTierOverview({
    seatCount,
    scale: viewport.transform.scale,
    minFitScale: viewport.minFitScale,
  });

  if (!show || sections.length === 0) return null;

  return (
    <div
      className={cn("pointer-events-none absolute inset-0 z-20", className)}
      aria-hidden={false}
    >
      {sections.map((section) => (
        <TierOverviewButton
          key={section.tierId}
          section={section}
          onFocus={() => viewport.zoomToMapRect(section)}
        />
      ))}
      <p className="pointer-events-none absolute start-2 top-2 rounded-md bg-card/90 px-2 py-1 text-[10px] text-bronze shadow-sm">
        {t("seating.tierOverviewHint")}
      </p>
    </div>
  );
}

function TierOverviewButton({
  section,
  onFocus,
}: {
  section: SectionBound;
  onFocus: () => void;
}) {
  const { t } = useI18n();

  return (
    <button
      type="button"
      data-tier-overview
      onClick={(e) => {
        e.stopPropagation();
        onFocus();
      }}
      className="pointer-events-auto absolute flex flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-gold/55 bg-gold/12 px-1 py-1 text-center shadow-sm backdrop-blur-[1px] transition hover:border-gold hover:bg-gold/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      style={{
        left: `${section.x}%`,
        top: `${section.y}%`,
        width: `${section.width}%`,
        height: `${section.height}%`,
      }}
      title={t("seating.sectionZoomTo", { name: section.tierName })}
    >
      <span className="line-clamp-2 text-[10px] font-bold leading-tight text-gold-dark sm:text-xs">
        {section.tierName}
      </span>
      <span className="text-[9px] font-medium text-bronze">
        {t("seating.sectionSeatTotal", { total: String(section.seatCount) })}
      </span>
    </button>
  );
}
