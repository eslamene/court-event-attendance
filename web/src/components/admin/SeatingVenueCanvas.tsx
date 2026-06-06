"use client";

import { useI18n } from "@/components/I18nProvider";
import { SeatingCanvasRenderer } from "@/components/admin/SeatingCanvasRenderer";
import { SeatingSectionOverview } from "@/components/admin/SeatingSectionOverview";
import type { PositionedSeat, VenueLayout } from "@/lib/seating-layout";
import type { SeatCell } from "@/lib/seating";
import { shouldUseCanvasForVenue } from "@/lib/seating-map-utils";
import {
  SEAT_STATUS_STYLES,
  SEAT_TIER_CHIP_CLASS,
  STAGE_VISUAL_CLASS,
  VENUE_CANVAS_CLASS,
  VENUE_GRID_STYLE,
  VENUE_LAYOUT_LABEL_CLASS,
} from "@/lib/seat-visual-styles";
import { cn } from "@/lib/utils";

type Props = {
  venue: VenueLayout;
  compact?: boolean;
  /** Grow to fill the preview pane (split layout / fullscreen). */
  fill?: boolean;
  className?: string;
  isRecentSeat?: (tierId: string, seatNumber: number) => boolean;
  showTierLabels?: boolean;
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
  designMode = false,
  onSelectSection,
}: Props) {
  const renderMode = venue.renderMode ?? "full";

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
      designMode={designMode}
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
  designMode = false,
}: Omit<Props, "onSelectSection">) {
  const { t } = useI18n();
  const stagePos = venue.config.stagePosition;

  const tierNames = [...new Set(venue.seats.map((s) => s.tierName))];

  return (
    <div className={cn("flex min-h-0 flex-col gap-2", fill && "h-full", className)}>
      {showTierLabels && tierNames.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {tierNames.map((name) => (
            <span key={name} className={SEAT_TIER_CHIP_CLASS}>
              {name}
            </span>
          ))}
        </div>
      ) : null}

      <div
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

        <StageElement stage={venue.stage} position={stagePos} type={venue.type} />

        {venue.seats.map((pos) => (
          <SeatDot
            key={`${pos.tierId}-${pos.number}`}
            positioned={pos}
            recent={isRecentSeat?.(pos.tierId, pos.number) ?? false}
            compact={compact}
            designMode={designMode}
          />
        ))}

        <p className={cn("absolute bottom-1.5 start-2", VENUE_LAYOUT_LABEL_CLASS)}>
          {t(`seating.layout.${venue.type}`)}
        </p>
      </div>
    </div>
  );
}

function StageElement({
  stage,
  position,
  type,
}: {
  stage: VenueLayout["stage"];
  position: string;
  type: VenueLayout["type"];
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
        left: `${stage.x}%`,
        top: `${stage.y}%`,
        width: `${stage.width}%`,
        height: `${stage.height}%`,
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
}: {
  positioned: PositionedSeat;
  recent: boolean;
  compact: boolean;
  designMode: boolean;
}) {
  const { seat, tierId, number, x, y, tierName } = positioned;
  const title =
    seat.status === "free"
      ? `#${number} · ${tierName}`
      : `#${number} · ${tierName} — ${seat.fullName}${seat.rank ? ` (${seat.rank})` : ""}`;

  const size = compact
    ? "h-6 w-6 min-h-6 min-w-6 text-[8px]"
    : "h-8 w-8 min-h-8 min-w-8 text-[9px] sm:h-9 sm:w-9 sm:min-h-9 sm:min-w-9 sm:text-[10px]";

  const className = cn(
    "absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-bold tabular-nums transition-all",
    size,
    SEAT_STATUS_STYLES[seat.status],
    designMode && "pointer-events-none",
    recent &&
      "z-20 animate-pulse ring-2 ring-gold ring-offset-2 ring-offset-[var(--seat-map-floor)]"
  );

  if (designMode) {
    return (
      <div
        title={title}
        aria-label={title}
        className={className}
        style={{ left: `${x}%`, top: `${y}%` }}
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
      style={{ left: `${x}%`, top: `${y}%` }}
      data-tier={tierId}
      data-seat={number}
    >
      {number}
    </button>
  );
}
