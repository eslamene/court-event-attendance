"use client";

import { useI18n } from "@/components/I18nProvider";
import { DesignerTierOverviewOverlay } from "@/components/admin/DesignerTierOverviewOverlay";
import { useDesignerViewport } from "@/components/admin/DesignerViewportContext";
import { SeatingCanvasRenderer } from "@/components/admin/SeatingCanvasRenderer";
import { SeatingSectionOverview } from "@/components/admin/SeatingSectionOverview";
import {
  layoutRectToPercentStyle,
  meterXToPercent,
  meterYToPercent,
  seatDotSizeCssForVenue,
  type PositionedSeat,
  type VenueLayout,
} from "@/lib/seating-layout";
import type { SeatCell } from "@/lib/seating";
import { shouldUseCanvasForVenue } from "@/lib/seating-map-utils";
import { shouldPreferTierOverview } from "@/lib/seating-viewport-utils";
import {
  formatTierPrice,
  seatColorForTier,
} from "@/lib/seat-tier-style";
import {
  SEAT_STATUS_STYLES,
  STAGE_VISUAL_CLASS,
  VENUE_CANVAS_CLASS,
  VENUE_GRID_STYLE,
  VENUE_LAYOUT_LABEL_CLASS,
} from "@/lib/seat-visual-styles";
import { cn } from "@/lib/utils";

type TierMeta = {
  color: string;
  name: string;
  price: number | null;
};

type Props = {
  venue: VenueLayout;
  compact?: boolean;
  /** Grow to fill the preview pane (split layout / fullscreen). */
  fill?: boolean;
  className?: string;
  isRecentSeat?: (tierId: string, seatNumber: number) => boolean;
  showTierLabels?: boolean;
  tierColors?: Record<string, string>;
  tierMeta?: Record<string, TierMeta>;
  /** Designer preview: seats are non-interactive so pan/zoom works. */
  designMode?: boolean;
  onSelectSection?: (tierId: string) => void;
};

export function SeatingVenueCanvas({
  venue,
  compact = false,
  fill = false,
  className,
  isRecentSeat,
  showTierLabels = true,
  tierColors,
  tierMeta,
  designMode = false,
  onSelectSection,
}: Props) {
  const viewport = useDesignerViewport();
  const renderMode = venue.renderMode ?? "full";

  const registerMapRoot = (el: HTMLDivElement | null) => {
    viewport?.registerMapElement(el);
  };

  if (renderMode === "sections" && venue.sectionBounds?.length && onSelectSection) {
    return (
      <SeatingSectionOverview
        venue={venue}
        sections={venue.sectionBounds}
        onSelectSection={onSelectSection}
        fill={fill}
        className={className}
      />
    );
  }

  const useCanvas = shouldUseCanvasForVenue({
    renderMode,
    seatCount: venue.seats.length,
  });

  if (useCanvas) {
    return (
      <SeatingCanvasRenderer
        venue={venue}
        compact={compact}
        fill={fill}
        className={className}
        isRecentSeat={isRecentSeat}
        tierColors={tierColors}
        mapRootRef={registerMapRoot}
      />
    );
  }

  return (
    <SeatingVenueCanvasDom
      venue={venue}
      compact={compact}
      fill={fill}
      className={className}
      isRecentSeat={isRecentSeat}
      showTierLabels={showTierLabels}
      tierColors={tierColors}
      tierMeta={tierMeta}
      designMode={designMode}
      mapRootRef={registerMapRoot}
    />
  );
}

function SeatingVenueCanvasDom({
  venue,
  compact = false,
  fill = false,
  className,
  isRecentSeat,
  showTierLabels = true,
  tierColors,
  tierMeta,
  designMode = false,
  mapRootRef,
}: Omit<Props, "onSelectSection"> & {
  mapRootRef?: (el: HTMLDivElement | null) => void;
}) {
  const { t, locale } = useI18n();
  const viewport = useDesignerViewport();
  const stagePos = venue.config.stagePosition;
  const preferOverview =
    designMode &&
    shouldPreferTierOverview({
      seatCount: venue.seats.length,
      scale: viewport?.transform.scale ?? 1,
      minFitScale: viewport?.minFitScale ?? 0.08,
    });
  const seatDotSize = seatDotSizeCssForVenue(venue);

  const legendItems =
    tierMeta && Object.keys(tierMeta).length > 0
      ? Object.entries(tierMeta)
      : [...new Set(venue.seats.map((s) => s.tierName))].map((name) => {
          const seat = venue.seats.find((s) => s.tierName === name);
          return [
            seat?.tierId ?? name,
            {
              name,
              color: tierColors?.[seat?.tierId ?? ""] ?? "#c9a227",
              price: null,
            },
          ] as const;
        });

  return (
    <div className={cn("flex min-h-0 flex-col gap-2", fill && "h-full", className)}>
      {showTierLabels && legendItems.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {legendItems.map(([key, meta]) => {
            const priceLabel =
              meta.price != null ? formatTierPrice(meta.price, locale) : null;
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-foreground"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full border border-black/10"
                  style={{ backgroundColor: meta.color }}
                  aria-hidden
                />
                <span>{meta.name}</span>
                {priceLabel ? (
                  <span className="text-bronze/80">· {priceLabel}</span>
                ) : null}
              </span>
            );
          })}
        </div>
      ) : null}

      <div
        ref={mapRootRef}
        data-seat-map-root
        className={cn(
          VENUE_CANVAS_CLASS,
          fill && "min-h-[min(240px,42vh)] flex-1 aspect-[4/3] sm:aspect-[16/11] lg:min-h-[320px]",
          !fill && compact && "aspect-[4/3] min-h-[220px]",
          !fill &&
            !compact &&
            "aspect-[16/11] min-h-[280px] max-h-[min(72vh,720px)] sm:min-h-[320px]"
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={VENUE_GRID_STYLE}
        />

        <StageElement
          stage={venue.stage}
          position={stagePos}
          type={venue.type}
          venue={venue}
        />

        {!preferOverview
          ? venue.seats.map((pos) => (
              <SeatDot
                key={`${pos.tierId}-${pos.number}`}
                positioned={pos}
                recent={isRecentSeat?.(pos.tierId, pos.number) ?? false}
                compact={compact}
                designMode={designMode}
                tierColor={tierColors?.[pos.tierId]}
                dotSize={seatDotSize}
                venue={venue}
              />
            ))
          : null}

        {designMode ? (
          <DesignerTierOverviewOverlay
            seats={venue.seats}
            tiers={uniqueTiersFromSeats(venue.seats)}
            seatCount={venue.seats.length}
            venueExtents={{ widthM: venue.widthM, depthM: venue.depthM }}
          />
        ) : null}

        <p className={cn("absolute bottom-1.5 start-2", VENUE_LAYOUT_LABEL_CLASS)}>
          {t(`seating.layout.${venue.type}`)}
        </p>
      </div>
    </div>
  );
}

