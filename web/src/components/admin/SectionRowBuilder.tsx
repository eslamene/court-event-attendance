"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Armchair,
  Check,
  GripVertical,
  Pencil,
  Plus,
  Rows3,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { SeatTierMetaInputs } from "@/components/admin/SeatTierMetaInputs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildSectionBandLayout,
  clearSectionPlacementPatch,
  DEFAULT_LAYOUT_CONFIG,
  getTierPlacement,
  ROW_LAYOUT_LIMITS,
  sectionSlotPlacementPatch,
  type RowAlignment,
  type SeatingLayoutConfig,
  type SectionBandTier,
  type StagePosition,
  type TierPlacement,
  tierPlacementKey,
} from "@/lib/seating-layout";
import { SEAT_TIER_LIMITS } from "@/lib/seating-limits";
import { cn } from "@/lib/utils";

const TIER_DRAG_MIME = "application/x-seat-tier-key";

type TierLike = {
  id?: string;
  clientKey?: string;
  name: string;
  seatCount: number;
  color: string;
  price: number | null;
};

type TierUpdatePatch = Partial<
  Pick<TierLike, "name" | "seatCount" | "color" | "price">
>;

type TierPlacementPatch = Pick<TierPlacement, "numberOfRows">;

type BuilderVariant = "compact" | "canvas";

type Props = {
  tiers: TierLike[];
  layoutConfig: SeatingLayoutConfig;
  stagePosition?: StagePosition;
  variant?: BuilderVariant;
  className?: string;
  onPatchTierPlacement: (
    tierKey: string,
    patch:
      | ReturnType<typeof sectionSlotPlacementPatch>
      | ReturnType<typeof clearSectionPlacementPatch>
  ) => void;
  onUpdateTier: (index: number, patch: TierUpdatePatch) => void;
  onAddTier: () => void;
  onAddTierToSlot?: (rowNumber: number, align: RowAlignment) => void;
};

const SLOT_ALIGNMENTS: RowAlignment[] = ["left", "center", "right"];

const SLOT_ICONS = {
  left: AlignLeft,
  center: AlignCenter,
  right: AlignRight,
} as const;

type OpenSlot = { rowNumber: number; align: RowAlignment };

function SectionStagePreview({
  variant = "compact",
  position,
  label,
}: {
  variant?: BuilderVariant;
  position: StagePosition;
  label: string;
}) {
  const isCanvas = variant === "canvas";
  const isVertical = position === "left" || position === "right";

  return (
    <div
      className={cn(
        "shrink-0 rounded-xl border border-gold/25",
        isVertical
          ? cn(
              "flex items-stretch justify-center bg-gradient-to-r from-gold/10 to-transparent",
              position === "right" && "bg-gradient-to-l from-gold/10 to-transparent",
              isCanvas ? "w-14 px-1.5 py-4 md:w-16" : "w-10 px-1 py-2"
            )
          : cn(
              "bg-gradient-to-b from-gold/10 to-transparent",
              position === "bottom" && "bg-gradient-to-t from-gold/10 to-transparent",
              isCanvas ? "px-6 py-4" : "p-2"
            )
      )}
      aria-hidden
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-gold/35 bg-gold/15 font-semibold uppercase tracking-wide text-gold-dark shadow-sm",
          isVertical
            ? cn(
                "min-h-[5rem] flex-1 [writing-mode:vertical-rl]",
                isCanvas ? "px-2 text-xs" : "px-1 text-[9px]"
              )
            : cn(
                "mx-auto w-full max-w-xl",
                isCanvas ? "h-10 text-sm" : "h-5 max-w-[70%] text-[9px]"
              )
        )}
      >
        {label}
      </div>
    </div>
  );
}

