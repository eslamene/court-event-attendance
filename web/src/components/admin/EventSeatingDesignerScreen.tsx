"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { ArrowLeft, CloudOff, CloudUpload, LayoutGrid, Loader2 } from "lucide-react";
import { SeatingLayoutDesigner } from "@/components/admin/SeatingLayoutDesigner";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useI18n } from "@/components/I18nProvider";
import { useFeedback } from "@/components/ui/FeedbackProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/Field";
import { useSeatingFormState } from "@/hooks/useSeatingFormState";
import { capacityProfileLabelKey } from "@/lib/seating-map-utils";
import { SEAT_TIER_LIMITS } from "@/lib/seating-limits";

type EventOption = {
  id: string;
  name: string;
  date?: string;
  seatingEnabled?: boolean;
};

type Props = {
  initialEventId?: string;
};

export function EventSeatingDesignerScreen({ initialEventId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();
  const { toastError } = useFeedback();
  const dateLocale = locale === "ar" ? ar : enUS;

  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState(
    initialEventId ?? searchParams.get("event") ?? ""
  );

  const {
    loading,
    saving,
    autoSaveStatus,
    autoSaveError,
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
  } = useSeatingFormState(selectedEventId, t, { autoSave: true });

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const res = await fetch("/api/admin/events");
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) {
        setEvents([]);
        return;
      }
      setEvents(
        data.map((event: EventOption) => ({
          id: event.id,
          name: event.name,
          date: event.date,
          seatingEnabled: event.seatingEnabled,
        }))
      );
    } catch {
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const fromUrl = searchParams.get("event");
    if (fromUrl && fromUrl !== selectedEventId) {
      setSelectedEventId(fromUrl);
    }
  }, [searchParams, selectedEventId]);

  useEffect(() => {
    if (selectedEventId || eventsLoading || events.length === 0) return;
    const first = events[0]?.id;
    if (first) {
      setSelectedEventId(first);
      router.replace(`/admin/seating/designer?event=${encodeURIComponent(first)}`, {
        scroll: false,
      });
    }
  }, [events, eventsLoading, router, selectedEventId]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId),
    [events, selectedEventId]
  );

  function onEventChange(eventId: string) {
    setSelectedEventId(eventId);
    const params = new URLSearchParams(searchParams.toString());
    if (eventId) {
      params.set("event", eventId);
    } else {
      params.delete("event");
    }
    const query = params.toString();
    router.replace(
      query ? `/admin/seating/designer?${query}` : "/admin/seating/designer",
      { scroll: false }
    );
  }

  async function retrySave() {
    if (!selectedEventId || !seatingEnabled) return;
    const result = await save({ silent: true });
    if (!result.ok && "error" in result && result.error) {
      toastError(result.error);
    }
  }

  const autoSaveLabel = (() => {
    switch (autoSaveStatus) {
      case "saving":
        return t("seating.autoSaveSaving");
      case "saved":
        return t("seating.autoSaveSaved");
      case "pending":
        return t("seating.autoSavePending");
      case "error":
        return t("seating.autoSaveError");
      default:
        return null;
    }
  })();

  const seatingSettingsHref = selectedEventId
    ? `/admin/events?seating=${selectedEventId}`
    : "/admin/events";

  return (
    <div className="flex h-[calc(100svh-5.5rem)] min-h-[520px] flex-col gap-3">
      <AdminPageHeader
        title={t("seating.designerPageTitle")}
        description={
          eventName
            ? t("seating.designerPageDescription", { name: eventName })
            : t("seating.designerSelectEventHint")
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
        {selectedEventId ? (
          <Link
            href={seatingSettingsHref}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <LayoutGrid className="size-4" />
            {t("seating.openSeatingSettings")}
          </Link>
        ) : null}
        {selectedEventId && seatingEnabled ? (
          <div className="flex items-center gap-2">
            {autoSaveLabel ? (
              <Badge
                variant={autoSaveStatus === "error" ? "destructive" : "outline"}
                className="gap-1 text-[10px] font-normal"
              >
                {autoSaveStatus === "saving" || autoSaveStatus === "pending" ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : autoSaveStatus === "error" ? (
                  <CloudOff className="size-3" />
                ) : (
                  <CloudUpload className="size-3" />
                )}
                {autoSaveLabel}
              </Badge>
            ) : null}
            {autoSaveStatus === "error" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                disabled={saving || loading}
                onClick={() => void retrySave()}
              >
                {t("seating.autoSaveRetry")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </AdminPageHeader>

      <div className="flex shrink-0 flex-wrap items-end gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <SelectField
          label={t("seating.selectEvent")}
          value={selectedEventId}
          onChange={(e) => onEventChange(e.target.value)}
          disabled={eventsLoading || events.length === 0}
          className="min-w-[min(100%,320px)] flex-1"
        >
          <option value="">
            {eventsLoading
              ? t("admin.registrationForm.loading")
              : t("seating.selectEventPlaceholder")}
          </option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
              {event.date
                ? ` · ${format(new Date(event.date), "PP", { locale: dateLocale })}`
                : ""}
            </option>
          ))}
        </SelectField>
        {selectedEvent && !selectedEvent.seatingEnabled ? (
          <Badge variant="outline" className="mb-0.5 text-[10px] text-amber-800">
            {t("seating.seatingDisabledBadge")}
          </Badge>
        ) : null}
      </div>

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
        {autoSaveError && autoSaveStatus === "error" ? (
          <Badge variant="destructive" className="max-w-full truncate text-[10px]">
            {autoSaveError}
          </Badge>
        ) : null}
      </div>

      {!selectedEventId ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-[#faf8f5] px-6 py-12 text-center">
          <p className="text-sm text-bronze">{t("seating.designerNoEventSelected")}</p>
        </div>
      ) : !seatingEnabled && !loading ? (
        <div className="rounded-xl border border-dashed border-border bg-[#faf8f5] px-4 py-8 text-center">
          <p className="text-sm text-bronze">{t("seating.designerSeatingDisabled")}</p>
          <Link
            href={seatingSettingsHref}
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
