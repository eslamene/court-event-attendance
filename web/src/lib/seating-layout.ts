import type { SeatCell, SeatingMapTier } from "./seating";

export type SeatingLayoutType =
  | "grid"
  | "theater"
  | "classroom"
  | "arena"
  | "banquet"
  | "u_shape";

export type StagePosition = "top" | "bottom" | "left" | "right" | "center";

/** Arena only: rings around center, or tiered rows radiating from center stage */
export type ArenaArrangement = "rings" | "rows";

/** Per-tier placement overrides (key = tier id or stable client key). */
export type TierPlacement = {
  /** Arena rings: 1-based ring index. 0 / omitted = auto from tier order. */
  ring?: number;
};

export type SeatingLayoutConfig = {
  stagePosition: StagePosition;
  stageLabel?: string;
  /** 0 or omitted = auto from seat count */
  seatsPerRow?: number;
  /** 0 or omitted = auto from seat count and seats per row */
  numberOfRows?: number;
  /** Arena rings only. 0 = auto from seat count and tiers */
  numberOfRings?: number;
  aisleCenter?: boolean;
  arenaArrangement?: ArenaArrangement;
  tierPlacements?: Record<string, TierPlacement>;
  horizontalSpacing?: number;
  verticalSpacing?: number;
  tierSpacing?: number;
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

export type VenueLayout = {
  type: SeatingLayoutType;
  config: SeatingLayoutConfig;
  stage: StageRect;
  seats: PositionedSeat[];
  renderMode?: SeatingMapRenderMode;
  sectionBounds?: SectionBound[];
  focusedTierId?: string;
};

/** Resolve seat data by index; tiers may carry sparse `seats` (occupied only). */
function seatAtIndex(tier: SeatingMapTier, index: number): SeatCell {
  const number = index + 1;
  const found = tier.seats.find((s) => s.number === number);
  return found ?? { number, status: "free" };
}

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
  numberOfRows: 0,
  numberOfRings: 0,
  aisleCenter: false,
  arenaArrangement: "rings",
  horizontalSpacing: 1,
  verticalSpacing: 1,
  tierSpacing: 1,
  seatPadding: 1.2,
};

export const ROW_LAYOUT_LIMITS = {
  seatsPerRow: { min: 0, max: 50, step: 1 },
  numberOfRows: { min: 0, max: 30, step: 1 },
} as const;

export const ARENA_RING_LIMITS = {
  numberOfRings: { min: 0, max: 12, step: 1 },
} as const;

export const SPACING_LIMITS = {
  horizontal: { min: 0.6, max: 2, step: 0.05 },
  vertical: { min: 0.6, max: 2, step: 0.05 },
  tier: { min: 0.5, max: 2.5, step: 0.05 },
  padding: { min: 1, max: 2.5, step: 0.05 },
} as const;

/** Usable canvas (% coordinates). */
const BOUNDS = { min: 4, max: 96, cx: 50, cy: 50, usableW: 88, usableH: 88 };

type LayoutMetrics = {
  minDist: number;
  hPitch: number;
  vPitch: number;
  tierGap: number;
  aisleGap: number;
};

type RowOrientation = "horizontal" | "vertical";

type PlacementContext = {
  metrics: LayoutMetrics;
  orientation: RowOrientation;
  /** Unit vector from row toward stage (for fan curvature). */
  fanAxis: { x: number; y: number };
  /** 0 = front row, increases away from stage. */
  rowDepth: number;
  totalRows: number;
};

// ——— Config helpers ———

