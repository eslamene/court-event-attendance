"use client";

import { useEffect, useState } from "react";
import type { SeatingMap, SeatCell } from "@/lib/seating";

type ConnectionState = "connecting" | "live" | "polling";

type Options = {
  tierId?: string | null;
};

function occupiedSeatsForTier(tier: SeatingMap["tiers"][number]): SeatCell[] {
  if (tier.occupiedSeats?.length) {
    return tier.occupiedSeats.map((s) => ({ ...s }));
  }
  return tier.seats.filter((s) => s.status !== "free");
}

export function useSeatingRealtime(
  eventId: string,
  enabled: boolean,
  options: Options = {}
) {
  const tierId = options.tierId ?? undefined;
  const [map, setMap] = useState<SeatingMap | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [loading, setLoading] = useState(true);
  const [recentKeys, setRecentKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !eventId) return;

    let alive = true;
    let eventSource: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const mapQuery = tierId ? `?tierId=${encodeURIComponent(tierId)}` : "";

    const markRecent = (prev: SeatingMap | null, next: SeatingMap) => {
      if (!prev) return;
      const changed = new Set<string>();
      for (const tier of next.tiers) {
        const prevTier = prev.tiers.find((t) => t.id === tier.id);
        if (!prevTier) continue;
        const prevOccupied = occupiedSeatsForTier(prevTier);
        const nextOccupied = occupiedSeatsForTier(tier);
        const prevByNumber = new Map(prevOccupied.map((s) => [s.number, s]));

        for (const seat of nextOccupied) {
          const prevSeat = prevByNumber.get(seat.number);
          if (
            !prevSeat ||
            prevSeat.status !== seat.status ||
            prevSeat.registrationId !== seat.registrationId
          ) {
            changed.add(`${tier.id}:${seat.number}`);
          }
        }
      }
      if (changed.size > 0) {
        setRecentKeys(changed);
        window.setTimeout(() => setRecentKeys(new Set()), 1800);
      }
    };

    const applyMap = (data: SeatingMap) => {
      if (!alive) return;
      setMap((prev) => {
        markRecent(prev, data);
        return data;
      });
      setLoading(false);
    };

    const fetchMap = async () => {
      try {
        const res = await fetch(
          `/api/admin/events/${eventId}/seating/map${mapQuery}`
        );
        if (res.ok) {
          applyMap(await res.json());
        }
      } catch {
        /* ignore */
      }
    };

    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const startPolling = () => {
      if (pollTimer) return;
      setConnection("polling");
      void fetchMap();
      pollTimer = setInterval(() => void fetchMap(), 5000);
    };

    const connectStream = () => {
      if (!alive) return;
      setConnection("connecting");
      eventSource?.close();

      const url = `/api/admin/events/${eventId}/seating/stream${mapQuery}`;
      eventSource = new EventSource(url);

      eventSource.addEventListener("seating:map", (event) => {
        if (!alive) return;
        try {
          applyMap(JSON.parse(String(event.data)) as SeatingMap);
          setConnection("live");
          stopPolling();
        } catch {
          /* ignore */
        }
      });

      eventSource.onopen = () => {
        if (!alive) return;
        setConnection("live");
        stopPolling();
      };

      eventSource.onerror = () => {
        if (!alive) return;
        eventSource?.close();
        eventSource = null;
        startPolling();
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connectStream, 3000);
      };
    };

    setLoading(true);
    void fetchMap();
    connectStream();

    return () => {
      alive = false;
      stopPolling();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      eventSource?.close();
    };
  }, [eventId, enabled, tierId]);

  function isRecentSeat(tierId: string, seatNumber: number) {
    return recentKeys.has(`${tierId}:${seatNumber}`);
  }

  return { map, connection, loading, isRecentSeat };
}
