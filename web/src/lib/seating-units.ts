/**
 * Physical dimensions for venue seating layouts (SI meters).
 * Layout algorithms work in meters; renderers convert to CSS % via venue extents.
 */

export const SEAT_SPECS = {
  /** Seat shell width (m). */
  widthM: 0.45,
  /** Seat depth front-to-back (m). */
  depthM: 0.48,
  /** Center-to-center pitch along a row (m) — typical theater ~0.50–0.55 m. */
  centerPitchM: 0.55,
  /** Row spacing, front edge to front edge (m) — typical ~0.85–0.95 m. */
  rowPitchM: 0.9,
  /** Minimum center distance when density scaling compresses spacing (m). */
  minCenterM: 0.5,
} as const;

export const STAGE_SPECS = {
  /** Stage width / height as a fraction of seated bounding box (per axis). */
  widthRatio: 0.8,
  minWidthM: 6,
  maxWidthM: 28,
  minHeightM: 2.4,
  maxHeightM: 8,
  minSideSpanM: 5,
  maxSideSpanM: 20,
  minCenterSizeM: 4,
  maxCenterSizeM: 14,
  gapFromSeatsM: 1.2,
  seatBoundsPadM: 0.85,
} as const;

export const VENUE_SPECS = {
  /** Default design canvas width (m). */
  designWidthM: 48,
  /** Default design canvas depth (m). */
  designDepthM: 48,
  /** Margin from canvas edge to usable seating (m). */
  marginM: 1.2,
  /** Padding around content when computing final venue extents (m). */
  extentPadM: 1.2,
} as const;

export type VenueExtents = {
  widthM: number;
  depthM: number;
};

export type MeterRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Usable design-time bounds in meters (square workspace for layout algorithms). */
export function designBounds() {
  const m = VENUE_SPECS.marginM;
  const w = VENUE_SPECS.designWidthM;
  const d = VENUE_SPECS.designDepthM;
  const max = Math.min(w, d) - m;
  return {
    min: m,
    max,
    maxX: w - m,
    maxY: d - m,
    cx: w / 2,
    cy: d / 2,
    usableW: w - 2 * m,
    usableH: d - 2 * m,
    widthM: w,
    depthM: d,
  };
}

/** Convert a legacy percent constant (0–100 canvas) to meters on the design canvas. */
export function legacyPercentToM(pct: number): number {
  return (pct / 100) * VENUE_SPECS.designWidthM;
}

export function meterXToPercent(x: number, widthM: number): number {
  if (widthM <= 0) return 0;
  return (x / widthM) * 100;
}

export function meterYToPercent(y: number, depthM: number): number {
  if (depthM <= 0) return 0;
  return (y / depthM) * 100;
}

export function meterRectToPercent(
  rect: MeterRect,
  extents: VenueExtents
): MeterRect {
  return {
    x: meterXToPercent(rect.x, extents.widthM),
    y: meterYToPercent(rect.y, extents.depthM),
    width: meterXToPercent(rect.width, extents.widthM),
    height: meterYToPercent(rect.height, extents.depthM),
  };
}

export function venueExtentsFromLayout(
  seats: { x: number; y: number }[],
  stage: MeterRect
): VenueExtents {
  const pad = VENUE_SPECS.extentPadM;
  let minX = stage.x;
  let minY = stage.y;
  let maxX = stage.x + stage.width;
  let maxY = stage.y + stage.height;

  for (const seat of seats) {
    minX = Math.min(minX, seat.x);
    minY = Math.min(minY, seat.y);
    maxX = Math.max(maxX, seat.x);
    maxY = Math.max(maxY, seat.y);
  }

  const contentW = maxX - minX + pad * 2;
  const contentD = maxY - minY + pad * 2;

  return {
    widthM: Math.max(contentW, SEAT_SPECS.centerPitchM * 3),
    depthM: Math.max(contentD, SEAT_SPECS.rowPitchM * 3),
  };
}
