"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { reorderList } from "@/components/admin/TierSortableList";
import {
  coerceLayoutConfig,
  DEFAULT_LAYOUT_CONFIG,
  normalizeLayoutType,
  normalizeStagePositionForLayout,
  parseLayoutConfig,
  remapTierPlacementsToTiers,
  serializeLayoutConfig,
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
import { defaultTierColor, normalizeTierColor } from "@/lib/seat-tier-style";

export type SeatingTierRow = {
  id?: string;
  clientKey?: string;
  name: string;
  seatCount: number;
  color: string;
  price: number | null;
  assigned?: number;
  maxAssignedSeat?: number;
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

export type SeatingAutoSaveStatus =
  | "idle"
  | "dirty"
  | "pending"
  | "saving"
  | "saved"
  | "error";

type UseSeatingFormStateOptions = {
  /** Debounced persist on layout / tier edits (venue designer). */
  autoSave?: boolean;
  autoSaveDelayMs?: number;
};

function normalizeLayoutForSnapshot(
  layoutConfig: SeatingLayoutConfig
): SeatingLayoutConfig {
  return parseLayoutConfig(serializeLayoutConfig(coerceLayoutConfig(layoutConfig)));
}

function buildSaveSnapshot(
  layoutType: SeatingLayoutType,
  layoutConfig: SeatingLayoutConfig,
  tiers: SeatingTierRow[]
): string {
  return JSON.stringify({
    layoutType,
    layoutConfig: normalizeLayoutForSnapshot(layoutConfig),
    tiers: tiers.map((tier) => ({
      id: tier.id ?? null,
      clientKey: tier.clientKey ?? null,
      name: tier.name.trim(),
      seatCount: Number(tier.seatCount) || 0,
      color: tier.color,
      price: tier.price,
    })),
  });
}

export function useSeatingFormState(
  eventId: string,
  translate: (key: string, vars?: Record<string, string>) => string,
  options: UseSeatingFormStateOptions = {}
) {
  const { autoSave = false, autoSaveDelayMs = 1200 } = options;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<SeatingAutoSaveStatus>("idle");
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);
  const [persistedSnapshot, setPersistedSnapshot] = useState<string | null>(null);
  const skipAutoSaveRef = useRef(true);
  const saveInFlightRef = useRef(false);
  const blockedSaveSnapshotRef = useRef<string | null>(null);
  const [eventName, setEventName] = useState("");
  const [seatingEnabled, setSeatingEnabled] = useState(false);
  const [layoutType, setLayoutType] = useState<SeatingLayoutType>("theater");
  const [layoutConfig, setLayoutConfig] = useState<SeatingLayoutConfig>({
    ...DEFAULT_LAYOUT_CONFIG,
  });
  const [tiers, setTiers] = useState<SeatingTierRow[]>([]);

  const load = useCallback(async () => {
    if (!eventId) {
      setLoading(false);
      setEventName("");
      setSeatingEnabled(false);
      setTiers([]);
      return null;
    }
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
      const loadedTiers = ((data.tiers as SeatingTierRow[]) ?? []).map(
        (tier, index) => ({
          id: tier.id,
          clientKey: tier.id,
          name: tier.name,
          seatCount: tier.seatCount,
          color: normalizeTierColor(tier.color, index),
          price: tier.price ?? null,
          assigned: tier.assigned,
          maxAssignedSeat: tier.maxAssignedSeat ?? tier.assigned ?? 0,
          available: tier.available,
        })
      );

      setTiers(loadedTiers);
      const nextConfig = {
        ...remapTierPlacementsToTiers(loadedConfig, loadedTiers),
        stagePosition: normalizeStagePositionForLayout(
          loadedType,
          loadedConfig.stagePosition
        ),
      };

      setLayoutConfig(nextConfig);
      setPersistedSnapshot(
        buildSaveSnapshot(loadedType, nextConfig, loadedTiers)
      );
      skipAutoSaveRef.current = true;
      blockedSaveSnapshotRef.current = null;
      setAutoSaveStatus("saved");
      setAutoSaveError(null);

      return { ok: true as const };
    } catch {
      return { ok: false as const, error: translate("seating.loadFailed") };
    } finally {
      setLoading(false);
    }
  }, [eventId, translate]);

  useEffect(() => {
    skipAutoSaveRef.current = true;
    setPersistedSnapshot(null);
    setAutoSaveStatus("idle");
    setAutoSaveError(null);
    void load().finally(() => {
      requestAnimationFrame(() => {
        skipAutoSaveRef.current = false;
      });
    });
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
        color: defaultTierColor(prev.length),
        price: null,
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

  const validateForSave = useCallback(
    (requireTiers: boolean): string | null => {
      if (!requireTiers) return null;
      const duplicate = findDuplicateTierNames(tiers);
      if (duplicate) return translate("seating.tierNameDuplicate");
      const limits = validateSeatTierLimits(tiers);
      if (!limits.ok) {
        const { key, vars } = seatTierIssueMessageKey(limits.issue);
        return translate(key, vars);
      }
      for (const tier of tiers) {
        const floor = Math.max(
          tier.maxAssignedSeat ?? 0,
          tier.assigned ?? 0
        );
        if (floor > 0 && Number(tier.seatCount) < floor) {
          return translate("seating.seatCountTooLow", { name: tier.name });
        }
      }
      return null;
    },
    [tiers, translate]
  );

  const applySaveResponse = useCallback(
    (
      data: Record<string, unknown>,
      options?: { reload?: boolean }
    ): void => {
      const reload = options?.reload ?? false;
      if (reload) {
        void load();
        return;
      }

      const returnedType = normalizeLayoutType(String(data.layoutType ?? layoutType));
      const returnedConfig = coerceLayoutConfig(
        data.layoutConfig as SeatingLayoutConfig | string
      );
      const returnedTiers = ((data.tiers as SeatingTierRow[]) ?? []).map(
        (tier, index) => ({
          id: tier.id,
          clientKey: tier.id,
          name: tier.name,
          seatCount: tier.seatCount,
          color: normalizeTierColor(tier.color, index),
          price: tier.price ?? null,
          assigned: tier.assigned,
          maxAssignedSeat: tier.maxAssignedSeat ?? tier.assigned ?? 0,
          available: tier.available,
        })
      );

      const nextConfig = {
        ...remapTierPlacementsToTiers(returnedConfig, returnedTiers),
        stagePosition: normalizeStagePositionForLayout(
          returnedType,
          returnedConfig.stagePosition
        ),
      };

      skipAutoSaveRef.current = true;
      blockedSaveSnapshotRef.current = null;
      setLayoutType(returnedType);
      setTiers(returnedTiers);
      setLayoutConfig(nextConfig);
      setPersistedSnapshot(
        buildSaveSnapshot(returnedType, nextConfig, returnedTiers)
      );
      requestAnimationFrame(() => {
        skipAutoSaveRef.current = false;
      });
    },
    [layoutType, load]
  );

  const save = useCallback(
    async (saveOptions?: {
      seatingEnabled?: boolean;
      silent?: boolean;
      reload?: boolean;
    }) => {
      if (!eventId) {
        return { ok: false as const, error: translate("seating.loadFailed") };
      }

      const enabled = saveOptions?.seatingEnabled ?? seatingEnabled;
      const validationError = validateForSave(enabled);
      if (validationError) {
        return { ok: false as const, error: validationError };
      }

      if (saveInFlightRef.current) {
        return { ok: false as const, skipped: true as const };
      }

      saveInFlightRef.current = true;
      setSaving(true);
      if (autoSave) {
        setAutoSaveStatus("saving");
      }

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
            clientKey: tier.clientKey,
            name: tier.name,
            seatCount: Number(tier.seatCount),
            color: tier.color,
            price: tier.price,
          })),
          }),
        });
        const data = await readJsonResponse(res);
        if (!data || !res.ok) {
          const error = String(data?.error || translate("seating.saveFailed"));
          if (autoSave) {
            blockedSaveSnapshotRef.current = buildSaveSnapshot(
              layoutType,
              layoutConfig,
              tiers
            );
            setAutoSaveStatus("error");
            setAutoSaveError(error);
          }
          return { ok: false as const, error };
        }

        const silent = saveOptions?.silent ?? autoSave;
        blockedSaveSnapshotRef.current = null;
        applySaveResponse(data, { reload: saveOptions?.reload ?? !silent });
        if (autoSave) {
          setAutoSaveStatus("saved");
          setAutoSaveError(null);
        }

        return {
          ok: true as const,
          message: String(data.message || translate("seating.saved")),
        };
      } catch {
        const error = translate("seating.saveFailed");
        if (autoSave) {
          setAutoSaveStatus("error");
          setAutoSaveError(error);
        }
        return { ok: false as const, error };
      } finally {
        saveInFlightRef.current = false;
        setSaving(false);
      }
    },
    [
      applySaveResponse,
      autoSave,
      eventId,
      layoutConfig,
      layoutType,
      seatingEnabled,
      tiers,
      translate,
      validateForSave,
    ]
  );

  const saveSnapshot = useMemo(
    () => buildSaveSnapshot(layoutType, layoutConfig, tiers),
    [layoutConfig, layoutType, tiers]
  );

  useEffect(() => {
    if (blockedSaveSnapshotRef.current !== saveSnapshot) {
      blockedSaveSnapshotRef.current = null;
    }
  }, [saveSnapshot]);

  useEffect(() => {
    if (!autoSave || !eventId || loading || !seatingEnabled || saving) return;
    if (skipAutoSaveRef.current) return;

    if (persistedSnapshot !== null && saveSnapshot === persistedSnapshot) {
      setAutoSaveStatus((status) =>
        status === "pending" ? "saved" : status === "dirty" ? "saved" : status
      );
      return;
    }

    const validationError = validateForSave(true);
    if (validationError) {
      blockedSaveSnapshotRef.current = saveSnapshot;
      setAutoSaveStatus("error");
      setAutoSaveError(validationError);
      return;
    }

    if (blockedSaveSnapshotRef.current === saveSnapshot) {
      return;
    }

    setAutoSaveStatus("pending");
    setAutoSaveError(null);

    const timer = window.setTimeout(() => {
      if (saveInFlightRef.current) return;
      if (blockedSaveSnapshotRef.current === saveSnapshot) return;
      void save({ silent: true });
    }, autoSaveDelayMs);

    return () => window.clearTimeout(timer);
  }, [
    autoSave,
    autoSaveDelayMs,
    eventId,
    loading,
    persistedSnapshot,
    save,
    saveSnapshot,
    saving,
    seatingEnabled,
    validateForSave,
  ]);

  return {
    loading,
    saving,
    autoSaveStatus,
    autoSaveError,
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
    isDirty:
      persistedSnapshot !== null && saveSnapshot !== persistedSnapshot,
  };
}
