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
import { Armchair, CaretLeft, CaretRight, X } from "phosphor-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError, fetchEventSeating, type SeatingMap, type SeatGuideTarget } from "../api";
import { SeatingVenueView } from "./SeatingVenueView";
import { Button } from "./ui/Button";
import { LoadingState } from "./ui/States";
import { useI18n } from "../context/I18nContext";
import {
  capacityProfileLabelKey,
  shouldRenderMobileDotMap,
  usesSectionOverview,
} from "../lib/seating-capacity";
import { colors, layout, radius, spacing, typography } from "../theme/tokens";

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

export type { SeatGuideTarget } from "../api";

export function SeatGuideModal({ visible, eventId, target, onClose }: Props) {
  const { t, textAlign, isRTL } = useI18n();
  const { width } = useWindowDimensions();
  const [map, setMap] = useState<SeatingMap | null>(null);
  const [focusedTierId, setFocusedTierId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const BackIcon = isRTL ? CaretRight : CaretLeft;

  const load = useCallback(async () => {
    if (!visible || !eventId) return;
    setLoading(true);
    setError("");
    setFocusedTierId(null);

    try {
      const focus = target
        ? { seatTierId: target.seatTierId, seatNumber: target.seatNumber }
        : undefined;

      let data = await fetchEventSeating(eventId, { focus });

      if (target && data.venue.renderMode === "sections") {
        const tier = data.tiers?.find((item) => item.id === target.seatTierId);
        if (tier && shouldRenderMobileDotMap(tier.seatCount)) {
          data = await fetchEventSeating(eventId, {
            focus,
            tierId: target.seatTierId,
          });
          setFocusedTierId(target.seatTierId);
        }
      }

      setMap(data);
    } catch (e) {
      setMap(null);
      setError(e instanceof ApiError ? e.message : t("seatGuide.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [visible, eventId, target, t]);

  const loadTier = useCallback(
    async (tierId: string | null) => {
      if (!visible || !eventId) return;
      setLoading(true);
      setError("");
      try {
        const focus = target
          ? { seatTierId: target.seatTierId, seatNumber: target.seatNumber }
          : undefined;
        const data = await fetchEventSeating(eventId, {
          focus,
          tierId: tierId ?? undefined,
        });
        setFocusedTierId(tierId);
        setMap(data);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : t("seatGuide.loadFailed"));
      } finally {
        setLoading(false);
      }
    },
    [visible, eventId, target, t]
  );

  useEffect(() => {
    if (visible) void load();
  }, [visible, eventId, target]);

  const canvasWidth = Math.min(width - spacing.xl * 2, 480);
  const canvasHeight = canvasWidth * 0.68;

  const highlight =
    target && map
      ? map.venue.seats.find(
          (s) =>
            s.tierId === target.seatTierId && s.number === target.seatNumber
        )
      : null;

  const focusedTier =
    focusedTierId && map?.tiers
      ? map.tiers.find((tier) => tier.id === focusedTierId)
      : null;

  const isSectionOverview =
    map?.venue.renderMode === "sections" && !map.venue.focusedTierId;

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
              {map.totalSeats != null && usesSectionOverview(map.totalSeats) ? (
                <Text style={[styles.metaHint, { textAlign }]}>
                  {t("seating.largeVenueMapHint", { total: map.totalSeats })}
                </Text>
              ) : null}

              {map.capacityProfile && map.capacityProfile !== "small" ? (
                <View style={styles.badgeRow}>
                  <Text style={styles.capacityBadge}>
                    {t(capacityProfileLabelKey(map.capacityProfile))}
                  </Text>
                  {map.totalSeats != null ? (
                    <Text style={styles.totalSeats}>
                      {t("seating.totalSeatsLabel", { count: map.totalSeats })}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {focusedTier ? (
                <Pressable
                  style={[styles.backRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}
                  onPress={() => void loadTier(null)}
                >
                  <BackIcon size={16} color={colors.goldAccent} weight="bold" />
                  <Text style={styles.backText}>{t("seating.sectionBack")}</Text>
                  <Text style={styles.focusedTierName} numberOfLines={1}>
                    {focusedTier.name}
                  </Text>
                </Pressable>
              ) : null}

              <Text style={[styles.hint, { textAlign }]}>
                {target
                  ? t("seatGuide.hint")
                  : isSectionOverview
                    ? t("seating.sectionOverviewHint")
                    : t("seatGuide.hint")}
              </Text>

              <SeatingVenueView
                map={map}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                target={target}
                highlightTierId={target?.seatTierId}
                onSelectSection={
                  isSectionOverview ? (tierId) => void loadTier(tierId) : undefined
                }
              />

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

              {map.tiers && map.tiers.length > 1 && isSectionOverview ? (
                <View style={styles.tierList}>
                  {map.tiers.map((tier) => (
                    <Button
                      key={tier.id}
                      variant="secondary"
                      label={`${tier.name} · ${t("seating.tierStats", {
                        assigned: tier.assigned,
                        total: tier.seatCount,
                      })}`}
                      onPress={() => void loadTier(tier.id)}
                      fullWidth
                      style={styles.tierBtn}
                    />
                  ))}
                </View>
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
  metaHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    alignSelf: "stretch",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.sm,
    alignSelf: "stretch",
  },
  capacityBadge: {
    ...typography.micro,
    fontWeight: "700",
    color: colors.gold,
    backgroundColor: colors.creamDark,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    overflow: "hidden",
  },
  totalSeats: {
    ...typography.micro,
    color: colors.textMuted,
    alignSelf: "center",
  },
  backRow: {
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
    alignSelf: "stretch",
  },
  backText: {
    ...typography.captionBold,
    color: colors.goldAccent,
  },
  focusedTierName: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 20,
    alignSelf: "stretch",
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
  tierList: {
    marginTop: spacing.lg,
    gap: spacing.sm,
    width: "100%",
  },
  tierBtn: { alignSelf: "stretch" },
});
