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
import { useI18n } from "../context/I18nContext";
import {
  clearActivityLog,
  getActivityLog,
  type ActivityEntry,
  type ActivityType,
} from "../lib/activity-log";

export function ActivityLogScreen() {
  const { t, textAlign, rowDirection, dateLocale } = useI18n();
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

  function typeLabel(type: ActivityType) {
    return t(`activityLog.types.${type}`);
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
      <View style={[styles.toolbar, { flexDirection: rowDirection }]}>
        <TouchableOpacity onPress={() => void handleClear()}>
          <Text style={styles.clearBtn}>{t("activityLog.clearLog")}</Text>
        </TouchableOpacity>
        <Text style={styles.count}>
          {t("common.eventsCount", { count: entries.length })}
        </Text>
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
          <Text style={styles.empty}>{t("activityLog.empty")}</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={[styles.rowHeader, { flexDirection: rowDirection }]}>
              <Text style={styles.type}>{typeLabel(item.type)}</Text>
              <Text style={styles.time}>
                {new Date(item.at).toLocaleString(dateLocale, {
                  dateStyle: "short",
                  timeStyle: "medium",
                })}
              </Text>
            </View>
            <Text style={[styles.message, { textAlign }]}>{item.message}</Text>
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
    justifyContent: "space-between",
    marginBottom: 4,
  },
  type: { fontSize: 11, fontWeight: "700", color: "#5c3d1e" },
  time: { fontSize: 10, color: "#8b6914" },
  message: { fontSize: 13, color: "#2c1810" },
});
