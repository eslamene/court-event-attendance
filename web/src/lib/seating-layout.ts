import type { SeatCell, SeatingMapTier } from "./seating";

export type SeatingLayoutType =
  | "grid"
  | "theater"
  | "classroom"
  | "arena"
  | "banquet"
  | "u_shape";

export type StagePosition = "top" | "bottom" | "left" | "right" | "center";

/** Arena only: rings around center, or tiered rows radiating from center. */
export type ArenaArrangement = "rings" | "rows";

export type SeatingLayoutConfig = {
  stagePosition: StagePosition;
  stageLabel?: string;
  /** 0 or omitted = auto from seat count */
  seatsPerRow?: number;
  aisleCenter?: boolean;
  /** Arena layout: circular rings (default) or row tiers from center stage */
  arenaArrangement?: ArenaArrangement;
  /** Horizontal pitch multiplier between seats (0.6–2) */
  horizontalSpacing?: number;
  /** Vertical pitch multiplier between rows (0.6–2) */
  verticalSpacing?: number;
  /** Gap multiplier between seat tiers / layers (0.5–2.5) */
  tierSpacing?: number;
  /** Minimum padding between seat centers (1–2.5) */
  seatPadding?: number;
};

export type StageRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
};

export type PositionedSeat = {
  number: number;
  tierId: string;
  tierName: string;
  x: number;
  y: number;
  seat: SeatCell;
};

export type VenueLayout = {
  type: SeatingLayoutType;
  config: SeatingLayoutConfig;
  stage: StageRect;
  seats: PositionedSeat[];
};

export const LAYOUT_TYPES: SeatingLayoutType[] = [
  "theater",
  "classroom",
  "arena",
  "banquet",
  "u_shape",
  "grid",
];

export const DEFAULT_LAYOUT_CONFIG: SeatingLayoutConfig = {
  stagePosition: "top",
  stageLabel: "Stage",
  seatsPerRow: 0,
  aisleCenter: false,
  arenaArrangement: "rings",
  horizontalSpacing: 1,
  verticalSpacing: 1,
  tierSpacing: 1,
  seatPadding: 1.2,
};

export const SPACING_LIMITS = {
  horizontal: { min: 0.6, max: 2, step: 0.05 },
  vertical: { min: 0.6, max: 2, step: 0.05 },
  tier: { min: 0.5, max: 2.5, step: 0.05 },
  padding: { min: 1, max: 2.5, step: 0.05 },
} as const;

function spacingMult(value: number | undefined, fallback = 1): number {
  if (value == null || !Number.isFinite(value) || value <= 0) return fallback;
  return value;
}

export function minSeatCenterDistance(config: SeatingLayoutConfig): number {
  return 4 * spacingMult(config.seatPadding, 1.2);
}

/** Push seats apart so centers stay at least minDist apart (canvas % units). */
export function resolveSeatOverlaps(
  seats: PositionedSeat[],
  minDist: number
): PositionedSeat[] {
  if (seats.length < 2) return seats;

  const result = seats.map((s) => ({ ...s }));
  const minDistSq = minDist * minDist;

  for (let iter = 0; iter < 64; iter++) {
    let moved = false;
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const dx = result[j].x - result[i].x;
        const dy = result[j].y - result[i].y;
        const distSq = dx * dx + dy * dy;
        if (distSq >= minDistSq) continue;

        const dist = Math.sqrt(distSq) || 0.01;
        const push = (minDist - dist) / 2;
        const nx = dx / dist;
        const ny = dy / dist;
        result[i].x -= nx * push;
        result[i].y -= ny * push;
        result[j].x += nx * push;
        result[j].y += ny * push;
        moved = true;
      }
    }
    if (!moved) break;
  }

  return result.map((s) => ({
    ...s,
    x: Math.min(97, Math.max(3, s.x)),
    y: Math.min(97, Math.max(3, s.y)),
  }));
}

export function normalizeArenaArrangement(
  value: string | undefined | null
): ArenaArrangement {
  return value === "rows" ? "rows" : "rings";
}

export function parseLayoutConfig(json: string | null | undefined): SeatingLayoutConfig {
  if (!json || json.trim() === "" || json === "{}") {
    return { ...DEFAULT_LAYOUT_CONFIG };
  }
  try {
    const parsed = JSON.parse(json) as Partial<SeatingLayoutConfig>;
    return mergeLayoutConfig(parsed);
  } catch {
    return { ...DEFAULT_LAYOUT_CONFIG };
  }
}

