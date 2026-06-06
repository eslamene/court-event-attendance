/** Client-safe seating capacity helpers (aligned with web seating-limits). */

export type VenueCapacityProfile = "small" | "medium" | "large";

export type SeatingMapRenderMode = "full" | "sections" | "tier";

export const VENUE_CAPACITY = {
  fullVisualMapMax: 2_500,
  canvasRenderThreshold: 800,
  mobileDotMapMax: 600,
} as const;

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

export function usesSectionOverview(totalSeats: number): boolean {
  return totalSeats > VENUE_CAPACITY.fullVisualMapMax;
}

export function shouldRenderMobileDotMap(seatCount: number): boolean {
  return seatCount <= VENUE_CAPACITY.mobileDotMapMax;
}