function uniqueTiersFromSeats(seats: PositionedSeat[]) {
  const tiers = new Map<string, { id: string; name: string; seatCount: number }>();
  for (const seat of seats) {
    const existing = tiers.get(seat.tierId);
    if (existing) {
      existing.seatCount += 1;
    } else {
      tiers.set(seat.tierId, {
        id: seat.tierId,
        name: seat.tierName,
        seatCount: 1,
      });
    }
  }
  return [...tiers.values()];
}

function StageElement({
  stage,
  position,
  type,
  venue,
}: {
  stage: VenueLayout["stage"];
  position: string;
  type: VenueLayout["type"];
  venue: VenueLayout;
}) {
  const isCircle = type === "arena" || type === "banquet" || position === "center";

  return (
    <div
      className={cn(
        "absolute flex items-center justify-center text-center font-bold",
        STAGE_VISUAL_CLASS,
        isCircle ? "rounded-full" : "rounded-lg"
      )}
      style={{
        ...layoutRectToPercentStyle(stage, venue),
        transform: "translate(-0%, -0%)",
      }}
      title={stage.label}
    >
      <span
        className={cn(
          "px-1 leading-tight drop-shadow-sm",
          isCircle ? "text-[8px] sm:text-[9px]" : "text-[10px] sm:text-xs"
        )}
      >
        {stage.label}
      </span>
    </div>
  );
}

function SeatDot({
  positioned,
  recent,
  compact,
  designMode,
  tierColor,
  dotSize,
  venue,
}: {
  positioned: PositionedSeat;
  recent: boolean;
  compact: boolean;
  designMode: boolean;
  tierColor?: string;
  dotSize?: string;
  venue: VenueLayout;
}) {
  const { seat, tierId, number, x, y, tierName } = positioned;
  const title =
    seat.status === "free"
      ? `#${number} · ${tierName}`
      : `#${number} · ${tierName} — ${seat.fullName}${seat.rank ? ` (${seat.rank})` : ""}`;

  const sizeClass = dotSize
    ? "text-[9px] sm:text-[10px]"
    : compact
      ? "h-6 w-6 min-h-6 min-w-6 text-[8px]"
      : "h-8 w-8 min-h-8 min-w-8 text-[9px] sm:h-9 sm:w-9 sm:min-h-9 sm:min-w-9 sm:text-[10px]";

  const tierTint = tierColor
    ? seatColorForTier(tierColor, seat.status)
    : null;

  const className = cn(
    "absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 font-bold tabular-nums transition-all",
    sizeClass,
    !tierTint && SEAT_STATUS_STYLES[seat.status],
    designMode && "pointer-events-none",
    recent &&
      "z-20 animate-pulse ring-2 ring-gold ring-offset-2 ring-offset-[var(--seat-map-floor)]"
  );

  const style = {
    left: `${meterXToPercent(x, venue.widthM)}%`,
    top: `${meterYToPercent(y, venue.depthM)}%`,
    ...(dotSize ? { width: dotSize, height: dotSize } : {}),
    ...(tierTint
      ? {
          backgroundColor: tierTint.fill,
          borderColor: tierTint.stroke,
          color: tierTint.stroke,
        }
      : {}),
  };

  if (designMode) {
    return (
      <div
        title={title}
        aria-label={title}
        className={className}
        style={style}
        data-tier={tierId}
        data-seat={number}
      >
        {number}
      </div>
    );
  }

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={className}
      style={style}
      data-tier={tierId}
      data-seat={number}
    >
      {number}
    </button>
  );
}
