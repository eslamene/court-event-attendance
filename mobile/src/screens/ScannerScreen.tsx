import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Vibration,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import {
  CheckCircle,
  Warning,
  XCircle,
  CloudArrowDown,
  QrCode,
  MapTrifold,
  User,
} from "phosphor-react-native";
import {
  ApiError,
  formatRegistrationDetails,
  fetchSession,
  hasSeatAssignment,
  isNetworkError,
  scanQr,
  type ScanRegistration,
  type ScanResult,
  type ScanResultCode,
} from "../api";
import {
  SeatGuideModal,
  type SeatGuideTarget,
} from "../components/SeatGuideModal";
import { AppHeader, Screen, ScreenBody } from "../components/ui/Screen";
import { Button } from "../components/ui/Button";
import { EventPicker } from "../components/ui/EventPicker";
import { extractQrToken, isLikelyQrPayload } from "../qr";
import { useEventContext } from "../context/EventContext";
import { useI18n } from "../context/I18nContext";
import { logActivity } from "../lib/activity-log";
import {
  clearSession,
  enqueueOfflineScan,
  getOfflineQueue,
  getToken,
  getUser,
  saveEvents,
  saveUser,
} from "../storage";
import { syncOfflineQueue } from "../offline";
import { colors, layout, radius, spacing, typography } from "../theme/tokens";

type Props = {
  onLogout: () => void;
};

type Feedback = "idle" | "success" | "warning" | "error" | "offline";

type RecentScan = {
  id: string;
  at: string;
  result: ScanResultCode;
  message: string;
  name?: string;
  seatLabel?: string | null;
};

