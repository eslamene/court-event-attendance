"use client";

import { useI18n } from "@/components/I18nProvider";
import {
  layoutRectToPercentStyle,
  type SectionBound,
  type VenueLayout,
} from "@/lib/seating-layout";
import {
  STAGE_VISUAL_CLASS,
  VENUE_CANVAS_CLASS,
  VENUE_GRID_STYLE,
  VENUE_LAYOUT_LABEL_CLASS,
} from "@/lib/seat-visual-styles";
import { cn } from "@/lib/utils";

type Props = {
  venue: VenueLayout;
  sections: SectionBound[];
  onSelectSection: (tierId: string) => void;
  fill?: boolean;
  className?: string;
};

export function SeatingSectionOverview({
  venue,
  sections,
  onSelectSection,
  fill = false,
  className,
}: Props) {
  const { t } = useI18n();
  const stage = venue.stage;
  const isCircle =
    venue.type === "arena" ||
    venue.type === "banquet" ||
    venue.config.stagePosition === "center";

  return (
    <div className={cn("flex min-h-0 flex-col gap-2", fill && "h-full", className)}>
      <p className="text-xs text-bronze">{t("seating.sectionOverviewHint")}</p>

      <div
        className={cn(
          VENUE_CANVAS_CLASS,
          fill && "min-h-[min(240px,42vh)] flex-1 aspect-[4/3] sm:aspect-[16/11] lg:min-h-[320px]",
          !fill && "aspect-[16/11] min-h-[280px] max-h-[min(72vh,720px)] sm:min-h-[320px]"
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={VENUE_GRID_STYLE}
        />

        <div
          className={cn(
            "absolute flex items-center justify-center text-center font-bold",
            STAGE_VISUAL_CLASS,
            isCircle ? "rounded-full" : "rounded-lg"
          )}
          style={layoutRectToPercentStyle(stage, venue)}
          title={stage.label}
        >
          <span className="px-1 text-[8px] leading-tight sm:text-[9px]">
            {stage.label}
          </span>
        </div>

        {sections.map((section) => {
          const pct =
            section.seatCount > 0
              ? Math.round((section.assigned / section.seatCount) * 100)
              : 0;

          return (
            <button
              key={section.tierId}
              type="button"
              onClick={() => onSelectSection(section.tierId)}
              className="absolute z-10 flex flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-gold/50 bg-gold/10 px-1 py-1 text-center shadow-sm transition hover:border-gold hover:bg-gold/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              style={{
                left: `${section.x}%`,
                top: `${section.y}%`,
                width: `${section.width}%`,
                height: `${section.height}%`,
              }}
              title={t("seating.sectionOpen", { name: section.tierName })}
            >
              <span className="line-clamp-2 text-[10px] font-bold leading-tight text-gold-dark sm:text-xs">
                {section.tierName}
              </span>
              <span className="text-[9px] font-medium text-bronze">
                {t("seating.sectionOccupancy", {
                  assigned: String(section.assigned),
                  total: String(section.seatCount),
                  pct: String(pct),
                })}
              </span>
            </button>
          );
        })}

        <p className={cn("absolute bottom-1.5 start-2", VENUE_LAYOUT_LABEL_CLASS)}>
          {t(`seating.layout.${venue.type}`)}
        </p>
      </div>
    </div>
  );
}
