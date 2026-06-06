import { useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Armchair,
  CalendarBlank,
  CaretDown,
  Check,
  X,
} from "phosphor-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "../../context/I18nContext";
import { AppLogo } from "./AppLogo";
import type { EventItem } from "../../api";
import { colors, layout, radius, shadows, spacing, typography } from "../../theme/tokens";

type Props = {
  events: EventItem[];
  eventId: string;
  onSelect: (id: string) => void;
  textAlign?: "left" | "right" | "center";
  rowDirection?: "row" | "row-reverse";
};

export function EventPicker({
  events,
  eventId,
  onSelect,
  textAlign = "left",
  rowDirection = "row",
}: Props) {
  const { t, dateLocale } = useI18n();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const slide = useRef(new Animated.Value(0)).current;

  const selected = events.find((event) => event.id === eventId) ?? null;

  useEffect(() => {
    if (open) {
      slide.setValue(0);
      Animated.spring(slide, {
        toValue: 1,
        useNativeDriver: true,
        damping: 22,
        stiffness: 220,
      }).start();
    }
  }, [open, slide]);

  function closeSheet() {
    Animated.timing(slide, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setOpen(false);
    });
  }

  function handleSelect(id: string) {
    onSelect(id);
    closeSheet();
  }

  function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString(dateLocale, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const sheetTranslateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [420, 0],
  });

  const backdropOpacity = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.45],
  });

  return (
    <>
      <View style={styles.wrap}>
        <Pressable
          style={({ pressed }) => [
            styles.trigger,
            pressed && styles.triggerPressed,
            !selected && styles.triggerEmpty,
          ]}
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t("eventPicker.open")}
          accessibilityHint={selected?.name ?? t("common.selectEvent")}
        >
          <View style={[styles.triggerRow, { flexDirection: rowDirection }]}>
            <AppLogo
              uri={selected?.logoPath}
              variant={selected?.logoPath ? "event" : "platform"}
              size={44}
              accessibilityLabel={
                selected?.logoPath
                  ? t("branding.eventLogo", { name: selected.name })
                  : t("branding.platformLogo")
              }
            />
            <View style={styles.triggerText}>
              <Text style={[styles.triggerLabel, { textAlign }]}>
                {t("eventPicker.label")}
              </Text>
              <Text
                style={[styles.triggerValue, { textAlign }]}
                numberOfLines={2}
              >
                {selected?.name ?? t("common.selectEvent")}
              </Text>
            </View>
            <CaretDown size={18} color={colors.goldLight} weight="bold" />
          </View>
        </Pressable>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={closeSheet}
        statusBarTranslucent
      >
        <View style={styles.modalRoot}>
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
          </Animated.View>

          <Animated.View
            style={[
              styles.sheet,
              {
                paddingBottom: Math.max(insets.bottom, spacing.lg),
                transform: [{ translateY: sheetTranslateY }],
              },
            ]}
          >
            <View style={styles.handle} />

            <View style={[styles.sheetHeader, { flexDirection: rowDirection }]}>
              <Text style={[styles.sheetTitle, { textAlign }]}>
                {t("eventPicker.title")}
              </Text>
              <Pressable
                onPress={closeSheet}
                style={styles.closeBtn}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("common.cancel")}
              >
                <X size={20} color={colors.goldLight} weight="bold" />
              </Pressable>
            </View>

            {events.length === 0 ? (
              <View style={styles.emptyWrap}>
                <CalendarBlank size={40} color={colors.goldLight} weight="duotone" />
                <Text style={[styles.emptyText, { textAlign }]}>
                  {t("eventPicker.noEvents")}
                </Text>
              </View>
            ) : (
              <FlatList
                data={events}
                keyExtractor={(item) => item.id}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                renderItem={({ item }) => {
                  const active = item.id === eventId;
                  const dateLabel = formatDate(item.date);

                  return (
                    <Pressable
                      style={({ pressed }) => [
                        styles.option,
                        active && styles.optionActive,
                        pressed && styles.optionPressed,
                      ]}
                      onPress={() => handleSelect(item.id)}
                    >
                      <View style={[styles.optionRow, { flexDirection: rowDirection }]}>
                        <AppLogo
                          uri={item.logoPath}
                          variant={item.logoPath ? "event" : "platform"}
                          size={40}
                          accessibilityLabel={t("branding.eventLogo", {
                            name: item.name,
                          })}
                        />
                        <View style={styles.optionText}>
                          <Text
                            style={[
                              styles.optionName,
                              { textAlign },
                              active && styles.optionNameActive,
                            ]}
                            numberOfLines={2}
                          >
                            {item.name}
                          </Text>
                          {dateLabel ? (
                            <Text style={[styles.optionDate, { textAlign }]}>
                              {dateLabel}
                            </Text>
                          ) : null}
                          {item.seatingEnabled ? (
                            <View
                              style={[
                                styles.badgeRow,
                                { flexDirection: rowDirection, alignSelf: textAlign === "center" ? "center" : textAlign === "right" ? "flex-end" : "flex-start" },
                              ]}
                            >
                              <Armchair size={12} color={colors.goldAccent} weight="duotone" />
                              <Text style={styles.badgeText}>
                                {t("eventPicker.seated")}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        {active ? (
                          <Check size={22} color={colors.goldAccent} weight="bold" />
                        ) : (
                          <View style={styles.checkPlaceholder} />
                        )}
                      </View>
                    </Pressable>
                  );
                }}
              />
            )}
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  trigger: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: layout.minTouchTarget,
    ...shadows.card,
  },
  triggerPressed: { opacity: 0.92 },
  triggerEmpty: { borderStyle: "dashed" },
  triggerRow: {
    alignItems: "center",
    gap: spacing.md,
  },
  triggerText: { flex: 1, minWidth: 0 },
  triggerLabel: {
    ...typography.micro,
    color: colors.textMuted,
    marginBottom: 2,
  },
  triggerValue: {
    ...typography.bodyBold,
    color: colors.text,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: "78%",
    paddingTop: spacing.sm,
    ...shadows.card,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  sheetHeader: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  sheetTitle: {
    ...typography.heading,
    color: colors.text,
    flex: 1,
  },
  closeBtn: {
    minWidth: layout.minTouchTarget,
    minHeight: layout.minTouchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { flexGrow: 0 },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  separator: { height: spacing.sm },
  option: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
    padding: spacing.md,
    minHeight: layout.minTouchTarget,
  },
  optionActive: {
    borderColor: colors.goldAccent,
    backgroundColor: colors.creamDark,
  },
  optionPressed: { opacity: 0.9 },
  optionRow: {
    alignItems: "center",
    gap: spacing.md,
  },
  optionText: { flex: 1, minWidth: 0 },
  optionName: {
    ...typography.bodyBold,
    color: colors.text,
  },
  optionNameActive: { color: colors.gold },
  optionDate: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  badgeRow: {
    alignItems: "center",
    gap: 4,
    marginTop: spacing.sm,
  },
  badgeText: {
    ...typography.micro,
    color: colors.goldAccent,
    fontWeight: "600",
  },
  checkPlaceholder: { width: 22 },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
  },
});
