import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";
import { apiT } from "@/lib/i18n/api";
import {
  computeVenueLayout,
  type SeatingLayoutConfig,
  type SeatingLayoutType,
  type VenueLayout,
  normalizeLayoutType,
  parseLayoutConfig,
  serializeLayoutConfig,
} from "./seating-layout";
import {
  collectSeatTierValidationIssues,
  SEAT_TIER_LIMITS,
} from "./seating-limits";
import { findDuplicateTierNames } from "./seating-tier-names";

const OCCUPIED_STATUSES = ["APPROVED", "ATTENDED"] as const;

export type SeatCellStatus = "free" | "approved" | "attended";

export type SeatCell = {
  number: number;
  status: SeatCellStatus;
  registrationId?: string;
  fullName?: string;
  rank?: string;
};

export type SeatingMapTier = {
  id: string;
  name: string;
  seatCount: number;
  sortOrder: number;
  assigned: number;
  available: number;
  seats: SeatCell[];
};

export type SeatingMap = {
  eventId: string;
  eventName: string;
  seatingEnabled: boolean;
  seatingRevision: number;
  layoutType: SeatingLayoutType;
  layoutConfig: SeatingLayoutConfig;
  venue: VenueLayout;
  updatedAt: string;
  tiers: SeatingMapTier[];
};

export async function bumpSeatingRevision(eventId: string): Promise<number> {
  const updated = await prisma.event.update({
    where: { id: eventId },
    data: { seatingRevision: { increment: 1 } },
    select: { seatingRevision: true },
  });
  return updated.seatingRevision;
}

/** Notify all seating map subscribers (SSE via DB revision + optional local WebSocket). */
export async function notifySeatingUpdate(eventId: string) {
  await bumpSeatingRevision(eventId);
  try {
    const { pushSeatingToWebSocketClients } = await import("./seating-realtime");
    await pushSeatingToWebSocketClients(eventId);
  } catch {
    /* Custom WS server not running */
  }
}

async function emitSeatingUpdate(eventId: string) {
  void notifySeatingUpdate(eventId);
}

export type SeatTierInput = {
  id?: string;
  name: string;
  seatCount: number;
};

export function formatSeatLabel(tierName: string, seatNumber: number): string {
  return `${tierName} · ${seatNumber}`;
}

export function validateSeatTiers(
  tiers: SeatTierInput[],
  seatingEnabled: boolean
): { ok: true; tiers: SeatTierInput[] } | { ok: false; error: string } {
  if (!seatingEnabled) {
    return { ok: true, tiers: [] };
  }
  if (tiers.length === 0) {
    return {
      ok: false,
      error: "At least one seat tier is required when seating is enabled",
    };
  }

  const limitIssues = collectSeatTierValidationIssues(tiers);
  if (limitIssues.length > 0) {
    const first = limitIssues[0];
    if (first.type === "tier_count") {
      return {
        ok: false,
        error: `Maximum ${first.max} seat tiers allowed`,
      };
    }
    if (first.type === "total_seats") {
      return {
        ok: false,
        error: `Total seats (${first.count}) exceeds the maximum of ${first.max}`,
      };
    }
    return {
      ok: false,
      error: `Tier "${first.name}" has ${first.count} seats; maximum per tier is ${first.max}`,
    };
  }

  const normalized: SeatTierInput[] = [];
  for (const tier of tiers) {
    const name = tier.name.trim();
    const seatCount = Number(tier.seatCount);
    if (!name) {
      return { ok: false, error: "Each tier needs a name" };
    }
    if (
      !Number.isInteger(seatCount) ||
      seatCount < SEAT_TIER_LIMITS.seatsPerTier.min ||
      seatCount > SEAT_TIER_LIMITS.seatsPerTier.max
    ) {
      return {
        ok: false,
        error: `Invalid seat count for tier "${name}" (allowed: ${SEAT_TIER_LIMITS.seatsPerTier.min}–${SEAT_TIER_LIMITS.seatsPerTier.max})`,
      };
    }
    normalized.push({
      id: tier.id,
      name,
      seatCount,
    });
  }

  const duplicate = findDuplicateTierNames(normalized);
  if (duplicate) {
    return {
      ok: false,
      error: `Duplicate tier name "${duplicate}"`,
    };
  }

  return { ok: true, tiers: normalized };
}