function clampSpacing(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number
): number {
  const v = spacingMult(value, fallback);
  return Math.min(max, Math.max(min, v));
}

function mergeLayoutConfig(parsed: Partial<SeatingLayoutConfig>): SeatingLayoutConfig {
  return {
    stagePosition: parsed.stagePosition ?? DEFAULT_LAYOUT_CONFIG.stagePosition,
    stageLabel: parsed.stageLabel ?? DEFAULT_LAYOUT_CONFIG.stageLabel,
    seatsPerRow: parsed.seatsPerRow ?? 0,
    aisleCenter: Boolean(parsed.aisleCenter),
    arenaArrangement: normalizeArenaArrangement(parsed.arenaArrangement),
    horizontalSpacing: clampSpacing(
      parsed.horizontalSpacing,
      SPACING_LIMITS.horizontal.min,
      SPACING_LIMITS.horizontal.max,
      DEFAULT_LAYOUT_CONFIG.horizontalSpacing!
    ),
    verticalSpacing: clampSpacing(
      parsed.verticalSpacing,
      SPACING_LIMITS.vertical.min,
      SPACING_LIMITS.vertical.max,
      DEFAULT_LAYOUT_CONFIG.verticalSpacing!
    ),
    tierSpacing: clampSpacing(
      parsed.tierSpacing,
      SPACING_LIMITS.tier.min,
      SPACING_LIMITS.tier.max,
      DEFAULT_LAYOUT_CONFIG.tierSpacing!
    ),
    seatPadding: clampSpacing(
      parsed.seatPadding,
      SPACING_LIMITS.padding.min,
      SPACING_LIMITS.padding.max,
      DEFAULT_LAYOUT_CONFIG.seatPadding!
    ),
  };
}

/** Accept API object or JSON string. */
export function coerceLayoutConfig(
  value: string | SeatingLayoutConfig | null | undefined
): SeatingLayoutConfig {
  if (value == null) return { ...DEFAULT_LAYOUT_CONFIG };
  if (typeof value === "object") return mergeLayoutConfig(value);
  return parseLayoutConfig(value);
}

export function serializeLayoutConfig(config: SeatingLayoutConfig): string {
  return JSON.stringify({
    stagePosition: config.stagePosition,
    stageLabel: config.stageLabel?.trim() || DEFAULT_LAYOUT_CONFIG.stageLabel,
    seatsPerRow: config.seatsPerRow ?? 0,
    aisleCenter: Boolean(config.aisleCenter),
    arenaArrangement: normalizeArenaArrangement(config.arenaArrangement),
  });
}

export function normalizeLayoutType(value: string | null | undefined): SeatingLayoutType {
  if (value && LAYOUT_TYPES.includes(value as SeatingLayoutType)) {
    return value as SeatingLayoutType;
  }
  return "theater";
}

/** Stage positions offered in the layout designer for a venue type. */
export function getStagePositionsForLayout(layoutType: SeatingLayoutType): StagePosition[] {
  if (layoutType === "arena" || layoutType === "banquet") {
    return ["center"];
  }
  return ["top", "bottom", "left", "right", "center"];
}

export function normalizeStagePositionForLayout(
  layoutType: SeatingLayoutType,
  position: StagePosition | string | undefined
): StagePosition {
  const allowed = getStagePositionsForLayout(layoutType);
  if (position && allowed.includes(position as StagePosition)) {
    return position as StagePosition;
  }
  return allowed[0];
}

function autoSeatsPerRow(count: number): number {
  if (count <= 8) return count;
  if (count <= 24) return 8;
  if (count <= 60) return 10;
  return Math.min(14, Math.ceil(Math.sqrt(count * 1.4)));
}

function stageRect(config: SeatingLayoutConfig, layoutType: SeatingLayoutType): StageRect {
  const label = config.stageLabel?.trim() || DEFAULT_LAYOUT_CONFIG.stageLabel!;
  const pos = config.stagePosition;

  if (layoutType === "arena" || layoutType === "banquet") {
    return { x: 42, y: 42, width: 16, height: 16, label };
  }

  switch (pos) {
    case "bottom":
      return { x: 22, y: 86, width: 56, height: 8, label };
    case "left":
      return { x: 4, y: 38, width: 10, height: 24, label };
    case "right":
      return { x: 86, y: 38, width: 10, height: 24, label };
    case "center":
      return { x: 38, y: 38, width: 24, height: 24, label };
    case "top":
    default:
      return { x: 22, y: 4, width: 56, height: 8, label };
  }
}