function spacingMult(value: number | undefined, fallback = 1): number {
  if (value == null || !Number.isFinite(value) || value <= 0) return fallback;
  return value;
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

export function minSeatCenterDistance(config: SeatingLayoutConfig): number {
  return 3.8 * spacingMult(config.seatPadding, 1.2);
}

function centerStageTemplate(): StageRect {
  return { x: 38, y: 38, width: 24, height: 24, label: "" };
}

function centerStageBands(stage: StageRect, metrics: LayoutMetrics) {
  const gap = metrics.tierGap + metrics.minDist * 0.35;
  const margin = BOUNDS.min + 4;
  const belowHeight = BOUNDS.max - (stage.y + stage.height) - gap - margin;
  const aboveHeight = stage.y - gap - margin;
  return { gap, belowHeight, aboveHeight };
}

function estimateCanvasSeatCapacity(
  metrics: LayoutMetrics,
  tierCount = 1,
  config?: SeatingLayoutConfig
): number {
  const cols = Math.max(1, Math.floor(BOUNDS.usableW / metrics.hPitch));
  const tierGaps = Math.max(0, tierCount - 1) * metrics.tierGap;
  let usableH = usableSeatingHeight();
  if (config?.stagePosition === "center") {
    const bands = centerStageBands(centerStageTemplate(), metrics);
    usableH = Math.max(0, bands.belowHeight) + Math.max(0, bands.aboveHeight);
  }
  const rows = Math.max(1, Math.floor((usableH - tierGaps) / metrics.vPitch));
  return Math.max(1, Math.floor(cols * rows * 0.9));
}

function densityScaleForSeatCount(
  seatCount: number,
  metrics: LayoutMetrics,
  tierCount: number,
  config?: SeatingLayoutConfig
): number {
  const capacity = estimateCanvasSeatCapacity(metrics, tierCount, config);
  if (seatCount <= capacity) return 1;
  const ratio = (capacity * 0.88) / seatCount;
  return Math.min(1, Math.pow(ratio, 0.62));
}

function metricsFromConfig(
  config: SeatingLayoutConfig,
  seatCount?: number,
  tierCount = 1
): LayoutMetrics {
  const baseMinDist = minSeatCenterDistance(config);
  const hMult = spacingMult(config.horizontalSpacing);
  const vMult = spacingMult(config.verticalSpacing);
  const tierMult = spacingMult(config.tierSpacing);

  const base: LayoutMetrics = {
    minDist: baseMinDist,
    hPitch: Math.max(baseMinDist * 0.92, 3.6 * hMult),
    vPitch: Math.max(baseMinDist * 0.95, 4.8 * vMult),
    tierGap: Math.max(2.5, 3.2 * tierMult),
    aisleGap: Math.max(baseMinDist * 0.65, 2.8),
  };

  if (!seatCount || seatCount <= 0) return base;

  const density = densityScaleForSeatCount(seatCount, base, tierCount, config);
  if (density >= 0.999) return base;

  return {
    minDist: baseMinDist * density,
    hPitch: base.hPitch * density,
    vPitch: base.vPitch * density,
    tierGap: base.tierGap * density,
    aisleGap: base.aisleGap * density,
  };
}

export function normalizeArenaArrangement(
  value: string | undefined | null
): ArenaArrangement {
  return value === "rows" ? "rows" : "rings";
}

function clampRingCount(value: number | undefined): number {
  if (value == null || !Number.isFinite(value) || value <= 0) return 0;
  return Math.min(
    ARENA_RING_LIMITS.numberOfRings.max,
    Math.max(ARENA_RING_LIMITS.numberOfRings.min, Math.round(value))
  );
}

export function tierPlacementKey(
  tier: { id?: string; clientKey?: string },
  index: number
): string {
  return tier.id ?? tier.clientKey ?? `preview-${index}`;
}

function normalizeTierPlacements(
  raw: Record<string, TierPlacement> | undefined
): Record<string, TierPlacement> | undefined {
  if (!raw) return undefined;
  const result: Record<string, TierPlacement> = {};
  for (const [key, value] of Object.entries(raw)) {
    const ring = clampRingCount(value?.ring);
    if (ring > 0) result[key] = { ring };
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export function getTierPlacement(
  config: SeatingLayoutConfig,
  tierKey: string
): TierPlacement {
  return config.tierPlacements?.[tierKey] ?? {};
}

/** Drop ring placements for removed tiers so layout auto-redistributes. */
export function syncTierPlacementsAfterTierChange(
  config: SeatingLayoutConfig,
  tiers: { id?: string; clientKey?: string }[]
): SeatingLayoutConfig {
  if (!config.tierPlacements) return config;

  const validKeys = new Set(
    tiers.map((tier, index) => tierPlacementKey(tier, index))
  );
  const next: Record<string, TierPlacement> = {};
  for (const [key, placement] of Object.entries(config.tierPlacements)) {
    if (validKeys.has(key)) next[key] = placement;
  }

  return {
    ...config,
    tierPlacements: Object.keys(next).length > 0 ? next : undefined,
  };
}

function mergeLayoutConfig(parsed: Partial<SeatingLayoutConfig>): SeatingLayoutConfig {
  return {
    stagePosition: parsed.stagePosition ?? DEFAULT_LAYOUT_CONFIG.stagePosition,
    stageLabel: parsed.stageLabel ?? DEFAULT_LAYOUT_CONFIG.stageLabel,
    seatsPerRow: parsed.seatsPerRow ?? 0,
    numberOfRows: parsed.numberOfRows ?? 0,
    numberOfRings: clampRingCount(parsed.numberOfRings),
    aisleCenter: Boolean(parsed.aisleCenter),
    arenaArrangement: normalizeArenaArrangement(parsed.arenaArrangement),
    tierPlacements: normalizeTierPlacements(parsed.tierPlacements),
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

export function coerceLayoutConfig(
  value: string | SeatingLayoutConfig | null | undefined
): SeatingLayoutConfig {
  if (value == null) return { ...DEFAULT_LAYOUT_CONFIG };
  if (typeof value === "object") return mergeLayoutConfig(value);
  return parseLayoutConfig(value);
}

export function serializeLayoutConfig(config: SeatingLayoutConfig): string {
  const merged = mergeLayoutConfig(config);
  return JSON.stringify({
    stagePosition: merged.stagePosition,
    stageLabel: merged.stageLabel?.trim() || DEFAULT_LAYOUT_CONFIG.stageLabel,
    seatsPerRow: merged.seatsPerRow ?? 0,
    numberOfRows: merged.numberOfRows ?? 0,
    numberOfRings: merged.numberOfRings ?? 0,
    aisleCenter: Boolean(merged.aisleCenter),
    arenaArrangement: normalizeArenaArrangement(merged.arenaArrangement),
    tierPlacements: merged.tierPlacements,
    horizontalSpacing: merged.horizontalSpacing,
    verticalSpacing: merged.verticalSpacing,
    tierSpacing: merged.tierSpacing,
    seatPadding: merged.seatPadding,
  });
}

export function normalizeLayoutType(value: string | null | undefined): SeatingLayoutType {
  if (value && LAYOUT_TYPES.includes(value as SeatingLayoutType)) {
    return value as SeatingLayoutType;
  }
  return "theater";
}

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

// ——— Geometry & post-processing ———

function stageCenter(stage: StageRect): { x: number; y: number } {
  return {
    x: stage.x + stage.width / 2,
    y: stage.y + stage.height / 2,
  };
}

function stageInflated(stage: StageRect, pad: number): StageRect {
  return {
    ...stage,
    x: stage.x - pad,
    y: stage.y - pad,
    width: stage.width + pad * 2,
    height: stage.height + pad * 2,
  };
}

function pointInRect(x: number, y: number, r: StageRect): boolean {
  return x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
}

function clampPoint(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.min(BOUNDS.max, Math.max(BOUNDS.min, x)),
    y: Math.min(BOUNDS.max, Math.max(BOUNDS.min, y)),
  };
}

/** Clamp to canvas; nudge along the edge so stacked boundary seats do not share one point. */
function clampPointSpread(
  x: number,
  y: number,
  spreadKey: number,
  minDist: number
): { x: number; y: number } {
  let cx = Math.min(BOUNDS.max, Math.max(BOUNDS.min, x));
  let cy = Math.min(BOUNDS.max, Math.max(BOUNDS.min, y));

  const onEdge =
    cx <= BOUNDS.min + 0.05 ||
    cx >= BOUNDS.max - 0.05 ||
    cy <= BOUNDS.min + 0.05 ||
    cy >= BOUNDS.max - 0.05;

  if (onEdge) {
    const angle = spreadKey * 2.399963229728653;
    const spread = minDist * 0.22;
    cx = Math.min(BOUNDS.max, Math.max(BOUNDS.min, cx + Math.cos(angle) * spread));
    cy = Math.min(BOUNDS.max, Math.max(BOUNDS.min, cy + Math.sin(angle) * spread));
  }

  return { x: cx, y: cy };
}

/** Repel seats from the stage footprint before overlap resolution. */
function applyStageClearance(
  seats: PositionedSeat[],
  stage: StageRect,
  minDist: number
): PositionedSeat[] {
  const zone = stageInflated(stage, minDist * 0.55);
  const center = stageCenter(stage);

  return seats.map((s) => {
    if (!pointInRect(s.x, s.y, zone)) return s;

    const dx = s.x - center.x;
    const dy = s.y - center.y;
    const len = Math.hypot(dx, dy) || 0.01;
    const push = minDist * 0.85;
    const nx = dx / len;
    const ny = dy / len;

    let x = s.x + nx * push;
    let y = s.y + ny * push;

    if (pointInRect(x, y, zone)) {
      if (zone.width >= zone.height) {
        x = s.x < center.x ? zone.x - minDist * 0.3 : zone.x + zone.width + minDist * 0.3;
      } else {
        y = s.y < center.y ? zone.y - minDist * 0.3 : zone.y + zone.height + minDist * 0.3;
      }
    }

    const clamped = clampPoint(x, y);
    return { ...s, x: clamped.x, y: clamped.y };
  });
}

/** Force-directed separation with damping; preserves tier grouping lightly. */
export function resolveSeatOverlaps(
  seats: PositionedSeat[],
  minDist: number
): PositionedSeat[] {
  if (seats.length < 2) return seats;

  const result = seats.map((s, index) => ({ ...s, vx: 0, vy: 0, index }));
  const minDistSq = minDist * minDist;
  const maxIter = Math.min(220, 50 + Math.floor(seats.length / 3));

  for (let iter = 0; iter < maxIter; iter++) {
    let maxOverlap = 0;

    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const dx = result[j].x - result[i].x;
        const dy = result[j].y - result[i].y;
        const distSq = dx * dx + dy * dy;
        if (distSq >= minDistSq) continue;

        const dist = Math.sqrt(distSq) || 0.01;
        const overlap = minDist - dist;
        maxOverlap = Math.max(maxOverlap, overlap);

        const nx = dx / dist;
        const ny = dy / dist;
        const sameTier = result[i].tierId === result[j].tierId;
        const weight = sameTier ? 0.55 : 0.45;

        result[i].vx -= nx * overlap * weight;
        result[i].vy -= ny * overlap * weight;
        result[j].vx += nx * overlap * weight;
        result[j].vy += ny * overlap * weight;
      }
    }

    const damping = iter < maxIter * 0.6 ? 0.72 : 0.58;
    for (const s of result) {
      s.x += s.vx;
      s.y += s.vy;
      s.vx *= damping;
      s.vy *= damping;
      const c = clampPointSpread(s.x, s.y, s.index + s.number, minDist);
      s.x = c.x;
      s.y = c.y;
    }

    if (maxOverlap < 0.02) break;
  }

  return result.map(({ vx: _vx, vy: _vy, index: _index, ...s }) => s);
}

/** Shift seat cloud into canvas without scaling — preserves row spacing. */
function translateLayoutToBounds(seats: PositionedSeat[], margin = 6): PositionedSeat[] {
  if (seats.length === 0) return seats;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const s of seats) {
    minX = Math.min(minX, s.x);
    maxX = Math.max(maxX, s.x);
    minY = Math.min(minY, s.y);
    maxY = Math.max(maxY, s.y);
  }

  let dx = 0;
  let dy = 0;
  if (minX < BOUNDS.min + margin) dx = BOUNDS.min + margin - minX;
  else if (maxX > BOUNDS.max - margin) dx = BOUNDS.max - margin - maxX;

  if (minY < BOUNDS.min + margin) dy = BOUNDS.min + margin - minY;
  else if (maxY > BOUNDS.max - margin) dy = BOUNDS.max - margin - maxY;

  if (dx === 0 && dy === 0) return seats;

  return seats.map((s) => {
    const c = clampPoint(s.x + dx, s.y + dy);
    return { ...s, x: c.x, y: c.y };
  });
}

/** Scale & translate seat cloud to fit canvas if layout overflows. */
function fitLayoutToBounds(seats: PositionedSeat[]): PositionedSeat[] {
  if (seats.length === 0) return seats;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const s of seats) {
    minX = Math.min(minX, s.x);
    maxX = Math.max(maxX, s.x);
    minY = Math.min(minY, s.y);
    maxY = Math.max(maxY, s.y);
  }

  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const margin = 6;
  const maxW = BOUNDS.usableW - margin * 2;
  const maxH = BOUNDS.usableH - margin * 2;
  const scale = Math.min(1, maxW / w, maxH / h);

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  return seats.map((s) => {
    const x = BOUNDS.cx + (s.x - cx) * scale;
    const y = BOUNDS.cy + (s.y - cy) * scale;
    const c = clampPoint(x, y);
    return { ...s, x: c.x, y: c.y };
  });
}

