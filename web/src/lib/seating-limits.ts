/** Client-safe seating capacity limits (no server / DB imports). */

export const SEAT_TIER_LIMITS = {
  seatsPerTier: { min: 1, max: 1000 },
  totalSeats: { max: 2500 },
  tierCount: { max: 12 },
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
  return tiers.reduce((sum, tier) => sum + Math.max(0, Number(tier.seatCount) || 0), 0);
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
