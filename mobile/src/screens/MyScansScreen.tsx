import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchEventScans, type AttendanceScan } from "../api";
import { ScanLogList } from "../components/ScanLogList";
import {
  SeatGuideModal,
  type SeatGuideTarget,
} from "../components/SeatGuideModal";
import { AppHeader, Screen, ScreenBody } from "../components/ui/Screen";
import { EventPicker } from "../components/ui/EventPicker";
import { StatRow } from "../components/ui/Card";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { useEventContext } from "../context/EventContext";
import { useI18n } from "../context/I18nContext";
import { clearSession, getToken } from "../storage";

type Props = {
  onLogout: () => void;
};

export function MyScansScreen({ onLogout }: Props) {
  const { events, eventId, setEventId, selectedEvent } = useEventContext();
  const { t, textAlign, rowDirection } = useI18n();
  const [scans, setScans] = useState<AttendanceScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [guideTarget, setGuideTarget] = useState<SeatGuideTarget | null>(null);
  const [guideVisible, setGuideVisible] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!eventId) {
        setScans([]);
        setLoading(false);
        return;
      }

      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        const token = await getToken();
        if (!token) {
          onLogout();
          return;
        }

        const data = await fetchEventScans(token, eventId, "mine");
        setScans(data.scans);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          await clearSession();
          onLogout();
          return;
        }
        setError(e instanceof Error ? e.message : t("myScans.loadFailed"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [eventId, onLogout, t]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const successCount = scans.filter((s) => s.result === "SUCCESS").length;

  return (
    <Screen>
      <AppHeader
        title={t("myScans.title")}
        subtitle={selectedEvent?.name ?? t("common.selectEvent")}
        textAlign={textAlign}
      />

      <EventPicker
        events={events}
        eventId={eventId}
        onSelect={setEventId}
        textAlign={textAlign}
        rowDirection={rowDirection}
      />

      <StatRow
        rowDirection={rowDirection}
        items={[
          { value: scans.length, label: t("myScans.totalLabel") },
          {
            value: successCount,
            label: t("myScans.successLabel"),
            tone: "success",
          },
        ]}
      />

      <ErrorBanner message={error} textAlign={textAlign} />

      <ScreenBody>
        <ScanLogList
          scans={scans}
          loading={loading}
          refreshing={refreshing}
          onRefresh={() => void load(true)}
          emptyMessage={t("myScans.empty")}
          seatingEnabled={selectedEvent?.seatingEnabled}
          onGuideSeat={(target) => {
            setGuideTarget(target);
            setGuideVisible(true);
          }}
        />
      </ScreenBody>

      <SeatGuideModal
        visible={guideVisible}
        eventId={eventId}
        target={guideTarget}
        onClose={() => {
          setGuideVisible(false);
          setGuideTarget(null);
        }}
      />
    </Screen>
  );
}
