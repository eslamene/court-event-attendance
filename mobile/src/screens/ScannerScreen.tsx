import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { scanQr } from "../api";
import {
  clearSession,
  enqueueOfflineScan,
  getEvents,
  getSelectedEventId,
  getToken,
  getUser,
  setSelectedEventId,
} from "../storage";
import { syncOfflineQueue } from "../offline";
import type { EventItem } from "../api";

type Props = {
  onLogout: () => void;
};

type Feedback = "idle" | "success" | "error";

export function ScannerScreen({ onLogout }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventId, setEventId] = useState<string>("");
  const [userName, setUserName] = useState("");
  const [feedback, setFeedback] = useState<Feedback>("idle");
  const [message, setMessage] = useState("وجّه الكاميرا نحو رمز QR");
  const [details, setDetails] = useState("");
  const [scanning, setScanning] = useState(true);
  const [pendingSync, setPendingSync] = useState(0);
  const lastScan = useRef(0);

  const load = useCallback(async () => {
    const [ev, sel, user, token] = await Promise.all([
      getEvents(),
      getSelectedEventId(),
      getUser(),
      getToken(),
    ]);
    setEvents(ev);
    setUserName(user?.name ?? "");
    if (sel) setEventId(sel);
    else if (ev[0]) setEventId(ev[0].id);

    if (token) {
      const result = await syncOfflineQueue(token);
      setPendingSync(result.failed);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleScan(raw: string) {
    const now = Date.now();
    if (now - lastScan.current < 2500) return;
    lastScan.current = now;

    if (!eventId) {
      setFeedback("error");
      setMessage("يرجى اختيار الفعالية أولاً");
      return;
    }

    setScanning(false);
    const token = await getToken();
    const offlineId = `offline-${now}-${Math.random().toString(36).slice(2)}`;
    const scannedAt = new Date().toISOString();

    try {
      if (!token) throw new Error("انتهت الجلسة");

      const result = await scanQr(token, {
        qrToken: raw,
        eventId,
        offlineId,
        scannedAt,
      });

      if (result.success) {
        setFeedback("success");
        setMessage(result.message);
        setDetails(
          result.registration
            ? `${result.registration.fullName}\n${result.registration.rank}\n${result.registration.entity}`
            : ""
        );
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Vibration.vibrate(200);
      } else {
        setFeedback("error");
        setMessage(result.message);
        setDetails("");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Vibration.vibrate([0, 100, 100, 100]);
      }
    } catch {
      await enqueueOfflineScan({
        offlineId,
        qrToken: raw,
        eventId,
        scannedAt,
      });
      setFeedback("success");
      setMessage("تم الحفظ محلياً — سيتم المزامنة عند عودة الاتصال");
      setDetails("");
      setPendingSync((p) => p + 1);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    setTimeout(() => {
      setFeedback("idle");
      setMessage("وجّه الكاميرا نحو رمز QR");
      setDetails("");
      setScanning(true);
    }, 3500);
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

  const selectedEvent = events.find((e) => e.id === eventId);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>مسح الحضور</Text>
        <Text style={styles.headerUser}>{userName}</Text>
        <TouchableOpacity onPress={onLogout}>
          <Text style={styles.logout}>خروج</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.eventPicker}>
        {events.map((e) => (
          <TouchableOpacity
            key={e.id}
            style={[styles.chip, eventId === e.id && styles.chipActive]}
            onPress={() => {
              setEventId(e.id);
              setSelectedEventId(e.id);
            }}
          >
            <Text
              style={[styles.chipText, eventId === e.id && styles.chipTextActive]}
              numberOfLines={2}
            >
              {e.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {selectedEvent && (
        <Text style={styles.eventHint}>الفعالية النشطة: {selectedEvent.name}</Text>
      )}

      {pendingSync > 0 && (
        <Text style={styles.syncHint}>
          {pendingSync} مسح محفوظ بانتظار المزامنة
        </Text>
      )}

      <View
        style={[
          styles.feedback,
          feedback === "success" && styles.feedbackSuccess,
          feedback === "error" && styles.feedbackError,
        ]}
      >
        <Text style={styles.feedbackIcon}>
          {feedback === "success" ? "✅" : feedback === "error" ? "❌" : "📷"}
        </Text>
        <Text style={styles.feedbackMsg}>{message}</Text>
        {details ? <Text style={styles.feedbackDetails}>{details}</Text> : null}
      </View>

      <View style={styles.cameraWrap}>
        {scanning && (
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => handleScan(data)}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#faf8f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
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
  logout: { color: "#d4a84b", fontSize: 14 },
  eventPicker: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
    padding: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e8dcc8",
    maxWidth: "48%",
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
    margin: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e8dcc8",
    alignItems: "center",
  },
  feedbackSuccess: { backgroundColor: "#dcfce7", borderColor: "#166534" },
  feedbackError: { backgroundColor: "#fee2e2", borderColor: "#991b1b" },
  feedbackIcon: { fontSize: 32, marginBottom: 8 },
  feedbackMsg: {
    fontSize: 16,
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
    margin: 12,
    borderRadius: 16,
    overflow: "hidden",
  },
  camera: { flex: 1 },
  msg: { fontSize: 16, marginBottom: 16, textAlign: "center" },
  button: {
    backgroundColor: "#5c3d1e",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});