const ROW_ALIGN_TYPES: ReadonlySet<SeatingLayoutType> = new Set([
  "theater",
  "classroom",
  "grid",
]);

function isRowAlignedLayout(type: SeatingLayoutType, config: SeatingLayoutConfig): boolean {
  if (ROW_ALIGN_TYPES.has(type)) return true;
  return type === "arena" && normalizeArenaArrangement(config.arenaArrangement) === "rows";
}

function isArenaRingsLayout(type: SeatingLayoutType, config: SeatingLayoutConfig): boolean {
  return type === "arena" && normalizeArenaArrangement(config.arenaArrangement) === "rings";
}

/** Cluster seats into horizontal rows (top-to-bottom). */
function groupSeatsIntoRows(seats: PositionedSeat[], tolerance = 2): PositionedSeat[][] {
  const sorted = [...seats].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: PositionedSeat[][] = [];

  for (const seat of sorted) {
    const last = rows[rows.length - 1];
    if (!last || Math.abs(seat.y - last[0].y) > tolerance) {
      rows.push([seat]);
    } else {
      last.push(seat);
    }
  }

  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
  }
  return rows;
}

/** Force every row to a single Y so grids stay straight. */
function snapHorizontalRows(seats: PositionedSeat[]): PositionedSeat[] {
  const rows = groupSeatsIntoRows(seats);
  if (rows.length < 2) {
    return rows.flatMap((row) => {
      const rowY = row.reduce((sum, s) => sum + s.y, 0) / row.length;
      return row.map((s) => ({ ...s, y: rowY }));
    });
  }

  const centers = rows.map(
    (row) => row.reduce((sum, s) => sum + s.y, 0) / row.length
  );
  const gaps: number[] = [];
  for (let i = 1; i < centers.length; i++) {
    gaps.push(Math.abs(centers[i] - centers[i - 1]));
  }
  gaps.sort((a, b) => a - b);
  const medianGap = gaps[Math.floor(gaps.length / 2)] ?? 2;
  const tolerance = Math.min(1.25, medianGap * 0.28);

  const sorted = [...seats].sort((a, b) => a.y - b.y || a.x - b.x);
  const snappedRows: PositionedSeat[][] = [];
  for (const seat of sorted) {
    const last = snappedRows[snappedRows.length - 1];
    if (!last || Math.abs(seat.y - last[0].y) > tolerance) {
      snappedRows.push([seat]);
    } else {
      last.push(seat);
    }
  }

  return snappedRows.flatMap((row) => {
    const rowY = row.reduce((sum, s) => sum + s.y, 0) / row.length;
    return row.map((s) => ({ ...s, y: rowY }));
  });
}

function groupSeatsIntoColumns(seats: PositionedSeat[], tolerance = 2): PositionedSeat[][] {
  const sorted = [...seats].sort((a, b) => a.x - b.x || a.y - b.y);
  const columns: PositionedSeat[][] = [];

  for (const seat of sorted) {
    const last = columns[columns.length - 1];
    if (!last || Math.abs(seat.x - last[0].x) > tolerance) {
      columns.push([seat]);
    } else {
      last.push(seat);
    }
  }

  for (const col of columns) {
    col.sort((a, b) => a.y - b.y);
  }
  return columns;
}

function snapVerticalColumns(seats: PositionedSeat[]): PositionedSeat[] {
  return groupSeatsIntoColumns(seats).flatMap((col) => {
    const colX = col.reduce((sum, s) => sum + s.x, 0) / col.length;
    return col.map((s) => ({ ...s, x: colX }));
  });
}

function rowOrientationForStage(position: StagePosition): RowOrientation {
  return position === "left" || position === "right" ? "vertical" : "horizontal";
}

function snapRowAlignedSeats(
  seats: PositionedSeat[],
  orientation: RowOrientation
): PositionedSeat[] {
  return orientation === "vertical"
    ? snapVerticalColumns(seats)
    : snapHorizontalRows(seats);
}

/** Push whole rows/columns away from the stage — keeps the grid aligned. */
function applyStageClearanceRows(
  seats: PositionedSeat[],
  stage: StageRect,
  minDist: number,
  orientation: RowOrientation
): PositionedSeat[] {
  if (seats.length === 0) return seats;

  const zone = stageInflated(stage, minDist * 0.55);
  const result: PositionedSeat[] = [];

  if (orientation === "vertical") {
    const columns = groupSeatsIntoColumns(seats);
    let xShift = 0;

    for (const col of columns) {
      const colX = col[0].x + xShift;
      const hitsStage = col.some((s) => pointInRect(colX, s.y, zone));
      if (hitsStage) {
        xShift += minDist * 0.85;
      }
      const finalX = col[0].x + xShift;
      for (const s of col) {
        const clamped = clampPoint(finalX, s.y);
        result.push({ ...s, x: clamped.x, y: clamped.y });
      }
    }
    return result;
  }

  const rows = groupSeatsIntoRows(seats);
  const stageMidY = stage.y + stage.height / 2;
  const rowPitch = estimateRowPitch(rows, minDist);
  let nextBelowY = stage.y + stage.height + minDist * 0.85;
  let nextAboveY = stage.y - minDist * 0.85;

  for (const row of rows) {
    let rowY = row[0].y;
    const hitsStage = row.some((s) => pointInRect(s.x, rowY, zone));

    if (hitsStage) {
      if (rowY >= stageMidY) {
        rowY = nextBelowY;
        nextBelowY += rowPitch;
      } else {
        rowY = nextAboveY;
        nextAboveY -= rowPitch;
      }
    }

    for (const s of row) {
      const clamped = clampPoint(s.x, rowY);
      result.push({ ...s, x: clamped.x, y: clamped.y });
    }
  }

  return result;
}

function estimateRowPitch(rows: PositionedSeat[][], fallback: number): number {
  if (rows.length < 2) return fallback;
  const centers = rows.map(
    (row) => row.reduce((sum, s) => sum + s.y, 0) / row.length
  );
  const gaps: number[] = [];
  for (let i = 1; i < centers.length; i++) {
    gaps.push(Math.abs(centers[i] - centers[i - 1]));
  }
  gaps.sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)] ?? fallback;
  return Math.max(fallback * 0.72, median);
}

