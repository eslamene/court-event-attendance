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
  isNetworkError,
  scanQr,
  type ScanResult,
  type ScanResultCode,
} from "../api";
import { extractQrToken, isLikelyQrPayload } from "../qr";
import { useEventContext } from "../context/EventContext";
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

const RESULT_LABELS: Record<ScanResultCode, string> = {
  SUCCESS: "حضور مسجّل",
  INVALID: "رمز غير صالح",
  ALREADY_USED: "مستخدم مسبقاً",
  WRONG_EVENT: "فعالية أخرى",
};

export function ScannerScreen({ onLogout }: Props) {
  const { events, eventId, setEventId, selectedEvent, refreshEvents } =
    useEventContext();
  const [permission, requestPermission] = useCameraPermissions();
  const [userName, setUserName] = useState("");
  const [feedback, setFeedback] = useState<Feedback>("idle");
  const [message, setMessage] = useState("وجّه الكاميرا نحو رمز QR");
  const [details, setDetails] = useState("");
  const [resultCode, setResultCode] = useState<ScanResultCode | null>(null);
  const [scanning, setScanning] = useState(true);
  const [pendingSync, setPendingSync] = useState(0);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const lastScan = useRef(0);

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

    if (result.success) {
      setFeedback("success");
      setMessage(result.message);
      setDetails(formatRegistrationDetails(result.registration));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Vibration.vibrate(200);
      void logActivity("scan_success", result.message, {
        name: result.registration?.fullName ?? "",
      });
      pushRecentScan({
        id: raw,
        at: new Date().toLocaleTimeString("ar-EG"),
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
        ? formatRegistrationDetails(result.registration)
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
      at: new Date().toLocaleTimeString("ar-EG"),
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
      setMessage("يرجى اختيار الفعالية أولاً");
      setResultCode(null);
      return;
    }

    const qrToken = extractQrToken(raw);
    if (!isLikelyQrPayload(raw)) {
      setFeedback("error");
      setMessage("رمز QR غير معروف — تأكد من مسح رمز الحضور الصحيح");
      setDetails("");
      setResultCode("INVALID");
      setScanning(false);
      setTimeout(() => {
        setFeedback("idle");
        setMessage("وجّه الكاميرا نحو رمز QR");
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
      if (!token) throw new ApiError("انتهت الجلسة", 401);

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
        void logActivity("offline_queue", "حفظ مسح بانتظار المزامنة");
        setFeedback("offline");
        setMessage("لا يوجد اتصال — تم الحفظ محلياً للمزامنة لاحقاً");
        setDetails("");
        setResultCode(null);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }

      setFeedback("error");
      setMessage(
        error instanceof Error ? error.message : "تعذّر إتمام المسح"
      );
      setDetails("");
      setResultCode(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    setTimeout(() => {
      setFeedback("idle");
      setMessage("وجّه الكاميرا نحو رمز QR");
      setDetails("");
      setResultCode(null);
      setScanning(true);
    }, 4000);
  }

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.msg}>يلزم إذن الكاميرا لمسح الرموز</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>منح الإذن</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>مسح الحضور</Text>
        <Text style={styles.headerUser}>{userName}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.eventPicker}
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
        <Text style={styles.eventHint}>الفعالية النشطة: {selectedEvent.name}</Text>
      ) : (
        <Text style={styles.eventHint}>لا توجد فعاليات نشطة</Text>
      )}

      {pendingSync > 0 ? (
        <Text style={styles.syncHint}>
          {pendingSync} مسح محفوظ بانتظار المزامنة
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
          <Text style={styles.resultBadge}>{RESULT_LABELS[resultCode]}</Text>
        ) : null}
        <Text style={styles.feedbackMsg}>{message}</Text>
        {details ? <Text style={styles.feedbackDetails}>{details}</Text> : null}
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
          <Text style={styles.historyTitle}>آخر المسوحات</Text>
          {recentScans.map((scan) => (
            <View key={`${scan.id}-${scan.at}`} style={styles.historyRow}>
              <Text style={styles.historyTime}>{scan.at}</Text>
              <View style={styles.historyBody}>
                <Text style={styles.historyName}>
                  {scan.name ?? RESULT_LABELS[scan.result]}
                </Text>
                {scan.seatLabel ? (
                  <Text style={styles.historySeat}>المقعد: {scan.seatLabel}</Text>
                ) : null}
                <Text style={styles.historyMsg}>{scan.message}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
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
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 56,
    backgroundColor: "#5c3d1e",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  headerUser: { color: "#e8dcc8", fontSize: 12 },
  eventPicker: {
    flexDirection: "row-reverse",
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
  chipText: { fontSize: 12, color: "#5c3d1e", textAlign: "right" },
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
    textAlign: "right",
    marginBottom: 6,
  },
  historyRow: {
    flexDirection: "row-reverse",
    gap: 8,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: "#f5f0e8",
  },
  historyTime: { fontSize: 10, color: "#8b6914", minWidth: 52, textAlign: "left" },
  historyBody: { flex: 1 },
  historyName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2c1810",
    textAlign: "right",
  },
  historySeat: {
    fontSize: 11,
    color: "#b8860b",
    textAlign: "right",
    fontWeight: "600",
  },
  historyMsg: { fontSize: 10, color: "#8b6914", textAlign: "right" },
  msg: { fontSize: 16, marginBottom: 16, textAlign: "center" },
  button: {
    backgroundColor: "#5c3d1e",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});
