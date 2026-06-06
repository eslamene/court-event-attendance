import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { API_BASE_URL } from "../config";
import { getBiometricSupport } from "../lib/biometric";
import { logActivity } from "../lib/activity-log";
import {
  clearBiometricCredentials,
  isBiometricEnabled,
  saveBiometricCredentials,
} from "../lib/settings";
import { clearSession, getOfflineQueue, getUser, setOfflineQueue } from "../storage";

type Props = {
  onLogout: () => void;
  onOpenActivityLog: () => void;
};

export function SettingsScreen({ onLogout, onOpenActivityLog }: Props) {
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [biometricOn, setBiometricOn] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("المصادقة البيومترية");
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [passwordPrompt, setPasswordPrompt] = useState("");
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [user, enabled, support, queue] = await Promise.all([
      getUser(),
      isBiometricEnabled(),
      getBiometricSupport(),
      getOfflineQueue(),
    ]);
    setUserName(user?.name ?? "");
    setUserEmail(user?.email ?? "");
    setBiometricOn(enabled);
    setBiometricLabel(support.label);
    setBiometricAvailable(support.available && support.enrolled);
    setPendingSync(queue.length);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleBiometricToggle(value: boolean) {
    if (!value) {
      await clearBiometricCredentials();
      setBiometricOn(false);
      await logActivity("settings", "تم إيقاف الدخول البيومتري");
      return;
    }

    if (!biometricAvailable) {
      Alert.alert(
        "غير متاح",
        "لم يتم إعداد بصمة الوجه أو بصمة الإصبع على هذا الجهاز"
      );
      return;
    }

    setShowPasswordPrompt(true);
  }

  async function confirmBiometricSetup() {
    if (!passwordPrompt.trim()) {
      Alert.alert("مطلوب", "أدخل كلمة المرور لتأكيد تفعيل الدخول البيومتري");
      return;
    }

    setBusy(true);
    try {
      await saveBiometricCredentials({
        email: userEmail,
        password: passwordPrompt,
      });
      setBiometricOn(true);
      setShowPasswordPrompt(false);
      setPasswordPrompt("");
      await logActivity("settings", `تم تفعيل الدخول عبر ${biometricLabel}`);
      Alert.alert("تم", `تم تفعيل الدخول عبر ${biometricLabel}`);
    } catch {
      Alert.alert("خطأ", "تعذّر حفظ بيانات الدخول في التخزين المشفّر");
    } finally {
      setBusy(false);
    }
  }

  async function handleClearOfflineQueue() {
    Alert.alert(
      "مسح الطابور",
      "هل تريد حذف المسوحات المحفوظة محلياً؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "مسح",
          style: "destructive",
          onPress: async () => {
            await setOfflineQueue([]);
            setPendingSync(0);
            await logActivity("settings", "تم مسح طابور المزامنة المحلي");
          },
        },
      ]
    );
  }

  async function handleLogout() {
    Alert.alert("تسجيل الخروج", "هل تريد تسجيل الخروج؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "خروج",
        style: "destructive",
        onPress: async () => {
          await logActivity("logout", "تسجيل خروج من الإعدادات");
          await clearSession();
          onLogout();
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>الإعدادات</Text>
        <Text style={styles.subtitle}>{userName}</Text>
        <Text style={styles.email}>{userEmail}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>الأمان</Text>
        <View style={styles.row}>
          <Switch
            value={biometricOn}
            onValueChange={(v) => void handleBiometricToggle(v)}
            disabled={!biometricAvailable && !biometricOn}
            trackColor={{ false: "#e8dcc8", true: "#d4a84b" }}
            thumbColor={biometricOn ? "#5c3d1e" : "#fff"}
          />
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>الدخول عبر {biometricLabel}</Text>
            <Text style={styles.rowHint}>
              {biometricAvailable
                ? "يُخزَّن في التخزين المشفّر للجهاز (Keychain / Keystore)"
                : "غير متاح على هذا الجهاز"}
            </Text>
          </View>
        </View>

        {showPasswordPrompt ? (
          <View style={styles.passwordBox}>
            <Text style={styles.passwordLabel}>
              أدخل كلمة المرور لتأكيد التفعيل
            </Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={passwordPrompt}
              onChangeText={setPasswordPrompt}
              placeholder="كلمة المرور"
              textAlign="right"
            />
            <View style={styles.passwordActions}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => {
                  setShowPasswordPrompt(false);
                  setPasswordPrompt("");
                }}
              >
                <Text style={styles.secondaryBtnText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => void confirmBiometricSetup()}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>تأكيد</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>البيانات</Text>
        <TouchableOpacity style={styles.linkRow} onPress={onOpenActivityLog}>
          <Text style={styles.linkArrow}>‹</Text>
          <Text style={styles.linkLabel}>سجل نشاط التطبيق</Text>
        </TouchableOpacity>
        {pendingSync > 0 ? (
          <View style={styles.offlineRow}>
            <TouchableOpacity onPress={() => void handleClearOfflineQueue()}>
              <Text style={styles.dangerText}>مسح</Text>
            </TouchableOpacity>
            <Text style={styles.offlineText}>
              {pendingSync} مسح بانتظار المزامنة
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>حول التطبيق</Text>
        <Text style={styles.infoRow}>الإصدار: 1.1.0</Text>
        <Text style={styles.infoRow} numberOfLines={2}>
          الخادم: {API_BASE_URL}
        </Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={() => void handleLogout()}>
        <Text style={styles.logoutText}>تسجيل الخروج</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#faf8f5" },
  content: { paddingBottom: 32 },
  header: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#5c3d1e",
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "700", textAlign: "right" },
  subtitle: {
    color: "#fff",
    fontSize: 15,
    textAlign: "right",
    marginTop: 8,
    fontWeight: "600",
  },
  email: { color: "#e8dcc8", fontSize: 12, textAlign: "right", marginTop: 2 },
  section: {
    marginTop: 16,
    marginHorizontal: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8dcc8",
    padding: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8b6914",
    textAlign: "right",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },
  rowText: { flex: 1 },
  rowLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2c1810",
    textAlign: "right",
  },
  rowHint: { fontSize: 11, color: "#8b6914", textAlign: "right", marginTop: 4 },
  passwordBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f5f0e8",
  },
  passwordLabel: {
    fontSize: 12,
    color: "#5c3d1e",
    textAlign: "right",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#faf8f5",
    borderWidth: 1,
    borderColor: "#e8dcc8",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  passwordActions: {
    flexDirection: "row-reverse",
    gap: 8,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: "#5c3d1e",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "600" },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "#f5f0e8",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  secondaryBtnText: { color: "#5c3d1e", fontWeight: "600" },
  linkRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  linkLabel: { fontSize: 15, color: "#2c1810", fontWeight: "600" },
  linkArrow: { fontSize: 20, color: "#8b6914" },
  offlineRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f5f0e8",
  },
  offlineText: { color: "#b45309", fontSize: 13 },
  dangerText: { color: "#991b1b", fontWeight: "600" },
  infoRow: {
    fontSize: 13,
    color: "#5c3d1e",
    textAlign: "right",
    marginBottom: 6,
  },
  logoutBtn: {
    marginHorizontal: 12,
    marginTop: 20,
    backgroundColor: "#fee2e2",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#991b1b",
  },
  logoutText: { color: "#991b1b", fontWeight: "700", fontSize: 15 },
});
