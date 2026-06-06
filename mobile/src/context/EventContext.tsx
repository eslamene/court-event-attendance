import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { EventItem } from "../api";
import { getEvents, getSelectedEventId, setSelectedEventId } from "../storage";

type EventContextValue = {
  events: EventItem[];
  eventId: string;
  selectedEvent: EventItem | null;
  setEventId: (id: string) => void;
  refreshEvents: () => Promise<void>;
};

const EventContext = createContext<EventContextValue | null>(null);

export function EventProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventId, setEventIdState] = useState("");

  const refreshEvents = useCallback(async () => {
    const [ev, selected] = await Promise.all([getEvents(), getSelectedEventId()]);
    setEvents(ev);
    if (selected && ev.some((e) => e.id === selected)) {
      setEventIdState(selected);
    } else if (ev[0]) {
      setEventIdState(ev[0].id);
      await setSelectedEventId(ev[0].id);
    } else {
      setEventIdState("");
    }
  }, []);

  useEffect(() => {
    void refreshEvents();
  }, [refreshEvents]);

  const setEventId = useCallback((id: string) => {
    setEventIdState(id);
    void setSelectedEventId(id);
  }, []);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === eventId) ?? null,
    [events, eventId]
  );

  const value = useMemo(
    () => ({
      events,
      eventId,
      selectedEvent,
      setEventId,
      refreshEvents,
    }),
    [events, eventId, selectedEvent, setEventId, refreshEvents]
  );

  return (
    <EventContext.Provider value={value}>{children}</EventContext.Provider>
  );
}

export function useEventContext() {
  const ctx = useContext(EventContext);
  if (!ctx) {
    throw new Error("useEventContext must be used within EventProvider");
  }
  return ctx;
}
