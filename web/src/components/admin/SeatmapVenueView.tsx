"use client";

import { useMemo, type Ref } from "react";
import dynamic from "next/dynamic";
import "@/styles/seatmap.canvas.css";
import type {
  SeatmapCanvasRef,
  SeatmapOptions,
} from "@/types/seatmap-canvas";
import {
  seatmapBlocksSignature,
  venueLayoutToSeatmapBlocks,
  type SeatmapTierMeta,
} from "@/lib/seatmap-adapter";
import type { VenueLayout } from "@/lib/seating-layout";
import { cn } from "@/lib/utils";

const SeatmapCanvas = dynamic(
  () => import("@/lib/seatmap/SeatmapCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[240px] items-center justify-center rounded-xl border border-dashed border-border bg-card/50 text-sm text-bronze">
        …
      </div>
    ),
  }
);

type Props = {
  venue: VenueLayout;
  tiers: SeatmapTierMeta[];
  className?: string;
  /** Designer preview — seats are not selectable. */
  designMode?: boolean;
  contentKey?: string;
  onBlockSelect?: (tierId: string) => void;
  canvasRef?: Ref<SeatmapCanvasRef>;
};

export function SeatmapVenueView({
  venue,
  tiers,
  className,
  designMode = false,
  contentKey,
  onBlockSelect,
  canvasRef,
}: Props) {
  const blocks = useMemo(
    () => venueLayoutToSeatmapBlocks(venue, tiers),
    [venue, tiers]
  );
  const dataSignature = useMemo(
    () => seatmapBlocksSignature(blocks),
    [blocks]
  );

  const options = useMemo<SeatmapOptions>(
    () => ({
      legend: !designMode && tiers.length > 1,
      max_zoom: 8,
      min_zoom: 0.08,
      click_enable_sold_seats: !designMode,
      style: {
        seat: {
          radius: 12,
          color: "#f5f0e8",
          hover: "#c9a227",
          selected: "#8b6914",
          not_salable: "#b8a99a",
          font_size: 10,
        },
        block: {
          fill: "rgba(201, 162, 39, 0.06)",
          stroke: "rgba(201, 162, 39, 0.35)",
        },
        legend: {
          font_color: "#6b5a45",
        },
      },
    } as SeatmapOptions),
    [designMode, tiers.length]
  );

  if (blocks.length === 0) {
    return (
      <div
        className={cn(
          "flex h-full min-h-[240px] items-center justify-center rounded-xl border border-dashed border-border bg-card/50",
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "seatmap-venue-root h-full min-h-[min(320px,55vh)] overflow-hidden rounded-xl border border-border bg-[#ebe6dc]",
        className
      )}
      data-seatmap-key={contentKey ?? dataSignature}
    >
      <SeatmapCanvas
        ref={canvasRef}
        data={blocks}
        options={options}
        autoZoomToVenue
        className="h-full w-full"
        onBlockClick={(block) => {
          const tierId = String(block?.id ?? block?.item?.id ?? "");
          if (tierId && onBlockSelect) onBlockSelect(tierId);
        }}
        onSeatClick={(seat) => {
          if (designMode) return;
          if (seat?.item?.salable) {
            seat.isSelected() ? seat.unSelect() : seat.select();
          }
        }}
      />
    </div>
  );
}
