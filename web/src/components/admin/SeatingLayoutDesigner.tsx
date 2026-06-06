"use client";

import { useMemo } from "react";
import {
  Circle,
  GraduationCap,
  Grid3x3,
  Layers,
  LayoutTemplate,
  Plus,
  Square,
  Theater,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { SeatingDesignerViewport } from "@/components/admin/SeatingDesignerViewport";
import { SeatingVenueCanvas } from "@/components/admin/SeatingVenueCanvas";
import { SelectField, TextField } from "@/components/ui/Field";
import { CheckboxField } from "@/components/ui/Field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  computeVenueLayout,
  DEFAULT_LAYOUT_CONFIG,
  getStagePositionsForLayout,
  LAYOUT_TYPES,
  normalizeStagePositionForLayout,
  normalizeArenaArrangement,
  SPACING_LIMITS,
  type ArenaArrangement,
  type SeatingLayoutConfig,
  type SeatingLayoutType,
  type StagePosition,
} from "@/lib/seating-layout";
import type { SeatingMapTier } from "@/lib/seating";
import { cn } from "@/lib/utils";

const layoutIcons: Record<SeatingLayoutType, typeof Theater> = {
  theater: Theater,
  classroom: GraduationCap,
  arena: Circle,
  banquet: UtensilsCrossed,
  u_shape: Square,
  grid: Grid3x3,
};

export type TierPreview = {
  id?: string;
  name: string;
  seatCount: number;
  assigned?: number;
  available?: number;
};

type Props = {
  layoutType: SeatingLayoutType;
  layoutConfig: SeatingLayoutConfig;
  tiers: TierPreview[];
  onLayoutTypeChange: (type: SeatingLayoutType) => void;
  onLayoutConfigChange: (config: SeatingLayoutConfig) => void;
  onAddTier: () => void;
  onUpdateTier: (index: number, patch: Partial<TierPreview>) => void;
  onRemoveTier: (index: number) => void;
  expandedPreview?: boolean;
};

function tiersToPreviewTiers(tiers: TierPreview[]): SeatingMapTier[] {
  return tiers.map((tier, index) => ({
    id: tier.id ?? `preview-${index}`,
    name: tier.name,
    seatCount: tier.seatCount,
    sortOrder: index + 1,
    assigned: tier.assigned ?? 0,
    available: tier.available ?? tier.seatCount,
    seats: Array.from({ length: tier.seatCount }, (_, i) => ({
      number: i + 1,
      status: "free" as const,
    })),
  }));
}

function SpacingSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatValue?: (v: number) => string;
}) {
  const display = formatValue ? formatValue(value) : value.toFixed(2);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gold-dark">{label}</span>
        <span className="text-xs tabular-nums text-bronze">{display}</span>
      </div>
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

export function SeatingLayoutDesigner({
  layoutType,
  layoutConfig,
  tiers,
  onLayoutTypeChange,
  onLayoutConfigChange,
  onAddTier,
  onUpdateTier,
  onRemoveTier,
  expandedPreview = false,
}: Props) {
  const { t } = useI18n();

  const stagePositions = getStagePositionsForLayout(layoutType);
  const stagePosition = normalizeStagePositionForLayout(
    layoutType,
    layoutConfig.stagePosition
  );
  const stageSelectDisabled = stagePositions.length === 1;
  const arenaArrangement = normalizeArenaArrangement(layoutConfig.arenaArrangement);
  const showSeatsPerRow =
    layoutType === "theater" ||
    layoutType === "classroom" ||
    layoutType === "grid" ||
    (layoutType === "arena" && arenaArrangement === "rows");

  const layoutHintKey =
    layoutType === "arena" && arenaArrangement === "rows"
      ? "seating.layoutHint.arena_rows"
      : `seating.layoutHint.${layoutType}`;

  const hSpacing = layoutConfig.horizontalSpacing ?? DEFAULT_LAYOUT_CONFIG.horizontalSpacing!;
  const vSpacing = layoutConfig.verticalSpacing ?? DEFAULT_LAYOUT_CONFIG.verticalSpacing!;
  const tierSpacing = layoutConfig.tierSpacing ?? DEFAULT_LAYOUT_CONFIG.tierSpacing!;
  const seatPadding = layoutConfig.seatPadding ?? DEFAULT_LAYOUT_CONFIG.seatPadding!;

  const previewVenue = useMemo(() => {
    const previewTiers = tiersToPreviewTiers(tiers.filter((t) => t.seatCount > 0));
    if (previewTiers.length === 0) return null;
    return computeVenueLayout(previewTiers, layoutType, {
      ...layoutConfig,
      stagePosition,
    });
  }, [tiers, layoutType, layoutConfig, stagePosition]);

  function handleLayoutTypeChange(type: SeatingLayoutType) {
    onLayoutTypeChange(type);
    const nextPosition = normalizeStagePositionForLayout(
      type,
      layoutConfig.stagePosition
    );
    if (nextPosition !== layoutConfig.stagePosition) {
      onLayoutConfigChange({ ...layoutConfig, stagePosition: nextPosition });
    }
  }

  function patchConfig(patch: Partial<SeatingLayoutConfig>) {
    onLayoutConfigChange({ ...layoutConfig, ...patch });
  }

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col",
        expandedPreview && "h-full min-h-0"
      )}
    >
      <div
        className={cn(
          "grid min-h-0 flex-1 grid-cols-1 gap-4 md:gap-5",
          "lg:grid-cols-[minmax(0,min(100%,22rem))_minmax(0,1fr)]",
          expandedPreview && "h-full min-h-0"
        )}
      >
        <aside
          className={cn(
            "flex min-w-0 flex-col gap-4",
            "lg:max-h-[min(78vh,780px)] lg:overflow-y-auto lg:overscroll-contain lg:pe-1",
            expandedPreview && "lg:max-h-none lg:h-full"
          )}
        >
          <p className="text-sm text-bronze">{t("seating.layoutIntro")}</p>

          {/* Seat tiers / layers */}
          <div className="space-y-2 rounded-xl border border-border bg-[#faf8f5] p-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-gold-dark">
                <Layers className="size-4 shrink-0" />
                {t("seating.tiersTitle")}
              </h4>
              <Button type="button" variant="outline" size="sm" onClick={onAddTier}>
                <Plus className="size-4" />
                {t("seating.addTier")}
              </Button>
            </div>

            {tiers.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-5 text-center text-xs text-bronze">
                {t("seating.noTiers")}
              </p>
            ) : (
              <div className="space-y-2">
                {tiers.map((tier, index) => (
                  <div
                    key={tier.id ?? `tier-${index}`}
                    className="space-y-2 rounded-lg border border-border bg-card p-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {t("seating.tierLayer", { n: String(index + 1) })}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => onRemoveTier(index)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                    <TextField
                      label={t("seating.tierName")}
                      value={tier.name}
                      onChange={(e) =>
                        onUpdateTier(index, { name: e.target.value })
                      }
                      required
                    />
                    <TextField
                      label={t("seating.seatCount")}
                      type="number"
                      min={1}
                      value={String(tier.seatCount)}
                      onChange={(e) =>
                        onUpdateTier(index, {
                          seatCount: Number(e.target.value) || 0,
                        })
                      }
                      dir="ltr"
                      className="text-left"
                      required
                    />
                    {tier.id && tier.assigned != null ? (
                      <p className="text-[10px] text-bronze">
                        {t("seating.tierStats", {
                          assigned: String(tier.assigned),
                          total: String(tier.seatCount),
                        })}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gold-dark">
              <LayoutTemplate className="size-4 shrink-0" />
              {t("seating.layoutType")}
            </h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
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
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-card p-3">
            <h4 className="text-sm font-semibold text-gold-dark">
              {t("seating.spacingTitle")}
            </h4>
            <p className="text-xs text-bronze/80">{t("seating.spacingHint")}</p>
            <SpacingSlider
              label={t("seating.horizontalSpacing")}
              value={hSpacing}
              min={SPACING_LIMITS.horizontal.min}
              max={SPACING_LIMITS.horizontal.max}
              step={SPACING_LIMITS.horizontal.step}
              onChange={(v) => patchConfig({ horizontalSpacing: v })}
            />
            <SpacingSlider
              label={t("seating.verticalSpacing")}
              value={vSpacing}
              min={SPACING_LIMITS.vertical.min}
              max={SPACING_LIMITS.vertical.max}
              step={SPACING_LIMITS.vertical.step}
              onChange={(v) => patchConfig({ verticalSpacing: v })}
            />
            <SpacingSlider
              label={t("seating.tierSpacing")}
              value={tierSpacing}
              min={SPACING_LIMITS.tier.min}
              max={SPACING_LIMITS.tier.max}
              step={SPACING_LIMITS.tier.step}
              onChange={(v) => patchConfig({ tierSpacing: v })}
            />
            <SpacingSlider
              label={t("seating.seatPadding")}
              value={seatPadding}
              min={SPACING_LIMITS.padding.min}
              max={SPACING_LIMITS.padding.max}
              step={SPACING_LIMITS.padding.step}
              onChange={(v) => patchConfig({ seatPadding: v })}
              formatValue={(v) => `${Math.round(v * 100)}%`}
            />
          </div>

          <div className="grid gap-3">
            <SelectField
              label={t("seating.stagePosition")}
              fieldKey="stagePosition"
              value={stagePosition}
              disabled={stageSelectDisabled}
              onChange={(e) =>
                patchConfig({
                  stagePosition: e.target.value as StagePosition,
                })
              }
              options={stagePositions.map((pos) => ({
                value: pos,
                label: t(`seating.stage.${pos}`),
              }))}
            />

            <TextField
              label={t("seating.stageLabel")}
              value={layoutConfig.stageLabel ?? DEFAULT_LAYOUT_CONFIG.stageLabel ?? ""}
              onChange={(e) =>
                patchConfig({ stageLabel: e.target.value })
              }
              placeholder={t("seating.stageLabelPlaceholder")}
            />

            {layoutType === "arena" ? (
              <SelectField
                label={t("seating.arenaArrangement")}
                fieldKey="arenaArrangement"
                value={arenaArrangement}
                onChange={(e) =>
                  patchConfig({
                    arenaArrangement: e.target.value as ArenaArrangement,
                  })
                }
                options={(["rings", "rows"] as const).map((mode) => ({
                  value: mode,
                  label: t(`seating.arenaArrangement.${mode}`),
                }))}
              />
            ) : null}

            {showSeatsPerRow ? (
              <TextField
                label={t("seating.seatsPerRow")}
                type="number"
                min={0}
                value={String(layoutConfig.seatsPerRow ?? 0)}
                onChange={(e) =>
                  patchConfig({
                    seatsPerRow: Number(e.target.value) || 0,
                  })
                }
                dir="ltr"
                className="text-left"
                placeholder="0 = auto"
              />
            ) : null}

            {layoutType === "classroom" ? (
              <CheckboxField
                label={t("seating.aisleCenter")}
                checked={Boolean(layoutConfig.aisleCenter)}
                onChange={(checked) =>
                  patchConfig({ aisleCenter: checked })
                }
              />
            ) : null}
          </div>

          <p className="text-xs text-bronze/80 lg:hidden">{t(layoutHintKey)}</p>
        </aside>

        <section className="flex min-h-0 min-h-[min(280px,52vh)] flex-col gap-2 lg:min-h-[min(400px,70vh)]">
          <h4 className="shrink-0 text-sm font-semibold text-gold-dark">
            {t("seating.layoutPreview")}
          </h4>

          <SeatingDesignerViewport className="min-h-[min(300px,55vh)] flex-1">
            {previewVenue ? (
              <SeatingVenueCanvas
                venue={previewVenue}
                fill
                showTierLabels
                designMode
                className="h-full w-full min-w-[min(100%,520px)]"
              />
            ) : (
              <div className="flex h-full min-h-[240px] w-full items-center justify-center rounded-xl border border-dashed border-border bg-card/50">
                <p className="px-4 text-center text-sm text-bronze">
                  {t("seating.layoutPreviewEmpty")}
                </p>
              </div>
            )}
          </SeatingDesignerViewport>

          <p className="hidden shrink-0 text-xs text-bronze/80 lg:block">
            {t(layoutHintKey)}
          </p>
        </section>
      </div>
    </div>
  );
}