export async function getTierAvailability(eventId: string) {
  const tiers = await prisma.seatTier.findMany({
    where: { eventId },
    orderBy: { sortOrder: "asc" },
  });

  const counts = await prisma.registration.groupBy({
    by: ["seatTierId"],
    where: {
      eventId,
      seatTierId: { not: null },
      seatNumber: { not: null },
      status: { in: [...OCCUPIED_STATUSES] },
    },
    _count: { _all: true },
  });

  const usedByTier = new Map(
    counts
      .filter((c) => c.seatTierId)
      .map((c) => [c.seatTierId!, c._count._all])
  );

  return tiers.map((tier) => {
    const assigned = usedByTier.get(tier.id) ?? 0;
    return {
      id: tier.id,
      name: tier.name,
      seatCount: tier.seatCount,
      sortOrder: tier.sortOrder,
      assigned,
      available: Math.max(0, tier.seatCount - assigned),
    };
  });
}

export async function getSeatingMap(eventId: string): Promise<SeatingMap> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      seatingEnabled: true,
      seatingRevision: true,
      seatingLayoutType: true,
      seatingLayoutJson: true,
    },
  });

  if (!event) {
    throw new Error(await apiT("api.eventNotFound"));
  }

  const tiers = await prisma.seatTier.findMany({
    where: { eventId },
    orderBy: { sortOrder: "asc" },
  });

  const registrations = await prisma.registration.findMany({
    where: {
      eventId,
      seatTierId: { not: null },
      seatNumber: { not: null },
      status: { in: [...OCCUPIED_STATUSES] },
    },
    select: {
      id: true,
      seatTierId: true,
      seatNumber: true,
      fullName: true,
      rank: true,
      status: true,
    },
  });

  const byTierSeat = new Map<string, Map<number, (typeof registrations)[number]>>();
  for (const reg of registrations) {
    if (!reg.seatTierId || reg.seatNumber == null) continue;
    if (!byTierSeat.has(reg.seatTierId)) {
      byTierSeat.set(reg.seatTierId, new Map());
    }
    byTierSeat.get(reg.seatTierId)!.set(reg.seatNumber, reg);
  }

  const layoutType = normalizeLayoutType(event.seatingLayoutType);
  const layoutConfig = parseLayoutConfig(event.seatingLayoutJson);

  const tiersData: SeatingMapTier[] = tiers.map((tier) => {
      const occupied = byTierSeat.get(tier.id) ?? new Map();
      const seats: SeatCell[] = [];
      for (let n = 1; n <= tier.seatCount; n++) {
        const reg = occupied.get(n);
        if (reg) {
          seats.push({
            number: n,
            status: reg.status === "ATTENDED" ? "attended" : "approved",
            registrationId: reg.id,
            fullName: reg.fullName,
            rank: reg.rank,
          });
        } else {
          seats.push({ number: n, status: "free" });
        }
      }
      const assigned = seats.filter((s) => s.status !== "free").length;
      return {
        id: tier.id,
        name: tier.name,
        seatCount: tier.seatCount,
        sortOrder: tier.sortOrder,
        assigned,
        available: Math.max(0, tier.seatCount - assigned),
        seats,
      };
    });

  const venue = computeVenueLayout(tiersData, layoutType, layoutConfig);

  return {
    eventId: event.id,
    eventName: event.name,
    seatingEnabled: event.seatingEnabled,
    seatingRevision: event.seatingRevision,
    layoutType,
    layoutConfig,
    venue,
    updatedAt: new Date().toISOString(),
    tiers: tiersData,
  };
}

async function nextSeatNumber(
  tx: Prisma.TransactionClient,
  eventId: string,
  tierId: string
): Promise<number> {
  const tier = await tx.seatTier.findFirst({
    where: { id: tierId, eventId },
  });
  if (!tier) {
    throw new Error(await apiT("seating.tierNotFound"));
  }

  const occupied = await tx.registration.findMany({
    where: {
      eventId,
      seatTierId: tierId,
      seatNumber: { not: null },
      status: { in: [...OCCUPIED_STATUSES] },
    },
    select: { seatNumber: true },
  });

  const used = new Set(
    occupied.map((r) => r.seatNumber).filter((n): n is number => n != null)
  );

  for (let n = 1; n <= tier.seatCount; n++) {
    if (!used.has(n)) return n;
  }

  throw new Error(await apiT("seating.tierFull", { tier: tier.name }));
}

export async function resolveSeatTierId(
  eventId: string,
  preferredTierId?: string | null
): Promise<string> {
  const tiers = await prisma.seatTier.findMany({
    where: { eventId },
    orderBy: { sortOrder: "asc" },
  });

  if (tiers.length === 0) {
    throw new Error(await apiT("seating.noTiersConfigured"));
  }

  if (preferredTierId) {
    const match = tiers.find((t) => t.id === preferredTierId);
    if (!match) throw new Error(await apiT("seating.tierNotFound"));
    return match.id;
  }

  if (tiers.length === 1) return tiers[0].id;

  throw new Error(await apiT("seating.tierRequired"));
}

