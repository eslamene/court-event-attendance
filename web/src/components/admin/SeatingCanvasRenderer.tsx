"use client";

import { useEffect, useMemo, useRef } from "react";
import { useI18n } from "@/components/I18nProvider";
import { useDesignerViewport } from "@/components/admin/DesignerViewportContext";
import {
  estimateMedianSeatPitchPercent,
  estimateRowPitchPercent,
  layoutRectToPercentStyle,
  meterXToPercent,
  meterYToPercent,
  type VenueLayout,
} from "@/lib/seating-layout";
import { seatColorForTier } from "@/lib/seat-tier-style";
import {
  DESIGNER_VIEWPORT,
  shouldPreferTierOverview,
  tierSectionBoundsForDesigner,
} from "@/lib/seating-viewport-utils";
import {
  SEAT_STATUS_FILL,
  SEAT_STATUS_STROKE,
  STAGE_VISUAL_CLASS,
  VENUE_CANVAS_CLASS,
  VENUE_GRID_STYLE,
  VENUE_LAYOUT_LABEL_CLASS,
} from "@/lib/seat-visual-styles";
import { cn } from "@/lib/utils";

type Props = {
  venue: VenueLayout;
  compact?: boolean;
  fill?: boolean;
  className?: string;
  isRecentSeat?: (tierId: string, seatNumber: number) => boolean;
  tierColors?: Record<string, string>;
  mapRootRef?: (el: HTMLDivElement | null) => void;
};