export function SectionRowBuilder({
  tiers,
  layoutConfig,
  stagePosition: stagePositionProp,
  variant = "compact",
  className,
  onPatchTierPlacement,
  onUpdateTier,
  onAddTier,
  onAddTierToSlot,
}: Props) {
  const isCanvas = variant === "canvas";
  const { t } = useI18n();
  const stagePosition =
    stagePositionProp ?? layoutConfig.stagePosition ?? "top";
  const stageLabel =
    layoutConfig.stageLabel?.trim() ||
    DEFAULT_LAYOUT_CONFIG.stageLabel ||
    t("seating.stageLabelShort");
  const stageOnSide =
    stagePosition === "left" || stagePosition === "right";
  const [extraRows, setExtraRows] = useState(0);
  const [openSlot, setOpenSlot] = useState<OpenSlot | null>(null);
  const [editingTierKey, setEditingTierKey] = useState<string | null>(null);
  const [dragTierKey, setDragTierKey] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<OpenSlot | null>(null);

  const minRows = 1 + extraRows;

  const { bands, unassigned } = useMemo(
    () => buildSectionBandLayout(tiers, layoutConfig, minRows),
    [tiers, layoutConfig, minRows]
  );

  const tierKeys = tiers.map((tier, index) => tierPlacementKey(tier, index));

  function assignTier(
    tierKey: string,
    rowNumber: number,
    align: RowAlignment
  ) {
    onPatchTierPlacement(tierKey, sectionSlotPlacementPatch(rowNumber, align));
    setOpenSlot(null);
    setDropTarget(null);
    setDragTierKey(null);
  }

  function unassignTier(tierKey: string) {
    onPatchTierPlacement(tierKey, clearSectionPlacementPatch());
    if (editingTierKey === tierKey) setEditingTierKey(null);
  }

  function isRowEmpty(band: (typeof bands)[number]) {
    return (
      band.left.length === 0 &&
      band.center.length === 0 &&
      band.right.length === 0
    );
  }

  function removeRow(rowNumber: number) {
    const band = bands.find((b) => b.rowNumber === rowNumber);
    const last = bands[bands.length - 1];
    if (!band || !last || last.rowNumber !== rowNumber || !isRowEmpty(band)) {
      return;
    }
    if (bands.length <= 1) return;
    setExtraRows((value) => Math.max(0, value - 1));
  }

  function rowDeleteBlockedReason(
    band: (typeof bands)[number]
  ): string | null {
    if (bands.length <= 1) return t("seating.removeSectionRowBlockedMin");
    if (!isRowEmpty(band)) return t("seating.removeSectionRowBlockedTier");
    if (band.rowNumber !== bands[bands.length - 1]?.rowNumber) {
      return t("seating.removeSectionRowBlockedNotLast");
    }
    return null;
  }

  function handleSlotDrop(rowNumber: number, align: RowAlignment) {
    if (!dragTierKey) return;
    assignTier(dragTierKey, rowNumber, align);
  }

  return (
    <div
      className={cn(
        isCanvas
          ? "flex h-full min-h-0 flex-col gap-4 rounded-xl border border-border bg-[#f3efe8] p-4 md:p-6"
          : "space-y-2",
        className
      )}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-2",
          isCanvas ? "justify-between" : "justify-between"
        )}
      >
        <p
          className={cn(
            "leading-snug text-bronze/75",
            isCanvas ? "text-xs" : "text-[9px]"
          )}
        >
          {t("seating.sectionRowInteractHint")}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "gap-1",
            isCanvas ? "h-8 px-3 text-xs" : "h-7 px-2 text-[10px]"
          )}
          onClick={() => setExtraRows((value) => value + 1)}
        >
          <Plus className={isCanvas ? "size-3.5" : "size-3"} aria-hidden />
          {t("seating.addSectionRow")}
        </Button>
      </div>

      <div
        className={cn(
          "flex gap-4",
          isCanvas && "min-h-0 flex-1",
          stageOnSide
            ? isCanvas
              ? "flex-col md:flex-row md:items-stretch"
              : "flex-row items-stretch"
            : "flex-col"
        )}
      >
        {stagePosition === "top" || stagePosition === "left" ? (
          <SectionStagePreview
            variant={variant}
            position={stagePosition}
            label={stageLabel}
          />
        ) : null}

        <div
          className={cn(
            isCanvas
              ? "min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1"
              : "space-y-2"
          )}
        >
          {bands.map((band) => (
            <SectionBandRow
              key={band.rowNumber}
              variant={variant}
              band={band}
              canDelete={rowDeleteBlockedReason(band) == null}
              deleteBlockedReason={rowDeleteBlockedReason(band)}
              openSlot={openSlot}
              editingTierKey={editingTierKey}
              dragTierKey={dragTierKey}
              dropTarget={dropTarget}
              tierKeys={tierKeys}
              tiers={tiers}
              onOpenSlot={setOpenSlot}
              onCloseSlot={() => setOpenSlot(null)}
              onAssignTier={assignTier}
              onUnassignTier={unassignTier}
              layoutConfig={layoutConfig}
              onUpdateTier={onUpdateTier}
              onPatchTierPlacement={onPatchTierPlacement}
              onEditTier={setEditingTierKey}
              onCloseEdit={() => setEditingTierKey(null)}
              onDragStart={(tierKey) => {
                setDragTierKey(tierKey);
                setEditingTierKey(null);
                setOpenSlot(null);
              }}
              onDragEnd={() => {
                setDragTierKey(null);
                setDropTarget(null);
              }}
              onDropTarget={setDropTarget}
              onSlotDrop={handleSlotDrop}
              onAddTier={onAddTier}
              onAddTierToSlot={onAddTierToSlot}
              onRemoveRow={() => removeRow(band.rowNumber)}
            />
          ))}
        </div>

        {stagePosition === "bottom" || stagePosition === "right" ? (
          <SectionStagePreview
            variant={variant}
            position={stagePosition}
            label={stageLabel}
          />
        ) : null}
      </div>

      <UnassignedTierPool
        variant={variant}
        items={unassigned}
        tiers={tiers}
        editingTierKey={editingTierKey}
        dragTierKey={dragTierKey}
        isDropTarget={dropTarget?.rowNumber === 0}
        onEditTier={setEditingTierKey}
        onCloseEdit={() => setEditingTierKey(null)}
        layoutConfig={layoutConfig}
        onUpdateTier={onUpdateTier}
        onPatchTierPlacement={onPatchTierPlacement}
        onUnassignTier={unassignTier}
        onDragStart={(tierKey) => {
          setDragTierKey(tierKey);
          setEditingTierKey(null);
          setOpenSlot(null);
        }}
        onDragEnd={() => {
          setDragTierKey(null);
          setDropTarget(null);
        }}
        onDragOver={() => setDropTarget({ rowNumber: 0, align: "center" })}
        onDragLeave={() => {
          if (dropTarget?.rowNumber === 0) setDropTarget(null);
        }}
        onDrop={(tierKey) => {
          if (tierKey) unassignTier(tierKey);
          setDropTarget(null);
          setDragTierKey(null);
        }}
      />
    </div>
  );
}

