"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Armchair, LayoutGrid, LayoutTemplate, Plus, Save, Trash2 } from "lucide-react";
import { IconTabBar } from "@/components/ui/icon-tabs";
import { EventSeatingMap } from "@/components/admin/EventSeatingMap";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
    const result = await save();
    if (!result.ok) {
      toastError(result.error);
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
                  href={`/admin/events/${eventId}/seating/designer`}
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
                        <div className="space-y-0.5">
                          <Input
                            type="number"
                            min={SEAT_TIER_LIMITS.seatsPerTier.min}
                            max={SEAT_TIER_LIMITS.seatsPerTier.max}
                            value={String(tier.seatCount)}
                            onChange={(e) =>
                              updateTier(index, {
                                seatCount: Number(e.target.value) || 0,
                              })
                            }
                            dir="ltr"
                            aria-label={t("seating.seatCount")}
                            aria-invalid={Boolean(seatError)}
                            className={cn(
                              "h-7 px-2 text-left text-xs",
                              seatError && "border-destructive"
                            )}
                          />
                          {seatError ? (
                            <p className="text-[9px] leading-tight text-destructive">
                              {seatError}
                            </p>
                          ) : null}
                        </div>
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
