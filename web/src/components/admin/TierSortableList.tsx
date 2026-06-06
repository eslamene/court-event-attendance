"use client";

import { useState, type ReactNode } from "react";
import { GripVertical, Trash2 } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SortableTierItem = {
  id?: string;
  clientKey?: string;
};

type Props<T extends SortableTierItem> = {
  items: T[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (index: number) => void;
  renderItem: (item: T, index: number) => ReactNode;
  getItemKey: (item: T, index: number) => string;
  getPositionLabel?: (index: number, total: number) => string;
  compact?: boolean;
};

export function TierSortableList<T extends SortableTierItem>({
  items,
  onReorder,
  onRemove,
  renderItem,
  getItemKey,
  getPositionLabel,
  compact = false,
}: Props<T>) {
  const { t } = useI18n();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function handleDrop(targetIndex: number) {
    if (dragIndex == null || dragIndex === targetIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    onReorder(dragIndex, targetIndex);
    setDragIndex(null);
    setOverIndex(null);
  }

  return (
    <div className={cn(compact ? "space-y-1" : "space-y-2")}>
      {!compact ? (
        <p className="text-[11px] text-bronze/80">{t("seating.tierDragHint")}</p>
      ) : null}
      {items.map((item, index) => {
        const isDragging = dragIndex === index;
        const isOver = overIndex === index && dragIndex !== index;
        const positionLabel = getPositionLabel?.(index, items.length);

        return (
          <div
            key={getItemKey(item, index)}
            draggable
            onDragStart={(e) => {
              setDragIndex(index);
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", String(index));
            }}
            onDragEnd={() => {
              setDragIndex(null);
              setOverIndex(null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setOverIndex(index);
            }}
            onDragLeave={() => {
              if (overIndex === index) setOverIndex(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(index);
            }}
            className={cn(
              "rounded-lg border bg-card transition-shadow",
              isDragging && "opacity-50",
              isOver ? "border-gold ring-1 ring-gold/30" : "border-border",
              compact ? "shadow-none hover:border-gold/30" : "shadow-sm"
            )}
          >
            {compact ? (
              <div className="flex items-start gap-1.5 p-1.5">
                <button
                  type="button"
                  className="mt-1 flex shrink-0 cursor-grab touch-none items-center justify-center rounded p-0.5 text-bronze hover:bg-gold/10 hover:text-gold-dark active:cursor-grabbing"
                  aria-label={t("seating.tierDragHandle")}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <GripVertical className="size-3.5" />
                </button>
                <div className="min-w-0 flex-1 space-y-1">
                  {positionLabel ? (
                    <p className="truncate text-[10px] font-medium text-gold-dark/90">
                      <span className="text-bronze/70">
                        {t("seating.tierLayer", { n: String(index + 1) })}
                      </span>
                      {" · "}
                      {positionLabel}
                    </p>
                  ) : null}
                  {renderItem(item, index)}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0 text-destructive hover:text-destructive"
                  onClick={() => onRemove(index)}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-1 border-b border-border/60 bg-[#faf8f5]/80 px-1.5 py-1">
                  <button
                    type="button"
                    className="mt-0.5 flex shrink-0 cursor-grab touch-none items-center justify-center rounded p-1 text-bronze hover:bg-gold/10 hover:text-gold-dark active:cursor-grabbing"
                    aria-label={t("seating.tierDragHandle")}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <GripVertical className="size-4" />
                  </button>
                  <div className="min-w-0 flex-1 pt-0.5">
                    {positionLabel ? (
                      <p className="truncate text-[10px] font-medium text-gold-dark">
                        {t("seating.tierLayer", { n: String(index + 1) })}
                        {" · "}
                        {positionLabel}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => onRemove(index)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <div className="space-y-2 p-2.5">{renderItem(item, index)}</div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function reorderList<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  const result = [...list];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
}
