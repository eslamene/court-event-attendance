import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from "react-native";
import { MapTrifold } from "phosphor-react-native";
import type { AttendanceScan } from "../api";
import { hasSeatAssignment } from "../api";
import { Button } from "./ui/Button";
import { LoadingState, EmptyState } from "./ui/States";
import { useI18n } from "../context/I18nContext";
import type { SeatGuideTarget } from "../api";
import { colors, radius, spacing, typography } from "../theme/tokens";

const RESULT_COLORS: Record<string, string> = {
  SUCCESS: colors.success,
  INVALID: colors.danger,
  ALREADY_USED: colors.warning,
  WRONG_EVENT: colors.warning,
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
      <View style={styles.listRoot}>
        <LoadingState />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.listRoot}
      data={scans}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />
      }
      contentContainerStyle={scans.length === 0 ? styles.emptyContainer : styles.list}
      ListEmptyComponent={<EmptyState message={emptyMessage} />}
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
                  { color: RESULT_COLORS[item.result] ?? colors.gold },
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
              <Button
                variant="primary"
                label={t("seatGuide.open")}
                icon={<MapTrifold size={16} color={colors.textOnGold} weight="duotone" />}
                onPress={() =>
                  onGuideSeat({
                    guestName: item.registration!.fullName,
                    seatLabel: item.registration!.seatLabel!,
                    seatTierId: item.registration!.seatTierId!,
                    seatNumber: item.registration!.seatNumber!,
                  })
                }
                style={styles.guideBtn}
                fullWidth={false}
              />
            ) : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  listRoot: { flex: 1 },
  list: { paddingBottom: spacing.lg },
  emptyContainer: { flexGrow: 1 },
  row: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowHeader: {
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  badge: { ...typography.micro, fontWeight: "700" },
  time: { ...typography.micro, color: colors.textMuted },
  name: {
    ...typography.bodyBold,
    color: colors.text,
  },
  meta: { ...typography.caption, color: colors.gold, marginTop: 2 },
  seat: {
    ...typography.captionBold,
    color: colors.goldAccent,
    marginTop: spacing.xs,
  },
  scanner: {
    ...typography.micro,
    color: colors.textMuted,
    marginTop: 6,
    fontStyle: "italic",
  },
  guideBtn: { marginTop: spacing.md, alignSelf: "flex-start" },
});