function theaterRows(
  tier: SeatingMapTier,
  startY: number,
  config: SeatingLayoutConfig
): { seats: PositionedSeat[]; nextY: number } {
  const spr = config.seatsPerRow && config.seatsPerRow > 0
    ? config.seatsPerRow
    : autoSeatsPerRow(tier.seatCount);
  const rowH = 5.2;
  const seatW = Math.min(4.2, 88 / spr);
  const positioned: PositionedSeat[] = [];

  for (let i = 0; i < tier.seats.length; i++) {
    const seat = tier.seats[i];
    const row = Math.floor(i / spr);
    const col = i % spr;
    const seatsInRow = Math.min(spr, tier.seatCount - row * spr);
    let x = 50 - ((seatsInRow - 1) * seatW) / 2 + col * seatW;

    if (config.aisleCenter && seatsInRow > 4 && col >= Math.ceil(seatsInRow / 2)) {
      x += 3.5;
    }

    positioned.push({
      number: seat.number,
      tierId: tier.id,
      tierName: tier.name,
      x,
      y: startY + row * rowH,
      seat,
    });
  }

  const rows = Math.ceil(tier.seatCount / spr);
  return { seats: positioned, nextY: startY + rows * rowH + 3 };
}

function layoutTheaterLike(
  tiers: SeatingMapTier[],
  config: SeatingLayoutConfig,
  type: "theater" | "classroom"
): PositionedSeat[] {
  const stage = stageRect(config, type);
  let y = stage.y + stage.height + 4;

  if (config.stagePosition === "bottom") {
    y = 12;
  }

  const all: PositionedSeat[] = [];
  for (const tier of tiers) {
    const { seats, nextY } = theaterRows(tier, y, {
      ...config,
      aisleCenter: type === "classroom" || config.aisleCenter,
    });
    all.push(...seats);
    y = nextY;
  }
  return all;
}

function layoutArenaRings(tiers: SeatingMapTier[]): PositionedSeat[] {
  const all: PositionedSeat[] = [];
  const ringGap = 28 / Math.max(tiers.length, 1);

  tiers.forEach((tier, tierIndex) => {
    const radius = 14 + (tierIndex + 1) * ringGap;
    for (let i = 0; i < tier.seats.length; i++) {
      const seat = tier.seats[i];
      const angle = (2 * Math.PI * i) / tier.seatCount - Math.PI / 2;
      all.push({
        number: seat.number,
        tierId: tier.id,
        tierName: tier.name,
        x: 50 + radius * Math.cos(angle) * 0.85,
        y: 50 + radius * Math.sin(angle) * 0.85,
        seat,
      });
    }
  });

  return all;
}

/** Row tiers stacked outward from the center stage (amphitheater-style). */
function layoutArenaRows(
  tiers: SeatingMapTier[],
  config: SeatingLayoutConfig
): PositionedSeat[] {
  const stage = stageRect(config, "arena");
  let y = stage.y + stage.height + 5;
  const all: PositionedSeat[] = [];

  for (const tier of tiers) {
    const { seats, nextY } = theaterRows(tier, y, config);
    all.push(...seats);
    y = nextY + 4;
  }

  return all;
}

function layoutArena(
  tiers: SeatingMapTier[],
  config: SeatingLayoutConfig
): PositionedSeat[] {
  if (normalizeArenaArrangement(config.arenaArrangement) === "rows") {
    return layoutArenaRows(tiers, config);
  }
  return layoutArenaRings(tiers);
}

