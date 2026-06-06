import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { ApiError, fetchEventSeating, type SeatingMap } from "../api";
import { useI18n } from "../context/I18nContext";

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
  free: { bg: "#e8dcc8", text: "#5c3d1e" },
  approved: { bg: "#fef3c7", text: "#92400e" },
  attended: { bg: "#bbf7d0", text: "#166534" },
  highlight: { bg: "#d4a84b", text: "#fff" },
};

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
        e instanceof ApiError
          ? e.message
          : t("seatGuide.loadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [visible, eventId, t]);

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  const canvasWidth = Math.min(width - 32, 480);
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
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>{t("common.cancel")}</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { textAlign }]}>{t("seatGuide.title")}</Text>
        </View>

        {target ? (
          <View style={styles.guestBar}>
            <Text style={[styles.guestName, { textAlign }]}>{target.guestName}</Text>
            <Text style={[styles.seatLabel, { textAlign }]}>
              {t("common.seat", { label: target.seatLabel })}
            </Text>
          </View>
        ) : null}

        <ScrollView contentContainerStyle={styles.body}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#5c3d1e" />
            </View>
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : map && !map.seatingEnabled ? (
            <Text style={styles.error}>{t("seatGuide.notEnabled")}</Text>
          ) : map ? (
            <>
              <Text style={[styles.hint, { textAlign }]}>
                {t("seatGuide.hint")}
              </Text>

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
                  const colors = isTarget
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
                          backgroundColor: colors.bg,
                        },
                      ]}
                    >
                      <Text style={[styles.seatNumber, { color: colors.text }]}>
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
      </View>
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
  container: { flex: 1, backgroundColor: "#faf8f5" },
  header: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#5c3d1e",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  closeBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  closeText: { color: "#d4a84b", fontWeight: "600", fontSize: 15 },
  title: {
    flex: 1,
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  guestBar: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e8dcc8",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  guestName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#2c1810",
  },
  seatLabel: {
    fontSize: 14,
    color: "#b8860b",
    fontWeight: "600",
    marginTop: 4,
  },
  body: {
    padding: 16,
    alignItems: "center",
    paddingBottom: 32,
  },
  center: { paddingVertical: 48 },
  error: {
    color: "#991b1b",
    textAlign: "center",
    padding: 24,
  },
  hint: {
    fontSize: 13,
    color: "#8b6914",
    marginBottom: 12,
    lineHeight: 20,
  },
  canvas: {
    backgroundColor: "#f5f0e8",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e8dcc8",
    overflow: "hidden",
    position: "relative",
  },
  stage: {
    position: "absolute",
    backgroundColor: "#5c3d1e",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
    zIndex: 5,
  },
  stageLabel: {
    color: "#fff",
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
    borderColor: "#5c3d1e",
    width: 32,
    height: 32,
    marginLeft: -16,
    marginTop: -16,
    borderRadius: 16,
    zIndex: 20,
    elevation: 4,
    shadowColor: "#5c3d1e",
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
    gap: 12,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e8dcc8",
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
    fontSize: 11,
    color: "#5c3d1e",
  },
  directions: {
    marginTop: 16,
    fontSize: 14,
    color: "#2c1810",
    lineHeight: 22,
    fontWeight: "600",
  },
});