function UnassignedTierPool({
  variant = "compact",
  items,
  tiers,
  editingTierKey,
  dragTierKey,
  isDropTarget,
  onEditTier,
  onCloseEdit,
  layoutConfig,
  onUpdateTier,
  onPatchTierPlacement,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  variant?: BuilderVariant;
  items: SectionBandTier[];
  tiers: TierLike[];
  editingTierKey: string | null;
  dragTierKey: string | null;
  isDropTarget: boolean;
  onEditTier: (tierKey: string | null) => void;
  onCloseEdit: () => void;
  layoutConfig: SeatingLayoutConfig;
  onUpdateTier: (index: number, patch: TierUpdatePatch) => void;
  onPatchTierPlacement: (
    tierKey: string,
    patch: TierPlacementPatch
  ) => void;
  onUnassignTier: (tierKey: string) => void;
  onDragStart: (tierKey: string) => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: (tierKey: string | null) => void;
}) {
  const { t } = useI18n();
  const isCanvas = variant === "canvas";

  if (items.length === 0 && !dragTierKey) return null;

  return (
    <div
      onDragOverCapture={(e) => {
        if (!dragTierKey) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        onDragOver();
      }}
      onDragLeave={onDragLeave}
      onDropCapture={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const key = e.dataTransfer.getData(TIER_DRAG_MIME) || dragTierKey;
        onDrop(key || null);
      }}
      className={cn(
        "shrink-0 rounded-xl border border-dashed transition-colors",
        isCanvas ? "p-3 md:p-4" : "p-2",
        isDropTarget
          ? "border-gold bg-gold/10"
          : "border-border/80 bg-card/80"
      )}
    >
      <p
        className={cn(
          "mb-2 font-medium text-bronze",
          isCanvas ? "text-xs" : "text-[9px]"
        )}
      >
        {t("seating.unassignedTiers")}
      </p>
      {items.length === 0 ? (
        <p className="text-[10px] text-bronze/60">{t("seating.dropTierHere")}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <div
              key={item.tierKey}
              className={cn(isCanvas ? "min-w-[10rem]" : "min-w-[8rem]")}
            >
              <TierChip
                variant={variant}
                item={item}
                tier={tiers[item.tierIndex]}
                isDragging={dragTierKey === item.tierKey}
                isEditing={editingTierKey === item.tierKey}
                onEdit={() =>
                  onEditTier(
                    editingTierKey === item.tierKey ? null : item.tierKey
                  )
                }
                onCloseEdit={onCloseEdit}
                layoutConfig={layoutConfig}
                onUpdate={(patch, placementPatch) => {
                  onUpdateTier(item.tierIndex, patch);
                  if (placementPatch) {
                    onPatchTierPlacement(item.tierKey, placementPatch);
                  }
                }}
                onRemove={() => {}}
                onDragStart={() => onDragStart(item.tierKey)}
                onDragEnd={onDragEnd}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionBandRow({
  variant = "compact",
  band,
  canDelete,
  openSlot,
  editingTierKey,
  dragTierKey,
  dropTarget,
  tierKeys,
  tiers,
  onOpenSlot,
  onCloseSlot,
  onAssignTier,
  onUnassignTier,
  layoutConfig,
  onUpdateTier,
  onPatchTierPlacement,
  onEditTier,
  onCloseEdit,
  onDragStart,
  onDragEnd,
  onDropTarget,
  onSlotDrop,
  onAddTier,
  onAddTierToSlot,
  onRemoveRow,
  deleteBlockedReason,
}: {
  variant?: BuilderVariant;
  band: ReturnType<typeof buildSectionBandLayout>["bands"][number];
  canDelete: boolean;
  deleteBlockedReason: string | null;
  openSlot: OpenSlot | null;
  editingTierKey: string | null;
  dragTierKey: string | null;
  dropTarget: OpenSlot | null;
  tierKeys: string[];
  tiers: TierLike[];
  layoutConfig: SeatingLayoutConfig;
  onOpenSlot: (slot: OpenSlot) => void;
  onCloseSlot: () => void;
  onAssignTier: (
    tierKey: string,
    rowNumber: number,
    align: RowAlignment
  ) => void;
  onUnassignTier: (tierKey: string) => void;
  onUpdateTier: (index: number, patch: TierUpdatePatch) => void;
  onPatchTierPlacement: (
    tierKey: string,
    patch: TierPlacementPatch
  ) => void;
  onEditTier: (tierKey: string | null) => void;
  onCloseEdit: () => void;
  onDragStart: (tierKey: string) => void;
  onDragEnd: () => void;
  onDropTarget: (slot: OpenSlot | null) => void;
  onSlotDrop: (rowNumber: number, align: RowAlignment) => void;
  onAddTier: () => void;
  onAddTierToSlot?: (rowNumber: number, align: RowAlignment) => void;
  onRemoveRow: () => void;
}) {
  const { t } = useI18n();
  const isCanvas = variant === "canvas";

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-sm",
        isCanvas ? "p-3 md:p-4" : "p-1.5"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-1",
          isCanvas ? "mb-3 px-1" : "mb-1.5 px-0.5"
        )}
      >
        <span
          className={cn(
            "inline-flex items-center gap-1.5 font-semibold text-bronze",
            isCanvas ? "text-sm" : "text-[9px]"
          )}
          title={t("seating.sectionRowN", { n: String(band.rowNumber) })}
        >
          <Rows3
            className={cn("text-gold-dark", isCanvas ? "size-4" : "size-3")}
            aria-hidden
          />
          {t("seating.sectionRowN", { n: String(band.rowNumber) })}
        </span>
        <button
          type="button"
          onClick={onRemoveRow}
          disabled={!canDelete}
          className={cn(
            "rounded p-0.5",
            canDelete
              ? "text-bronze/50 hover:bg-destructive/10 hover:text-destructive"
              : "cursor-not-allowed text-bronze/25"
          )}
          title={
            canDelete
              ? t("seating.removeSectionRow")
              : (deleteBlockedReason ?? t("seating.removeSectionRow"))
          }
          aria-label={t("seating.removeSectionRow")}
        >
          <Trash2 className={isCanvas ? "size-3.5" : "size-3"} aria-hidden />
        </button>
      </div>

      <div
        className={cn(
          "grid grid-cols-3",
          isCanvas ? "gap-3 md:gap-4" : "gap-1.5"
        )}
      >
        {SLOT_ALIGNMENTS.map((align) => {
          const SlotIcon = SLOT_ICONS[align];
          const items = band[align];
          const slotOpen =
            openSlot?.rowNumber === band.rowNumber && openSlot.align === align;
          const isDropTarget =
            dropTarget?.rowNumber === band.rowNumber &&
            dropTarget.align === align;

          return (
            <div
              key={align}
              onDragOverCapture={(e) => {
                if (!dragTierKey) return;
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = "move";
                onDropTarget({ rowNumber: band.rowNumber, align });
              }}
              onDragLeave={(e) => {
                if (
                  e.currentTarget.contains(e.relatedTarget as Node | null)
                ) {
                  return;
                }
                if (
                  dropTarget?.rowNumber === band.rowNumber &&
                  dropTarget.align === align
                ) {
                  onDropTarget(null);
                }
              }}
              onDropCapture={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const key =
                  e.dataTransfer.getData(TIER_DRAG_MIME) || dragTierKey;
                if (key) onSlotDrop(band.rowNumber, align);
              }}
              className={cn(
                "flex flex-col rounded-lg border border-dashed transition-colors",
                isCanvas
                  ? "min-h-[8rem] gap-2 p-2 md:min-h-[9rem] md:p-3"
                  : "min-h-[5rem] gap-1 p-1",
                isDropTarget
                  ? "border-gold bg-gold/15 ring-2 ring-gold/25"
                  : "border-border/80 bg-[#faf8f5]/90",
                dragTierKey && "relative z-10"
              )}
            >
              <div
                className="flex flex-col items-center justify-center gap-0.5 text-bronze/60"
                title={t(`seating.rowAlign.${align}`)}
              >
                <SlotIcon
                  className={isCanvas ? "size-5" : "size-3"}
                  aria-hidden
                />
                {isCanvas ? (
                  <span className="text-[10px] font-medium uppercase tracking-wide">
                    {t(`seating.rowAlign.${align}`)}
                  </span>
                ) : null}
              </div>

              {items.map((item) => (
                <TierChip
                  key={item.tierKey}
                  variant={variant}
                  item={item}
                  tier={tiers[item.tierIndex]}
                  isDragging={dragTierKey === item.tierKey}
                  isEditing={editingTierKey === item.tierKey}
                  onEdit={() =>
                    onEditTier(
                      editingTierKey === item.tierKey ? null : item.tierKey
                    )
                  }
                  onCloseEdit={onCloseEdit}
                  layoutConfig={layoutConfig}
                  onUpdate={(patch, placementPatch) => {
                    onUpdateTier(item.tierIndex, patch);
                    if (placementPatch) {
                      onPatchTierPlacement(item.tierKey, placementPatch);
                    }
                  }}
                  onRemove={() => onUnassignTier(item.tierKey)}
                  onDragStart={() => onDragStart(item.tierKey)}
                  onDragEnd={onDragEnd}
                />
              ))}

              {items.length === 0 && isDropTarget ? (
                <p
                  className={cn(
                    "py-2 text-center text-gold-dark",
                    isCanvas ? "text-xs" : "text-[8px]"
                  )}
                >
                  {t("seating.dropTierHere")}
                </p>
              ) : null}

              <div className="relative mt-auto">
                <button
                  type="button"
                  onClick={() =>
                    slotOpen
                      ? onCloseSlot()
                      : onOpenSlot({ rowNumber: band.rowNumber, align })
                  }
                  className={cn(
                    "flex w-full items-center justify-center gap-1 rounded-md border border-dashed transition-colors",
                    isCanvas ? "py-2 text-xs" : "py-1 text-[9px]",
                    slotOpen
                      ? "border-gold bg-gold/10 text-gold-dark"
                      : "border-border/70 text-bronze/60 hover:border-gold/40 hover:bg-gold/5 hover:text-gold-dark"
                  )}
                  title={t("seating.addTierToSlot")}
                  aria-expanded={slotOpen}
                >
                  <Plus
                    className={isCanvas ? "size-4" : "size-3"}
                    aria-hidden
                  />
                  {isCanvas ? (
                    <span>{t("seating.addTierToSlot")}</span>
                  ) : null}
                </button>

                {slotOpen ? (
                  <TierSlotMenu
                    variant={variant}
                    tiers={tiers}
                    tierKeys={tierKeys}
                    onSelect={(tierKey) =>
                      onAssignTier(tierKey, band.rowNumber, align)
                    }
                    onCreate={() => {
                      if (onAddTierToSlot) {
                        onAddTierToSlot(band.rowNumber, align);
                      } else {
                        onAddTier();
                      }
                      onCloseSlot();
                    }}
                    onClose={onCloseSlot}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TierChip({
  variant = "compact",
  item,
  tier,
  isDragging,
  isEditing,
  onEdit,
  onCloseEdit,
  layoutConfig,
  onUpdate,
  onRemove,
  onDragStart,
  onDragEnd,
}: {
  variant?: BuilderVariant;
  item: SectionBandTier;
  tier: TierLike | undefined;
  isDragging: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onCloseEdit: () => void;
  layoutConfig: SeatingLayoutConfig;
  onUpdate: (
    patch: TierUpdatePatch,
    placementPatch?: TierPlacementPatch
  ) => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const { t } = useI18n();
  const isCanvas = variant === "canvas";
  const panelRef = useRef<HTMLDivElement>(null);
  const placement = getTierPlacement(layoutConfig, item.tierKey);
  const numberOfRows = placement.numberOfRows ?? 0;
  const numberOfRowsMax = tier
    ? Math.min(
        ROW_LAYOUT_LIMITS.numberOfRows.max,
        Math.max(4, tier.seatCount)
      )
    : ROW_LAYOUT_LIMITS.numberOfRows.max;

  useEffect(() => {
    if (!isEditing) return;
    function onPointerDown(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        onCloseEdit();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [isEditing, onCloseEdit]);

  if (!tier) return null;

  return (
    <div className="relative">
      <div
        className={cn(
          "group flex items-center rounded-lg border bg-card shadow-xs transition-opacity",
          isCanvas ? "gap-1 px-1 py-1.5" : "gap-0.5 px-0.5 py-0.5",
          isDragging && "opacity-40",
          isEditing
            ? "border-gold ring-1 ring-gold/30"
            : "border-border hover:border-gold/40"
        )}
      >
        <span
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            onDragStart();
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData(TIER_DRAG_MIME, item.tierKey);
            e.dataTransfer.setData("text/plain", item.tierKey);
          }}
          onDragEnd={(e) => {
            e.stopPropagation();
            onDragEnd();
          }}
          className="flex cursor-grab rounded p-0.5 text-bronze/40 hover:bg-muted hover:text-bronze active:cursor-grabbing"
          title={t("seating.dragTier")}
          role="button"
          aria-label={t("seating.dragTier")}
        >
          <GripVertical
            className={isCanvas ? "size-4" : "size-3"}
            aria-hidden
          />
        </span>

        <button
          type="button"
          onClick={onEdit}
          className={cn(
            "flex min-w-0 flex-1 items-center rounded text-start hover:bg-gold/5",
            isCanvas ? "gap-2 px-1 py-1" : "gap-1 px-0.5 py-0.5"
          )}
          title={t("seating.editTier")}
        >
          <span
            className={cn(
              "shrink-0 rounded-full border border-black/10",
              isCanvas ? "size-4" : "size-3"
            )}
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          <span
            className={cn(
              "min-w-0 flex-1 truncate font-medium text-foreground",
              isCanvas ? "text-sm" : "text-[9px]"
            )}
          >
            {item.name || "—"}
          </span>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-0.5 tabular-nums text-bronze/70",
              isCanvas ? "text-xs" : "text-[8px]"
            )}
            title={t("seating.seatCount")}
          >
            <Armchair
              className={isCanvas ? "size-3.5" : "size-2.5"}
              aria-hidden
            />
            {item.seatCount}
          </span>
          <Pencil
            className={cn(
              "shrink-0 text-bronze/40 opacity-0 transition-opacity group-hover:opacity-100",
              isCanvas ? "size-3.5" : "size-2.5"
            )}
          />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="rounded p-0.5 text-bronze/40 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-destructive"
          title={t("seating.removeTierFromRow")}
          aria-label={t("seating.removeTierFromRow")}
        >
          <X className="size-2.5" aria-hidden />
        </button>
      </div>

      {isEditing ? (
        <TierEditPanel
          ref={panelRef}
          variant={variant}
          tier={tier}
          numberOfRows={numberOfRows}
          numberOfRowsMax={numberOfRowsMax}
          onApply={(tierPatch, placementPatch) =>
            onUpdate(tierPatch, placementPatch)
          }
          onClose={onCloseEdit}
        />
      ) : null}
    </div>
  );
}

function MenuFooter({
  variant = "compact",
  onCancel,
  onApply,
  applyDisabled = false,
}: {
  variant?: BuilderVariant;
  onCancel: () => void;
  onApply: () => void;
  applyDisabled?: boolean;
}) {
  const { t } = useI18n();
  const isCanvas = variant === "canvas";

  return (
    <div
      className={cn(
        "flex gap-2 border-t border-border",
        isCanvas ? "p-3 pt-2" : "p-2 pt-1.5"
      )}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onCancel}
        className={cn("flex-1", isCanvas ? "h-8 text-xs" : "h-7 text-[10px]")}
      >
        {t("admin.common.cancel")}
      </Button>
      <Button
        type="button"
        size="sm"
        onClick={onApply}
        disabled={applyDisabled}
        className={cn(
          "flex-1 bg-gold-dark text-white hover:bg-gold-dark/90",
          isCanvas ? "h-8 text-xs" : "h-7 text-[10px]"
        )}
      >
        {t("admin.common.apply")}
      </Button>
    </div>
  );
}

type TierEditDraft = TierUpdatePatch & { numberOfRows: number };

const TierEditPanel = forwardRef<
  HTMLDivElement,
  {
    variant?: BuilderVariant;
    tier: TierLike;
    numberOfRows: number;
    numberOfRowsMax: number;
    onApply: (
      patch: TierUpdatePatch,
      placementPatch?: TierPlacementPatch
    ) => void;
    onClose: () => void;
  }
>(function TierEditPanel(
  {
    variant = "compact",
    tier,
    numberOfRows,
    numberOfRowsMax,
    onApply,
    onClose,
  },
  ref
) {
  const { t } = useI18n();
  const isCanvas = variant === "canvas";
  const [draft, setDraft] = useState<TierEditDraft>({
    name: tier.name,
    seatCount: tier.seatCount,
    color: tier.color,
    price: tier.price,
    numberOfRows,
  });

  useEffect(() => {
    setDraft({
      name: tier.name,
      seatCount: tier.seatCount,
      color: tier.color,
      price: tier.price,
      numberOfRows,
    });
  }, [tier, numberOfRows]);

  function handleApply() {
    const placementPatch: TierPlacementPatch = {
      numberOfRows:
        draft.numberOfRows > 0 ? draft.numberOfRows : undefined,
    };
    onApply(
      {
        name: draft.name ?? tier.name,
        seatCount: draft.seatCount ?? tier.seatCount,
        color: draft.color ?? tier.color,
        price: draft.price ?? tier.price,
      },
      placementPatch
    );
    onClose();
  }

  const numberOfRowsAuto = (draft.numberOfRows ?? 0) <= 0;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-40 overflow-hidden rounded-xl border border-gold/40 bg-card shadow-xl",
        isCanvas
          ? "start-0 top-full mt-2 w-[min(100%,16rem)]"
          : "inset-x-0 top-full mt-1"
      )}
      role="dialog"
      aria-label={t("seating.editTier")}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-1 border-b border-border bg-[#faf8f5]",
          isCanvas ? "px-3 py-2" : "mb-0 px-2 py-1.5"
        )}
      >
        <span
          className={cn(
            "font-semibold text-gold-dark",
            isCanvas ? "text-xs" : "text-[9px]"
          )}
        >
          {t("seating.editTier")}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-bronze/60 hover:text-foreground"
          aria-label={t("admin.common.cancel")}
        >
          <X className="size-3" aria-hidden />
        </button>
      </div>

      <div className={cn(isCanvas ? "space-y-3 p-3" : "space-y-2 p-2")}>
        <label className="block space-y-1">
          <span
            className={cn(
              "flex items-center gap-1 font-medium text-bronze/80",
              isCanvas ? "text-xs" : "text-[8px]"
            )}
          >
            <Tag className={isCanvas ? "size-3.5" : "size-2.5"} aria-hidden />
            {t("seating.tierName")}
          </span>
          <Input
            value={draft.name ?? ""}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, name: e.target.value }))
            }
            className={cn("px-2", isCanvas ? "h-9 text-sm" : "h-7 text-xs")}
            aria-label={t("seating.tierName")}
          />
        </label>

        <label className="block space-y-1">
          <span
            className={cn(
              "flex items-center gap-1 font-medium text-bronze/80",
              isCanvas ? "text-xs" : "text-[8px]"
            )}
          >
            <Armchair
              className={isCanvas ? "size-3.5" : "size-2.5"}
              aria-hidden
            />
            {t("seating.seatCount")}
          </span>
          <Input
            type="number"
            min={SEAT_TIER_LIMITS.seatsPerTier.min}
            max={SEAT_TIER_LIMITS.seatsPerTier.max}
            value={String(draft.seatCount ?? 0)}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                seatCount: Number(e.target.value) || 0,
              }))
            }
            dir="ltr"
            className={cn(
              "px-2 text-left",
              isCanvas ? "h-9 text-sm" : "h-7 text-xs"
            )}
            aria-label={t("seating.seatCount")}
          />
        </label>

        <SeatTierMetaInputs
          color={draft.color ?? tier.color}
          price={draft.price ?? tier.price}
          onColorChange={(color) => setDraft((prev) => ({ ...prev, color }))}
          onPriceChange={(price) => setDraft((prev) => ({ ...prev, price }))}
          className="border-0 bg-transparent p-0"
        />

        {(draft.seatCount ?? tier.seatCount) > 0 ? (
          <label className="block space-y-1">
            <span
              className={cn(
                "flex items-center gap-1 font-medium text-bronze/80",
                isCanvas ? "text-xs" : "text-[8px]"
              )}
            >
              <Rows3
                className={isCanvas ? "size-3.5" : "size-2.5"}
                aria-hidden
              />
              {t("seating.numberOfRows")}
            </span>
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={numberOfRowsMax}
                value={numberOfRowsAuto ? "" : String(draft.numberOfRows)}
                placeholder={t("seating.autoLayout")}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  setDraft((prev) => ({
                    ...prev,
                    numberOfRows: raw === "" ? 0 : Number(raw) || 0,
                  }));
                }}
                dir="ltr"
                className={cn(
                  "px-2 text-left",
                  isCanvas ? "h-9 text-sm" : "h-7 text-xs",
                  !numberOfRowsAuto && "pe-8"
                )}
                aria-label={t("seating.numberOfRows")}
              />
              {numberOfRowsAuto ? (
                <span
                  className="pointer-events-none absolute inset-y-0 end-2 flex items-center text-gold-dark/80"
                  title={t("seating.autoLayout")}
                  aria-hidden
                >
                  <SlidersHorizontal
                    className={isCanvas ? "size-3.5" : "size-3"}
                  />
                </span>
              ) : null}
            </div>
          </label>
        ) : null}
      </div>

      <MenuFooter
        variant={variant}
        onCancel={onClose}
        onApply={handleApply}
      />
    </div>
  );
});

