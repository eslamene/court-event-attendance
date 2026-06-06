/** Pan/zoom math for the seating designer preview. */

import type { PositionedSeat } from "@/lib/seating-layout";
import { computeSectionBounds, type SectionBound } from "@/lib/seating-map-utils";

export type ViewPan = { x: number; y: number };

export type ViewTransform = {
  scale: number;
  pan: ViewPan;
};

export type PercentRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const DESIGNER_VIEWPORT = {
  maxScale: 12,
  zoomStep: 0.15,
  fitPadding: 28,
  /** Below this scale (medium venues), prefer tier boxes over individual seats. */
  tierOverviewMaxScale: 0.55,
  /** Draw seat numbers on canvas when scale is at or above this. */
  seatLabelMinScale: 1.35,
  /** Skip seats smaller than this many screen pixels (radius). */
  seatCullMinRadiusPx: 0.65,
  /** Canvas dot radius used for LOD calculations. */
  baseSeatRadiusPx: 4.5,
  /**
   * Once a seat dot is at least this many screen pixels wide, render seats
   * instead of tier overview boxes — regardless of venue size.
   */
  seatDotVisibleMinRadiusPx: 2.25,
} as const;

export function clampScale(
  value: number,
  minScale: number,
  maxScale = DESIGNER_VIEWPORT.maxScale
): number {
  return Math.min(maxScale, Math.max(minScale, value));
}

/** Fit content box inside the viewport with optional padding. */
export function computeFitTransform(
  containerW: number,
  containerH: number,
  contentW: number,
  contentH: number,
  padding = DESIGNER_VIEWPORT.fitPadding
): ViewTransform {
  if (containerW < 1 || containerH < 1 || contentW < 1 || contentH < 1) {
    return { scale: 1, pan: { x: 0, y: 0 } };
  }

  const availW = Math.max(1, containerW - padding * 2);
  const availH = Math.max(1, containerH - padding * 2);
  const scale = Math.min(availW / contentW, availH / contentH);
  const panX = (containerW - contentW * scale) / 2;
  const panY = (containerH - contentH * scale) / 2;

  return { scale, pan: { x: panX, y: panY } };
}

/** Minimum scale so the full layout remains visible (can be < 1). */
export function computeMinFitScale(
  containerW: number,
  containerH: number,
  contentW: number,
  contentH: number,
  padding = DESIGNER_VIEWPORT.fitPadding
): number {
  if (containerW < 1 || containerH < 1 || contentW < 1 || contentH < 1) {
    return 0.05;
  }
  const availW = Math.max(1, containerW - padding * 2);
  const availH = Math.max(1, containerH - padding * 2);
  return Math.min(availW / contentW, availH / contentH) * 0.92;
}

/**
 * Zoom so a percent rect (0–100 venue space) fills the viewport.
 * `mapOffset` / `mapSize` locate the venue floor inside the content wrapper.
 */
export function computeZoomToMapRect(
  containerW: number,
  containerH: number,
  contentW: number,
  contentH: number,
  mapOffset: ViewPan,
  mapSize: { width: number; height: number },
  rect: PercentRect,
  padding = DESIGNER_VIEWPORT.fitPadding
): ViewTransform {
  const rectPx = {
    x: mapOffset.x + (rect.x / 100) * mapSize.width,
    y: mapOffset.y + (rect.y / 100) * mapSize.height,
    width: (rect.width / 100) * mapSize.width,
    height: (rect.height / 100) * mapSize.height,
  };

  const availW = Math.max(1, containerW - padding * 2);
  const availH = Math.max(1, containerH - padding * 2);
  const fitScale = Math.min(
    availW / Math.max(rectPx.width, 1),
    availH / Math.max(rectPx.height, 1)
  );
  const seatVisibleScale =
    (DESIGNER_VIEWPORT.seatDotVisibleMinRadiusPx /
      DESIGNER_VIEWPORT.baseSeatRadiusPx) *
    1.2;
  const scale = Math.min(
    Math.max(fitScale, seatVisibleScale),
    DESIGNER_VIEWPORT.maxScale
  );

  const rectCenterX = rectPx.x + rectPx.width / 2;
  const rectCenterY = rectPx.y + rectPx.height / 2;

  return {
    scale,
    pan: {
      x: containerW / 2 - rectCenterX * scale,
      y: containerH / 2 - rectCenterY * scale,
    },
  };
}

export function zoomAboutPoint(
  prev: ViewTransform,
  nextScale: number,
  origin: { x: number; y: number },
  containerRect: { left: number; top: number }
): ViewTransform {
  const ox = origin.x - containerRect.left;
  const oy = origin.y - containerRect.top;
  const ratio = nextScale / prev.scale;

  return {
    scale: nextScale,
    pan: {
      x: ox - (ox - prev.pan.x) * ratio,
      y: oy - (oy - prev.pan.y) * ratio,
    },
  };
}

export function tierSectionBoundsForDesigner(
  seats: PositionedSeat[],
  tiers: { id: string; name: string; seatCount: number }[],
  extents: { widthM: number; depthM: number }
): SectionBound[] {
  return computeSectionBounds(
    seats,
    tiers.map((tier) => ({
      id: tier.id,
      name: tier.name,
      seatCount: tier.seatCount,
      assigned: 0,
    })),
    extents
  );
}

export function seatScreenRadiusPx(
  scale: number,
  baseRadius: number = DESIGNER_VIEWPORT.baseSeatRadiusPx
): number {
  return baseRadius * scale;
}

/**
 * Tier overview is a zoomed-out summary only — once seat dots are large enough
 * on screen, always switch to the seat cloud (even for 10k+ venues).
 */
export function shouldPreferTierOverview(input: {
  seatCount: number;
  scale: number;
  minFitScale?: number;
  baseSeatRadiusPx?: number;
}): boolean {
  if (input.seatCount <= 800) return false;

  const radius = seatScreenRadiusPx(
    input.scale,
    input.baseSeatRadiusPx ?? DESIGNER_VIEWPORT.baseSeatRadiusPx
  );

  if (radius >= DESIGNER_VIEWPORT.seatDotVisibleMinRadiusPx) {
    return false;
  }

  if (input.seatCount > 2_500) {
    const fitScale = input.minFitScale ?? 0.1;
    return input.scale <= fitScale * 1.05;
  }

  return input.scale < DESIGNER_VIEWPORT.tierOverviewMaxScale;
}
