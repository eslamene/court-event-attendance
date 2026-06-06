import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import type { AttendanceScan } from "../api";

const RESULT_LABELS: Record<string, string> = {
  SUCCESS: "حضور مسجّل",
  INVALID: "رمز غير صالح",
  ALREADY_USED: "مستخدم مسبقاً",
  WRONG_EVENT: "فعالية أخرى",
};

const RESULT_COLORS: Record<string, string> = {
  SUCCESS: "#166534",
  INVALID: "#991b1b",
  ALREADY_USED: "#b45309",
  WRONG_EVENT: "#b45309",
};

type Props = {
  scans: AttendanceScan[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  showScanner?: boolean;
  emptyMessage: string;
};

export function ScanLogList({
  scans,
  loading,
  refreshing,
  onRefresh,
  showScanner = false,
  emptyMessage,
}: Props) {
  if (loading && scans.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#5c3d1e" size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={scans}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={scans.length === 0 ? styles.emptyContainer : undefined}
      ListEmptyComponent={
        <Text style={styles.empty}>{emptyMessage}</Text>
      }
      renderItem={({ item }) => {
        const name =
          item.registration?.fullName ?? item.judgeName ?? "—";
        const time = new Date(item.scannedAt).toLocaleString("ar-EG", {
          dateStyle: "short",
          timeStyle: "short",
        });

        return (
          <View style={styles.row}>
            <View style={styles.rowHeader}>
              <Text
                style={[
                  styles.badge,
                  { color: RESULT_COLORS[item.result] ?? "#5c3d1e" },
                ]}
              >
                {RESULT_LABELS[item.result] ?? item.result}
              </Text>
              <Text style={styles.time}>{time}</Text>
            </View>
            <Text style={styles.name}>{name}</Text>
            {item.registration?.rank ? (
              <Text style={styles.meta}>{item.registration.rank}</Text>
            ) : null}
            {item.registration?.entity ? (
              <Text style={styles.meta}>{item.registration.entity}</Text>
            ) : null}
            {item.registration?.seatLabel ? (
              <Text style={styles.seat}>
                المقعد: {item.registration.seatLabel}
              </Text>
            ) : null}
            {showScanner ? (
              <Text style={styles.scanner}>
                المسح بواسطة: {item.scannedBy.name}
              </Text>
            ) : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { flexGrow: 1, justifyContent: "center" },
  empty: {
    textAlign: "center",
    color: "#8b6914",
    fontSize: 15,
    padding: 24,
  },
  row: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8dcc8",
  },
  rowHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  badge: { fontSize: 11, fontWeight: "700" },
  time: { fontSize: 11, color: "#8b6914" },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2c1810",
    textAlign: "right",
  },
  meta: { fontSize: 12, color: "#5c3d1e", textAlign: "right", marginTop: 2 },
  seat: {
    fontSize: 12,
    color: "#b8860b",
    textAlign: "right",
    marginTop: 4,
    fontWeight: "600",
  },
  scanner: {
    fontSize: 11,
    color: "#8b6914",
    textAlign: "right",
    marginTop: 6,
    fontStyle: "italic",
  },
});
