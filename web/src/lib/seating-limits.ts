/** Client-safe seating capacity limits (no server / DB imports). */

export const SEAT_TIER_LIMITS = {
  seatsPerTier: { min: 1, max: 10_000 },
  totalSeats: { max: 25_000 },
  tierCount: { max: 32 },
} as const;

/** Venue size bands for UI and API payload shaping. */
export type VenueCapacityProfile = "small" | "medium" | "large";

export const VENUE_CAPACITY = {
  /** Up to this total: full interactive DOM seat map for the whole venue. */
  fullVisualMapMax: 2_500,
  /** Prefer canvas rendering above this seat count in a single view. */
  canvasRenderThreshold: 800,
  /** Designer preview warns above this total (layout still computes). */
  designPreviewWarnTotal: 2_500,
  smallMax: 2_500,
  mediumMax: 10_000,
  largeMax: 25_000,
} as const;

export type SeatTierCountInput = {
  name: string;
  seatCount: number;
};

export function isValidTierSeatCount(seatCount: number): boolean {
  return (
    Number.isInteger(seatCount) &&
    seatCount >= SEAT_TIER_LIMITS.seatsPerTier.min &&
    seatCount <= SEAT_TIER_LIMITS.seatsPerTier.max
  );
}

export function totalSeatCount(tiers: { seatCount: number }[]): number {
  return tiers.reduce(
    (sum, tier) => sum + Math.max(0, Number(tier.seatCount) || 0),
    0
  );
}

export type TierSeatRedistributionInput = SeatTierCountInput & {
  assigned?: number;
};

/** Split `targetTotal` seats evenly across tiers, never below assigned counts. */
export function redistributeSeatCountsAcrossTiers<T extends TierSeatRedistributionInput>(
  tiers: T[],
  targetTotal?: number
): T[] {
  if (tiers.length === 0) return [];

  const mins = tiers.map((tier) =>
    Math.max(0, Number(tier.assigned) || 0)
  );
  const minSum = mins.reduce((sum, value) => sum + value, 0);
  const total = Math.max(targetTotal ?? totalSeatCount(tiers), minSum);
  const n = tiers.length;

  const ideal = Math.floor(total / n);
  let remainder = total % n;
  const counts = mins.map((min, index) => {
    const share = ideal + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
    return Math.max(min, share);
  });

  let sum = counts.reduce((a, b) => a + b, 0);
  let guard = 0;
  while (sum > total && guard++ < total * n) {
    let trimmed = false;
    for (let i = 0; i < n; i++) {
      if (counts[i] > mins[i]) {
        counts[i]--;
        sum--;
        trimmed = true;
        if (sum <= total) break;
      }
    }
    if (!trimmed) break;
  }

  guard = 0;
  let fill = 0;
  while (sum < total && guard++ < total * n) {
    counts[fill % n]++;
    sum++;
    fill++;
  }

  return tiers.map((tier, index) => ({
    ...tier,
    seatCount: counts[index],
  }));
}

export function getVenueCapacityProfile(
  totalSeats: number
): VenueCapacityProfile {
  if (totalSeats <= VENUE_CAPACITY.smallMax) return "small";
  if (totalSeats <= VENUE_CAPACITY.mediumMax) return "medium";
  return "large";
}

export function usesSectionOverview(totalSeats: number): boolean {
  return totalSeats > VENUE_CAPACITY.fullVisualMapMax;
}

export function prefersCanvasRendering(seatCount: number): boolean {
  return seatCount > VENUE_CAPACITY.canvasRenderThreshold;
}

export type SeatTierValidationIssue =
  | { type: "tier_count"; max: number }
  | { type: "tier_seats"; name: string; count: number; max: number }
  | { type: "total_seats"; count: number; max: number };

export function collectSeatTierValidationIssues(
  tiers: SeatTierCountInput[]
): SeatTierValidationIssue[] {
  const issues: SeatTierValidationIssue[] = [];

  if (tiers.length > SEAT_TIER_LIMITS.tierCount.max) {
    issues.push({
      type: "tier_count",
      max: SEAT_TIER_LIMITS.tierCount.max,
    });
  }

  for (const tier of tiers) {
    const count = Number(tier.seatCount);
    if (!isValidTierSeatCount(count)) {
      issues.push({
        type: "tier_seats",
        name: tier.name.trim() || "—",
        count,
        max: SEAT_TIER_LIMITS.seatsPerTier.max,
      });
    }
  }

  const total = totalSeatCount(tiers);
  if (total > SEAT_TIER_LIMITS.totalSeats.max) {
    issues.push({
      type: "total_seats",
      count: total,
      max: SEAT_TIER_LIMITS.totalSeats.max,
    });
  }

  return issues;
}

export function validateSeatTierLimits(
  tiers: SeatTierCountInput[]
): { ok: true } | { ok: false; issue: SeatTierValidationIssue } {
  const issues = collectSeatTierValidationIssues(tiers);
  if (issues.length === 0) return { ok: true };
  return { ok: false, issue: issues[0] };
}

export function buildTierSeatCountErrors(
  tiers: SeatTierCountInput[],
  translate: (key: string, vars?: Record<string, string>) => string
): Record<number, string> {
  const errors: Record<number, string> = {};
  const total = totalSeatCount(tiers);
  const totalMsg =
    total > SEAT_TIER_LIMITS.totalSeats.max
      ? translate("seating.seatCountTotalTooHigh", {
          count: String(total),
          max: String(SEAT_TIER_LIMITS.totalSeats.max),
        })
      : null;

  tiers.forEach((tier, index) => {
    const count = Number(tier.seatCount);
    if (!isValidTierSeatCount(count)) {
      errors[index] = translate("seating.seatCountTooHigh", {
        name: tier.name.trim() || "—",
        count: String(count),
        max: String(SEAT_TIER_LIMITS.seatsPerTier.max),
      });
    } else if (totalMsg) {
      errors[index] = totalMsg;
    }
  });

  return errors;
}

/** Map a validation issue to an i18n key + vars for the UI. */
export function seatTierIssueMessageKey(
  issue: SeatTierValidationIssue
): { key: string; vars: Record<string, string> } {
  switch (issue.type) {
    case "tier_count":
      return {
        key: "seating.tierCountTooHigh",
        vars: { max: String(issue.max) },
      };
    case "tier_seats":
      return {
        key: "seating.seatCountTooHigh",
        vars: {
          name: issue.name,
          max: String(issue.max),
          count: String(issue.count),
        },
      };
    case "total_seats":
      return {
        key: "seating.seatCountTotalTooHigh",
        vars: {
          count: String(issue.count),
          max: String(issue.max),
        },
      };
  }
}