function layoutOverflowsBounds(seats: PositionedSeat[], margin = 5): boolean {
  if (seats.length === 0) return false;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const s of seats) {
    minX = Math.min(minX, s.x);
    maxX = Math.max(maxX, s.x);
    minY = Math.min(minY, s.y);
    maxY = Math.max(maxY, s.y);
  }
  return (
    minX < BOUNDS.min + margin ||
    maxX > BOUNDS.max - margin ||
    minY < BOUNDS.min + margin ||
    maxY > BOUNDS.max - margin
  );
}

function finalizeLayout(
  seats: PositionedSeat[],
  stage: StageRect,
  config: SeatingLayoutConfig,
  metrics?: LayoutMetrics,
  layoutType?: SeatingLayoutType
): PositionedSeat[] {
  const baseMinDist = minSeatCenterDistance(config);
  const minDist = metrics?.minDist ?? baseMinDist;
  const densityScaled = minDist < baseMinDist * 0.98;
  const rowAligned = layoutType != null && isRowAlignedLayout(layoutType, config);
  const arenaRings = layoutType != null && isArenaRingsLayout(layoutType, config);
  const orientation = rowOrientationForStage(config.stagePosition);

  if (arenaRings) {
    if (layoutOverflowsBounds(seats)) {
      return fitLayoutToBounds(seats);
    }
    return seats;
  }

  if (rowAligned) {
    let result = snapRowAlignedSeats(seats, orientation);
    const centerStage = config.stagePosition === "center";

    if (!centerStage) {
      result = applyStageClearanceRows(result, stage, minDist, orientation);
    }

    if (layoutOverflowsBounds(result)) {
      result = translateLayoutToBounds(result);
      result = snapRowAlignedSeats(result, orientation);
    }

    if (!centerStage) {
      result = applyStageClearanceRows(result, stage, minDist * 0.9, orientation);
    }
    return snapRowAlignedSeats(result, orientation);
  }

  let result = applyStageClearance(seats, stage, minDist);
  result = resolveSeatOverlaps(result, minDist);

  if (!densityScaled || layoutOverflowsBounds(result)) {
    result = fitLayoutToBounds(result);
    result = resolveSeatOverlaps(result, minDist);
  }

  result = applyStageClearance(result, stage, minDist * 0.9);
  result = resolveSeatOverlaps(result, minDist);
  return result;
}

// ——— Row / tier placement ———

function usableSeatingHeight(stageClearance = 14): number {
  return BOUNDS.usableH - stageClearance;
}

function autoSeatsPerRow(
  count: number,
  metrics: LayoutMetrics,
  maxWidth = BOUNDS.usableW - 8
): number {
  const byWidth = Math.max(1, Math.floor(maxWidth / metrics.hPitch));

  let spr: number;
  if (count <= 6) {
    spr = count;
  } else if (count <= 20) {
    spr = Math.max(4, Math.ceil(count / 3));
  } else if (count <= 60) {
    spr = Math.ceil(Math.sqrt(count * 1.35));
  } else {
    spr = Math.ceil(Math.sqrt(count * 1.2));
  }

  return Math.min(byWidth, spr);
}

function totalRowSlotsForTiers(
  tierCount: number,
  metrics: LayoutMetrics,
  config?: SeatingLayoutConfig
): number {
  let usableH = usableSeatingHeight();
  if (config?.stagePosition === "center") {
    const bands = centerStageBands(centerStageTemplate(), metrics);
    usableH = Math.max(0, bands.belowHeight) + Math.max(0, bands.aboveHeight);
  }
  const tierGaps = Math.max(0, tierCount - 1) * metrics.tierGap;
  return Math.max(1, Math.floor((usableH - tierGaps) / metrics.vPitch));
}

/** Seats-per-row per tier, balanced so stacked tiers fit canvas height. */
function computeSeatsPerRowByTier(
  tiers: SeatingMapTier[],
  metrics: LayoutMetrics,
  config: SeatingLayoutConfig
): Map<string, number> {
  if (config.seatsPerRow && config.seatsPerRow > 0) {
    return new Map(tiers.map((t) => [t.id, config.seatsPerRow!]));
  }

  if (config.numberOfRows && config.numberOfRows > 0) {
    return new Map(
      tiers.map((t) => [t.id, Math.max(1, Math.ceil(t.seatCount / config.numberOfRows!))])
    );
  }

  const maxWidth = BOUNDS.usableW - 8;
  const byWidth = Math.max(1, Math.floor(maxWidth / metrics.hPitch));
  const rowSlots = totalRowSlotsForTiers(tiers.length, metrics, config);

  const sprByTier = tiers.map((tier) => ({
    id: tier.id,
    count: tier.seatCount,
    spr: Math.min(byWidth, autoSeatsPerRow(tier.seatCount, metrics, maxWidth)),
  }));

  const countRows = () =>
    sprByTier.reduce((sum, t) => sum + Math.ceil(t.count / t.spr), 0);

  let guard = 0;
  while (countRows() > rowSlots && guard < 500) {
    guard++;
    let pick = 0;
    let pickRows = -1;
    for (let i = 0; i < sprByTier.length; i++) {
      const rows = Math.ceil(sprByTier[i].count / sprByTier[i].spr);
      if (sprByTier[i].spr >= byWidth) continue;
      if (rows > pickRows) {
        pickRows = rows;
        pick = i;
      }
    }
    if (pickRows < 0) break;
    sprByTier[pick].spr++;
  }

  return new Map(sprByTier.map((t) => [t.id, t.spr]));
}

function fanOffset(
  col: number,
  seatsInRow: number,
  rowDepth: number,
  totalRows: number,
  metrics: LayoutMetrics,
  fanAxis: { x: number; y: number }
): { dx: number; dy: number } {
  if (seatsInRow <= 1 || totalRows <= 1) return { dx: 0, dy: 0 };

  const t = rowDepth / Math.max(totalRows - 1, 1);
  const curve = t * t * 0.85;
  const normalized = (col - (seatsInRow - 1) / 2) / Math.max(seatsInRow - 1, 1);
  const magnitude = normalized * curve * metrics.hPitch * 0.9;

  return { dx: fanAxis.x * magnitude, dy: fanAxis.y * magnitude };
}

function aisleShift(
  col: number,
  seatsInRow: number,
  aisleCenter: boolean,
  metrics: LayoutMetrics,
  aisleGapOverride?: number
): number {
  if (!aisleCenter || seatsInRow <= 4) return 0;
  const mid = Math.ceil(seatsInRow / 2);
  const gap = aisleGapOverride ?? metrics.aisleGap;
  return col >= mid ? gap : 0;
}

function centerStageAisleGap(stage: StageRect, metrics: LayoutMetrics): number {
  return Math.max(metrics.aisleGap, stage.width + metrics.minDist * 0.45);
}

function placeRowSeats(
  tier: SeatingMapTier,
  rowIndex: number,
  seatsInRow: number,
  seatsPerRowFull: number,
  startSeatIndex: number,
  originX: number,
  originY: number,
  ctx: PlacementContext,
  aisleCenter: boolean,
  aisleGapOverride?: number
): PositionedSeat[] {
  const row: PositionedSeat[] = [];
  const pitch =
    ctx.orientation === "horizontal" ? ctx.metrics.hPitch : ctx.metrics.vPitch;
  const fullSpan = (seatsPerRowFull - 1) * pitch;
  const rowStart = -fullSpan / 2;

  for (let col = 0; col < seatsInRow; col++) {
    const seatIdx = startSeatIndex + col;
    if (seatIdx >= tier.seatCount) break;
    const seat = seatAtIndex(tier, seatIdx);

    const along = rowStart + col * pitch;

    let x = originX;
    let y = originY;

    if (ctx.orientation === "horizontal") {
      x =
        originX +
        along +
        aisleShift(
          col,
          seatsPerRowFull,
          aisleCenter,
          ctx.metrics,
          aisleGapOverride
        );
      y = originY;
    } else {
      x = originX;
      y =
        originY +
        along +
        aisleShift(
          col,
          seatsPerRowFull,
          aisleCenter,
          ctx.metrics,
          aisleGapOverride
        );
    }

    const fan = fanOffset(
      col,
      seatsInRow,
      ctx.rowDepth,
      ctx.totalRows,
      ctx.metrics,
      ctx.fanAxis
    );
    x += fan.dx;
    y += fan.dy;

    row.push({
      number: seat.number,
      tierId: tier.id,
      tierName: tier.name,
      x,
      y,
      seat,
    });
  }

  return row;
}