export async function assignSeatForRegistration(
  registrationId: string,
  options?: { seatTierId?: string | null }
): Promise<{ seatTierId: string; seatNumber: number; seatLabel: string }> {
  const result = await prisma.$transaction(async (tx) => {
    const registration = await tx.registration.findUnique({
      where: { id: registrationId },
      include: {
        event: { include: { seatTiers: { orderBy: { sortOrder: "asc" } } } },
      },
    });

    if (!registration) {
      throw new Error(await apiT("api.registrationNotFound"));
    }
    if (!registration.event.seatingEnabled) {
      throw new Error(await apiT("seating.notEnabled"));
    }

    const tierId = await resolveSeatTierId(
      registration.eventId,
      options?.seatTierId ?? registration.seatTierId
    );

    const seatNumber = await nextSeatNumber(tx, registration.eventId, tierId);
    const tier = registration.event.seatTiers.find((t) => t.id === tierId)!;

    await tx.registration.update({
      where: { id: registrationId },
      data: { seatTierId: tierId, seatNumber },
    });

    const result = {
      eventId: registration.eventId,
      seatTierId: tierId,
      seatNumber,
      seatLabel: formatSeatLabel(tier.name, seatNumber),
    };

    return result;
  });

  void emitSeatingUpdate(result.eventId);
  return {
    seatTierId: result.seatTierId,
    seatNumber: result.seatNumber,
    seatLabel: result.seatLabel,
  };
}

export async function releaseSeat(registrationId: string): Promise<void> {
  const reg = await prisma.registration.update({
    where: { id: registrationId },
    data: { seatTierId: null, seatNumber: null },
    select: { eventId: true },
  });
  void emitSeatingUpdate(reg.eventId);
}

export async function saveEventSeating(
  eventId: string,
  seatingEnabled: boolean,
  tiers: SeatTierInput[],
  layout?: { type?: SeatingLayoutType; config?: SeatingLayoutConfig }
) {
  const validated = validateSeatTiers(tiers, seatingEnabled);
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  await prisma.$transaction(async (tx) => {
    await tx.event.update({
      where: { id: eventId },
      data: {
        seatingEnabled,
        ...(layout?.type
          ? { seatingLayoutType: normalizeLayoutType(layout.type) }
          : {}),
        ...(layout?.config
          ? { seatingLayoutJson: serializeLayoutConfig(layout.config) }
          : {}),
      },
    });

    if (!seatingEnabled) {
      await tx.seatTier.deleteMany({ where: { eventId } });
      return;
    }

    const existing = await tx.seatTier.findMany({ where: { eventId } });
    const incomingIds = new Set(
      validated.tiers.map((t) => t.id).filter(Boolean) as string[]
    );

    for (const old of existing) {
      if (!incomingIds.has(old.id)) {
        const assigned = await tx.registration.count({
          where: {
            seatTierId: old.id,
            status: { in: [...OCCUPIED_STATUSES] },
          },
        });
        if (assigned > 0) {
          throw new Error(
            await apiT("seating.cannotDeleteTierWithSeats", { name: old.name })
          );
        }
        await tx.seatTier.delete({ where: { id: old.id } });
      }
    }

    for (let i = 0; i < validated.tiers.length; i++) {
      const tier = validated.tiers[i];
      if (tier.id) {
        const current = existing.find((e) => e.id === tier.id);
        if (!current) continue;
        if (tier.seatCount < current.seatCount) {
          const maxAssigned = await tx.registration.aggregate({
            where: {
              seatTierId: tier.id,
              status: { in: [...OCCUPIED_STATUSES] },
              seatNumber: { not: null },
            },
            _max: { seatNumber: true },
          });
          if ((maxAssigned._max.seatNumber ?? 0) > tier.seatCount) {
            throw new Error(
              await apiT("seating.seatCountTooLow", { name: tier.name })
            );
          }
        }
        await tx.seatTier.update({
          where: { id: tier.id },
          data: {
            name: tier.name,
            seatCount: tier.seatCount,
            sortOrder: i + 1,
          },
        });
      } else {
        await tx.seatTier.create({
          data: {
            eventId,
            name: tier.name,
            seatCount: tier.seatCount,
            sortOrder: i + 1,
          },
        });
      }
    }
  });

  void emitSeatingUpdate(eventId);
}