function layoutBanquet(tiers: SeatingMapTier[]): PositionedSeat[] {
  const all: PositionedSeat[] = [];

  for (const tier of tiers) {
    const seatsPerTable = 8;
    const tableCount = Math.ceil(tier.seatCount / seatsPerTable);
    const tablesPerRing = Math.max(1, Math.ceil(Math.sqrt(tableCount)));
    const ringRadius = 22 + tier.sortOrder * 8;

    for (let t = 0; t < tableCount; t++) {
      const ring = Math.floor(t / tablesPerRing);
      const posInRing = t % tablesPerRing;
      const tablesOnRing = Math.min(tablesPerRing, tableCount - ring * tablesPerRing);
      const tableAngle = (2 * Math.PI * posInRing) / tablesOnRing - Math.PI / 2;
      const tableX = 50 + (ringRadius + ring * 10) * Math.cos(tableAngle) * 0.9;
      const tableY = 50 + (ringRadius + ring * 10) * Math.sin(tableAngle) * 0.9;

      const start = t * seatsPerTable;
      const end = Math.min(start + seatsPerTable, tier.seatCount);

      for (let s = start; s < end; s++) {
        const seat = tier.seats[s];
        const seatAngle = (2 * Math.PI * (s - start)) / (end - start) - Math.PI / 2;
        all.push({
          number: seat.number,
          tierId: tier.id,
          tierName: tier.name,
          x: tableX + 3.8 * Math.cos(seatAngle),
          y: tableY + 3.8 * Math.sin(seatAngle),
          seat,
        });
      }
    }
  }

  return all;
}

function layoutUShape(tiers: SeatingMapTier[]): PositionedSeat[] {
  const all: PositionedSeat[] = [];

  for (const tier of tiers) {
    const count = tier.seatCount;
    const leftCount = Math.ceil(count * 0.28);
    const bottomCount = Math.ceil(count * 0.36);
    const rightCount = count - leftCount - bottomCount;
    const tierOffset = (tier.sortOrder - 1) * 4;

    for (let i = 0; i < count; i++) {
      const seat = tier.seats[i];
      let x = 50;
      let y = 50;

      if (i < leftCount) {
        x = 14 - tierOffset;
        y = 22 + (i / Math.max(leftCount - 1, 1)) * 52;
      } else if (i < leftCount + bottomCount) {
        const bi = i - leftCount;
        x = 18 + (bi / Math.max(bottomCount - 1, 1)) * 64;
        y = 82 - tierOffset;
      } else {
        const ri = i - leftCount - bottomCount;
        x = 86 + tierOffset;
        y = 22 + (ri / Math.max(rightCount - 1, 1)) * 52;
      }

      all.push({
        number: seat.number,
        tierId: tier.id,
        tierName: tier.name,
        x,
        y,
        seat,
      });
    }
  }

  return all;
}

function layoutGrid(tiers: SeatingMapTier[]): PositionedSeat[] {
  const all: PositionedSeat[] = [];
  let yOffset = 16;

  for (const tier of tiers) {
    const spr = autoSeatsPerRow(tier.seatCount);
    const seatW = Math.min(4.5, 90 / spr);
    const rowH = 5.5;

    for (let i = 0; i < tier.seats.length; i++) {
      const seat = tier.seats[i];
      const row = Math.floor(i / spr);
      const col = i % spr;
      const seatsInRow = Math.min(spr, tier.seatCount - row * spr);
      all.push({
        number: seat.number,
        tierId: tier.id,
        tierName: tier.name,
        x: 50 - ((seatsInRow - 1) * seatW) / 2 + col * seatW,
        y: yOffset + row * rowH,
        seat,
      });
    }

    const rows = Math.ceil(tier.seatCount / spr);
    yOffset += rows * rowH + 8;
  }

  return all;
}

export function computeVenueLayout(
  tiers: SeatingMapTier[],
  layoutType: SeatingLayoutType,
  config: SeatingLayoutConfig
): VenueLayout {
  const type = normalizeLayoutType(layoutType);
  const normalizedConfig = {
    ...DEFAULT_LAYOUT_CONFIG,
    ...config,
  };
  const stage = stageRect(normalizedConfig, type);

  let seats: PositionedSeat[] = [];
  switch (type) {
    case "classroom":
      seats = layoutTheaterLike(tiers, normalizedConfig, "classroom");
      break;
    case "theater":
      seats = layoutTheaterLike(tiers, normalizedConfig, "theater");
      break;
    case "arena":
      seats = layoutArena(tiers, normalizedConfig);
      break;
    case "banquet":
      seats = layoutBanquet(tiers);
      break;
    case "u_shape":
      seats = layoutUShape(tiers);
      break;
    case "grid":
    default:
      seats = layoutGrid(tiers);
      break;
  }

  return {
    type,
    config: normalizedConfig,
    stage,
    seats,
  };
}
