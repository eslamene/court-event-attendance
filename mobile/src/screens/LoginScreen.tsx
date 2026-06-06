import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Fingerprint, SignIn } from "phosphor-react-native";
import { staffLogin } from "../api";
import { AppLogo } from "../components/ui/AppLogo";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Screen } from "../components/ui/Screen";
import { useI18n } from "../context/I18nContext";
import { canUseBiometricLogin, getBiometricSupport } from "../lib/biometric";
import { logActivity } from "../lib/activity-log";
import { getBiometricCredentials } from "../lib/settings";
import { saveSession } from "../storage";
import { colors, layout, spacing, typography } from "../theme/tokens";

type Props = {
  onLogin: () => void;
};

export function LoginScreen({ onLogin }: Props) {
  const { t, textAlign } = useI18n();
  const { width } = useWindowDimensions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricReady, setBiometricReady] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("");

  const formWidth = Math.min(width - spacing.xl * 2, layout.maxFormWidth);

  useEffect(() => {
    async function checkBiometric() {
      const labels = {
        generic: t("biometric.generic"),
        faceId: t("biometric.faceId"),
        fingerprint: t("biometric.fingerprint"),
        iris: t("biometric.iris"),
        cancel: t("biometric.cancel"),
        usePassword: t("biometric.usePassword"),
      };
      const [ready, support] = await Promise.all([
        canUseBiometricLogin(t("biometric.credentialsPrompt")),
        getBiometricSupport(labels),
      ]);
      setBiometricReady(ready);
      setBiometricLabel(support.label);
    }
    void checkBiometric();
  }, [t]);

  async function completeLogin(
    loginEmail: string,
    loginPassword: string,
    viaBiometric = false
  ) {
    setError("");
    setLoading(true);
    try {
      const data = await staffLogin(loginEmail.trim(), loginPassword);
      await saveSession(data.token, data.user, data.events);
      await logActivity(
        viaBiometric ? "biometric_login" : "login",
        viaBiometric
          ? t("login.biometricActivity", { method: biometricLabel })
          : t("login.loginActivity", { name: data.user.name })
      );
      onLogin();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("login.unexpectedError"));
      await logActivity("error", t("login.loginFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.form, { width: formWidth, maxWidth: "100%" }]}>
            <AppLogo
              size={120}
              variant="platform"
              style={styles.logo}
              accessibilityLabel={t("branding.platformLogo")}
            />
            <Text style={styles.title}>{t("login.title")}</Text>
            <Text style={styles.subtitle}>{t("login.subtitle")}</Text>
            <Text style={styles.version}>
              {t("common.version", { version: "1.1.0" })}
            </Text>

            {biometricReady ? (
              <>
                <Button
                  variant="ghost"
                  label={t("login.biometricLogin", { method: biometricLabel })}
                  icon={<Fingerprint size={22} color={colors.gold} weight="duotone" />}
                  onPress={() => void handleBiometric()}
                  disabled={loading}
                />
                <Text style={styles.orDivider}>{t("common.or")}</Text>
              </>
            ) : null}

            <Input
              placeholder={t("login.email")}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textAlign={textAlign}
              autoComplete="email"
            />
            <Input
              placeholder={t("login.password")}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textAlign={textAlign}
              autoComplete="password"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              label={t("login.submit")}
              icon={<SignIn size={20} color={colors.textOnGold} weight="bold" />}
              onPress={() => void completeLogin(email, password)}
              loading={loading}
            />

            <Text style={styles.hint}>{t("login.hint")}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );

  async function handleBiometric() {
    setError("");
    setLoading(true);
    try {
      const credentials = await getBiometricCredentials(
        t("biometric.credentialsPrompt")
      );
      if (!credentials) {
        setError(t("login.credentialsNotFound"));
        setBiometricReady(false);
        return;
      }
      await completeLogin(credentials.email, credentials.password, true);
    } catch {
      setError(t("login.biometricFailed"));
    } finally {
      setLoading(false);
    }
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  form: { alignSelf: "center" },
  logo: {
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.title,
    color: colors.gold,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
    color: colors.goldLight,
    textAlign: "center",
  },
  version: {
    ...typography.micro,
    color: colors.goldAccent,
    textAlign: "center",
    marginBottom: spacing.xl,
    marginTop: spacing.xs,
  },
  orDivider: {
    textAlign: "center",
    color: colors.goldLight,
    marginVertical: spacing.md,
    ...typography.micro,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  hint: {
    marginTop: spacing.lg,
    ...typography.micro,
    color: colors.goldLight,
    textAlign: "center",
    lineHeight: 18,
  },
});
