"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Armchair,
  ChevronDown,
  Circle,
  GraduationCap,
  Grid2x2,
  Grid3x3,
  Info,
  Layers,
  LayoutTemplate,
  MapPin,
  PanelBottom,
  PanelLeft,
  PanelRight,
  PanelTop,
  Plus,
  RotateCcw,
  Rows3,
  SlidersHorizontal,
  Square,
  Tag,
  Theater,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { SeatTierIconInput } from "@/components/admin/SeatTierIconInput";
import { SeatTierMetaInputs } from "@/components/admin/SeatTierMetaInputs";
import { SectionRowBuilder } from "@/components/admin/SectionRowBuilder";
import { SeatingDesignerViewport } from "@/components/admin/SeatingDesignerViewport";
import { SeatingVenueCanvas } from "@/components/admin/SeatingVenueCanvas";
import { TierSortableList } from "@/components/admin/TierSortableList";
import { TextField } from "@/components/ui/Field";
import { CheckboxField } from "@/components/ui/Field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  analyzeVenueLayout,
  ARENA_RING_LIMITS,
  coerceLayoutConfig,
  computeVenueLayout,
  DEFAULT_LAYOUT_CONFIG,
  getStagePositionsForLayout,
  getTierPlacement,
  getTierRowLayoutSummary,
  sectionSlotPlacementPatch,
  tierPlacementKey,
  LAYOUT_TYPES,
  normalizeStagePositionForLayout,
  normalizeArenaArrangement,
  ROW_LAYOUT_LIMITS,
  type ArenaArrangement,
  type RowAlignment,
  type SeatingLayoutConfig,
  type SeatingLayoutType,
  type StagePosition,
  type TierPlacement,
} from "@/lib/seating-layout";
import type { SeatingMapTier } from "@/lib/seating";
import {
  buildTierSeatCountErrors,
  collectSeatTierValidationIssues,
  SEAT_TIER_LIMITS,
  VENUE_CAPACITY,
  type VenueCapacityProfile,
} from "@/lib/seating-limits";
import { capacityProfileLabelKey } from "@/lib/seating-map-utils";
import { tierNameKey } from "@/lib/seating-tier-names";
import { Input } from "@/components/ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

const layoutIcons: Record<SeatingLayoutType, typeof Theater> = {
  theater: Theater,
  classroom: GraduationCap,
  arena: Circle,
  banquet: UtensilsCrossed,
  u_shape: Square,
  grid: Grid3x3,
};

/** Matches PanelTop/Bottom/Left/Right — stage bar in the middle of the frame. */
function StageCenterIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M5 12h14" strokeWidth="2.5" />
    </svg>
  );
}

const stagePositionIcons: Record<StagePosition, LucideIcon | typeof StageCenterIcon> = {
  top: PanelTop,
  bottom: PanelBottom,
  left: PanelLeft,
  right: PanelRight,
  center: StageCenterIcon,
};

const STAGE_GRID_SLOTS: Array<{
  position: StagePosition;
  row: number;
  col: number;
}> = [
  { position: "top", row: 1, col: 2 },
  { position: "left", row: 2, col: 1 },
  { position: "center", row: 2, col: 2 },
  { position: "right", row: 2, col: 3 },
  { position: "bottom", row: 3, col: 2 },
];

export type TierPreview = {
  id?: string;
  /** Stable key for layout placement before the tier is saved. */
  clientKey?: string;
  name: string;
  seatCount: number;
  color: string;
  price: number | null;
  assigned?: number;
  available?: number;
};

function TierLayoutNumberField({
  label,
  icon: Icon,
  value,
  max,
  onChange,
  autoLabel,
}: {
  label: string;
  icon: LucideIcon;
  value: number;
  max: number;
  onChange: (value: number) => void;
  autoLabel: string;
}) {
  const isAuto = value <= 0;

  return (
    <div className="block min-w-0 space-y-0.5">
      <div className="relative">
        <span
          className="pointer-events-none absolute start-0 top-0 flex h-7 w-7 items-center justify-center text-bronze/55"
          title={label}
          aria-hidden
        >
          <Icon className="size-3.5" />
        </span>
        <Input
          type="number"
          min={0}
          max={max}
          value={isAuto ? "" : String(value)}
          placeholder={autoLabel}
          onChange={(e) => {
            const raw = e.target.value.trim();
            onChange(raw === "" ? 0 : Number(raw) || 0);
          }}
          dir="ltr"
          aria-label={label}
          className="h-7 ps-7 pe-8 text-left text-xs"
        />
        {isAuto ? (
          <span
            className="pointer-events-none absolute inset-y-0 end-2 flex items-center text-[9px] font-medium text-gold-dark/80"
            title={autoLabel}
            aria-hidden
          >
            <SlidersHorizontal className="size-3" />
          </span>
        ) : null}
      </div>
    </div>
  );
}

