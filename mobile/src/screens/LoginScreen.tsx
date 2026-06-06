import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import { staffLogin } from "../api";
import { useI18n } from "../context/I18nContext";
import { canUseBiometricLogin, getBiometricSupport } from "../lib/biometric";
import { logActivity } from "../lib/activity-log";
import { getBiometricCredentials } from "../lib/settings";
import { saveSession } from "../storage";

type Props = {
  onLogin: () => void;
};

export function LoginScreen({ onLogin }: Props) {
  const { t, textAlign } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricReady, setBiometricReady] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("");

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

  async function handleLogin() {
    await completeLogin(email, password);
  }

  async function handleBiometricLogin() {
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

  return (
    <View style={styles.container}>
      <Image source={require("../../assets/logo.png")} style={styles.logo} />
      <Text style={styles.title}>{t("login.title")}</Text>
      <Text style={styles.subtitle}>{t("login.subtitle")}</Text>
      <Text style={styles.version}>{t("common.version", { version: "1.1.0" })}</Text>

      {biometricReady ? (
        <TouchableOpacity
          style={styles.biometricButton}
          onPress={() => void handleBiometricLogin()}
          disabled={loading}
        >
          <Text style={styles.biometricIcon}>🔐</Text>
          <Text style={styles.biometricText}>
            {t("login.biometricLogin", { method: biometricLabel })}
          </Text>
        </TouchableOpacity>
      ) : null}

      {biometricReady ? (
        <Text style={styles.orDivider}>{t("common.or")}</Text>
      ) : null}

      <TextInput
        style={[styles.input, { textAlign }]}
        placeholder={t("login.email")}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={[styles.input, { textAlign }]}
        placeholder={t("login.password")}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={styles.button}
        onPress={() => void handleLogin()}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{t("login.submit")}</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.hint}>{t("login.hint")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#faf8f5",
    padding: 24,
    justifyContent: "center",
  },
  logo: {
    width: 100,
    height: 100,
    alignSelf: "center",
    marginBottom: 16,
    borderRadius: 50,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#5c3d1e",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#8b6914",
    textAlign: "center",
    marginBottom: 4,
  },
  version: {
    fontSize: 11,
    color: "#b8860b",
    textAlign: "center",
    marginBottom: 20,
  },
  biometricButton: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#5c3d1e",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 8,
  },
  biometricIcon: { fontSize: 28, marginBottom: 4 },
  biometricText: { color: "#5c3d1e", fontSize: 15, fontWeight: "700" },
  orDivider: {
    textAlign: "center",
    color: "#8b6914",
    marginVertical: 12,
    fontSize: 12,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e8dcc8",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#5c3d1e",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  error: { color: "#991b1b", textAlign: "center", marginBottom: 8 },
  hint: {
    marginTop: 16,
    fontSize: 11,
    color: "#8b6914",
    textAlign: "center",
    lineHeight: 18,
  },
});