export function ScannerScreen({ onLogout }: Props) {
  const { events, eventId, setEventId, selectedEvent, refreshEvents } =
    useEventContext();
  const { t, textAlign, rowDirection, dateLocale } = useI18n();
  const { width } = useWindowDimensions();
  const compact = width < layout.compactWidth;
  const [permission, requestPermission] = useCameraPermissions();
  const [userName, setUserName] = useState("");
  const [feedback, setFeedback] = useState<Feedback>("idle");
  const [message, setMessage] = useState("");
  const [details, setDetails] = useState("");
  const [resultCode, setResultCode] = useState<ScanResultCode | null>(null);
  const [scanning, setScanning] = useState(true);
  const [pendingSync, setPendingSync] = useState(0);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [guideTarget, setGuideTarget] = useState<SeatGuideTarget | null>(null);
  const [guideVisible, setGuideVisible] = useState(false);
  const [lastSeatRegistration, setLastSeatRegistration] =
    useState<ScanRegistration | null>(null);
  const lastScan = useRef(0);

  const eventHasSeating = Boolean(selectedEvent?.seatingEnabled);

  function openSeatGuide(reg?: ScanRegistration | null) {
    if (!reg || !hasSeatAssignment(reg)) return;
    setGuideTarget({
      guestName: reg.fullName,
      seatLabel: reg.seatLabel,
      seatTierId: reg.seatTierId,
      seatNumber: reg.seatNumber,
    });
    setGuideVisible(true);
  }

  useEffect(() => {
    if (feedback === "idle") {
      setMessage(t("scanner.pointCamera"));
    }
  }, [t, feedback]);

  const formatSeat = useCallback(
    (label: string) => t("common.seat", { label }),
    [t]
  );

  const refreshPendingCount = useCallback(async () => {
    const queue = await getOfflineQueue();
    setPendingSync(queue.length);
  }, []);

  const refreshSession = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      onLogout();
      return;
    }

    try {
      const session = await fetchSession(token);
      await saveUser(session.user);
      await saveEvents(session.events);
      setUserName(session.user.name);
      await refreshEvents();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearSession();
        onLogout();
      }
    }
  }, [onLogout, refreshEvents]);

  const load = useCallback(async () => {
    const [user, token] = await Promise.all([getUser(), getToken()]);
    setUserName(user?.name ?? "");
    await refreshEvents();
    await refreshPendingCount();

    if (token) {
      const sync = await syncOfflineQueue(token);
      await refreshPendingCount();
      if (sync.sessionExpired) {
        await clearSession();
        onLogout();
        return;
      }
      await refreshSession();
    }
  }, [onLogout, refreshPendingCount, refreshSession]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => {
      void load();
    }, 15000);
    return () => clearInterval(interval);
  }, [load]);

  function pushRecentScan(scan: RecentScan) {
    setRecentScans((prev) => [scan, ...prev].slice(0, 8));
  }

  function applyScanResult(result: ScanResult, raw: string) {
    setResultCode(result.result);
    setLastSeatRegistration(
      result.registration && hasSeatAssignment(result.registration)
        ? result.registration
        : null
    );

    if (result.success) {
      setFeedback("success");
      setMessage(result.message);
      setDetails(formatRegistrationDetails(result.registration, formatSeat));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Vibration.vibrate(200);
      void logActivity("scan_success", result.message, {
        name: result.registration?.fullName ?? "",
      });
      pushRecentScan({
        id: raw,
        at: new Date().toLocaleTimeString(dateLocale),
        result: result.result,
        message: result.message,
        name: result.registration?.fullName,
        seatLabel: result.registration?.seatLabel,
      });
      return;
    }

    if (result.result === "ALREADY_USED" || result.result === "WRONG_EVENT") {
      setFeedback("warning");
    } else {
      setFeedback("error");
    }

    setMessage(result.message);
    setDetails(
      result.registration
        ? formatRegistrationDetails(result.registration, formatSeat)
        : ""
    );
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Vibration.vibrate([0, 80, 80, 80]);
    void logActivity(
      result.result === "INVALID" ? "scan_error" : "scan_warning",
      result.message
    );

    pushRecentScan({
      id: raw,
      at: new Date().toLocaleTimeString(dateLocale),
      result: result.result,
      message: result.message,
      name: result.registration?.fullName,
    });
  }

  async function handleScan(raw: string) {
    const now = Date.now();
    if (now - lastScan.current < 2500) return;
    lastScan.current = now;

    if (!eventId) {
      setFeedback("error");
      setMessage(t("scanner.selectEventFirst"));
      setResultCode(null);
      return;
    }

    const qrToken = extractQrToken(raw);
    if (!isLikelyQrPayload(raw)) {
      setFeedback("error");
      setMessage(t("scanner.unknownQr"));
      setDetails("");
      setResultCode("INVALID");
      setScanning(false);
      setTimeout(() => {
        setFeedback("idle");
        setMessage(t("scanner.pointCamera"));
        setDetails("");
        setResultCode(null);
        setScanning(true);
      }, 2500);
      return;
    }

    setScanning(false);
    const token = await getToken();
    const offlineId = `offline-${now}-${Math.random().toString(36).slice(2)}`;
    const scannedAt = new Date().toISOString();

    try {
      if (!token) throw new ApiError(t("scanner.sessionExpired"), 401);

      const result = await scanQr(token, {
        qrToken,
        eventId,
        offlineId,
        scannedAt,
      });

      applyScanResult(result, qrToken);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearSession();
        onLogout();
        return;
      }

      if (isNetworkError(error)) {
        await enqueueOfflineScan({
          offlineId,
          qrToken,
          eventId,
          scannedAt,
        });
        await refreshPendingCount();
        void logActivity("offline_queue", t("scanner.offlineQueueActivity"));
        setFeedback("offline");
        setMessage(t("scanner.offlineSaved"));
        setDetails("");
        setResultCode(null);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }

      setFeedback("error");
      setMessage(
        error instanceof Error ? error.message : t("scanner.scanFailed")
      );
      setDetails("");
      setResultCode(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    setTimeout(() => {
      setFeedback("idle");
      setMessage(t("scanner.pointCamera"));
      setDetails("");
      setResultCode(null);
      setScanning(true);
    }, 4000);
  }

  if (!permission?.granted) {
    return (
      <Screen style={styles.center}>
        <QrCode size={48} color={colors.goldLight} weight="duotone" />
        <Text style={styles.msg}>{t("scanner.cameraPermission")}</Text>
        <Button
          variant="primary"
          label={t("scanner.grantPermission")}
          onPress={requestPermission}
          fullWidth={false}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader
        title={t("scanner.title")}
        textAlign={textAlign}
        right={
          <View style={styles.headerActions}>
            {eventHasSeating ? (
              compact ? (
                <Pressable
                  style={styles.iconBtn}
                  onPress={() => {
                    setGuideTarget(null);
                    setGuideVisible(true);
                  }}
                  accessibilityLabel={t("scanner.openSeatMap")}
                  hitSlop={8}
                >
                  <MapTrifold size={22} color={colors.goldAccent} weight="duotone" />
                </Pressable>
              ) : (
                <Button
                  variant="accent"
                  label={t("scanner.openSeatMap")}
                  icon={<MapTrifold size={16} color={colors.goldAccent} weight="duotone" />}
                  onPress={() => {
                    setGuideTarget(null);
                    setGuideVisible(true);
                  }}
                  fullWidth={false}
                  style={styles.mapBtn}
                />
              )
            ) : null}
            <View style={styles.userRow}>
              <User size={14} color={colors.textOnGoldMuted} weight="duotone" />
              <Text style={styles.headerUser} numberOfLines={1}>
                {userName}
              </Text>
            </View>
          </View>
        }
      />

      <EventPicker
        events={events}
        eventId={eventId}
        onSelect={setEventId}
        textAlign={textAlign}
        rowDirection={rowDirection}
      />

      {selectedEvent ? (
        <Text style={styles.eventHint} numberOfLines={2}>
          {t("scanner.activeEvent", { name: selectedEvent.name })}
        </Text>
      ) : (
        <Text style={styles.eventHint}>{t("scanner.noActiveEvents")}</Text>
      )}

      {pendingSync > 0 ? (
        <Text style={styles.syncHint}>
          {t("scanner.pendingSync", { count: pendingSync })}
        </Text>
      ) : null}

      <ScreenBody>
        <View style={styles.main}>
          <View
            style={[
              styles.feedback,
              feedback === "success" && styles.feedbackSuccess,
              feedback === "warning" && styles.feedbackWarning,
              feedback === "error" && styles.feedbackError,
              feedback === "offline" && styles.feedbackOffline,
            ]}
          >
            <FeedbackIcon feedback={feedback} />
            {resultCode ? (
              <Text style={styles.resultBadge}>{t(`scanResult.${resultCode}`)}</Text>
            ) : null}
            <Text style={styles.feedbackMsg}>{message}</Text>
            {details ? (
              <Text style={styles.feedbackDetails}>{details}</Text>
            ) : null}
            {lastSeatRegistration && eventHasSeating ? (
              <Button
                variant="primary"
                label={t("seatGuide.open")}
                icon={<MapTrifold size={18} color={colors.textOnGold} weight="duotone" />}
                onPress={() => openSeatGuide(lastSeatRegistration)}
                style={styles.guideBtn}
              />
            ) : null}
          </View>

          <View style={styles.cameraWrap}>
            {scanning ? (
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={({ data }) => void handleScan(data)}
              />
            ) : null}
          </View>

          {recentScans.length > 0 ? (
            <View style={styles.history}>
              <Text style={[styles.historyTitle, { textAlign }]}>
                {t("scanner.recentScans")}
              </Text>
              {recentScans.map((scan) => (
                <View
                  key={`${scan.id}-${scan.at}`}
                  style={[styles.historyRow, { flexDirection: rowDirection }]}
                >
                  <Text style={styles.historyTime}>{scan.at}</Text>
                  <View style={styles.historyBody}>
                    <Text style={[styles.historyName, { textAlign }]} numberOfLines={1}>
                      {scan.name ?? t(`scanResult.${scan.result}`)}
                    </Text>
                    {scan.seatLabel ? (
                      <Text style={[styles.historySeat, { textAlign }]} numberOfLines={1}>
                        {t("common.seat", { label: scan.seatLabel })}
                      </Text>
                    ) : null}
                    <Text style={[styles.historyMsg, { textAlign }]} numberOfLines={2}>
                      {scan.message}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </ScreenBody>

      <SeatGuideModal
        visible={guideVisible}
        eventId={eventId}
        target={guideTarget}
        onClose={() => {
          setGuideVisible(false);
          setGuideTarget(null);
        }}
      />
    </Screen>
  );
}

function FeedbackIcon({ feedback }: { feedback: Feedback }) {
  const size = 36;
  switch (feedback) {
    case "success":
      return <CheckCircle size={size} color={colors.success} weight="duotone" />;
    case "warning":
      return <Warning size={size} color={colors.warning} weight="duotone" />;
    case "error":
      return <XCircle size={size} color={colors.danger} weight="duotone" />;
    case "offline":
      return <CloudArrowDown size={size} color={colors.info} weight="duotone" />;
    default:
      return <QrCode size={size} color={colors.gold} weight="duotone" />;
  }
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.lg,
  },
  headerActions: { alignItems: "flex-end", gap: spacing.sm, maxWidth: "100%" },
  iconBtn: {
    minWidth: layout.minTouchTarget,
    minHeight: layout.minTouchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  userRow: { flexDirection: "row", alignItems: "center", gap: 4, maxWidth: 140 },
  headerUser: { color: colors.textOnGoldMuted, fontSize: 12, flexShrink: 1 },
  mapBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, minHeight: 36 },
  main: { flex: 1, minHeight: 0 },
  eventHint: {
    textAlign: "center",
    ...typography.caption,
    color: colors.goldLight,
    paddingHorizontal: spacing.lg,
  },
  syncHint: {
    textAlign: "center",
    ...typography.caption,
    color: colors.warning,
    marginTop: spacing.xs,
  },
  feedback: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  feedbackSuccess: { backgroundColor: colors.successBg, borderColor: colors.success },
  feedbackWarning: { backgroundColor: colors.warningBg, borderColor: colors.warning },
  feedbackError: { backgroundColor: colors.dangerBg, borderColor: colors.danger },
  feedbackOffline: { backgroundColor: colors.infoBg, borderColor: colors.info },
  resultBadge: {
    ...typography.micro,
    fontWeight: "700",
    color: colors.gold,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  feedbackMsg: {
    ...typography.bodyBold,
    color: colors.text,
    textAlign: "center",
  },
  feedbackDetails: {
    marginTop: spacing.sm,
    ...typography.caption,
    color: colors.gold,
    textAlign: "center",
    lineHeight: 22,
  },
  guideBtn: { marginTop: spacing.md, alignSelf: "stretch" },
  cameraWrap: {
    flex: 1,
    minHeight: 180,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  camera: { flex: 1 },
  history: {
    maxHeight: 120,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyTitle: {
    ...typography.captionBold,
    color: colors.gold,
    marginBottom: spacing.sm,
  },
  historyRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.creamDark,
  },
  historyTime: { fontSize: 10, color: colors.goldLight, minWidth: 52 },
  historyBody: { flex: 1, minWidth: 0 },
  historyName: {
    ...typography.captionBold,
    color: colors.text,
  },
  historySeat: {
    fontSize: 11,
    color: colors.goldAccent,
    fontWeight: "600",
  },
  historyMsg: { ...typography.micro, color: colors.goldLight },
  msg: { ...typography.body, marginBottom: spacing.lg, textAlign: "center", color: colors.text },
});
