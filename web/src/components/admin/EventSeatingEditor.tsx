"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  Armchair,
  LayoutGrid,
  LayoutTemplate,
  Plus,
  Save,
  Tag,
  Trash2,
} from "lucide-react";
import { IconTabBar } from "@/components/ui/icon-tabs";
import { EventSeatingMap } from "@/components/admin/EventSeatingMap";
import { SeatTierIconInput } from "@/components/admin/SeatTierIconInput";
import { SeatTierMetaInputs } from "@/components/admin/SeatTierMetaInputs";
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
import { SEAT_TIER_LIMITS } from "@/lib/seating-limits";
import { useSeatingFormState } from "@/hooks/useSeatingFormState";

type Props = {
  eventId: string;
  eventName: string;
  onClose: () => void;
  initialTab?: "settings" | "map";
};

export function EventSeatingEditor({
  eventId,
  eventName,
  onClose,
  initialTab = "settings",
}: Props) {
  const { t } = useI18n();
  const { toastSuccess, toastError } = useFeedback();
  const [tab, setTab] = useState<"settings" | "map">(initialTab);

  const {
    loading,
    saving,
    seatingEnabled,
    setSeatingEnabled,
    tiers,
    tierNameErrors,
    tierSeatCountErrors,
    tierCountError,
    addTier,
    updateTier,
    removeTier,
    save,
  } = useSeatingFormState(eventId, t);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    const result = await save({ reload: true });
    if (!result.ok) {
      if ("error" in result && result.error) {
        toastError(result.error);
      }
      return;
    }
    toastSuccess(result.message);
  }

  return (
    <Modal
      title={t("seating.title", { name: eventName })}
      onClose={onClose}
      size={tab === "map" ? "xl" : "lg"}
      elevated
    >
      <IconTabBar
        className="mb-4 shrink-0"
        value={tab}
        onValueChange={(v) => setTab(v as "settings" | "map")}
        items={[
          {
            value: "settings",
            label: t("seating.settingsTab"),
            icon: Armchair,
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
      ) : (
        <form onSubmit={onSave} className="space-y-4">
          <p className="text-sm text-bronze">{t("seating.intro")}</p>

          <CheckboxField
            label={t("seating.enabled")}
            description={t("seating.enabledHint")}
            checked={seatingEnabled}
            onChange={setSeatingEnabled}
          />

          {seatingEnabled ? (
            <div className="rounded-xl border border-border bg-[#faf8f5] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-bronze">{t("seating.designerPromo")}</p>
                <Link
                  href={`/admin/seating/designer?event=${encodeURIComponent(eventId)}`}
                  onClick={onClose}
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <LayoutTemplate className="size-3.5" />
                  {t("seating.openDesigner")}
                </Link>
              </div>
            </div>
          ) : null}

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
                  disabled={tiers.length >= SEAT_TIER_LIMITS.tierCount.max}
                >
                  <Plus className="size-3.5" />
                  {t("seating.addTier")}
                </Button>
              </div>
              <p className="text-[10px] text-bronze/80">
                {t("seating.seatCountLimitsHint", {
                  max: String(SEAT_TIER_LIMITS.seatsPerTier.max),
                  totalMax: String(SEAT_TIER_LIMITS.totalSeats.max),
                })}
              </p>
              {tierCountError ? (
                <p className="text-[10px] text-destructive">{tierCountError}</p>
              ) : null}

              {tiers.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-bronze">
                  {t("seating.noTiers")}
                </p>
              ) : (
                <div className="space-y-1">
                  {tiers.map((tier, index) => {
                    const nameError = tierNameErrors[index];
                    const seatError = tierSeatCountErrors[index];
                    return (
                      <div
                        key={tier.id ?? tier.clientKey ?? `new-${index}`}
                        className="space-y-1.5 rounded-lg border border-border bg-card p-1.5"
                      >
                        <div className="flex items-start gap-1.5">
                          <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_4.25rem] gap-1.5">
                            <SeatTierIconInput
                              icon={Tag}
                              label={t("seating.tierName")}
                              value={tier.name}
                              onChange={(name) => updateTier(index, { name })}
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
                                updateTier(index, {
                                  seatCount: Number(raw) || 0,
                                })
                              }
                              dir="ltr"
                              inputClassName="text-left"
                              error={seatError}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 shrink-0 text-destructive hover:text-destructive"
                            onClick={() => removeTier(index)}
                            title={t("admin.common.delete")}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
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
                        <SeatTierMetaInputs
                          color={tier.color}
                          price={tier.price}
                          onColorChange={(color) =>
                            updateTier(index, { color })
                          }
                          onPriceChange={(price) =>
                            updateTier(index, { price })
                          }
                        />
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
