/** Client-safe helpers for large-venue seating maps (no server imports). */

import {
  prefersCanvasRendering,
  usesSectionOverview,
  type VenueCapacityProfile,
} from "./seating-limits";
import type { PositionedSeat } from "./seating-layout";

export type SeatingMapRenderMode = "full" | "sections" | "tier";

export type SectionBound = {
  tierId: string;
  tierName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  seatCount: number;
  assigned: number;
};

export type OccupiedSeatCell = {
  number: number;
  status: "approved" | "attended";
  registrationId?: string;
  fullName?: string;
  rank?: string;
};

export type SparseTierMeta = {
  id: string;
  name: string;
  seatCount: number;
  sortOrder: number;
  assigned: number;
  available: number;
  occupiedSeats: OccupiedSeatCell[];
};

export function computeSectionBounds(
  positioned: PositionedSeat[],
  tiers: { id: string; name: string; seatCount: number; assigned: number }[]
): SectionBound[] {
  const extrema = new Map<
    string,
    { minX: number; maxX: number; minY: number; maxY: number }
  >();

  for (const seat of positioned) {
    const current = extrema.get(seat.tierId) ?? {
      minX: seat.x,
      maxX: seat.x,
      minY: seat.y,
      maxY: seat.y,
    };
    current.minX = Math.min(current.minX, seat.x);
    current.maxX = Math.max(current.maxX, seat.x);
    current.minY = Math.min(current.minY, seat.y);
    current.maxY = Math.max(current.maxY, seat.y);
    extrema.set(seat.tierId, current);
  }

  const pad = 2.5;

  return tiers.map((tier) => {
    const box = extrema.get(tier.id);
    if (!box) {
      return {
        tierId: tier.id,
        tierName: tier.name,
        x: 10,
        y: 10,
        width: 80,
        height: 80,
        seatCount: tier.seatCount,
        assigned: tier.assigned,
      };
    }

    return {
      tierId: tier.id,
      tierName: tier.name,
      x: Math.max(0, box.minX - pad),
      y: Math.max(0, box.minY - pad),
      width: Math.min(100, box.maxX - box.minX + pad * 2),
      height: Math.min(100, box.maxY - box.minY + pad * 2),
      seatCount: tier.seatCount,
      assigned: tier.assigned,
    };
  });
}

export function resolveMapRenderMode(input: {
  totalSeats: number;
  tierId?: string;
  tierSeatCount?: number;
}): SeatingMapRenderMode {
  if (input.tierId) return "tier";
  if (usesSectionOverview(input.totalSeats)) return "sections";
  return "full";
}

export function shouldUseCanvasForVenue(input: {
  renderMode: SeatingMapRenderMode;
  seatCount: number;
}): boolean {
  if (input.renderMode === "sections") return false;
  return prefersCanvasRendering(input.seatCount);
}

export function capacityProfileLabelKey(
  profile: VenueCapacityProfile
): string {
  switch (profile) {
    case "small":
      return "seating.capacityProfile.small";
    case "medium":
      return "seating.capacityProfile.medium";
    case "large":
      return "seating.capacityProfile.large";
  }
}