function resolveTierRowLayout(
  tier: SeatingMapTier,
  config: SeatingLayoutConfig,
  metrics: LayoutMetrics,
  seatsPerRowByTier?: Map<string, number>
): { spr: number; totalRows: number } {
  const configSpr = config.seatsPerRow && config.seatsPerRow > 0 ? config.seatsPerRow : 0;
  const configRows =
    config.numberOfRows && config.numberOfRows > 0 ? config.numberOfRows : 0;

  let spr =
    seatsPerRowByTier?.get(tier.id) ??
    (configSpr > 0 ? configSpr : autoSeatsPerRow(tier.seatCount, metrics));

  if (configSpr > 0 && configRows > 0) {
    return {
      spr: configSpr,
      totalRows: Math.max(configRows, Math.ceil(tier.seatCount / configSpr)),
    };
  }

  if (configRows > 0) {
    return {
      spr: Math.max(1, Math.ceil(tier.seatCount / configRows)),
      totalRows: configRows,
    };
  }

  if (configSpr > 0) {
    return { spr: configSpr, totalRows: Math.ceil(tier.seatCount / configSpr) };
  }

  return { spr, totalRows: Math.ceil(tier.seatCount / spr) };
}

function rowDeltaForStage(
  orientation: RowOrientation,
  position: StagePosition,
  metrics: LayoutMetrics
): { dx: number; dy: number } {
  if (orientation === "horizontal") {
    return {
      dx: 0,
      dy: position === "bottom" ? -metrics.vPitch : metrics.vPitch,
    };
  }
  return {
    dx: position === "right" ? -metrics.hPitch : metrics.hPitch,
    dy: 0,
  };
}

function adaptMetricsToStageBand(
  stage: StageRect,
  position: StagePosition,
  tiers: SeatingMapTier[],
  config: SeatingLayoutConfig,
  metrics: LayoutMetrics,
  seatsPerRowByTier: Map<string, number>
): LayoutMetrics {
  const orientation = rowOrientationForStage(position);
  const gap = metrics.tierGap + metrics.minDist * 0.35;
  const margin = BOUNDS.min + 4;
  const tierGaps = Math.max(0, tiers.length - 1) * metrics.tierGap;

  let rowSum = 0;
  for (const tier of tiers) {
    rowSum += resolveTierRowLayout(tier, config, metrics, seatsPerRowByTier).totalRows;
  }
  if (rowSum <= 0) return metrics;

  const minPitch = metrics.minDist * 0.72;

  if (orientation === "horizontal") {
    const usable =
      position === "bottom"
        ? stage.y - gap - margin
        : BOUNDS.max - margin - (stage.y + stage.height + gap);
    const needed = rowSum * metrics.vPitch + tierGaps;
    if (needed <= usable) return metrics;
    const rowPitch = Math.max(minPitch, (usable - tierGaps) / rowSum);
    return { ...metrics, vPitch: Math.min(metrics.vPitch, rowPitch) };
  }

  const usable =
    position === "right"
      ? stage.x - gap - margin
      : BOUNDS.max - margin - (stage.x + stage.width + gap);
  const needed = rowSum * metrics.hPitch + tierGaps;
  if (needed <= usable) return metrics;
  const colPitch = Math.max(minPitch, (usable - tierGaps) / rowSum);
  return { ...metrics, hPitch: Math.min(metrics.hPitch, colPitch) };
}

function placeTierRows(
  tier: SeatingMapTier,
  origin: { x: number; y: number },
  config: SeatingLayoutConfig,
  metrics: LayoutMetrics,
  orientation: RowOrientation,
  fanAxis: { x: number; y: number },
  aisleCenter: boolean,
  seatsPerRowByTier?: Map<string, number>,
  aisleGapOverride?: number,
  rowDelta?: { dx: number; dy: number }
): { seats: PositionedSeat[]; end: { x: number; y: number } } {
  const { spr, totalRows } = resolveTierRowLayout(
    tier,
    config,
    metrics,
    seatsPerRowByTier
  );
  const delta =
    rowDelta ??
    (orientation === "horizontal"
      ? { dx: 0, dy: metrics.vPitch }
      : { dx: metrics.hPitch, dy: 0 });
  const seats: PositionedSeat[] = [];
  let ox = origin.x;
  let oy = origin.y;

  for (let row = 0; row < totalRows; row++) {
    const startIdx = row * spr;
    const seatsInRow = Math.min(spr, tier.seatCount - startIdx);
    const rowX = origin.x + delta.dx * row;
    const rowY = origin.y + delta.dy * row;
    const ctx: PlacementContext = {
      metrics,
      orientation,
      fanAxis,
      rowDepth: row,
      totalRows,
    };

    seats.push(
      ...placeRowSeats(
        tier,
        row,
        seatsInRow,
        spr,
        startIdx,
        rowX,
        rowY,
        ctx,
        aisleCenter,
        aisleGapOverride
      )
    );

    ox = rowX + delta.dx;
    oy = rowY + delta.dy;
  }

  return {
    seats,
    end: { x: ox, y: oy },
  };
}

function centerStageBandPitch(
  stage: StageRect,
  metrics: LayoutMetrics,
  rowsBelow: number,
  rowsAbove: number,
  tierCount: number
): number {
  const { belowHeight, aboveHeight } = centerStageBands(stage, metrics);
  const minPitch = metrics.minDist * 0.72;
  const tierGaps = Math.max(0, tierCount - 1) * metrics.tierGap;
  const pBelow =
    rowsBelow > 0 ? (belowHeight - tierGaps) / rowsBelow : Infinity;
  const pAbove =
    rowsAbove > 0 ? (aboveHeight - tierGaps) / rowsAbove : Infinity;
  return Math.max(minPitch, Math.min(metrics.vPitch, pBelow, pAbove));
}

function splitTierRowsAroundCenter(totalRows: number): {
  rowsBelow: number;
  rowsAbove: number;
} {
  const rowsBelow = Math.ceil(totalRows / 2);
  return { rowsBelow, rowsAbove: totalRows - rowsBelow };
}