function TierLayoutPanel({
  tierIndex,
  tierKey,
  tier,
  tiers,
  layoutType,
  layoutConfig,
  showRowLayout,
  showArenaRings,
  effectiveRingCount,
  onPatchPlacement,
}: {
  tierIndex: number;
  tierKey: string;
  tier: TierPreview;
  tiers: TierPreview[];
  layoutType: SeatingLayoutType;
  layoutConfig: SeatingLayoutConfig;
  showRowLayout: boolean;
  showArenaRings: boolean;
  effectiveRingCount: number;
  onPatchPlacement: (patch: Partial<TierPlacement>) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const placement = getTierPlacement(layoutConfig, tierKey);
  const summary = useMemo(
    () => getTierRowLayoutSummary(tierIndex, tiers, layoutType, layoutConfig),
    [tierIndex, tiers, layoutType, layoutConfig]
  );
  const rowCount = summary.totalRows;
  const seatsPerRowMax = Math.min(
    ROW_LAYOUT_LIMITS.seatsPerRow.max,
    Math.max(8, tier.seatCount)
  );
  const numberOfRowsMax = Math.min(
    ROW_LAYOUT_LIMITS.numberOfRows.max,
    Math.max(4, tier.seatCount)
  );

  if (!showRowLayout && !showArenaRings) return null;
  if (tier.seatCount <= 0) return null;

  const summaryLabel =
    showRowLayout && rowCount > 0
      ? t("seating.tierLayoutSummary", {
          rows: String(summary.totalRows),
          perRow: String(summary.seatsPerRow),
          seats: String(tier.seatCount),
        })
      : showArenaRings && placement.ring && placement.ring > 0
        ? t("seating.tierOnRing", { n: String(placement.ring) })
        : t("seating.autoLayout");

  return (
    <div className="overflow-hidden rounded-md border border-border/60 bg-[#faf8f5]/40">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-2 py-1 text-left hover:bg-gold/5"
        aria-expanded={open}
        title={summaryLabel}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-gold/10 text-gold-dark">
            <LayoutTemplate className="size-3.5" aria-hidden />
          </span>
          <p className="truncate text-[10px] text-bronze/85">{summaryLabel}</p>
        </div>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-bronze transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open ? (
        <div className="space-y-3 border-t border-border/60 px-2 py-2">
          {showRowLayout ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <TierLayoutNumberField
                  icon={Grid2x2}
                  label={t("seating.seatsPerRow")}
                  value={placement.seatsPerRow ?? 0}
                  max={seatsPerRowMax}
                  autoLabel={t("seating.autoLayout")}
                  onChange={(seatsPerRow) =>
                    onPatchPlacement({
                      seatsPerRow: seatsPerRow > 0 ? seatsPerRow : undefined,
                    })
                  }
                />
                <TierLayoutNumberField
                  icon={Rows3}
                  label={t("seating.numberOfRows")}
                  value={placement.numberOfRows ?? 0}
                  max={numberOfRowsMax}
                  autoLabel={t("seating.autoLayout")}
                  onChange={(numberOfRows) =>
                    onPatchPlacement({
                      numberOfRows: numberOfRows > 0 ? numberOfRows : undefined,
                    })
                  }
                />
              </div>
            </>
          ) : null}

          {showArenaRings ? (
            <div className="relative">
              <span
                className="pointer-events-none absolute start-0 top-0 flex h-7 w-7 items-center justify-center text-bronze/55"
                title={t("seating.tierRingPlacement")}
                aria-hidden
              >
                <Circle className="size-3.5" />
              </span>
              <select
                value={String(placement.ring ?? 0)}
                onChange={(e) =>
                  onPatchPlacement({
                    ring:
                      Number(e.target.value) > 0
                        ? Number(e.target.value)
                        : undefined,
                  })
                }
                aria-label={t("seating.tierRingPlacement")}
                className="h-7 w-full rounded-md border border-input bg-card ps-7 pe-2 text-[11px] text-foreground"
              >
                <option value="0">⟳ {t("seating.autoLayout")}</option>
                {Array.from({ length: effectiveRingCount }, (_, i) => i + 1).map(
                  (ring) => (
                    <option key={ring} value={ring}>
                      ○ {ring}
                    </option>
                  )
                )}
              </select>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type Props = {
  layoutType: SeatingLayoutType;
  layoutConfig: SeatingLayoutConfig;
  tiers: TierPreview[];
  onLayoutTypeChange: (type: SeatingLayoutType) => void;
  onLayoutConfigChange: (config: SeatingLayoutConfig) => void;
  onAddTier: () => void;
  onUpdateTier: (index: number, patch: Partial<TierPreview>) => void;
  onRemoveTier: (index: number) => void;
  onReorderTiers: (fromIndex: number, toIndex: number) => void;
  /** Full-page designer route (not embedded in a modal). */
  standalone?: boolean;
  totalSeats?: number;
  capacityProfile?: VenueCapacityProfile;
};

function tiersToPreviewTiers(tiers: TierPreview[]): SeatingMapTier[] {
  return tiers.map((tier, index) => ({
    id: tier.id ?? tier.clientKey ?? `preview-${index}`,
    name: tier.name,
    seatCount: tier.seatCount,
    sortOrder: index + 1,
    assigned: tier.assigned ?? 0,
    available: tier.available ?? tier.seatCount,
    color: tier.color,
    price: tier.price,
    seats: [],
  }));
}

function DesignerSection({
  title,
  icon: Icon,
  defaultOpen = true,
  badge,
  headerAction,
  info,
  infoLabel,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  badge?: ReactNode;
  headerAction?: ReactNode;
  info?: string;
  infoLabel?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-start transition-colors hover:text-gold-dark"
          aria-expanded={open}
        >
          {Icon ? <Icon className="size-4 shrink-0 text-gold" aria-hidden /> : null}
          <span className="flex-1 text-sm font-semibold text-gold-dark">{title}</span>
          {badge}
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-bronze transition-transform",
              open && "rotate-180"
            )}
            aria-hidden
          />
        </button>
        {info && infoLabel ? (
          <button
            type="button"
            className={cn(
              "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-bronze/65 transition-colors hover:bg-gold/10 hover:text-gold-dark",
              infoOpen && "bg-gold/10 text-gold-dark"
            )}
            aria-label={infoLabel}
            aria-expanded={infoOpen}
            onClick={() => {
              setInfoOpen((value) => !value);
              setOpen(true);
            }}
          >
            <Info className="size-3.5" aria-hidden />
          </button>
        ) : null}
        {headerAction}
      </div>
      {open ? (
        <div className="space-y-3 overflow-hidden border-t border-border bg-[#faf8f5]/40 px-3 pb-3 pt-2.5">
          {infoOpen && info ? (
            <p className="rounded-lg border border-border bg-card px-2.5 py-2 text-xs leading-relaxed text-bronze">
              {info}
            </p>
          ) : null}
          {children}
        </div>
      ) : null}
    </div>
  );
}

function SpacingSlider({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
  zeroLabel,
  subdued,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatValue?: (v: number) => string;
  zeroLabel?: string;
  subdued?: boolean;
}) {
  const display =
    value === 0 && zeroLabel
      ? zeroLabel
      : formatValue
        ? formatValue(value)
        : value.toFixed(2);

  return (
    <div className={cn("space-y-1", subdued && "opacity-65")}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gold-dark">{label}</span>
        <span className="text-xs tabular-nums text-bronze">{display}</span>
      </div>
      {hint ? <p className="text-[11px] leading-snug text-bronze/75">{hint}</p> : null}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-[#5c3d1e]"
      />
    </div>
  );
}

function StagePositionPicker({
  value,
  options,
  disabled,
  onChange,
  label,
  getLabel,
}: {
  value: StagePosition;
  options: StagePosition[];
  disabled?: boolean;
  onChange: (position: StagePosition) => void;
  label: string;
  getLabel: (position: StagePosition) => string;
}) {
  const optionSet = new Set(options);
  const onlyCenter =
    options.length === 1 && options[0] === "center";

  const renderSlot = (position: StagePosition) => {
    const Icon = stagePositionIcons[position];
    const active = value === position;
    const title = getLabel(position);

    return (
      <button
        key={position}
        type="button"
        title={title}
        aria-label={title}
        aria-pressed={active}
        disabled={disabled}
        onClick={() => onChange(position)}
        className={cn(
          "flex aspect-square items-center justify-center rounded-lg border transition-colors",
          onlyCenter ? "size-14" : "w-full",
          active
            ? "border-gold bg-gold/10 text-gold-dark shadow-sm"
            : "border-border bg-card text-bronze hover:border-gold/40 hover:bg-[#faf8f5]",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <Icon className="size-5 shrink-0" />
      </button>
    );
  };

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-gold-dark">{label}</span>
      {onlyCenter ? (
        <div
          className="flex justify-center rounded-xl border border-dashed border-border bg-card/60 p-4"
          role="group"
          aria-label={label}
        >
          {renderSlot("center")}
        </div>
      ) : (
        <div
          className="grid w-full max-w-[11rem] grid-cols-3 grid-rows-3 gap-1.5"
          role="group"
          aria-label={label}
        >
          {STAGE_GRID_SLOTS.map((slot) => {
            if (!optionSet.has(slot.position)) {
              return (
                <div
                  key={slot.position}
                  style={{ gridRow: slot.row, gridColumn: slot.col }}
                />
              );
            }

            const Icon = stagePositionIcons[slot.position];
            const active = value === slot.position;
            const title = getLabel(slot.position);

            return (
              <button
                key={slot.position}
                type="button"
                title={title}
                aria-label={title}
                aria-pressed={active}
                disabled={disabled}
                onClick={() => onChange(slot.position)}
                style={{ gridRow: slot.row, gridColumn: slot.col }}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-lg border transition-colors",
                  active
                    ? "border-gold bg-gold/10 text-gold-dark shadow-sm"
                    : "border-border bg-card text-bronze hover:border-gold/40 hover:bg-[#faf8f5]",
                  disabled && "cursor-not-allowed opacity-60"
                )}
              >
                <Icon className="size-5 shrink-0" />
              </button>
            );
          })}
        </div>
      )}
      <p className="text-xs text-bronze">{getLabel(value)}</p>
    </div>
  );
}

function LayoutStatChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-[#faf8f5] px-2.5 py-0.5 text-[11px] text-bronze">
      <span className="font-medium text-gold-dark">{value}</span>
      <span>{label}</span>
    </span>
  );
}

export function SeatingLayoutDesigner({
  layoutType,
  layoutConfig,
  tiers,
  onLayoutTypeChange,
  onLayoutConfigChange,
  onAddTier,
  onUpdateTier,
  onRemoveTier,
  onReorderTiers,
  standalone = false,
  totalSeats: totalSeatsProp,
  capacityProfile,
}: Props) {
  const { t } = useI18n();
  const pendingSectionSlotRef = useRef<{
    rowNumber: number;
    align: RowAlignment;
  } | null>(null);
  const prevTierCountRef = useRef(tiers.length);
  const prevShowSectionCanvasRef = useRef(false);
  const [previewMode, setPreviewMode] = useState<"sections" | "seats">(
    "sections"
  );

  const stagePositions = getStagePositionsForLayout(layoutType);
  const stagePosition = normalizeStagePositionForLayout(
    layoutType,
    layoutConfig.stagePosition
  );
  const stagePickerDisabled = stagePositions.length === 1;
  const arenaArrangement = normalizeArenaArrangement(layoutConfig.arenaArrangement);
  const showRowLayout =
    layoutType === "theater" ||
    layoutType === "classroom" ||
    layoutType === "grid" ||
    (layoutType === "arena" && arenaArrangement === "rows");
  const showArenaRings =
    layoutType === "arena" && arenaArrangement === "rings";
  const showAisle =
    layoutType === "theater" || layoutType === "classroom";
  const showSectionCanvas =
    showRowLayout &&
    stagePosition !== "center" &&
    tiers.some((tier) => tier.seatCount > 0);

  useEffect(() => {
    if (showSectionCanvas && !prevShowSectionCanvasRef.current) {
      setPreviewMode("sections");
    }
    if (!showSectionCanvas) {
      setPreviewMode("seats");
    }
    prevShowSectionCanvasRef.current = showSectionCanvas;
  }, [showSectionCanvas]);

  const layoutHintKey =
    layoutType === "arena" && arenaArrangement === "rows"
      ? "seating.layoutHint.arena_rows"
      : layoutType === "arena" && arenaArrangement === "rings"
        ? "seating.layoutHint.arena_rings"
        : `seating.layoutHint.${layoutType}`;

  const activeTiers = tiers.filter((tier) => tier.seatCount > 0);
  const totalSeatCount =
    totalSeatsProp ??
    tiers.reduce((sum, tier) => sum + Math.max(0, tier.seatCount), 0);

  const previewLayoutKey = useMemo(
    () =>
      tiers
        .map((tier, index) => `${tier.id ?? tier.clientKey ?? index}:${tier.seatCount}`)
        .join("|"),
    [tiers]
  );

  const seatLimitIssues = useMemo(
    () => collectSeatTierValidationIssues(tiers),
    [tiers]
  );
  const hasSeatLimitIssues = seatLimitIssues.length > 0;

  const previewVenue = useMemo(() => {
    if (hasSeatLimitIssues) return null;
    const previewTiers = tiersToPreviewTiers(activeTiers);
    if (previewTiers.length === 0) return null;
    return computeVenueLayout(previewTiers, layoutType, {
      ...layoutConfig,
      stagePosition,
    });
  }, [activeTiers, hasSeatLimitIssues, layoutType, layoutConfig, stagePosition]);

  const layoutStats = useMemo(
    () =>
      previewVenue
        ? analyzeVenueLayout(previewVenue, activeTiers.length)
        : null,
    [previewVenue, activeTiers.length]
  );

  const tierNameErrors = useMemo(() => {
    const byKey = new Map<string, number[]>();
    tiers.forEach((tier, index) => {
      const key = tierNameKey(tier.name);
      if (!key) return;
      const indices = byKey.get(key) ?? [];
      indices.push(index);
      byKey.set(key, indices);
    });
    const errors: Record<number, string> = {};
    for (const indices of byKey.values()) {
      if (indices.length > 1) {
        for (const index of indices) {
          errors[index] = t("seating.tierNameDuplicate");
        }
      }
    }
    return errors;
  }, [tiers, t]);

  const tierSeatCountErrors = useMemo(
    () => buildTierSeatCountErrors(tiers, t),
    [tiers, t]
  );

  const tierCountError =
    tiers.length > SEAT_TIER_LIMITS.tierCount.max
      ? t("seating.tierCountTooHigh", {
          max: String(SEAT_TIER_LIMITS.tierCount.max),
        })
      : null;

  const numberOfRingsMax = Math.min(
    ARENA_RING_LIMITS.numberOfRings.max,
    Math.max(1, totalSeatCount)
  );

  const numberOfRingsValue = layoutConfig.numberOfRings ?? 0;

  function handleLayoutTypeChange(type: SeatingLayoutType) {
    onLayoutTypeChange(type);
    const nextPosition = normalizeStagePositionForLayout(
      type,
      layoutConfig.stagePosition
    );
    if (nextPosition !== layoutConfig.stagePosition) {
      patchConfig({ stagePosition: nextPosition });
    }
  }

  function patchConfig(patch: Partial<SeatingLayoutConfig>) {
    onLayoutConfigChange(coerceLayoutConfig({ ...layoutConfig, ...patch }));
  }

  function resetLayoutSettings() {
    onLayoutConfigChange(
      coerceLayoutConfig({
        ...DEFAULT_LAYOUT_CONFIG,
        stagePosition: normalizeStagePositionForLayout(
          layoutType,
          DEFAULT_LAYOUT_CONFIG.stagePosition
        ),
      })
    );
  }

  const effectiveRingCount =
    numberOfRingsValue > 0
      ? numberOfRingsValue
      : layoutStats?.ringCount ?? Math.max(1, tiers.length);

  function getTierPositionLabel(index: number, tierKey: string): string {
    const ring = getTierPlacement(layoutConfig, tierKey).ring;
    if (showArenaRings) {
      if (ring && ring > 0) {
        return t("seating.tierOnRing", { n: String(ring) });
      }
      if (index === 0) return t("seating.tierPosition.inner");
      if (index === tiers.length - 1) return t("seating.tierPosition.outer");
      return t("seating.tierPosition.middle");
    }
    if (index === 0) return t("seating.tierPosition.front");
    if (index === tiers.length - 1) return t("seating.tierPosition.back");
    return t("seating.tierPosition.middle");
  }

  useEffect(() => {
    const pending = pendingSectionSlotRef.current;
    if (!pending || tiers.length <= prevTierCountRef.current) {
      prevTierCountRef.current = tiers.length;
      return;
    }
    const index = tiers.length - 1;
    const tierKey = tierPlacementKey(tiers[index], index);
    patchTierPlacement(
      tierKey,
      sectionSlotPlacementPatch(pending.rowNumber, pending.align)
    );
    pendingSectionSlotRef.current = null;
    prevTierCountRef.current = tiers.length;
  }, [tiers]);

  function patchTierPlacement(tierKey: string, patch: Partial<TierPlacement>) {
    const next = { ...(layoutConfig.tierPlacements ?? {}) };
    const merged = { ...(next[tierKey] ?? {}), ...patch };
    const placement: TierPlacement = {};
    if (merged.ring && merged.ring > 0) placement.ring = merged.ring;
    if (merged.seatsPerRow && merged.seatsPerRow > 0) {
      placement.seatsPerRow = merged.seatsPerRow;
    }
    if (merged.numberOfRows && merged.numberOfRows > 0) {
      placement.numberOfRows = merged.numberOfRows;
    }
    if (
      !("sectionRow" in patch) &&
      merged.sectionRow &&
      merged.sectionRow > 0
    ) {
      placement.sectionRow = merged.sectionRow;
    } else if (
      "sectionRow" in patch &&
      patch.sectionRow &&
      patch.sectionRow > 0
    ) {
      placement.sectionRow = patch.sectionRow;
    }
    if ("sectionAlign" in patch) {
      if (patch.sectionAlign === "left" || patch.sectionAlign === "right") {
        placement.sectionAlign = patch.sectionAlign;
      }
    } else if (merged.sectionAlign) {
      placement.sectionAlign = merged.sectionAlign;
    }
    if (Object.keys(placement).length > 0) {
      next[tierKey] = placement;
    } else {
      delete next[tierKey];
    }
    patchConfig({
      tierPlacements: Object.keys(next).length > 0 ? next : undefined,
    });
  }

  function setRingSlotAssignment(ring: number, tierKey: string) {
    const next = { ...(layoutConfig.tierPlacements ?? {}) };
    for (const [key, placement] of Object.entries(next)) {
      if (placement.ring === ring) delete next[key];
    }
    if (tierKey) {
      next[tierKey] = { ring };
    }
    patchConfig({
      tierPlacements: Object.keys(next).length > 0 ? next : undefined,
    });
  }

  function tierKeyForRing(ring: number): string {
    const entries = layoutConfig.tierPlacements ?? {};
    for (const [key, placement] of Object.entries(entries)) {
      if (placement.ring === ring) return key;
    }
    return "";
  }

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col",
        standalone ? "h-full" : "h-full"
      )}
    >
      <ResizablePanelGroup
        id="seating-layout-designer"
        orientation="horizontal"
        className="min-h-0 flex-1 rounded-xl border border-border bg-card/30"
        defaultLayout={{
          "seating-designer-settings": standalone ? 30 : 32,
          "seating-designer-preview": standalone ? 70 : 68,
        }}
      >
          <ResizablePanel
            id="seating-designer-settings"
            defaultSize={standalone ? "30%" : "32%"}
            minSize="280px"
            maxSize="45%"
            className="min-h-0 min-w-0"
          >
            <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain px-1">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-[#faf8f5] px-3 py-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-gold-dark">
                {t("seating.designerSummary")}
              </p>
              <p className="truncate text-[11px] text-bronze">
                {t(`seating.layout.${layoutType}`)}
                {" · "}
                {t("seating.statsTotal", { count: String(totalSeatCount) })}
                {capacityProfile ? (
                  <>
                    {" · "}
                    {t(capacityProfileLabelKey(capacityProfile))}
                  </>
                ) : null}
              </p>
              {totalSeatCount > VENUE_CAPACITY.fullVisualMapMax ? (
                <p className="mt-0.5 text-[10px] leading-snug text-bronze/80">
                  {t("seating.designerLargeVenueHint")}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 text-bronze hover:text-gold-dark"
              onClick={resetLayoutSettings}
            >
              <RotateCcw className="size-3.5" />
              {t("seating.designerReset")}
            </Button>
          </div>

          <DesignerSection
            title={t("seating.section.tiers")}
            icon={Layers}
            defaultOpen
            badge={
              tiers.length > 0 ? (
                <Badge variant="outline" className="text-[10px]">
                  {tiers.length}
                </Badge>
              ) : null
            }
            headerAction={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-[11px]"
                onClick={onAddTier}
                disabled={tiers.length >= SEAT_TIER_LIMITS.tierCount.max}
              >
                <Plus className="size-3.5" />
                {t("seating.addTier")}
              </Button>
            }
          >
            <p className="text-[10px] leading-snug text-bronze/80">
              {showRowLayout
                ? t("seating.tiersLayoutHint")
                : t("seating.seatCountLimitsHint", {
                    max: String(SEAT_TIER_LIMITS.seatsPerTier.max),
                    totalMax: String(SEAT_TIER_LIMITS.totalSeats.max),
                  })}
            </p>
            {tierCountError ? (
              <p className="text-[10px] text-destructive">{tierCountError}</p>
            ) : null}
            {tiers.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-card px-2 py-3 text-center text-[11px] text-bronze">
                {t("seating.noTiers")}
              </p>
            ) : (
              <TierSortableList
                compact
                items={tiers}
                onReorder={onReorderTiers}
                onRemove={onRemoveTier}
                getItemKey={(tier, index) =>
                  tier.id ?? tier.clientKey ?? `tier-${index}`
                }
                getPositionLabel={(index) =>
                  getTierPositionLabel(
                    index,
                    tierPlacementKey(tiers[index], index)
                  )
                }
                renderItem={(tier, index) => {
                  const tierKey = tierPlacementKey(tier, index);
                  const nameError = tierNameErrors[index];
                  const seatError = tierSeatCountErrors[index];

                  return (
                    <>
                      <div className="grid grid-cols-[minmax(0,1fr)_4.5rem] gap-2">
                        <SeatTierIconInput
                          icon={Tag}
                          label={t("seating.tierName")}
                          value={tier.name}
                          onChange={(name) => onUpdateTier(index, { name })}
                          placeholder={t("seating.tierName")}
                          error={nameError}
                        />
                        <SeatTierIconInput
                          icon={Armchair}
                          label={t("seating.seatCount")}
                          type="number"
                          min={SEAT_TIER_LIMITS.seatsPerTier.min}
                          max={SEAT_TIER_LIMITS.seatsPerTier.max}
                          value={String(tier.seatCount)}
                          onChange={(raw) =>
                            onUpdateTier(index, {
                              seatCount: Number(raw) || 0,
                            })
                          }
                          dir="ltr"
                          inputClassName="text-left"
                          error={seatError}
                        />
                      </div>
                      <SeatTierMetaInputs
                        compact
                        color={tier.color}
                        price={tier.price}
                        onColorChange={(color) =>
                          onUpdateTier(index, { color })
                        }
                        onPriceChange={(price) =>
                          onUpdateTier(index, { price })
                        }
                      />
                      <TierLayoutPanel
                        tierIndex={index}
                        tierKey={tierKey}
                        tier={tier}
                        tiers={tiers}
                        layoutType={layoutType}
                        layoutConfig={layoutConfig}
                        showRowLayout={showRowLayout}
                        showArenaRings={showArenaRings}
                        effectiveRingCount={effectiveRingCount}
                        onPatchPlacement={(patch) =>
                          patchTierPlacement(tierKey, patch)
                        }
                      />
                      {tier.id && tier.assigned != null ? (
                        <p
                          className="flex items-center gap-1 text-[9px] text-bronze/80"
                          title={t("seating.tierStats", {
                            assigned: String(tier.assigned),
                            total: String(tier.seatCount),
                          })}
                        >
                          <Armchair className="size-3 shrink-0" aria-hidden />
                          <span dir="ltr">
                            {tier.assigned}/{tier.seatCount}
                          </span>
                        </p>
                      ) : null}
                    </>
                  );
                }}
              />
            )}
          </DesignerSection>

          <DesignerSection
            title={t("seating.section.layout")}
            icon={LayoutTemplate}
            info={t("seating.layoutIntro")}
            infoLabel={t("seating.layoutIntroLabel")}
            defaultOpen
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {LAYOUT_TYPES.map((type) => {
                const Icon = layoutIcons[type];
                const active = layoutType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleLayoutTypeChange(type)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-colors",
                      active
                        ? "border-gold bg-gold/10 text-gold-dark shadow-sm"
                        : "border-border bg-card text-bronze hover:border-gold/40 hover:bg-[#faf8f5]"
                    )}
                  >
                    <Icon className="size-5 shrink-0" />
                    <span className="text-[11px] font-medium leading-tight">
                      {t(`seating.layout.${type}`)}
                    </span>
                  </button>
                );
              })}
            </div>
          </DesignerSection>

          <DesignerSection
            title={t("seating.section.stage")}
            icon={MapPin}
            defaultOpen
          >
            <StagePositionPicker
              label={t("seating.stagePosition")}
              value={stagePosition}
              options={stagePositions}
              disabled={stagePickerDisabled}
              onChange={(pos) => {
                const patch: Partial<SeatingLayoutConfig> = { stagePosition: pos };
                if (pos === "center") {
                  patch.aisleCenter = true;
                }
                patchConfig(patch);
              }}
              getLabel={(pos) => t(`seating.stage.${pos}`)}
            />
            {stagePosition === "center" && showRowLayout ? (
              <p className="text-xs leading-relaxed text-bronze/90">
                {t("seating.stageCenterHint")}
              </p>
            ) : null}
            <TextField
              label={t("seating.stageLabel")}
              value={layoutConfig.stageLabel ?? DEFAULT_LAYOUT_CONFIG.stageLabel ?? ""}
              onChange={(e) => patchConfig({ stageLabel: e.target.value })}
              placeholder={t("seating.stageLabelPlaceholder")}
            />
            {layoutType === "arena" ? (
              <div className="space-y-2">
                <span className="text-sm font-medium text-gold-dark">
                  {t("seating.arenaArrangement")}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(["rings", "rows"] as const).map((mode) => {
                    const active = arenaArrangement === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => patchConfig({ arenaArrangement: mode })}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "border-gold bg-gold/10 text-gold-dark"
                            : "border-border bg-card text-bronze hover:border-gold/40"
                        )}
                      >
                        {t(`seating.arenaArrangement.${mode}`)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {showAisle ? (
              <CheckboxField
                label={t("seating.aisleCenter")}
                checked={Boolean(layoutConfig.aisleCenter)}
                onChange={(checked) => patchConfig({ aisleCenter: checked })}
              />
            ) : null}
          </DesignerSection>

          {showArenaRings ? (
            <DesignerSection
              title={t("seating.section.options")}
              icon={SlidersHorizontal}
              defaultOpen={false}
            >
              <div className="space-y-2">
                <p className="text-xs text-bronze/85">{t("seating.ringLayoutHint")}</p>
                <SpacingSlider
                  label={t("seating.numberOfRings")}
                  value={numberOfRingsValue}
                  min={ARENA_RING_LIMITS.numberOfRings.min}
                  max={numberOfRingsMax}
                  step={ARENA_RING_LIMITS.numberOfRings.step}
                  zeroLabel={t("seating.autoLayout")}
                  formatValue={(v) => String(Math.round(v))}
                  onChange={(v) =>
                    patchConfig({ numberOfRings: Math.round(v) })
                  }
                />
              </div>
            </DesignerSection>
          ) : null}

            </div>
          </ResizablePanel>

          <ResizableHandle
            withHandle
            className="mx-0.5 w-3 shrink-0 border-s border-border bg-border/80 transition-colors hover:bg-gold/15"
          />

          <ResizablePanel
            id="seating-designer-preview"
            defaultSize={standalone ? "70%" : "68%"}
            minSize="45%"
            className="min-h-0 min-w-0"
          >
            <section className="flex h-full min-h-0 flex-col gap-2">
          <div className="flex shrink-0 flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-semibold text-gold-dark">
                  {previewMode === "sections" && showSectionCanvas
                    ? t("seating.sectionRowBuilderTitle")
                    : t("seating.layoutPreview")}
                </h4>
                {showSectionCanvas ? (
                  <div
                    className="inline-flex rounded-lg border border-border bg-card p-0.5"
                    role="tablist"
                    aria-label={t("seating.previewModeLabel")}
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={previewMode === "sections"}
                      onClick={() => setPreviewMode("sections")}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                        previewMode === "sections"
                          ? "bg-gold/15 text-gold-dark"
                          : "text-bronze hover:bg-[#faf8f5]"
                      )}
                    >
                      <Rows3 className="size-3.5" aria-hidden />
                      {t("seating.previewMode.sections")}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={previewMode === "seats"}
                      onClick={() => setPreviewMode("seats")}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                        previewMode === "seats"
                          ? "bg-gold/15 text-gold-dark"
                          : "text-bronze hover:bg-[#faf8f5]"
                      )}
                    >
                      <Grid3x3 className="size-3.5" aria-hidden />
                      {t("seating.previewMode.seats")}
                    </button>
                  </div>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs text-bronze/85">
                {previewMode === "sections" && showSectionCanvas
                  ? t("seating.sectionRowBuilderHint")
                  : t(layoutHintKey)}
              </p>
              {totalSeatCount > VENUE_CAPACITY.designPreviewWarnTotal ? (
                <p className="mt-1 text-xs text-bronze/80">
                  {t("seating.layoutPreviewLargeVenue", {
                    total: String(totalSeatCount),
                  })}
                </p>
              ) : null}
            </div>
            {layoutStats ? (
              <div className="flex flex-wrap justify-end gap-1.5">
                <LayoutStatChip
                  label={t("seating.statsSeatsLabel")}
                  value={String(layoutStats.totalSeats)}
                />
                <LayoutStatChip
                  label={t("seating.statsTiersLabel")}
                  value={String(layoutStats.tierCount)}
                />
                {layoutStats.ringCount != null ? (
                  <LayoutStatChip
                    label={t("seating.statsRingsLabel")}
                    value={
                      layoutStats.configuredRings != null
                        ? String(layoutStats.configuredRings)
                        : String(layoutStats.ringCount)
                    }
                  />
                ) : null}
                {layoutStats.rowCount != null ? (
                  <LayoutStatChip
                    label={t("seating.statsRowsLabel")}
                    value={String(layoutStats.rowCount)}
                  />
                ) : null}
                {layoutStats.tableRings != null ? (
                  <LayoutStatChip
                    label={t("seating.statsTablesLabel")}
                    value={String(layoutStats.tableRings)}
                  />
                ) : null}
                {layoutStats.configuredSeatsPerRow != null ? (
                  <LayoutStatChip
                    label={t("seating.statsPerRowLabel")}
                    value={String(layoutStats.configuredSeatsPerRow)}
                  />
                ) : null}
              </div>
            ) : null}
          </div>

          {showArenaRings && tiers.length > 0 ? (
            <div className="shrink-0 rounded-xl border border-border bg-[#faf8f5] p-3">
              <h5 className="mb-2 text-xs font-semibold text-gold-dark">
                {t("seating.ringSlotTitle")}
              </h5>
              <p className="mb-2 text-[11px] text-bronze/80">
                {t("seating.ringSlotHint")}
              </p>
              <div className="space-y-1.5">
                {Array.from({ length: effectiveRingCount }, (_, i) => i + 1).map(
                  (ring) => (
                    <div
                      key={ring}
                      className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5"
                    >
                      <span className="w-16 shrink-0 text-[11px] font-medium text-gold-dark">
                        {t("seating.ringN", { n: String(ring) })}
                      </span>
                      <select
                        value={tierKeyForRing(ring)}
                        onChange={(e) =>
                          setRingSlotAssignment(ring, e.target.value)
                        }
                        className="h-7 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        <option value="">{t("seating.ringSlotAuto")}</option>
                        {tiers.map((tier, index) => {
                          const key = tierPlacementKey(tier, index);
                          return (
                            <option key={key} value={key}>
                              {tier.name}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )
                )}
              </div>
            </div>
          ) : null}

          {previewMode === "sections" && showSectionCanvas ? (
            <SectionRowBuilder
              variant="canvas"
              className="min-h-[min(420px,62vh)] flex-1"
              tiers={tiers}
              layoutConfig={layoutConfig}
              stagePosition={stagePosition}
              onPatchTierPlacement={patchTierPlacement}
              onUpdateTier={onUpdateTier}
              onAddTier={() => {
                prevTierCountRef.current = tiers.length;
                onAddTier();
              }}
              onAddTierToSlot={(rowNumber, align) => {
                pendingSectionSlotRef.current = { rowNumber, align };
                prevTierCountRef.current = tiers.length;
                onAddTier();
              }}
            />
          ) : previewVenue ? (
            <SeatingDesignerViewport
              contentKey={previewLayoutKey}
              className="min-h-[min(320px,58vh)] flex-1"
            >
              <SeatingVenueCanvas
                venue={previewVenue}
                fill
                designMode
                showTierLabels={tiers.length > 1}
                tierColors={Object.fromEntries(
                  tiers.map((tier, index) => [
                    tier.id ?? tier.clientKey ?? `preview-${index}`,
                    tier.color,
                  ])
                )}
                tierMeta={Object.fromEntries(
                  tiers.map((tier, index) => [
                    tier.id ?? tier.clientKey ?? `preview-${index}`,
                    {
                      name: tier.name,
                      color: tier.color,
                      price: tier.price,
                    },
                  ])
                )}
              />
            </SeatingDesignerViewport>
          ) : (
            <div className="flex min-h-[min(300px,55vh)] flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-card/50">
              <p className="px-4 text-center text-sm text-bronze">
                {hasSeatLimitIssues
                  ? t("seating.layoutPreviewLimitExceeded")
                  : t("seating.layoutPreviewEmpty")}
              </p>
            </div>
          )}

            </section>
          </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
