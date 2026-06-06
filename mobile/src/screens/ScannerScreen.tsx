import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  ScrollView,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
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
      <View style={styles.center}>
        <Text style={styles.msg}>{t("scanner.cameraPermission")}</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>{t("scanner.grantPermission")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { flexDirection: rowDirection }]}>
        <Text style={styles.headerTitle}>{t("scanner.title")}</Text>
        <View style={styles.headerActions}>
          {eventHasSeating ? (
            <TouchableOpacity
              style={styles.mapBtn}
              onPress={() => {
                setGuideTarget(null);
                setGuideVisible(true);
              }}
            >
              <Text style={styles.mapBtnText}>{t("scanner.openSeatMap")}</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={styles.headerUser}>{userName}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.eventPicker,
          { flexDirection: rowDirection },
        ]}
      >
        {events.map((e) => (
          <TouchableOpacity
            key={e.id}
            style={[styles.chip, eventId === e.id && styles.chipActive]}
            onPress={() => setEventId(e.id)}
          >
            <Text
              style={[
                styles.chipText,
                { textAlign },
                eventId === e.id && styles.chipTextActive,
              ]}
              numberOfLines={2}
            >
              {e.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedEvent ? (
        <Text style={styles.eventHint}>
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

      <View
        style={[
          styles.feedback,
          feedback === "success" && styles.feedbackSuccess,
          feedback === "warning" && styles.feedbackWarning,
          feedback === "error" && styles.feedbackError,
          feedback === "offline" && styles.feedbackOffline,
        ]}
      >
        <Text style={styles.feedbackIcon}>
          {feedback === "success"
            ? "✅"
            : feedback === "warning"
              ? "⚠️"
              : feedback === "error"
                ? "❌"
                : feedback === "offline"
                  ? "📥"
                  : "📷"}
        </Text>
        {resultCode ? (
          <Text style={styles.resultBadge}>{t(`scanResult.${resultCode}`)}</Text>
        ) : null}
        <Text style={styles.feedbackMsg}>{message}</Text>
        {details ? <Text style={styles.feedbackDetails}>{details}</Text> : null}
        {lastSeatRegistration && eventHasSeating ? (
          <TouchableOpacity
            style={styles.guideBtn}
            onPress={() => openSeatGuide(lastSeatRegistration)}
          >
            <Text style={styles.guideBtnText}>{t("seatGuide.open")}</Text>
          </TouchableOpacity>
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
                <Text style={[styles.historyName, { textAlign }]}>
                  {scan.name ?? t(`scanResult.${scan.result}`)}
                </Text>
                {scan.seatLabel ? (
                  <Text style={[styles.historySeat, { textAlign }]}>
                    {t("common.seat", { label: scan.seatLabel })}
                  </Text>
                ) : null}
                <Text style={[styles.historyMsg, { textAlign }]}>
                  {scan.message}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <SeatGuideModal
        visible={guideVisible}
        eventId={eventId}
        target={guideTarget}
        onClose={() => {
          setGuideVisible(false);
          setGuideTarget(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#faf8f5" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 56,
    backgroundColor: "#5c3d1e",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  headerActions: { alignItems: "flex-end", gap: 4 },
  headerUser: { color: "#e8dcc8", fontSize: 12 },
  mapBtn: {
    backgroundColor: "rgba(212, 168, 75, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d4a84b",
  },
  mapBtnText: { color: "#d4a84b", fontSize: 11, fontWeight: "700" },
  eventPicker: {
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e8dcc8",
    maxWidth: 220,
  },
  chipActive: { backgroundColor: "#5c3d1e", borderColor: "#5c3d1e" },
  chipText: { fontSize: 12, color: "#5c3d1e" },
  chipTextActive: { color: "#fff" },
  eventHint: {
    textAlign: "center",
    fontSize: 12,
    color: "#8b6914",
    paddingHorizontal: 16,
  },
  syncHint: {
    textAlign: "center",
    fontSize: 12,
    color: "#b45309",
    marginTop: 4,
  },
  feedback: {
    marginHorizontal: 12,
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e8dcc8",
    alignItems: "center",
  },
  feedbackSuccess: { backgroundColor: "#dcfce7", borderColor: "#166534" },
  feedbackWarning: { backgroundColor: "#fef3c7", borderColor: "#b45309" },
  feedbackError: { backgroundColor: "#fee2e2", borderColor: "#991b1b" },
  feedbackOffline: { backgroundColor: "#e0f2fe", borderColor: "#0369a1" },
  feedbackIcon: { fontSize: 28, marginBottom: 4 },
  resultBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#5c3d1e",
    marginBottom: 4,
  },
  feedbackMsg: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2c1810",
    textAlign: "center",
  },
  feedbackDetails: {
    marginTop: 8,
    fontSize: 14,
    color: "#5c3d1e",
    textAlign: "center",
    lineHeight: 22,
  },
  guideBtn: {
    marginTop: 12,
    backgroundColor: "#5c3d1e",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  guideBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  cameraWrap: {
    flex: 1,
    minHeight: 220,
    margin: 12,
    borderRadius: 16,
    overflow: "hidden",
  },
  camera: { flex: 1 },
  history: {
    maxHeight: 140,
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e8dcc8",
  },
  historyTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5c3d1e",
    marginBottom: 6,
  },
  historyRow: {
    gap: 8,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: "#f5f0e8",
  },
  historyTime: { fontSize: 10, color: "#8b6914", minWidth: 52 },
  historyBody: { flex: 1 },
  historyName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2c1810",
  },
  historySeat: {
    fontSize: 11,
    color: "#b8860b",
    fontWeight: "600",
  },
  historyMsg: { fontSize: 10, color: "#8b6914" },
  msg: { fontSize: 16, marginBottom: 16, textAlign: "center" },
  button: {
    backgroundColor: "#5c3d1e",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});
