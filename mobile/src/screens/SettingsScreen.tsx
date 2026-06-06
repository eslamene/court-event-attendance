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
import { useI18n } from "../context/I18nContext";
import type { Locale } from "../i18n/types";
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
  const { t, locale, setLocale, textAlign, rowDirection } = useI18n();
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [biometricOn, setBiometricOn] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("");
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [passwordPrompt, setPasswordPrompt] = useState("");
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const labels = {
      generic: t("biometric.generic"),
      faceId: t("biometric.faceId"),
      fingerprint: t("biometric.fingerprint"),
      iris: t("biometric.iris"),
      cancel: t("biometric.cancel"),
      usePassword: t("biometric.usePassword"),
    };
    const [user, enabled, support, queue] = await Promise.all([
      getUser(),
      isBiometricEnabled(),
      getBiometricSupport(labels),
      getOfflineQueue(),
    ]);
    setUserName(user?.name ?? "");
    setUserEmail(user?.email ?? "");
    setBiometricOn(enabled);
    setBiometricLabel(support.label);
    setBiometricAvailable(support.available && support.enrolled);
    setPendingSync(queue.length);
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleBiometricToggle(value: boolean) {
    if (!value) {
      await clearBiometricCredentials();
      setBiometricOn(false);
      await logActivity("settings", t("settings.biometricDisabled"));
      return;
    }

    if (!biometricAvailable) {
      Alert.alert(t("common.unavailable"), t("settings.biometricUnavailableMsg"));
      return;
    }

    setShowPasswordPrompt(true);
  }

  async function confirmBiometricSetup() {
    if (!passwordPrompt.trim()) {
      Alert.alert(t("common.required"), t("settings.passwordRequired"));
      return;
    }

    setBusy(true);
    try {
      await saveBiometricCredentials(
        { email: userEmail, password: passwordPrompt },
        t("biometric.credentialsPrompt")
      );
      setBiometricOn(true);
      setShowPasswordPrompt(false);
      setPasswordPrompt("");
      await logActivity(
        "settings",
        t("settings.biometricEnabled", { method: biometricLabel })
      );
      Alert.alert(
        t("common.done"),
        t("settings.biometricEnabled", { method: biometricLabel })
      );
    } catch {
      Alert.alert(t("common.error"), t("settings.credentialsSaveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleClearOfflineQueue() {
    Alert.alert(t("settings.clearQueueTitle"), t("settings.clearQueueMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.clear"),
        style: "destructive",
        onPress: async () => {
          await setOfflineQueue([]);
          setPendingSync(0);
          await logActivity("settings", t("settings.queueCleared"));
        },
      },
    ]);
  }

  async function handleLogout() {
    Alert.alert(t("settings.logoutTitle"), t("settings.logoutMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.logout"),
        style: "destructive",
        onPress: async () => {
          await logActivity("settings", t("settings.logoutActivity"));
          await clearSession();
          onLogout();
        },
      },
    ]);
  }

  function LanguageOption({
    value,
    label,
  }: {
    value: Locale;
    label: string;
  }) {
    const active = locale === value;
    return (
      <TouchableOpacity
        style={[styles.langOption, active && styles.langOptionActive]}
        onPress={() => void setLocale(value)}
      >
        <Text style={[styles.langOptionText, active && styles.langOptionTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.title, { textAlign }]}>{t("settings.title")}</Text>
        <Text style={[styles.subtitle, { textAlign }]}>{userName}</Text>
        <Text style={[styles.email, { textAlign }]}>{userEmail}</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t("settings.language")}
        </Text>
        <View style={[styles.langRow, { flexDirection: rowDirection }]}>
          <LanguageOption value="ar" label={t("settings.languageArabic")} />
          <LanguageOption value="en" label={t("settings.languageEnglish")} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t("settings.security")}
        </Text>
        <View style={[styles.row, { flexDirection: rowDirection }]}>
          <Switch
            value={biometricOn}
            onValueChange={(v) => void handleBiometricToggle(v)}
            disabled={!biometricAvailable && !biometricOn}
            trackColor={{ false: "#e8dcc8", true: "#d4a84b" }}
            thumbColor={biometricOn ? "#5c3d1e" : "#fff"}
          />
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, { textAlign }]}>
              {t("settings.biometricLogin", { method: biometricLabel })}
            </Text>
            <Text style={[styles.rowHint, { textAlign }]}>
              {biometricAvailable
                ? t("settings.biometricHintAvailable")
                : t("settings.biometricHintUnavailable")}
            </Text>
          </View>
        </View>

        {showPasswordPrompt ? (
          <View style={styles.passwordBox}>
            <Text style={[styles.passwordLabel, { textAlign }]}>
              {t("settings.passwordConfirm")}
            </Text>
            <TextInput
              style={[styles.input, { textAlign }]}
              secureTextEntry
              value={passwordPrompt}
              onChangeText={setPasswordPrompt}
              placeholder={t("login.password")}
            />
            <View style={[styles.passwordActions, { flexDirection: rowDirection }]}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => {
                  setShowPasswordPrompt(false);
                  setPasswordPrompt("");
                }}
              >
                <Text style={styles.secondaryBtnText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => void confirmBiometricSetup()}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>{t("common.confirm")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>{t("settings.data")}</Text>
        <TouchableOpacity
          style={[styles.linkRow, { flexDirection: rowDirection }]}
          onPress={onOpenActivityLog}
        >
          <Text style={styles.linkArrow}>{locale === "ar" ? "‹" : "›"}</Text>
          <Text style={styles.linkLabel}>{t("settings.activityLog")}</Text>
        </TouchableOpacity>
        {pendingSync > 0 ? (
          <View style={[styles.offlineRow, { flexDirection: rowDirection }]}>
            <TouchableOpacity onPress={() => void handleClearOfflineQueue()}>
              <Text style={styles.dangerText}>{t("common.clear")}</Text>
            </TouchableOpacity>
            <Text style={styles.offlineText}>
              {t("settings.pendingSync", { count: pendingSync })}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>{t("settings.about")}</Text>
        <Text style={[styles.infoRow, { textAlign }]}>
          {t("common.version", { version: "1.1.0" })}
        </Text>
        <Text style={[styles.infoRow, { textAlign }]} numberOfLines={2}>
          {t("common.server", { url: API_BASE_URL })}
        </Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={() => void handleLogout()}>
        <Text style={styles.logoutText}>{t("settings.logout")}</Text>
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
  title: { color: "#fff", fontSize: 18, fontWeight: "700" },
  subtitle: {
    color: "#fff",
    fontSize: 15,
    marginTop: 8,
    fontWeight: "600",
  },
  email: { color: "#e8dcc8", fontSize: 12, marginTop: 2 },
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
    marginBottom: 12,
  },
  langRow: { gap: 8 },
  langOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e8dcc8",
    alignItems: "center",
    backgroundColor: "#faf8f5",
  },
  langOptionActive: {
    backgroundColor: "#5c3d1e",
    borderColor: "#5c3d1e",
  },
  langOptionText: { fontWeight: "600", color: "#5c3d1e" },
  langOptionTextActive: { color: "#fff" },
  row: {
    alignItems: "center",
    gap: 12,
  },
  rowText: { flex: 1 },
  rowLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2c1810",
  },
  rowHint: { fontSize: 11, color: "#8b6914", marginTop: 4 },
  passwordBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f5f0e8",
  },
  passwordLabel: {
    fontSize: 12,
    color: "#5c3d1e",
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
  passwordActions: { gap: 8 },
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  linkLabel: { fontSize: 15, color: "#2c1810", fontWeight: "600" },
  linkArrow: { fontSize: 20, color: "#8b6914" },
  offlineRow: {
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
