"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Armchair, LayoutGrid, LayoutTemplate, Plus, Save, Trash2 } from "lucide-react";
import { IconTabBar } from "@/components/ui/icon-tabs";
import { EventSeatingMap } from "@/components/admin/EventSeatingMap";
import { SeatingLayoutDesigner } from "@/components/admin/SeatingLayoutDesigner";
import { useI18n } from "@/components/I18nProvider";
import { useFeedback } from "@/components/ui/FeedbackProvider";
import { Modal } from "@/components/ui/Modal";
import { CheckboxField, TextField } from "@/components/ui/Field";
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
import { cn } from "@/lib/utils";

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
      { name: t("seating.newTierName"), seatCount: 50 },
    ]);
  }

  function updateTier(index: number, patch: Partial<TierRow>) {
    setTiers((prev) =>
      prev.map((tier, i) => (i === index ? { ...tier, ...patch } : tier))
    );
  }

  function removeTier(index: number) {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
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
          <div className="space-y-3 rounded-xl border border-border bg-[#faf8f5] p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gold-dark">
                <Armchair className="size-4 shrink-0" />
                {t("seating.tiersTitle")}
              </h3>
              <Button type="button" variant="outline" size="sm" onClick={addTier}>
                <Plus className="size-4" />
                {t("seating.addTier")}
              </Button>
            </div>

            {tiers.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-bronze">
                {t("seating.noTiers")}
              </p>
            ) : (
              <div className="space-y-2">
                {tiers.map((tier, index) => (
                  <div
                    key={tier.id ?? `new-${index}`}
                    className="grid gap-3 rounded-xl border border-border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
                  >
                    <TextField
                      label={t("seating.tierName")}
                      value={tier.name}
                      onChange={(e) =>
                        updateTier(index, { name: e.target.value })
                      }
                      required
                    />
                    <div className="min-w-[9.5rem] shrink-0 [&_label]:whitespace-nowrap">
                      <TextField
                        label={t("seating.seatCount")}
                        type="number"
                        min={1}
                        value={String(tier.seatCount)}
                        onChange={(e) =>
                          updateTier(index, {
                            seatCount: Number(e.target.value) || 0,
                          })
                        }
                        dir="ltr"
                        className="text-left"
                        required
                      />
                    </div>
                    <div className="flex flex-col justify-end gap-2 pb-1">
                      {tier.id && tier.assigned != null && (
                        <Badge variant="outline" className="justify-center">
                          {t("seating.tierStats", {
                            assigned: String(tier.assigned),
                            total: String(tier.seatCount),
                          })}
                        </Badge>
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeTier(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
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