/** Rows above and below a center stage — avoids seating through the stage footprint. */
function layoutRowBasedAroundCenter(
  tiers: SeatingMapTier[],
  stage: StageRect,
  config: SeatingLayoutConfig,
  metrics: LayoutMetrics,
  aisleCenter: boolean,
  seatsPerRowByTier?: Map<string, number>
): PositionedSeat[] {
  const all: PositionedSeat[] = [];
  const { gap } = centerStageBands(stage, metrics);
  const stageTop = stage.y;
  const stageBottom = stage.y + stage.height;
  const aisleGap = centerStageAisleGap(stage, metrics);
  const useAisle = aisleCenter || true;

  const tierPlans = tiers.map((tier) => {
    const { spr, totalRows } = resolveTierRowLayout(
      tier,
      config,
      metrics,
      seatsPerRowByTier
    );
    const { rowsBelow, rowsAbove } = splitTierRowsAroundCenter(totalRows);
    return { tier, spr, rowsBelow, rowsAbove };
  });

  const totalBelow = tierPlans.reduce((sum, plan) => sum + plan.rowsBelow, 0);
  const totalAbove = tierPlans.reduce((sum, plan) => sum + plan.rowsAbove, 0);
  const rowPitch = centerStageBandPitch(
    stage,
    metrics,
    totalBelow,
    totalAbove,
    tiers.length
  );
  const placeMetrics = { ...metrics, vPitch: rowPitch };

  let belowY = stageBottom + gap;
  let aboveY = stageTop - gap;

  for (const { tier, spr, rowsBelow, rowsAbove } of tierPlans) {
    let seatIdx = 0;

    for (let row = 0; row < rowsBelow; row++) {
      const seatsInRow = Math.min(spr, tier.seatCount - seatIdx);
      if (seatsInRow <= 0) break;
      const ctx: PlacementContext = {
        metrics: placeMetrics,
        orientation: "horizontal",
        fanAxis: { x: 0, y: 0 },
        rowDepth: row,
        totalRows: rowsBelow,
      };
      all.push(
        ...placeRowSeats(
          tier,
          row,
          seatsInRow,
          spr,
          seatIdx,
          BOUNDS.cx,
          belowY,
          ctx,
          useAisle,
          aisleGap
        )
      );
      seatIdx += seatsInRow;
      belowY += rowPitch;
    }

    let topY = aboveY;
    for (let row = 0; row < rowsAbove && seatIdx < tier.seatCount; row++) {
      const seatsInRow = Math.min(spr, tier.seatCount - seatIdx);
      if (seatsInRow <= 0) break;
      const ctx: PlacementContext = {
        metrics: placeMetrics,
        orientation: "horizontal",
        fanAxis: { x: 0, y: 0 },
        rowDepth: row,
        totalRows: rowsAbove,
      };
      all.push(
        ...placeRowSeats(
          tier,
          row,
          seatsInRow,
          spr,
          seatIdx,
          BOUNDS.cx,
          topY,
          ctx,
          useAisle,
          aisleGap
        )
      );
      seatIdx += seatsInRow;
      topY -= rowPitch;
    }

    aboveY = topY - metrics.tierGap;
    belowY += metrics.tierGap;
  }

  return all;
}

function seatingOriginForStage(
  stage: StageRect,
  position: StagePosition,
  metrics: LayoutMetrics
): { x: number; y: number; orientation: RowOrientation } {
  const gap = metrics.tierGap + metrics.minDist * 0.35;

  switch (position) {
    case "bottom":
      return { x: BOUNDS.cx, y: stage.y - gap, orientation: "horizontal" };
    case "left":
      return {
        x: stage.x + stage.width + gap,
        y: BOUNDS.cy,
        orientation: "vertical",
      };
    case "right":
      return { x: stage.x - gap, y: BOUNDS.cy, orientation: "vertical" };
    case "center":
      return {
        x: BOUNDS.cx,
        y: stage.y + stage.height + gap,
        orientation: "horizontal",
      };
    case "top":
    default:
      return {
        x: BOUNDS.cx,
        y: stage.y + stage.height + gap,
        orientation: "horizontal",
      };
  }
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

// ——— Layout algorithms ———

function layoutTheaterLike(
  tiers: SeatingMapTier[],
  config: SeatingLayoutConfig,
  type: "theater" | "classroom",
  metrics: LayoutMetrics
): PositionedSeat[] {
  const stage = stageRect(config, type);
  const position = config.stagePosition;
  const aisle = type === "classroom" || Boolean(config.aisleCenter);
  const seatsPerRowByTier = computeSeatsPerRowByTier(tiers, metrics, config);

  if (position === "center") {
    return layoutRowBasedAroundCenter(
      tiers,
      stage,
      config,
      metrics,
      aisle,
      seatsPerRowByTier
    );
  }

  const placementMetrics = adaptMetricsToStageBand(
    stage,
    position,
    tiers,
    config,
    metrics,
    seatsPerRowByTier
  );
  const origin = seatingOriginForStage(stage, position, placementMetrics);
  const rowDelta = rowDeltaForStage(origin.orientation, position, placementMetrics);
  const tierGapSign =
    origin.orientation === "horizontal"
      ? Math.sign(rowDelta.dy || 1)
      : Math.sign(rowDelta.dx || 1);
  const all: PositionedSeat[] = [];
  let cursor = { ...origin };

  for (const tier of tiers) {
    const { seats, end } = placeTierRows(
      tier,
      { x: cursor.x, y: cursor.y },
      config,
      placementMetrics,
      cursor.orientation,
      { x: 0, y: 0 },
      aisle,
      seatsPerRowByTier,
      undefined,
      rowDelta
    );
    all.push(...seats);

    if (cursor.orientation === "horizontal") {
      cursor.y = end.y + tierGapSign * placementMetrics.tierGap;
    } else {
      cursor.x = end.x + tierGapSign * placementMetrics.tierGap;
    }
  }

  return all;
}

/** Minimum ring radius so arc length fits `seatCount` seats at `minDist` apart. */
function minRingRadiusForSeatCount(seatCount: number, metrics: LayoutMetrics): number {
  if (seatCount <= 1) return metrics.minDist * 2;
  return (seatCount * metrics.minDist) / (2 * Math.PI * 0.92);
}

/** Largest ring that keeps seats inside the canvas with margin. */
function maxArenaRingRadius(metrics: LayoutMetrics): number {
  const margin = metrics.minDist * 0.6;
  return Math.min(BOUNDS.cx, BOUNDS.cy) - BOUNDS.min - margin;
}

function maxSeatsOnRing(radius: number, metrics: LayoutMetrics): number {
  const arc = 2 * Math.PI * radius * 0.92;
  return Math.max(1, Math.floor(arc / metrics.minDist));
}

type ArenaSeatRef = {
  tier: SeatingMapTier;
  seat: SeatCell;
};

function flattenArenaSeats(tiers: SeatingMapTier[]): ArenaSeatRef[] {
  const items: ArenaSeatRef[] = [];
  const ordered = [...tiers].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const tier of ordered) {
    for (let i = 0; i < tier.seatCount; i++) {
      items.push({ tier, seat: seatAtIndex(tier, i) });
    }
  }
  return items;
}

function splitSeatsEvenlyAcrossRings<T>(items: T[], ringCount: number): T[][] {
  if (items.length === 0) return [];
  const groups = Math.max(1, Math.min(ringCount, items.length));
  const result: T[][] = [];
  const base = Math.floor(items.length / groups);
  let remainder = items.length % groups;
  let idx = 0;

  for (let g = 0; g < groups; g++) {
    const size = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
    if (size > 0) {
      result.push(items.slice(idx, idx + size));
      idx += size;
    }
  }

  return result;
}

function maxArenaRingsThatFit(metrics: LayoutMetrics, tierMult: number): number {
  const maxR = maxArenaRingRadius(metrics);
  const inner = 12 * tierMult;
  const ringGap = metrics.minDist * (1.1 + (tierMult - 1) * 0.25);
  if (maxR <= inner) return 1;
  return Math.max(1, Math.floor((maxR - inner) / ringGap) + 1);
}

function autoArenaRingCount(
  totalSeats: number,
  tierCount: number,
  metrics: LayoutMetrics,
  tierMult: number
): number {
  const maxR = maxArenaRingRadius(metrics);
  const midCap = maxSeatsOnRing(maxR * 0.55, metrics);
  const fromSeats = Math.ceil(totalSeats / Math.max(1, midCap));
  const maxFit = maxArenaRingsThatFit(metrics, tierMult);
  return Math.min(maxFit, Math.max(1, tierCount, fromSeats));
}

function resolveArenaRingCount(
  config: SeatingLayoutConfig,
  totalSeats: number,
  tierCount: number,
  metrics: LayoutMetrics
): number {
  const tierMult = spacingMult(config.tierSpacing);
  const maxFit = maxArenaRingsThatFit(metrics, tierMult);

  if (config.numberOfRings && config.numberOfRings > 0) {
    return Math.min(config.numberOfRings, maxFit, Math.max(1, totalSeats));
  }

  return autoArenaRingCount(totalSeats, tierCount, metrics, tierMult);
}