export function SeatingCanvasRenderer({
  venue,
  compact = false,
  fill = false,
  className,
  isRecentSeat,
  tierColors,
  mapRootRef,
}: Props) {
  const { t } = useI18n();
  const viewport = useDesignerViewport();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewScale = viewport?.transform.scale ?? 1;

  const tierSections = useMemo(
    () =>
      tierSectionBoundsForDesigner(
        venue.seats,
        venue.seats.reduce(
          (acc, seat) => {
            if (!acc.some((tier) => tier.id === seat.tierId)) {
              acc.push({
                id: seat.tierId,
                name: seat.tierName,
                seatCount: venue.seats.filter((s) => s.tierId === seat.tierId)
                  .length,
              });
            }
            return acc;
          },
          [] as { id: string; name: string; seatCount: number }[]
        ),
        { widthM: venue.widthM, depthM: venue.depthM }
      ),
    [venue.seats, venue.widthM, venue.depthM]
  );

  const preferOverview = shouldPreferTierOverview({
    seatCount: venue.seats.length,
    scale: viewScale,
    minFitScale: viewport?.minFitScale ?? 0.08,
  });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const draw = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;

      const deviceDpr = window.devicePixelRatio || 1;
      const dpr = Math.min(4, deviceDpr);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.clearRect(0, 0, rect.width, rect.height);

      const pitchPercent = estimateMedianSeatPitchPercent(
        venue.seats,
        venue.widthM
      );
      const rowPitchPercent = estimateRowPitchPercent(
        venue.seats,
        venue.depthM
      );
      const pitchPx = (pitchPercent / 100) * rect.width;
      const rowPitchPx = (rowPitchPercent / 100) * rect.height;
      const maxRadius = Math.min(pitchPx, rowPitchPx) * 0.31;
      const baseRadius = Math.min(
        compact ? 4.5 : 5.5,
        Math.max(compact ? 1.8 : 2.2, maxRadius)
      );
      const screenRadius = baseRadius * viewScale;
      const showLabels =
        !preferOverview && viewScale >= DESIGNER_VIEWPORT.seatLabelMinScale;
      const cullRadius = DESIGNER_VIEWPORT.seatCullMinRadiusPx;

      if (preferOverview) {
        const sortedSections = [...tierSections].sort(
          (a, b) => a.width * a.height - b.width * b.height
        );

        for (const section of sortedSections) {
          const x = (section.x / 100) * rect.width;
          const y = (section.y / 100) * rect.height;
          const w = (section.width / 100) * rect.width;
          const h = (section.height / 100) * rect.height;
          const tierColor = tierColors?.[section.tierId] ?? "#c9a227";

          ctx.fillStyle = hexToRgba(tierColor, 0.16);
          ctx.strokeStyle = hexToRgba(tierColor, 0.72);
          ctx.lineWidth = 2;
          roundRect(ctx, x, y, w, h, 8);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#6b5a45";
          ctx.font = `600 ${Math.max(9, Math.min(12, w / 8))}px system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const label =
            section.tierName.length > 18
              ? `${section.tierName.slice(0, 16)}…`
              : section.tierName;
          ctx.fillText(label, x + w / 2, y + h / 2 - 6, w - 8);
          ctx.font = `500 ${Math.max(8, Math.min(10, w / 10))}px system-ui, sans-serif`;
          ctx.fillText(
            String(section.seatCount),
            x + w / 2,
            y + h / 2 + 8,
            w - 8
          );
        }
        return;
      }

      for (const pos of venue.seats) {
        if (screenRadius < cullRadius) continue;

        const px =
          (meterXToPercent(pos.x, venue.widthM) / 100) * rect.width;
        const py =
          (meterYToPercent(pos.y, venue.depthM) / 100) * rect.height;
        const recent = isRecentSeat?.(pos.tierId, pos.number) ?? false;
        const radius = recent ? baseRadius + 1.5 : baseRadius;

        const tierTint = tierColors?.[pos.tierId]
          ? seatColorForTier(tierColors[pos.tierId], pos.seat.status)
          : null;

        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fillStyle = tierTint?.fill ?? SEAT_STATUS_FILL[pos.seat.status];
        ctx.fill();
        ctx.strokeStyle = recent
          ? "#c9a227"
          : tierTint?.stroke ?? SEAT_STATUS_STROKE[pos.seat.status];
        ctx.lineWidth = recent ? 2 : 1.25;
        ctx.stroke();

        if (showLabels && screenRadius >= 5) {
          ctx.fillStyle = tierTint?.stroke ?? "#3d3428";
          ctx.font = `700 ${Math.max(7, Math.min(10, screenRadius))}px system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(pos.number), px, py);
        }
      }
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(container);
    return () => observer.disconnect();
  }, [
    venue.seats,
    venue.widthM,
    venue.depthM,
    compact,
    isRecentSeat,
    tierColors,
    viewScale,
    preferOverview,
    tierSections,
  ]);

  const stage = venue.stage;
  const isCircle =
    venue.type === "arena" ||
    venue.type === "banquet" ||
    venue.config.stagePosition === "center";

  return (
    <div className={cn("flex min-h-0 flex-col gap-2", fill && "h-full", className)}>
      <div
        ref={(el) => {
          containerRef.current = el;
          mapRootRef?.(el);
        }}
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

        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        {preferOverview ? (
          <>
            <p className="pointer-events-none absolute start-2 top-2 z-20 rounded-md bg-card/90 px-2 py-1 text-[10px] text-bronze shadow-sm">
              {t("seating.tierOverviewHint")}
            </p>
            <DesignerCanvasTierOverlay
              sections={tierSections}
              onSelect={(section) => viewport?.zoomToMapRect(section)}
            />
          </>
        ) : null}

        <p className={cn("absolute bottom-1.5 start-2", VENUE_LAYOUT_LABEL_CLASS)}>
          {t(`seating.layout.${venue.type}`)}
        </p>
      </div>
    </div>
  );
}

function DesignerCanvasTierOverlay({
  sections,
  onSelect,
}: {
  sections: ReturnType<typeof tierSectionBoundsForDesigner>;
  onSelect: (section: (typeof sections)[number]) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="absolute inset-0 z-20">
      {sections.map((section) => (
        <button
          key={section.tierId}
          type="button"
          data-tier-overview
          onClick={(e) => {
            e.stopPropagation();
            onSelect(section);
          }}
          className="absolute rounded-lg border-2 border-transparent hover:border-gold/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          style={{
            left: `${section.x}%`,
            top: `${section.y}%`,
            width: `${section.width}%`,
            height: `${section.height}%`,
          }}
          title={t("seating.sectionZoomTo", { name: section.tierName })}
          aria-label={t("seating.sectionZoomTo", { name: section.tierName })}
        />
      ))}
    </div>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) {
    return `rgba(201, 162, 39, ${alpha})`;
  }
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
