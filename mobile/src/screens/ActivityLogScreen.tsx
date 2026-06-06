import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import {
  clearActivityLog,
  getActivityLog,
  type ActivityEntry,
} from "../lib/activity-log";

const TYPE_LABELS: Record<string, string> = {
  login: "تسجيل دخول",
  logout: "تسجيل خروج",
  biometric_login: "دخول بيومتري",
  scan_success: "مسح ناجح",
  scan_warning: "مسح تحذير",
  scan_error: "مسح فاشل",
  offline_queue: "حفظ دون اتصال",
  sync: "مزامنة",
  settings: "إعدادات",
  session_refresh: "تحديث الجلسة",
  error: "خطأ",
};

export function ActivityLogScreen() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const log = await getActivityLog();
    setEntries(log);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleClear() {
    await clearActivityLog();
    setEntries([]);
  }

  if (loading && entries.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#5c3d1e" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => void handleClear()}>
          <Text style={styles.clearBtn}>مسح السجل</Text>
        </TouchableOpacity>
        <Text style={styles.count}>{entries.length} حدث</Text>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
          />
        }
        contentContainerStyle={
          entries.length === 0 ? styles.emptyContainer : undefined
        }
        ListEmptyComponent={
          <Text style={styles.empty}>لا يوجد نشاط مسجّل بعد</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={styles.type}>
                {TYPE_LABELS[item.type] ?? item.type}
              </Text>
              <Text style={styles.time}>
                {new Date(item.at).toLocaleString("ar-EG", {
                  dateStyle: "short",
                  timeStyle: "medium",
                })}
              </Text>
            </View>
            <Text style={styles.message}>{item.message}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#faf8f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  toolbar: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  clearBtn: { color: "#991b1b", fontWeight: "600" },
  count: { color: "#8b6914", fontSize: 12 },
  emptyContainer: { flexGrow: 1, justifyContent: "center" },
  empty: { textAlign: "center", color: "#8b6914", padding: 24 },
  row: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e8dcc8",
  },
  rowHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  type: { fontSize: 11, fontWeight: "700", color: "#5c3d1e" },
  time: { fontSize: 10, color: "#8b6914" },
  message: { fontSize: 13, color: "#2c1810", textAlign: "right" },
});