function computeArenaRingRadii(
  ringSizes: number[],
  metrics: LayoutMetrics,
  tierMult: number,
  hMult: number
): number[] {
  const maxR = maxArenaRingRadius(metrics);
  const inner = 12 * tierMult;
  const ringGap = metrics.minDist * (1.1 + (tierMult - 1) * 0.25);
  const count = ringSizes.length;

  const targets = ringSizes.map((_, i) => {
    const t = count <= 1 ? 0.42 : i / (count - 1);
    return inner + (maxR - inner) * t;
  });

  const radii = targets.map((target, i) => {
    const minR = minRingRadiusForSeatCount(ringSizes[i], metrics);
    return Math.max(minR, target);
  });

  for (let i = 1; i < radii.length; i++) {
    radii[i] = Math.max(radii[i], radii[i - 1] + ringGap);
  }

  const outer = radii[radii.length - 1];
  if (outer > maxR && outer > 0) {
    const scale = maxR / outer;
    for (let i = 0; i < radii.length; i++) {
      radii[i] *= scale;
      if (i > 0) {
        radii[i] = Math.max(radii[i], radii[i - 1] + ringGap * scale);
      }
    }
  }

  const radiusScale = 0.94 + (hMult - 1) * 0.04;
  return radii.map((r) => r * radiusScale);
}

function assignTiersToRings(
  tiers: SeatingMapTier[],
  config: SeatingLayoutConfig,
  ringCount: number
): Map<number, SeatingMapTier[]> {
  const ordered = [...tiers].sort((a, b) => a.sortOrder - b.sortOrder);
  const placements = config.tierPlacements ?? {};
  const ringTiers = new Map<number, SeatingMapTier[]>();
  let nextAutoRing = 1;

  for (let i = 0; i < ordered.length; i++) {
    const tier = ordered[i];
    const key = tierPlacementKey(tier, i);
    const preferred = placements[key]?.ring ?? 0;
    let ring: number;

    if (preferred > 0) {
      ring = Math.min(preferred, ringCount);
    } else {
      ring = Math.min(nextAutoRing, ringCount);
      nextAutoRing++;
    }

    const list = ringTiers.get(ring) ?? [];
    list.push(tier);
    ringTiers.set(ring, list);
  }

  return ringTiers;
}

function layoutArenaRings(
  tiers: SeatingMapTier[],
  config: SeatingLayoutConfig,
  metrics: LayoutMetrics
): PositionedSeat[] {
  const all: PositionedSeat[] = [];
  const hMult = spacingMult(config.horizontalSpacing);
  const tierMult = spacingMult(config.tierSpacing);
  const totalSeats = tiers.reduce((sum, t) => sum + t.seatCount, 0);
  if (totalSeats === 0) return all;

  const ringCount = resolveArenaRingCount(
    config,
    totalSeats,
    tiers.length,
    metrics
  );
  const ringTiers = assignTiersToRings(tiers, config, ringCount);
  const hasExplicitPlacements = Boolean(
    config.tierPlacements && Object.keys(config.tierPlacements).length > 0
  );

  const ringSeatGroups: ArenaSeatRef[][] = [];

  if (hasExplicitPlacements) {
    for (let ring = 1; ring <= ringCount; ring++) {
      const tiersOnRing = ringTiers.get(ring) ?? [];
      const group: ArenaSeatRef[] = [];
      for (const tier of tiersOnRing) {
        for (let i = 0; i < tier.seatCount; i++) {
          group.push({ tier, seat: seatAtIndex(tier, i) });
        }
      }
      ringSeatGroups.push(group);
    }
  } else {
    const arenaSeats = flattenArenaSeats(tiers);
    ringSeatGroups.push(
      ...splitSeatsEvenlyAcrossRings(arenaSeats, ringCount)
    );
  }

  const ringSizes = ringSeatGroups.map((g) => Math.max(g.length, 1));
  const radii = computeArenaRingRadii(ringSizes, metrics, tierMult, hMult);
  const startAngle = -Math.PI / 2;

  for (let ring = 0; ring < ringSeatGroups.length; ring++) {
    const group = ringSeatGroups[ring];
    if (group.length === 0) continue;
    const r = radii[ring];
    for (let i = 0; i < group.length; i++) {
      const { tier, seat } = group[i];
      const angle = startAngle + (2 * Math.PI * i) / group.length;
      all.push({
        number: seat.number,
        tierId: tier.id,
        tierName: tier.name,
        x: BOUNDS.cx + r * Math.cos(angle),
        y: BOUNDS.cy + r * Math.sin(angle),
        seat,
      });
    }
  }

  return all;
}

function layoutArenaRows(
  tiers: SeatingMapTier[],
  config: SeatingLayoutConfig,
  metrics: LayoutMetrics
): PositionedSeat[] {
  const stage = stageRect(config, "arena");
  const origin = {
    x: BOUNDS.cx,
    y: stage.y + stage.height + metrics.tierGap,
  };
  const seatsPerRowByTier = computeSeatsPerRowByTier(tiers, metrics, config);

  const all: PositionedSeat[] = [];
  let oy = origin.y;

  for (const tier of tiers) {
    const { seats, end } = placeTierRows(
      tier,
      { x: origin.x, y: oy },
      config,
      metrics,
      "horizontal",
      { x: 0, y: 0 },
      false,
      seatsPerRowByTier
    );
    all.push(...seats);
    oy = end.y + metrics.tierGap;
  }

  return all;
}

function layoutArena(
  tiers: SeatingMapTier[],
  config: SeatingLayoutConfig,
  metrics: LayoutMetrics
): PositionedSeat[] {
  if (normalizeArenaArrangement(config.arenaArrangement) === "rows") {
    return layoutArenaRows(tiers, config, metrics);
  }
  return layoutArenaRings(tiers, config, metrics);
}

function optimalSeatsPerTable(count: number): number {
  if (count <= 6) return count;
  if (count <= 10) return 8;
  return 10;
}

function layoutBanquet(
  tiers: SeatingMapTier[],
  config: SeatingLayoutConfig,
  metrics: LayoutMetrics
): PositionedSeat[] {
  const all: PositionedSeat[] = [];
  const tierMult = spacingMult(config.tierSpacing);
  const maxR = maxArenaRingRadius(metrics) * 0.92;

  for (const tier of tiers) {
    const seatsPerTable = optimalSeatsPerTable(tier.seatCount);
    const tableCount = Math.ceil(tier.seatCount / seatsPerTable);
    const tableSeatRadius = Math.min(
      Math.max(metrics.minDist * 0.42, 2.8),
      metrics.minDist * 0.52
    );
    const minTableDist = tableSeatRadius * 2 + metrics.minDist * 1.35;
    let ring = 0;
    let placed = 0;

    while (placed < tableCount) {
      const ringRadius = Math.min(
        maxR,
        (16 + tier.sortOrder * 5 + ring * (minTableDist * 0.95)) * tierMult
      );
      const circumference = 2 * Math.PI * ringRadius;
      const tablesOnRing = Math.max(
        1,
        Math.min(tableCount - placed, Math.floor(circumference / minTableDist))
      );

      for (let t = 0; t < tablesOnRing && placed < tableCount; t++) {
        const angle = (2 * Math.PI * t) / tablesOnRing - Math.PI / 2;
        const tableX = BOUNDS.cx + ringRadius * Math.cos(angle);
        const tableY = BOUNDS.cy + ringRadius * Math.sin(angle);

        const start = placed * seatsPerTable;
        const end = Math.min(start + seatsPerTable, tier.seatCount);
        const seatsAtTable = end - start;
        const seatArc =
          seatsAtTable > 1
            ? Math.min((2 * Math.PI) / seatsAtTable, metrics.minDist / tableSeatRadius)
            : 0;

        for (let s = start; s < end; s++) {
          const seat = seatAtIndex(tier, s);
          const seatAngle =
            seatArc * (s - start) - Math.PI / 2;
          all.push({
            number: seat.number,
            tierId: tier.id,
            tierName: tier.name,
            x: tableX + tableSeatRadius * Math.cos(seatAngle),
            y: tableY + tableSeatRadius * Math.sin(seatAngle),
            seat,
          });
        }
        placed++;
      }
      ring++;
    }
  }

  return all;
}

