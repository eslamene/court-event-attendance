import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { ApiError, fetchEventScans, type AttendanceScan } from "../api";
import { ScanLogList } from "../components/ScanLogList";
import {
  SeatGuideModal,
  type SeatGuideTarget,
} from "../components/SeatGuideModal";
import { useEventContext } from "../context/EventContext";
import { useI18n } from "../context/I18nContext";
import { logActivity } from "../lib/activity-log";
import { clearSession, getToken } from "../storage";

type Props = {
  onLogout: () => void;
};

export function EventAttendanceScreen({ onLogout }: Props) {
  const { events, eventId, setEventId, selectedEvent } = useEventContext();
  const { t, textAlign, rowDirection } = useI18n();
  const [scans, setScans] = useState<AttendanceScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({ total: 0, success: 0 });
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

        const data = await fetchEventScans(token, eventId, "all");
        setScans(data.scans);
        setSummary({ total: data.summary.total, success: data.summary.success });
        await logActivity(
          "sync",
          t("attendance.loadActivity", { name: data.event.name }),
          { eventId, count: String(data.scans.length) }
        );
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          await clearSession();
          onLogout();
          return;
        }
        setError(e instanceof Error ? e.message : t("attendance.loadFailed"));
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { textAlign }]}>{t("attendance.title")}</Text>
        <Text style={[styles.subtitle, { textAlign }]}>
          {selectedEvent?.name ?? t("common.selectEvent")}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.eventPicker,
          { flexDirection: rowDirection },
        ]}
      >
        {events.map((e) => (
          <TouchableOpacity
            key={e.id}
            style={[styles.chip, eventId === e.id && styles.chipActive]}
            onPress={() => setEventId(e.id)}
          >
            <Text
              style={[
                styles.chipText,
                { textAlign },
                eventId === e.id && styles.chipTextActive,
              ]}
              numberOfLines={2}
            >
              {e.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={[styles.stats, { flexDirection: rowDirection }]}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{summary.total}</Text>
          <Text style={styles.statLabel}>{t("attendance.totalScans")}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, styles.statSuccess]}>
            {summary.success}
          </Text>
          <Text style={styles.statLabel}>{t("attendance.successful")}</Text>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScanLogList
        scans={scans}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => void load(true)}
        showScanner
        emptyMessage={t("attendance.empty")}
        seatingEnabled={selectedEvent?.seatingEnabled}
        onGuideSeat={(target) => {
          setGuideTarget(target);
          setGuideVisible(true);
        }}
      />

      <SeatGuideModal
        visible={guideVisible}
        eventId={eventId}
        target={guideTarget}
        onClose={() => {
          setGuideVisible(false);
          setGuideTarget(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#faf8f5" },
  header: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#5c3d1e",
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "700" },
  subtitle: { color: "#e8dcc8", fontSize: 13, marginTop: 4 },
  eventPicker: {
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e8dcc8",
    maxWidth: 220,
  },
  chipActive: { backgroundColor: "#5c3d1e", borderColor: "#5c3d1e" },
  chipText: { fontSize: 12, color: "#5c3d1e" },
  chipTextActive: { color: "#fff" },
  stats: {
    gap: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e8dcc8",
    alignItems: "center",
  },
  statValue: { fontSize: 22, fontWeight: "700", color: "#5c3d1e" },
  statSuccess: { color: "#166534" },
  statLabel: { fontSize: 11, color: "#8b6914", marginTop: 4 },
  error: {
    color: "#991b1b",
    textAlign: "center",
    marginHorizontal: 12,
    marginBottom: 8,
  },
});
