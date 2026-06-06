"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Armchair, LayoutGrid, LayoutTemplate, Plus, Save, Trash2 } from "lucide-react";
import { IconTabBar } from "@/components/ui/icon-tabs";
import { EventSeatingMap } from "@/components/admin/EventSeatingMap";
import { SeatingLayoutDesigner } from "@/components/admin/SeatingLayoutDesigner";
import { useI18n } from "@/components/I18nProvider";
import { useFeedback } from "@/components/ui/FeedbackProvider";
import { Modal } from "@/components/ui/Modal";
import { CheckboxField } from "@/components/ui/Field";
import {
  CancelFormButton,
  PrimaryFormButton,
} from "@/components/ui/FormActions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DEFAULT_LAYOUT_CONFIG,
  coerceLayoutConfig,
  normalizeLayoutType,
  normalizeStagePositionForLayout,
  type SeatingLayoutConfig,
  type SeatingLayoutType,
} from "@/lib/seating-layout";
import { reorderList } from "@/components/admin/TierSortableList";
import {
  findDuplicateTierNames,
  suggestUniqueTierName,
  tierNameKey,
} from "@/lib/seating-tier-names";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";

async function readJsonResponse(res: Response): Promise<Record<string, unknown> | null> {
  const text = await res.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

type TierRow = {
  id?: string;
  clientKey?: string;
  name: string;
  seatCount: number;
  assigned?: number;
  available?: number;
};

type Props = {
  eventId: string;
  eventName: string;
  onClose: () => void;
  initialTab?: "settings" | "layout" | "map";
};

export function EventSeatingEditor({
  eventId,
  eventName,
  onClose,
  initialTab = "settings",
}: Props) {
  const { t } = useI18n();
  const { toastSuccess, toastError } = useFeedback();
  const [tab, setTab] = useState<"settings" | "layout" | "map">(initialTab);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seatingEnabled, setSeatingEnabled] = useState(false);
  const [layoutType, setLayoutType] = useState<SeatingLayoutType>("theater");
  const [layoutConfig, setLayoutConfig] = useState<SeatingLayoutConfig>({
    ...DEFAULT_LAYOUT_CONFIG,
  });
  const [tiers, setTiers] = useState<TierRow[]>([]);
  const isDesignMode = tab === "layout";

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/seating`);
      const data = await readJsonResponse(res);
      if (!data) {
        toastError(t("seating.loadFailed"));
        return;
      }
      if (!res.ok) {
        toastError(String(data.error || t("seating.loadFailed")));
        return;
      }
      setSeatingEnabled(Boolean(data.seatingEnabled));
      const loadedType = normalizeLayoutType(String(data.layoutType ?? ""));
      const loadedConfig = coerceLayoutConfig(
        data.layoutConfig as SeatingLayoutConfig | string
      );
      setLayoutType(loadedType);
      setLayoutConfig({
        ...loadedConfig,
        stagePosition: normalizeStagePositionForLayout(
          loadedType,
          loadedConfig.stagePosition
        ),
      });
      setTiers(
        ((data.tiers as TierRow[]) ?? []).map(
          (tier: TierRow & { seatCount: number }) => ({
            id: tier.id,
            clientKey: tier.id,
            name: tier.name,
            seatCount: tier.seatCount,
            assigned: tier.assigned,
            available: tier.available,
          })
        )
      );
    } catch {
      toastError(t("seating.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [eventId, t, toastError]);

  useEffect(() => {
    void load();
  }, [load]);

  function addTier() {
    setTiers((prev) => [
      ...prev,
      {
        clientKey: nanoid(),
        name: suggestUniqueTierName(
          t("seating.newTierName"),
          prev.map((tier) => tier.name)
        ),
        seatCount: 50,
      },
    ]);
  }

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

  function updateTier(index: number, patch: Partial<TierRow>) {
    setTiers((prev) =>
      prev.map((tier, i) => (i === index ? { ...tier, ...patch } : tier))
    );
  }

  function removeTier(index: number) {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  }

  function reorderTiers(fromIndex: number, toIndex: number) {
    setTiers((prev) => reorderList(prev, fromIndex, toIndex));
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (seatingEnabled) {
      const duplicate = findDuplicateTierNames(tiers);
      if (duplicate) {
        toastError(t("seating.tierNameDuplicate"));
        return;
      }
    }
    setSaving(true);
    const res = await fetch(`/api/admin/events/${eventId}/seating`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seatingEnabled,
        layoutType,
        layoutConfig,
        tiers: tiers.map((tier) => ({
          id: tier.id,
          name: tier.name,
          seatCount: Number(tier.seatCount),
        })),
      }),
    });
    const data = await readJsonResponse(res);
    setSaving(false);
    if (!data || !res.ok) {
      toastError(String(data?.error || t("seating.saveFailed")));
      return;
    }
    toastSuccess(String(data.message || t("seating.saved")));
    await load();
  }

  const modalSize = isDesignMode ? "fullscreen" : tab === "map" ? "xl" : "lg";

  return (
    <Modal
      title={t("seating.title", { name: eventName })}
      onClose={onClose}
      size={modalSize}
      elevated
      bodyClassName={isDesignMode ? "min-h-0" : undefined}
    >
      <IconTabBar
        className={cn("mb-4 shrink-0", isDesignMode && "mb-3")}
        value={tab}
        onValueChange={(v) => setTab(v as "settings" | "layout" | "map")}
        items={[
          {
            value: "settings",
            label: t("seating.settingsTab"),
            icon: Armchair,
          },
          {
            value: "layout",
            label: t("seating.layoutTab"),
            icon: LayoutTemplate,
            disabled: !seatingEnabled,
          },
          {
            value: "map",
            label: t("seating.mapTab"),
            icon: LayoutGrid,
            disabled: !seatingEnabled,
          },
        ]}
      />

      {tab === "map" ? (
        <EventSeatingMap eventId={eventId} enabled={seatingEnabled} />
      ) : tab === "layout" ? (
        <form
          onSubmit={onSave}
          className="flex min-h-0 flex-1 flex-col gap-3"
        >
          <div className="min-h-0 flex-1">
            <SeatingLayoutDesigner
              layoutType={layoutType}
              layoutConfig={layoutConfig}
              tiers={tiers}
              onLayoutTypeChange={setLayoutType}
              onLayoutConfigChange={setLayoutConfig}
              onAddTier={addTier}
              onUpdateTier={updateTier}
              onRemoveTier={removeTier}
              onReorderTiers={reorderTiers}
              expandedPreview
            />
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 border-t border-border pt-4">
            <PrimaryFormButton icon={Save} disabled={saving || loading}>
              {saving ? t("admin.registrationForm.saving") : t("admin.common.save")}
            </PrimaryFormButton>
            <CancelFormButton type="button" onClick={onClose}>
              {t("admin.common.cancel")}
            </CancelFormButton>
          </div>
        </form>
      ) : (
      <form onSubmit={onSave} className="space-y-4">
        <p className="text-sm text-bronze">{t("seating.intro")}</p>

        <CheckboxField
          label={t("seating.enabled")}
          description={t("seating.enabledHint")}
          checked={seatingEnabled}
          onChange={setSeatingEnabled}
        />

        {loading ? (
          <p className="py-8 text-center text-sm text-bronze">
            {t("admin.registrationForm.loading")}
          </p>
        ) : seatingEnabled ? (
          <div className="space-y-2 rounded-xl border border-border bg-[#faf8f5] p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold text-gold-dark">
                <Armchair className="size-3.5 shrink-0" />
                {t("seating.tiersTitle")}
                {tiers.length > 0 ? (
                  <Badge variant="outline" className="text-[10px]">
                    {tiers.length}
                  </Badge>
                ) : null}
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-[11px]"
                onClick={addTier}
              >
                <Plus className="size-3.5" />
                {t("seating.addTier")}
              </Button>
            </div>

            {tiers.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-bronze">
                {t("seating.noTiers")}
              </p>
            ) : (
              <div className="space-y-1">
                {tiers.map((tier, index) => {
                  const nameError = tierNameErrors[index];
                  return (
                    <div
                      key={tier.id ?? tier.clientKey ?? `new-${index}`}
                      className="grid grid-cols-[minmax(0,1fr)_4.25rem_auto] items-start gap-1.5 rounded-lg border border-border bg-card p-1.5"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <Input
                          value={tier.name}
                          onChange={(e) =>
                            updateTier(index, { name: e.target.value })
                          }
                          placeholder={t("seating.tierName")}
                          aria-label={t("seating.tierName")}
                          aria-invalid={Boolean(nameError)}
                          className={cn(
                            "h-7 px-2 text-xs",
                            nameError && "border-destructive"
                          )}
                        />
                        {nameError ? (
                          <p className="text-[10px] text-destructive">{nameError}</p>
                        ) : tier.id && tier.assigned != null ? (
                          <p className="text-[9px] text-bronze/80">
                            {t("seating.tierStats", {
                              assigned: String(tier.assigned),
                              total: String(tier.seatCount),
                            })}
                          </p>
                        ) : null}
                      </div>
                      <Input
                        type="number"
                        min={1}
                        value={String(tier.seatCount)}
                        onChange={(e) =>
                          updateTier(index, {
                            seatCount: Number(e.target.value) || 0,
                          })
                        }
                        dir="ltr"
                        aria-label={t("seating.seatCount")}
                        className="h-7 px-2 text-left text-xs"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => removeTier(index)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-2">
          <PrimaryFormButton icon={Save} disabled={saving || loading}>
            {saving ? t("admin.registrationForm.saving") : t("admin.common.save")}
          </PrimaryFormButton>
          <CancelFormButton type="button" onClick={onClose}>
            {t("admin.common.cancel")}
          </CancelFormButton>
        </div>
      </form>
      )}
    </Modal>
  );
}