function layoutUShape(
  tiers: SeatingMapTier[],
  config: SeatingLayoutConfig,
  stage: StageRect,
  metrics: LayoutMetrics
): PositionedSeat[] {
  const all: PositionedSeat[] = [];
  const stagePos = config.stagePosition;
  const openTowardTop = stagePos === "top" || stagePos === "center";
  const cornerPad = metrics.minDist * 0.55;

  for (const tier of tiers) {
    const count = tier.seatCount;
    const inset = (tier.sortOrder - 1) * metrics.minDist * 0.75;

    const leftRatio = 0.3;
    const bottomRatio = 0.4;
    const leftCount = Math.max(1, Math.round(count * leftRatio));
    const bottomCount = Math.max(1, Math.round(count * bottomRatio));
    const rightCount = Math.max(0, count - leftCount - bottomCount);

    const leftX = 14 + inset;
    const rightX = 86 - inset;
    const topY = openTowardTop ? 18 + inset : 22 + inset;
    const bottomY = openTowardTop ? 78 - inset : 82 - inset;

    const placeAlong = (
      index: number,
      total: number,
      start: number,
      end: number
    ) => (total <= 1 ? (start + end) / 2 : start + (index / (total - 1)) * (end - start));

    for (let i = 0; i < count; i++) {
      const seat = seatAtIndex(tier, i);
      let x = BOUNDS.cx;
      let y = BOUNDS.cy;

      if (i < leftCount) {
        x = leftX;
        y = placeAlong(i, leftCount, topY, bottomY - cornerPad);
      } else if (i < leftCount + bottomCount) {
        const bi = i - leftCount;
        x = placeAlong(bi, bottomCount, leftX + cornerPad, rightX - cornerPad);
        y = bottomY;
      } else {
        const ri = i - leftCount - bottomCount;
        x = rightX;
        y = placeAlong(ri, rightCount, topY, bottomY - cornerPad);
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

  void stage;
  return all;
}

function layoutGrid(
  tiers: SeatingMapTier[],
  config: SeatingLayoutConfig,
  metrics: LayoutMetrics
): PositionedSeat[] {
  const seatsPerRowByTier = computeSeatsPerRowByTier(tiers, metrics, config);

  if (config.stagePosition === "center") {
    const stage = stageRect(config, "grid");
    return layoutRowBasedAroundCenter(
      tiers,
      stage,
      config,
      metrics,
      Boolean(config.aisleCenter),
      seatsPerRowByTier
    );
  }

  const all: PositionedSeat[] = [];
  let yOffset = 14 + metrics.tierGap;

  for (const tier of tiers) {
    const { seats, end } = placeTierRows(
      tier,
      { x: BOUNDS.cx, y: yOffset },
      config,
      metrics,
      "horizontal",
      { x: 0, y: 0 },
      false,
      seatsPerRowByTier
    );
    all.push(...seats);
    yOffset = end.y + metrics.tierGap;
  }

  return all;
}

export type SpacingFieldKey = "horizontal" | "vertical" | "tier" | "padding";

export type SpacingFieldMeta = {
  key: SpacingFieldKey;
  /** 0–1 emphasis for the current layout (UI only). */
  relevance: number;
};

export function getSpacingFieldsForLayout(
  layoutType: SeatingLayoutType,
  config: SeatingLayoutConfig
): SpacingFieldMeta[] {
  const arenaRings =
    layoutType === "arena" &&
    normalizeArenaArrangement(config.arenaArrangement) === "rings";

  if (arenaRings) {
    return [
      { key: "horizontal", relevance: 0.85 },
      { key: "vertical", relevance: 0.25 },
      { key: "tier", relevance: 1 },
      { key: "padding", relevance: 1 },
    ];
  }
  if (layoutType === "banquet") {
    return [
      { key: "horizontal", relevance: 0.75 },
      { key: "vertical", relevance: 0.4 },
      { key: "tier", relevance: 1 },
      { key: "padding", relevance: 1 },
    ];
  }
  if (layoutType === "u_shape") {
    return [
      { key: "horizontal", relevance: 1 },
      { key: "vertical", relevance: 1 },
      { key: "tier", relevance: 0.85 },
      { key: "padding", relevance: 1 },
    ];
  }
  return [
    { key: "horizontal", relevance: 1 },
    { key: "vertical", relevance: 1 },
    { key: "tier", relevance: 1 },
    { key: "padding", relevance: 1 },
  ];
}

export type VenueLayoutAnalysis = {
  totalSeats: number;
  tierCount: number;
  ringCount: number | null;
  rowCount: number | null;
  tableRings: number | null;
  configuredRings: number | null;
  configuredRows: number | null;
  configuredSeatsPerRow: number | null;
};

function countValueClusters(values: number[], tolerance: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  let count = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] > tolerance) count++;
  }
  return count;
}

export function analyzeVenueLayout(
  venue: VenueLayout,
  tierCount: number
): VenueLayoutAnalysis {
  const { type, config, seats } = venue;
  const arenaRings =
    type === "arena" &&
    normalizeArenaArrangement(config.arenaArrangement) === "rings";
  const arenaRows =
    type === "arena" &&
    normalizeArenaArrangement(config.arenaArrangement) === "rows";

  const ringCount = arenaRings
    ? countValueClusters(
        seats.map((s) => Math.hypot(s.x - BOUNDS.cx, s.y - BOUNDS.cy)),
        1.15
      )
    : null;

  const rowCount =
    type === "theater" ||
    type === "classroom" ||
    type === "grid" ||
    arenaRows
      ? countValueClusters(
          seats.map((s) => s.y),
          2
        )
      : null;

  const tableRings =
    type === "banquet"
      ? countValueClusters(
          seats.map((s) => Math.hypot(s.x - BOUNDS.cx, s.y - BOUNDS.cy)),
          4
        )
      : null;

  return {
    totalSeats: seats.length,
    tierCount,
    ringCount,
    rowCount,
    tableRings,
    configuredRings:
      config.numberOfRings && config.numberOfRings > 0
        ? config.numberOfRings
        : null,
    configuredRows:
      config.numberOfRows && config.numberOfRows > 0 ? config.numberOfRows : null,
    configuredSeatsPerRow:
      config.seatsPerRow && config.seatsPerRow > 0 ? config.seatsPerRow : null,
  };
}

export function computeVenueLayout(
  tiers: SeatingMapTier[],
  layoutType: SeatingLayoutType,
  config: SeatingLayoutConfig
): VenueLayout {
  const type = normalizeLayoutType(layoutType);
  const normalizedConfig = mergeLayoutConfig({
    ...DEFAULT_LAYOUT_CONFIG,
    ...config,
  });
  const stage = stageRect(normalizedConfig, type);
  const totalSeats = tiers.reduce((sum, t) => sum + t.seatCount, 0);
  const metrics = metricsFromConfig(normalizedConfig, totalSeats, tiers.length);

  let seats: PositionedSeat[] = [];
  switch (type) {
    case "classroom":
      seats = layoutTheaterLike(tiers, normalizedConfig, "classroom", metrics);
      break;
    case "theater":
      seats = layoutTheaterLike(tiers, normalizedConfig, "theater", metrics);
      break;
    case "arena":
      seats = layoutArena(tiers, normalizedConfig, metrics);
      break;
    case "banquet":
      seats = layoutBanquet(tiers, normalizedConfig, metrics);
      break;
    case "u_shape":
      seats = layoutUShape(tiers, normalizedConfig, stage, metrics);
      break;
    case "grid":
    default:
      seats = layoutGrid(tiers, normalizedConfig, metrics);
      break;
  }

  seats = finalizeLayout(seats, stage, normalizedConfig, metrics, type);

  return {
    type,
    config: normalizedConfig,
    stage,
    seats,
  };
}
