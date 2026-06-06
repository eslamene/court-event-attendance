import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import {
  ClockCounterClockwise,
  Fingerprint,
  Globe,
  Info,
  SignOut,
  Trash,
} from "phosphor-react-native";
import { API_BASE_URL } from "../config";
import { AppHeader, Screen } from "../components/ui/Screen";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card } from "../components/ui/Card";
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
import { colors, radius, spacing, typography } from "../theme/tokens";

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
    <Screen>
      <AppHeader
        title={t("settings.title")}
        subtitle={userName}
        textAlign={textAlign}
        right={
          <Text style={styles.email} numberOfLines={1}>
            {userEmail}
          </Text>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card title={t("settings.language")} textAlign={textAlign}>
          <View style={[styles.langRow, { flexDirection: rowDirection }]}>
            <LanguageOption value="ar" label={t("settings.languageArabic")} />
            <LanguageOption value="en" label={t("settings.languageEnglish")} />
          </View>
        </Card>

        <Card title={t("settings.security")} textAlign={textAlign}>
          <View style={[styles.row, { flexDirection: rowDirection }]}>
            <Fingerprint size={22} color={colors.gold} weight="duotone" />
            <Switch
              value={biometricOn}
              onValueChange={(v) => void handleBiometricToggle(v)}
              disabled={!biometricAvailable && !biometricOn}
              trackColor={{ false: colors.border, true: colors.goldAccent }}
              thumbColor={biometricOn ? colors.gold : colors.card}
              style={styles.switch}
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
              <Input
                placeholder={t("login.password")}
                secureTextEntry
                value={passwordPrompt}
                onChangeText={setPasswordPrompt}
                textAlign={textAlign}
              />
              <View style={[styles.passwordActions, { flexDirection: rowDirection }]}>
                <View style={styles.passwordBtn}>
                  <Button
                    variant="secondary"
                    label={t("common.cancel")}
                    onPress={() => {
                      setShowPasswordPrompt(false);
                      setPasswordPrompt("");
                    }}
                  />
                </View>
                <View style={styles.passwordBtn}>
                  <Button
                    label={t("common.confirm")}
                    onPress={() => void confirmBiometricSetup()}
                    loading={busy}
                  />
                </View>
              </View>
            </View>
          ) : null}
        </Card>

        <Card title={t("settings.data")} textAlign={textAlign}>
          <TouchableOpacity
            style={[styles.linkRow, { flexDirection: rowDirection }]}
            onPress={onOpenActivityLog}
          >
            <ClockCounterClockwise size={20} color={colors.gold} weight="duotone" />
            <Text style={[styles.linkLabel, { textAlign }]}>{t("settings.activityLog")}</Text>
          </TouchableOpacity>
          {pendingSync > 0 ? (
            <View style={[styles.offlineRow, { flexDirection: rowDirection }]}>
              <TouchableOpacity onPress={() => void handleClearOfflineQueue()}>
                <View style={styles.clearRow}>
                  <Trash size={16} color={colors.danger} weight="duotone" />
                  <Text style={styles.dangerText}>{t("common.clear")}</Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.offlineText}>
                {t("settings.pendingSync", { count: pendingSync })}
              </Text>
            </View>
          ) : null}
        </Card>

        <Card title={t("settings.about")} textAlign={textAlign}>
          <View style={styles.infoRowWrap}>
            <Info size={18} color={colors.goldLight} weight="duotone" />
            <Text style={[styles.infoRow, { textAlign }]}>
              {t("common.version", { version: "1.1.0" })}
            </Text>
          </View>
          <View style={styles.infoRowWrap}>
            <Globe size={18} color={colors.goldLight} weight="duotone" />
            <Text style={[styles.infoRow, { textAlign }]} numberOfLines={2}>
              {t("common.server", { url: API_BASE_URL })}
            </Text>
          </View>
        </Card>

        <Button
          variant="danger"
          label={t("settings.logout")}
          icon={<SignOut size={20} color={colors.danger} weight="duotone" />}
          onPress={() => void handleLogout()}
          style={styles.logoutBtn}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  email: { color: colors.textOnGoldMuted, fontSize: 11, maxWidth: 140 },
  langRow: { gap: spacing.sm },
  langOption: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    backgroundColor: colors.cream,
    minHeight: 44,
    justifyContent: "center",
  },
  langOptionActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  langOptionText: { fontWeight: "600", color: colors.gold },
  langOptionTextActive: { color: colors.textOnGold },
  row: { alignItems: "center", gap: spacing.md },
  switch: { flexShrink: 0 },
  rowText: { flex: 1, minWidth: 0 },
  rowLabel: { ...typography.bodyBold, color: colors.text },
  rowHint: { ...typography.micro, color: colors.goldLight, marginTop: spacing.xs },
  passwordBox: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.creamDark,
  },
  passwordActions: { gap: spacing.sm },
  passwordBtn: { flex: 1, minWidth: 0 },
  linkRow: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  linkLabel: { flex: 1, ...typography.bodyBold, color: colors.text },
  offlineRow: {
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.creamDark,
  },
  clearRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  offlineText: { color: colors.warning, fontSize: 13 },
  dangerText: { color: colors.danger, fontWeight: "600" },
  infoRowWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoRow: { flex: 1, fontSize: 13, color: colors.gold },
  logoutBtn: { marginHorizontal: spacing.md, marginTop: spacing.lg },
});
