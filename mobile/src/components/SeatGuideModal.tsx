import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Armchair, X } from "phosphor-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError, fetchEventSeating, type SeatingMap } from "../api";
import { LoadingState } from "./ui/States";
import { useI18n } from "../context/I18nContext";
import { colors, layout, radius, spacing, typography } from "../theme/tokens";

export type SeatGuideTarget = {
  guestName: string;
  seatLabel: string;
  seatTierId: string;
  seatNumber: number;
};

type Props = {
  visible: boolean;
  eventId: string;
  target: SeatGuideTarget | null;
  onClose: () => void;
};

const SEAT_COLORS = {
  free: { bg: colors.creamDark, text: colors.gold },
  approved: { bg: colors.warningBg, text: colors.warning },
  attended: { bg: colors.attendedBg, text: colors.attended },
  highlight: { bg: colors.goldAccent, text: colors.textOnGold },
} as const;

export function SeatGuideModal({ visible, eventId, target, onClose }: Props) {
  const { t, textAlign } = useI18n();
  const { width } = useWindowDimensions();
  const [map, setMap] = useState<SeatingMap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!visible || !eventId) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchEventSeating(eventId);
      setMap(data);
    } catch (e) {
      setMap(null);
      setError(
        e instanceof ApiError ? e.message : t("seatGuide.loadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [visible, eventId, t]);

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  const canvasWidth = Math.min(width - spacing.xl * 2, 480);
  const canvasHeight = canvasWidth * 0.68;

  const highlight =
    target && map
      ? map.venue.seats.find(
          (s) =>
            s.tierId === target.seatTierId && s.number === target.seatNumber
        )
      : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <Text style={[styles.title, { textAlign }]} numberOfLines={2}>
            {t("seatGuide.title")}
          </Text>
          <Pressable
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("common.cancel")}
          >
            <X size={22} color={colors.goldAccent} weight="bold" />
          </Pressable>
        </View>

        {target ? (
          <View style={styles.guestBar}>
            <View style={styles.guestRow}>
              <Armchair size={20} color={colors.goldAccent} weight="duotone" />
              <View style={styles.guestText}>
                <Text style={[styles.guestName, { textAlign }]} numberOfLines={2}>
                  {target.guestName}
                </Text>
                <Text style={[styles.seatLabel, { textAlign }]}>
                  {t("common.seat", { label: target.seatLabel })}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <LoadingState />
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : map && !map.seatingEnabled ? (
            <Text style={styles.error}>{t("seatGuide.notEnabled")}</Text>
          ) : map ? (
            <>
              <Text style={[styles.hint, { textAlign }]}>{t("seatGuide.hint")}</Text>

              <View
                style={[
                  styles.canvas,
                  { width: canvasWidth, height: canvasHeight },
                ]}
              >
                <View
                  style={[
                    styles.stage,
                    {
                      left: `${map.venue.stage.x}%`,
                      top: `${map.venue.stage.y}%`,
                      width: `${map.venue.stage.width}%`,
                      height: `${map.venue.stage.height}%`,
                    },
                  ]}
                >
                  <Text style={styles.stageLabel} numberOfLines={2}>
                    {map.venue.stage.label || t("seatGuide.stage")}
                  </Text>
                </View>

                {map.venue.seats.map((pos) => {
                  const isTarget =
                    target &&
                    pos.tierId === target.seatTierId &&
                    pos.number === target.seatNumber;
                  const seatColors = isTarget
                    ? SEAT_COLORS.highlight
                    : SEAT_COLORS[pos.seat.status];

                  return (
                    <View
                      key={`${pos.tierId}-${pos.number}`}
                      style={[
                        styles.seatDot,
                        isTarget && styles.seatHighlight,
                        {
                          left: `${pos.x}%`,
                          top: `${pos.y}%`,
                          backgroundColor: seatColors.bg,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.seatNumber, { color: seatColors.text }]}
                      >
                        {pos.number}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.legend}>
                <LegendItem
                  color={SEAT_COLORS.highlight.bg}
                  label={t("seatGuide.yourSeat")}
                />
                <LegendItem
                  color={SEAT_COLORS.attended.bg}
                  label={t("seatGuide.attended")}
                />
                <LegendItem
                  color={SEAT_COLORS.approved.bg}
                  label={t("seatGuide.reserved")}
                />
                <LegendItem
                  color={SEAT_COLORS.free.bg}
                  label={t("seatGuide.free")}
                />
              </View>

              {highlight ? (
                <Text style={[styles.directions, { textAlign }]}>
                  {t("seatGuide.directions", {
                    tier: highlight.tierName,
                    number: highlight.number,
                  })}
                </Text>
              ) : target ? (
                <Text style={[styles.directions, { textAlign }]}>
                  {t("seatGuide.seatNotOnMap")}
                </Text>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.gold,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  closeBtn: {
    minWidth: layout.minTouchTarget,
    minHeight: layout.minTouchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...typography.heading,
    flex: 1,
    color: colors.textOnGold,
  },
  guestBar: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  guestRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  guestText: { flex: 1, minWidth: 0 },
  guestName: {
    ...typography.bodyBold,
    fontSize: 17,
    color: colors.text,
  },
  seatLabel: {
    ...typography.captionBold,
    color: colors.goldAccent,
    marginTop: spacing.xs,
  },
  body: {
    padding: spacing.lg,
    alignItems: "center",
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  error: {
    color: colors.danger,
    textAlign: "center",
    padding: spacing.xl,
    ...typography.body,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 20,
    alignSelf: "stretch",
  },
  canvas: {
    backgroundColor: colors.creamDark,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    position: "relative",
  },
  stage: {
    position: "absolute",
    backgroundColor: colors.gold,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xs,
    zIndex: 5,
  },
  stageLabel: {
    color: colors.textOnGold,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  seatDot: {
    position: "absolute",
    width: 26,
    height: 26,
    marginLeft: -13,
    marginTop: -13,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(92, 61, 30, 0.2)",
    zIndex: 10,
  },
  seatHighlight: {
    borderWidth: 3,
    borderColor: colors.gold,
    width: 32,
    height: 32,
    marginLeft: -16,
    marginTop: -16,
    borderRadius: 16,
    zIndex: 20,
    elevation: 4,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  seatNumber: {
    fontSize: 9,
    fontWeight: "700",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    width: "100%",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "rgba(92, 61, 30, 0.25)",
  },
  legendText: {
    ...typography.micro,
    color: colors.gold,
  },
  directions: {
    marginTop: spacing.lg,
    ...typography.bodyBold,
    color: colors.text,
    lineHeight: 22,
  },
});
