/**
 * Converts Court Event Attendance venue layouts into seatmap-canvas blocks.
 */

import type { SeatmapBlockData } from "@/types/seatmap-canvas";
import type { SeatCell } from "@/lib/seating";
import {
  estimateMedianSeatPitchM,
  type PositionedSeat,
  type VenueLayout,
} from "@/lib/seating-layout";
import { seatColorForTier } from "@/lib/seat-tier-style";

/** Virtual stage size — seatmap uses pixel coordinates. */
export const SEATMAP_STAGE_WIDTH = 1200;
export const SEATMAP_STAGE_HEIGHT = 900;

/** Match seatmap-canvas defaults (seat.style.radius + visual gap). */
export const SEATMAP_SEAT_RADIUS = 12;
export const SEATMAP_SEAT_GAP = 10;
export const SEATMAP_MIN_CENTER_DISTANCE =
  SEATMAP_SEAT_RADIUS * 2 + SEATMAP_SEAT_GAP;

const STAGE_MARGIN_PX = 40;

export type SeatmapTierMeta = {
  id: string;
  name: string;
  color: string;
  price?: number | null;
};

type LayoutCentroid = { cx: number; cy: number };

type PixelPoint = { x: number; y: number };

function layoutCentroid(
  seats: PositionedSeat[],
  venue: VenueLayout
): LayoutCentroid {
  if (seats.length === 0) {
    return { cx: venue.widthM / 2, cy: venue.depthM / 2 };
  }
  let sumX = 0;
  let sumY = 0;
  for (const seat of seats) {
    sumX += seat.x;
    sumY += seat.y;
  }
  return { cx: sumX / seats.length, cy: sumY / seats.length };
}

function spacingScaleForSeats(seats: PositionedSeat[], venue: VenueLayout): number {
  const pitchM = estimateMedianSeatPitchM(seats);
  const pitchPx = (pitchM / venue.widthM) * SEATMAP_STAGE_WIDTH;
  if (pitchPx <= 0 || pitchPx >= SEATMAP_MIN_CENTER_DISTANCE) return 1;
  return SEATMAP_MIN_CENTER_DISTANCE / pitchPx;
}

function projectSeatToPixels(
  seat: PositionedSeat,
  centroid: LayoutCentroid,
  scale: number,
  venue: VenueLayout
): PixelPoint {
  const sx = centroid.cx + (seat.x - centroid.cx) * scale;
  const sy = centroid.cy + (seat.y - centroid.cy) * scale;
  return {
    x: (sx / venue.widthM) * SEATMAP_STAGE_WIDTH,
    y: (sy / venue.depthM) * SEATMAP_STAGE_HEIGHT,
  };
}

function normalizePixelLayout(points: PixelPoint[]): PixelPoint[] {
  if (points.length === 0) return points;

  let minX = Infinity;
  let minY = Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
  }

  const shiftX = STAGE_MARGIN_PX - minX;
  const shiftY = STAGE_MARGIN_PX - minY;
  return points.map((point) => ({
    x: point.x + shiftX,
    y: point.y + shiftY,
  }));
}

function seatSalable(status: SeatCell["status"]): boolean {
  return status === "free";
}

function seatColor(
  status: SeatCell["status"],
  tierColor: string
): string | undefined {
  if (status === "free") return tierColor;
  return seatColorForTier(tierColor, status).fill;
}

export function venueLayoutToSeatmapBlocks(
  venue: VenueLayout,
  tiers: SeatmapTierMeta[]
): SeatmapBlockData[] {
  const tierById = new Map(tiers.map((tier) => [tier.id, tier]));
  const seatsByTier = new Map<string, PositionedSeat[]>();

  for (const seat of venue.seats) {
    const group = seatsByTier.get(seat.tierId) ?? [];
    group.push(seat);
    seatsByTier.set(seat.tierId, group);
  }

  const orderedTierIds =
    tiers.length > 0
      ? tiers.map((tier) => tier.id)
      : [...seatsByTier.keys()];

  const allSeats = venue.seats;
  const centroid = layoutCentroid(allSeats, venue);
  const spacingScale = spacingScaleForSeats(allSeats, venue);

  const orderedSeatKeys = allSeats.map(
    (seat) => `${seat.tierId}:${seat.number}`
  );
  const normalizedPoints = normalizePixelLayout(
    allSeats.map((seat) =>
      projectSeatToPixels(seat, centroid, spacingScale, venue)
    )
  );
  const normalizedByKey = new Map<string, PixelPoint>();
  for (let i = 0; i < orderedSeatKeys.length; i++) {
    normalizedByKey.set(orderedSeatKeys[i]!, normalizedPoints[i]!);
  }

  return orderedTierIds
    .map((tierId) => {
      const tier = tierById.get(tierId);
      const seats = seatsByTier.get(tierId) ?? [];
      if (seats.length === 0) return null;

      const block: SeatmapBlockData = {
        id: tierId,
        title: tier?.name ?? seats[0]?.tierName ?? tierId,
        color: tier?.color ?? "#c9a227",
        labels: [],
        seats: seats.map((pos) => {
          const point = normalizedByKey.get(`${pos.tierId}:${pos.number}`);
          if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
            return null;
          }
          return {
            id: `${pos.tierId}:${pos.number}`,
            x: point.x,
            y: point.y,
            title: String(pos.number),
            salable: seatSalable(pos.seat.status),
            color: seatColor(pos.seat.status, tier?.color ?? "#c9a227"),
            note:
              pos.seat.status !== "free" && pos.seat.fullName
                ? pos.seat.fullName
                : undefined,
            custom_data: {
              tierId: pos.tierId,
              tierName: pos.tierName,
              number: pos.number,
              status: pos.seat.status,
              rank: pos.seat.rank,
              registrationId: pos.seat.registrationId,
              price: tier?.price ?? null,
            },
          };
        }).filter((seat): seat is NonNullable<typeof seat> => seat != null),
      };

      if (block.seats.length === 0) return null;

      return block;
    })
    .filter((block): block is SeatmapBlockData => block != null);
}

export function seatmapBlocksSignature(blocks: SeatmapBlockData[]): string {
  if (blocks.length === 0) return "";
  try {
    return JSON.stringify(blocks);
  } catch {
    return String(blocks.length);
  }
}
