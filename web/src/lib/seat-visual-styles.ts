import type { SeatCell } from "@/lib/seating";

/** Light venue floor with strong seat contrast (brand gold). */
export const SEAT_STATUS_STYLES: Record<SeatCell["status"], string> = {
  free:
    "border-2 border-[var(--seat-free-ring)] bg-[var(--seat-free-bg)] text-[var(--seat-free-fg)] shadow-[0_1px_4px_rgba(92,61,30,0.28)]",
  approved:
    "border-2 border-[var(--seat-approved-ring)] bg-[var(--seat-approved-bg)] text-[var(--seat-approved-fg)] shadow-[0_1px_4px_rgba(92,61,30,0.32)]",
  attended:
    "border-2 border-[var(--seat-attended-ring)] bg-[var(--seat-attended-bg)] text-[var(--seat-attended-fg)] shadow-[0_1px_4px_rgba(20,83,45,0.35)]",
};

export const VENUE_CANVAS_CLASS =
  "relative w-full overflow-hidden rounded-xl border border-border bg-[var(--seat-map-floor)]";

export const VENUE_GRID_STYLE = {
  backgroundImage: `linear-gradient(to right, var(--seat-map-grid) 1px, transparent 1px), linear-gradient(to bottom, var(--seat-map-grid) 1px, transparent 1px)`,
  backgroundSize: "8% 8%",
} as const;

/** Original soft gold stage on light floor */
export const STAGE_VISUAL_CLASS =
  "border-2 border-gold-dark/50 bg-gradient-to-br from-gold/50 to-gold/25 font-semibold text-gold-dark shadow-md";

export const SEAT_TIER_CHIP_CLASS =
  "rounded-full border border-gold/40 bg-gold/15 px-2 py-0.5 text-[10px] font-medium text-gold-dark";

export const VENUE_LAYOUT_LABEL_CLASS =
  "text-[9px] font-medium text-bronze/80";
