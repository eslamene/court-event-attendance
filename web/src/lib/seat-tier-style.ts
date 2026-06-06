import type { SeatCell } from "@/lib/seating";

export const TIER_COLOR_PALETTE = [
  "#c9a227",
  "#4a7c59",
  "#3d6b8c",
  "#9b4d6a",
  "#7c5cbf",
  "#c77d3a",
  "#2d8a8a",
  "#8b6914",
] as const;

const HEX_COLOR = /^#([0-9a-fA-F]{6})$/;

export function defaultTierColor(index: number): string {
  return TIER_COLOR_PALETTE[index % TIER_COLOR_PALETTE.length];
}

export function normalizeTierColor(
  value: string | null | undefined,
  fallbackIndex = 0
): string {
  const trimmed = value?.trim() ?? "";
  if (HEX_COLOR.test(trimmed)) return trimmed.toLowerCase();
  return defaultTierColor(fallbackIndex);
}

export function parseTierPrice(
  value: number | string | null | undefined
): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

export function formatTierPrice(
  price: number | null | undefined,
  locale: string,
  currency = "EGP"
): string | null {
  if (price == null) return null;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${price}`;
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.slice(1), 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

function mixRgb(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number
): string {
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

/** Canvas / inline styles: free seats use a light tier tint; occupied use full tier color. */
export function seatColorForTier(
  tierColor: string,
  status: SeatCell["status"]
): { fill: string; stroke: string } {
  const base = hexToRgb(normalizeTierColor(tierColor));
  const white = { r: 255, g: 255, b: 255 };
  const dark = {
    r: Math.max(0, base.r - 48),
    g: Math.max(0, base.g - 48),
    b: Math.max(0, base.b - 48),
  };

  switch (status) {
    case "free":
      return {
        fill: mixRgb(white, base, 0.35),
        stroke: mixRgb(base, dark, 0.45),
      };
    case "attended":
      return {
        fill: mixRgb(base, dark, 0.55),
        stroke: mixRgb(base, dark, 0.85),
      };
    case "approved":
    default:
      return {
        fill: mixRgb(white, base, 0.15),
        stroke: mixRgb(base, dark, 0.65),
      };
  }
}
