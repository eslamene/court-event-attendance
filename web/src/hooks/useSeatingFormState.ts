"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { nanoid } from "nanoid";
import { reorderList } from "@/components/admin/TierSortableList";
import {
  coerceLayoutConfig,
  DEFAULT_LAYOUT_CONFIG,
  normalizeLayoutType,
  normalizeStagePositionForLayout,
  syncTierPlacementsAfterTierChange,
  type SeatingLayoutConfig,
  type SeatingLayoutType,
} from "@/lib/seating-layout";
import {
  buildTierSeatCountErrors,
  getVenueCapacityProfile,
  redistributeSeatCountsAcrossTiers,
  SEAT_TIER_LIMITS,
  seatTierIssueMessageKey,
  totalSeatCount,
  validateSeatTierLimits,
} from "@/lib/seating-limits";
import {
  findDuplicateTierNames,
  suggestUniqueTierName,
  tierNameKey,
} from "@/lib/seating-tier-names";

export type SeatingTierRow = {
  id?: string;
  clientKey?: string;
  name: string;
  seatCount: number;
  assigned?: number;
  available?: number;
};

async function readJsonResponse(
  res: Response
): Promise<Record<string, unknown> | null> {
  const text = await res.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function useSeatingFormState(
  eventId: string,
  translate: (key: string, vars?: Record<string, string>) => string
) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eventName, setEventName] = useState("");
  const [seatingEnabled, setSeatingEnabled] = useState(false);
  const [layoutType, setLayoutType] = useState<SeatingLayoutType>("theater");
  const [layoutConfig, setLayoutConfig] = useState<SeatingLayoutConfig>({
    ...DEFAULT_LAYOUT_CONFIG,
  });
  const [tiers, setTiers] = useState<SeatingTierRow[]>([]);

  const load = useCallback(async () => {
    if (!eventId) return null;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/seating`);
      const data = await readJsonResponse(res);
      if (!data || !res.ok) {
        return {
          ok: false as const,
          error: String(data?.error || translate("seating.loadFailed")),
        };
      }

      const loadedType = normalizeLayoutType(String(data.layoutType ?? ""));
      const loadedConfig = coerceLayoutConfig(
        data.layoutConfig as SeatingLayoutConfig | string
      );

      setEventName(String(data.eventName ?? ""));
      setSeatingEnabled(Boolean(data.seatingEnabled));
      setLayoutType(loadedType);
      setLayoutConfig({
        ...loadedConfig,
        stagePosition: normalizeStagePositionForLayout(
          loadedType,
          loadedConfig.stagePosition
        ),
      });
      setTiers(
        ((data.tiers as SeatingTierRow[]) ?? []).map((tier) => ({
          id: tier.id,
          clientKey: tier.id,
          name: tier.name,
          seatCount: tier.seatCount,
          assigned: tier.assigned,
          available: tier.available,
        }))
      );

      return { ok: true as const };
    } catch {
      return { ok: false as const, error: translate("seating.loadFailed") };
    } finally {
      setLoading(false);
    }
  }, [eventId, translate]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalSeats = useMemo(() => totalSeatCount(tiers), [tiers]);
  const capacityProfile = useMemo(
    () => getVenueCapacityProfile(totalSeats),
    [totalSeats]
  );

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
          errors[index] = translate("seating.tierNameDuplicate");
        }
      }
    }
    return errors;
  }, [tiers, translate]);

  const tierSeatCountErrors = useMemo(
    () => buildTierSeatCountErrors(tiers, translate),
    [tiers, translate]
  );

  const tierCountError =
    tiers.length > SEAT_TIER_LIMITS.tierCount.max
      ? translate("seating.tierCountTooHigh", {
          max: String(SEAT_TIER_LIMITS.tierCount.max),
        })
      : null;

  function addTier() {
    setTiers((prev) => {
      if (prev.length >= SEAT_TIER_LIMITS.tierCount.max) return prev;

      const capacityPool = totalSeatCount(prev);
      const newTier: SeatingTierRow = {
        clientKey: nanoid(),
        name: suggestUniqueTierName(
          translate("seating.newTierName"),
          prev.map((tier) => tier.name)
        ),
        seatCount: 0,
      };
      const next = redistributeSeatCountsAcrossTiers(
        [...prev, newTier],
        capacityPool
      );

      setLayoutConfig((config) =>
        syncTierPlacementsAfterTierChange(config, next)
      );
      return next;
    });
  }

  function updateTier(index: number, patch: Partial<SeatingTierRow>) {
    setTiers((prev) =>
      prev.map((tier, i) => (i === index ? { ...tier, ...patch } : tier))
    );
  }

  function removeTier(index: number) {
    setTiers((prev) => {
      const capacityPool = totalSeatCount(prev);
      const next = redistributeSeatCountsAcrossTiers(
        prev.filter((_, i) => i !== index),
        capacityPool
      );
      setLayoutConfig((config) =>
        syncTierPlacementsAfterTierChange(config, next)
      );
      return next;
    });
  }

  function reorderTiers(fromIndex: number, toIndex: number) {
    setTiers((prev) => reorderList(prev, fromIndex, toIndex));
  }

  function validateForSave(requireTiers: boolean): string | null {
    if (!requireTiers) return null;
    const duplicate = findDuplicateTierNames(tiers);
    if (duplicate) return translate("seating.tierNameDuplicate");
    const limits = validateSeatTierLimits(tiers);
    if (!limits.ok) {
      const { key, vars } = seatTierIssueMessageKey(limits.issue);
      return translate(key, vars);
    }
    return null;
  }

  async function save(options?: { seatingEnabled?: boolean }) {
    const enabled = options?.seatingEnabled ?? seatingEnabled;
    const validationError = validateForSave(enabled);
    if (validationError) {
      return { ok: false as const, error: validationError };
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/seating`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seatingEnabled: enabled,
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
      if (!data || !res.ok) {
        return {
          ok: false as const,
          error: String(data?.error || translate("seating.saveFailed")),
        };
      }
      await load();
      return {
        ok: true as const,
        message: String(data.message || translate("seating.saved")),
      };
    } catch {
      return { ok: false as const, error: translate("seating.saveFailed") };
    } finally {
      setSaving(false);
    }
  }

  return {
    loading,
    saving,
    eventName,
    seatingEnabled,
    setSeatingEnabled,
    layoutType,
    setLayoutType,
    layoutConfig,
    setLayoutConfig,
    tiers,
    totalSeats,
    capacityProfile,
    tierNameErrors,
    tierSeatCountErrors,
    tierCountError,
    addTier,
    updateTier,
    removeTier,
    reorderTiers,
    load,
    save,
    validateForSave,
  };
}
