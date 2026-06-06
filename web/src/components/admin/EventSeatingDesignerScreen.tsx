"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LayoutGrid, Save } from "lucide-react";
import { SeatingLayoutDesigner } from "@/components/admin/SeatingLayoutDesigner";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useI18n } from "@/components/I18nProvider";
import { useFeedback } from "@/components/ui/FeedbackProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSeatingFormState } from "@/hooks/useSeatingFormState";
import { capacityProfileLabelKey } from "@/lib/seating-map-utils";
import { SEAT_TIER_LIMITS } from "@/lib/seating-limits";

type Props = {
  eventId: string;
};

export function EventSeatingDesignerScreen({ eventId }: Props) {
  const router = useRouter();
  const { t } = useI18n();
  const { toastSuccess, toastError } = useFeedback();

  const {
    loading,
    saving,
    eventName,
    seatingEnabled,
    layoutType,
    setLayoutType,
    layoutConfig,
    setLayoutConfig,
    tiers,
    totalSeats,
    capacityProfile,
    addTier,
    updateTier,
    removeTier,
    reorderTiers,
    save,
  } = useSeatingFormState(eventId, t);

  async function onSave() {
    if (!seatingEnabled) {
      toastError(t("seating.designerSeatingDisabled"));
      return;
    }
    const result = await save();
    if (!result.ok) {
      toastError(result.error);
      return;
    }
    toastSuccess(result.message);
  }

  return (
    <div className="flex h-[calc(100svh-5.5rem)] min-h-[520px] flex-col gap-3">
      <AdminPageHeader
        title={t("seating.designerPageTitle")}
        description={
          eventName
            ? t("seating.designerPageDescription", { name: eventName })
            : t("seating.designerPageDescriptionLoading")
        }
        className="mb-0 shrink-0"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => router.push("/admin/events")}
        >
          <ArrowLeft className="size-4" />
          {t("seating.backToEvents")}
        </Button>
        <Link
          href={`/admin/events?seating=${eventId}`}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <LayoutGrid className="size-4" />
          {t("seating.openSeatingSettings")}
        </Link>
        <Button
          type="button"
          size="sm"
          className="gap-1.5"
          disabled={saving || loading || !seatingEnabled}
          onClick={() => void onSave()}
        >
          <Save className="size-4" />
          {saving ? t("admin.registrationForm.saving") : t("admin.common.save")}
        </Button>
      </AdminPageHeader>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-[10px]">
          {t("seating.seatCountLimitsHint", {
            max: String(SEAT_TIER_LIMITS.seatsPerTier.max),
            totalMax: String(SEAT_TIER_LIMITS.totalSeats.max),
          })}
        </Badge>
        {totalSeats > 0 ? (
          <Badge variant="secondary" className="text-[10px]">
            {t(capacityProfileLabelKey(capacityProfile))}
            {" · "}
            {t("seating.statsTotal", { count: String(totalSeats) })}
          </Badge>
        ) : null}
      </div>

      {!seatingEnabled && !loading ? (
        <div className="rounded-xl border border-dashed border-border bg-[#faf8f5] px-4 py-8 text-center">
          <p className="text-sm text-bronze">{t("seating.designerSeatingDisabled")}</p>
          <Link
            href={`/admin/events?seating=${eventId}`}
            className="mt-4 inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {t("seating.openSeatingSettings")}
          </Link>
        </div>
      ) : loading ? (
        <p className="py-16 text-center text-sm text-bronze">
          {t("admin.registrationForm.loading")}
        </p>
      ) : (
        <div className="min-h-0 flex-1">
          <SeatingLayoutDesigner
            standalone
            layoutType={layoutType}
            layoutConfig={layoutConfig}
            tiers={tiers}
            totalSeats={totalSeats}
            capacityProfile={capacityProfile}
            onLayoutTypeChange={setLayoutType}
            onLayoutConfigChange={setLayoutConfig}
            onAddTier={addTier}
            onUpdateTier={updateTier}
            onRemoveTier={removeTier}
            onReorderTiers={reorderTiers}
          />
        </div>
      )}
    </div>
  );
}
