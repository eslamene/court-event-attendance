import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import type { AttendanceScan } from "../api";
import { hasSeatAssignment } from "../api";
import { useI18n } from "../context/I18nContext";
import type { SeatGuideTarget } from "./SeatGuideModal";

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
  seatingEnabled?: boolean;
  onGuideSeat?: (target: SeatGuideTarget) => void;
};

export function ScanLogList({
  scans,
  loading,
  refreshing,
  onRefresh,
  showScanner = false,
  emptyMessage,
  seatingEnabled = false,
  onGuideSeat,
}: Props) {
  const { t, textAlign, rowDirection, dateLocale } = useI18n();

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
      ListEmptyComponent={<Text style={styles.empty}>{emptyMessage}</Text>}
      renderItem={({ item }) => {
        const name = item.registration?.fullName ?? item.judgeName ?? "—";
        const time = new Date(item.scannedAt).toLocaleString(dateLocale, {
          dateStyle: "short",
          timeStyle: "short",
        });
        return (
          <View style={styles.row}>
            <View style={[styles.rowHeader, { flexDirection: rowDirection }]}>
              <Text
                style={[
                  styles.badge,
                  { color: RESULT_COLORS[item.result] ?? "#5c3d1e" },
                ]}
              >
                {t(`scanResult.${item.result}`)}
              </Text>
              <Text style={styles.time}>{time}</Text>
            </View>
            <Text style={[styles.name, { textAlign }]}>{name}</Text>
            {item.registration?.rank ? (
              <Text style={[styles.meta, { textAlign }]}>
                {item.registration.rank}
              </Text>
            ) : null}
            {item.registration?.entity ? (
              <Text style={[styles.meta, { textAlign }]}>
                {item.registration.entity}
              </Text>
            ) : null}
            {item.registration?.seatLabel ? (
              <Text style={[styles.seat, { textAlign }]}>
                {t("common.seat", { label: item.registration.seatLabel })}
              </Text>
            ) : null}
            {showScanner ? (
              <Text style={[styles.scanner, { textAlign }]}>
                {t("common.scannedBy", { name: item.scannedBy.name })}
              </Text>
            ) : null}
            {seatingEnabled &&
            onGuideSeat &&
            item.registration &&
            hasSeatAssignment(item.registration) ? (
              <TouchableOpacity
                style={styles.guideBtn}
                onPress={() =>
                  onGuideSeat({
                    guestName: item.registration!.fullName,
                    seatLabel: item.registration!.seatLabel!,
                    seatTierId: item.registration!.seatTierId!,
                    seatNumber: item.registration!.seatNumber!,
                  })
                }
              >
                <Text style={styles.guideBtnText}>{t("seatGuide.open")}</Text>
              </TouchableOpacity>
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
  },
  meta: { fontSize: 12, color: "#5c3d1e", marginTop: 2 },
  seat: {
    fontSize: 12,
    color: "#b8860b",
    marginTop: 4,
    fontWeight: "600",
  },
  scanner: {
    fontSize: 11,
    color: "#8b6914",
    marginTop: 6,
    fontStyle: "italic",
  },
  guideBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "#5c3d1e",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  guideBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});
