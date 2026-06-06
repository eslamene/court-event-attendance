"use client";

import { useEffect, useRef } from "react";
import { useI18n } from "@/components/I18nProvider";
import type { VenueLayout } from "@/lib/seating-layout";
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
};

export function SeatingCanvasRenderer({
  venue,
  compact = false,
  fill = false,
  className,
  isRecentSeat,
}: Props) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const draw = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const radius = compact ? 3 : 4.5;

      for (const pos of venue.seats) {
        const px = (pos.x / 100) * rect.width;
        const py = (pos.y / 100) * rect.height;
        const recent = isRecentSeat?.(pos.tierId, pos.number) ?? false;

        ctx.beginPath();
        ctx.arc(px, py, recent ? radius + 1.5 : radius, 0, Math.PI * 2);
        ctx.fillStyle = SEAT_STATUS_FILL[pos.seat.status];
        ctx.fill();
        ctx.strokeStyle = recent ? "#c9a227" : SEAT_STATUS_STROKE[pos.seat.status];
        ctx.lineWidth = recent ? 2 : 1.25;
        ctx.stroke();
      }
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(container);
    return () => observer.disconnect();
  }, [venue.seats, compact, isRecentSeat]);

  const stage = venue.stage;
  const isCircle =
    venue.type === "arena" ||
    venue.type === "banquet" ||
    venue.config.stagePosition === "center";

  return (
    <div className={cn("flex min-h-0 flex-col gap-2", fill && "h-full", className)}>
      <div
        ref={containerRef}
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
          style={{
            left: `${stage.x}%`,
            top: `${stage.y}%`,
            width: `${stage.width}%`,
            height: `${stage.height}%`,
          }}
          title={stage.label}
        >
          <span className="px-1 text-[8px] leading-tight sm:text-[9px]">
            {stage.label}
          </span>
        </div>

        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        <p className={cn("absolute bottom-1.5 start-2", VENUE_LAYOUT_LABEL_CLASS)}>
          {t(`seating.layout.${venue.type}`)}
        </p>
      </div>
    </div>
  );
}