function TierSlotMenu({
  variant = "compact",
  tiers,
  tierKeys,
  onSelect,
  onCreate,
  onClose,
}: {
  variant?: BuilderVariant;
  tiers: TierLike[];
  tierKeys: string[];
  onSelect: (tierKey: string) => void;
  onCreate: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const isCanvas = variant === "canvas";
  const candidates = tiers
    .map((tier, index) => ({ tier, tierKey: tierKeys[index] }))
    .filter(({ tier }) => tier.seatCount > 0);
  const [selectedKey, setSelectedKey] = useState<string | null>(
    candidates[0]?.tierKey ?? null
  );

  function handleApply() {
    if (!selectedKey) return;
    onSelect(selectedKey);
  }

  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-full z-50 mb-1 overflow-hidden rounded-xl border border-border bg-card shadow-xl",
        isCanvas && "min-w-[12rem]"
      )}
      role="dialog"
      aria-label={t("seating.pickTierForSlot")}
    >
      <div
        className={cn(
          "flex items-center justify-between border-b border-border bg-[#faf8f5]",
          isCanvas ? "px-3 py-2" : "px-2 py-1"
        )}
      >
        <span
          className={cn(
            "font-medium text-gold-dark",
            isCanvas ? "text-xs" : "text-[9px]"
          )}
        >
          {t("seating.pickTierForSlot")}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-bronze/60 hover:text-foreground"
          aria-label={t("admin.common.cancel")}
        >
          <X className="size-3" aria-hidden />
        </button>
      </div>
      <div
        className={cn(
          "overflow-y-auto p-1",
          isCanvas ? "max-h-48" : "max-h-36"
        )}
      >
        {candidates.length === 0 ? (
          <p className="px-2 py-2 text-center text-[9px] text-bronze">
            {t("seating.noTiers")}
          </p>
        ) : (
          candidates.map(({ tier, tierKey }) => {
            const selected = selectedKey === tierKey;
            return (
              <button
                key={tierKey}
                type="button"
                onClick={() => setSelectedKey(tierKey)}
                aria-pressed={selected}
                className={cn(
                  "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-start transition-colors",
                  isCanvas ? "text-sm" : "text-[10px]",
                  selected
                    ? "bg-gold/15 text-gold-dark ring-1 ring-gold/30"
                    : "hover:bg-gold/10"
                )}
              >
                <span
                  className="size-3 shrink-0 rounded-full border border-black/10"
                  style={{ backgroundColor: tier.color }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {tier.name || "—"}
                </span>
                <Armchair
                  className="size-2.5 shrink-0 text-bronze/60"
                  aria-hidden
                />
                <span className="text-[9px] tabular-nums text-bronze">
                  {tier.seatCount}
                </span>
                {selected ? (
                  <Check className="size-3 shrink-0 text-gold-dark" />
                ) : null}
              </button>
            );
          })
        )}
      </div>
      <button
        type="button"
        onClick={onCreate}
        className={cn(
          "flex w-full items-center gap-1.5 border-t border-border px-2 py-2 font-medium text-gold-dark hover:bg-gold/5",
          isCanvas ? "text-xs" : "text-[10px]"
        )}
      >
        <Sparkles className="size-3.5 shrink-0" aria-hidden />
        {t("seating.addTierToSlotNew")}
      </button>
      <MenuFooter
        variant={variant}
        onCancel={onClose}
        onApply={handleApply}
        applyDisabled={!selectedKey}
      />
    </div>
  );
}
