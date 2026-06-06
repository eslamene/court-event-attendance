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
import { useEventContext } from "../context/EventContext";
import { getToken, clearSession } from "../storage";

type Props = {
  onLogout: () => void;
};

export function MyScansScreen({ onLogout }: Props) {
  const { events, eventId, setEventId, selectedEvent } = useEventContext();
  const [scans, setScans] = useState<AttendanceScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

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
        setError(e instanceof Error ? e.message : "تعذّر تحميل مسوحاتك");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [eventId, onLogout]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const successCount = scans.filter((s) => s.result === "SUCCESS").length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>مسوحاتي</Text>
        <Text style={styles.subtitle}>
          {selectedEvent?.name ?? "اختر فعالية"}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.eventPicker}
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
                eventId === e.id && styles.chipTextActive,
              ]}
              numberOfLines={2}
            >
              {e.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          {scans.length} مسح · {successCount} ناجح
        </Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScanLogList
        scans={scans}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => void load(true)}
        emptyMessage="لم تقم بأي مسح لهذه الفعالية بعد"
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
  title: { color: "#fff", fontSize: 18, fontWeight: "700", textAlign: "right" },
  subtitle: { color: "#e8dcc8", fontSize: 13, textAlign: "right", marginTop: 4 },
  eventPicker: {
    flexDirection: "row-reverse",
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
  chipText: { fontSize: 12, color: "#5c3d1e", textAlign: "right" },
  chipTextActive: { color: "#fff" },
  summaryBar: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e8dcc8",
  },
  summaryText: {
    textAlign: "center",
    color: "#5c3d1e",
    fontWeight: "600",
    fontSize: 13,
  },
  error: {
    color: "#991b1b",
    textAlign: "center",
    marginHorizontal: 12,
    marginBottom: 8,
  },
});
