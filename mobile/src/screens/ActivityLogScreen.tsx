import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
} from "react-native";
import { Trash } from "phosphor-react-native";
import { BackHeader, Screen, ScreenBody } from "../components/ui/Screen";
import { LoadingState, EmptyState } from "../components/ui/States";
import { useI18n } from "../context/I18nContext";
import {
  clearActivityLog,
  getActivityLog,
  type ActivityEntry,
  type ActivityType,
} from "../lib/activity-log";
import { colors, radius, spacing, typography } from "../theme/tokens";

type Props = {
  onBack: () => void;
};

export function ActivityLogScreen({ onBack }: Props) {
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
      <Screen>
        <BackHeader title={t("settings.activityLog")} onBack={onBack} textAlign={textAlign} />
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen>
      <BackHeader title={t("settings.activityLog")} onBack={onBack} textAlign={textAlign} />

      <View style={[styles.toolbar, { flexDirection: rowDirection }]}>
        <Pressable
          style={styles.clearBtn}
          onPress={() => void handleClear()}
          hitSlop={8}
        >
          <Trash size={16} color={colors.danger} weight="duotone" />
          <Text style={styles.clearText}>{t("activityLog.clearLog")}</Text>
        </Pressable>
        <Text style={styles.count}>
          {t("activityLog.entryCount", { count: entries.length })}
        </Text>
      </View>

      <ScreenBody>
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
              tintColor={colors.gold}
            />
          }
          contentContainerStyle={
            entries.length === 0 ? styles.emptyContainer : styles.list
          }
          ListEmptyComponent={<EmptyState message={t("activityLog.empty")} />}
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
      </ScreenBody>
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44 },
  clearText: { color: colors.danger, fontWeight: "600" },
  count: { ...typography.caption, color: colors.textMuted },
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
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  type: { ...typography.micro, fontWeight: "700", color: colors.gold },
  time: { fontSize: 10, color: colors.goldLight },
  message: { ...typography.caption, color: colors.text },
});
