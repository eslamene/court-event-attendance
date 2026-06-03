"use client";

import { useMemo } from "react";
import {
  Circle,
  GraduationCap,
  Grid3x3,
  LayoutTemplate,
  Square,
  Theater,
  UtensilsCrossed,
} from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { SeatingVenueCanvas } from "@/components/admin/SeatingVenueCanvas";
import { SelectField, TextField } from "@/components/ui/Field";
import { CheckboxField } from "@/components/ui/Field";
import {
  computeVenueLayout,
  DEFAULT_LAYOUT_CONFIG,
  getStagePositionsForLayout,
  LAYOUT_TYPES,
  normalizeStagePositionForLayout,
  normalizeArenaArrangement,
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

type TierPreview = {
  id?: string;
  name: string;
  seatCount: number;
};

type Props = {
  layoutType: SeatingLayoutType;
  layoutConfig: SeatingLayoutConfig;
  tiers: TierPreview[];
  onLayoutTypeChange: (type: SeatingLayoutType) => void;
  onLayoutConfigChange: (config: SeatingLayoutConfig) => void;
  expandedPreview?: boolean;
};

function tiersToPreviewTiers(tiers: TierPreview[]): SeatingMapTier[] {
  return tiers.map((tier, index) => ({
    id: tier.id ?? `preview-${index}`,
    name: tier.name,
    seatCount: tier.seatCount,
    sortOrder: index + 1,
    assigned: 0,
    available: tier.seatCount,
    seats: Array.from({ length: tier.seatCount }, (_, i) => ({
      number: i + 1,
      status: "free" as const,
    })),
  }));
}

export function SeatingLayoutDesigner({
  layoutType,
  layoutConfig,
  tiers,
  onLayoutTypeChange,
  onLayoutConfigChange,
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
          "lg:grid-cols-[minmax(0,min(100%,20rem))_minmax(0,1fr)]",
          "xl:grid-cols-[minmax(0,min(100%,22rem))_minmax(0,1fr)]",
          expandedPreview && "h-full min-h-0"
        )}
      >
        {/* Controls — start side (right in RTL) */}
        <aside
          className={cn(
            "flex min-w-0 flex-col gap-4",
            "lg:max-h-[min(72vh,720px)] lg:overflow-y-auto lg:overscroll-contain lg:pe-1",
            expandedPreview && "lg:max-h-none lg:h-full"
          )}
        >
          <p className="text-sm text-bronze">{t("seating.layoutIntro")}</p>

          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gold-dark">
              <LayoutTemplate className="size-4 shrink-0" />
              {t("seating.layoutType")}
            </h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              {LAYOUT_TYPES.map((type) => {
                const Icon = layoutIcons[type];
                const active = layoutType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleLayoutTypeChange(type)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-colors sm:p-3",
                      active
                        ? "border-gold bg-gold/10 text-gold-dark shadow-sm"
                        : "border-border bg-card text-bronze hover:border-gold/40 hover:bg-[#faf8f5]"
                    )}
                  >
                    <Icon className="size-5 shrink-0" />
                    <span className="text-[11px] font-medium leading-tight sm:text-xs">
                      {t(`seating.layout.${type}`)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <SelectField
              label={t("seating.stagePosition")}
              fieldKey="stagePosition"
              value={stagePosition}
              disabled={stageSelectDisabled}
              onChange={(e) =>
                onLayoutConfigChange({
                  ...layoutConfig,
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
                onLayoutConfigChange({ ...layoutConfig, stageLabel: e.target.value })
              }
              placeholder={t("seating.stageLabelPlaceholder")}
            />

            {layoutType === "arena" ? (
              <SelectField
                label={t("seating.arenaArrangement")}
                fieldKey="arenaArrangement"
                value={arenaArrangement}
                onChange={(e) =>
                  onLayoutConfigChange({
                    ...layoutConfig,
                    arenaArrangement: e.target.value as ArenaArrangement,
                  })
                }
                options={(
                  ["rings", "rows"] as const
                ).map((mode) => ({
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
                  onLayoutConfigChange({
                    ...layoutConfig,
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
                  onLayoutConfigChange({ ...layoutConfig, aisleCenter: checked })
                }
              />
            ) : null}
          </div>

          <p className="text-xs text-bronze/80 lg:hidden">{t(layoutHintKey)}</p>
        </aside>

        {/* Preview — end side (left in RTL) */}
        <section
          className={cn(
            "flex min-h-0 min-h-[min(260px,50vh)] flex-col rounded-xl border border-border bg-[#faf8f5] p-3 sm:p-4",
            "lg:sticky lg:top-0 lg:self-stretch lg:min-h-[min(400px,65vh)]",
            expandedPreview && "lg:min-h-0 lg:h-full"
          )}
        >
          <h4 className="mb-2 shrink-0 text-sm font-semibold text-gold-dark">
            {t("seating.layoutPreview")}
          </h4>

          <div className="flex min-h-0 flex-1 flex-col">
            {previewVenue ? (
              <SeatingVenueCanvas
                venue={previewVenue}
                compact={!expandedPreview}
                fill
                showTierLabels
                className="min-h-0 flex-1"
              />
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-12">
                <p className="px-4 text-center text-sm text-bronze">
                  {t("seating.layoutPreviewEmpty")}
                </p>
              </div>
            )}
          </div>

          <p className="mt-2 hidden shrink-0 text-xs text-bronze/80 lg:block">
            {t(layoutHintKey)}
          </p>
        </section>
      </div>
    </div>
  );
}
