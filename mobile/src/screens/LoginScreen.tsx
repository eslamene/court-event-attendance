import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  I18nManager,
} from "react-native";
import { staffLogin } from "../api";
import { canUseBiometricLogin, getBiometricSupport } from "../lib/biometric";
import { logActivity } from "../lib/activity-log";
import { getBiometricCredentials } from "../lib/settings";
import { saveSession } from "../storage";

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

type Props = {
  onLogin: () => void;
};

export function LoginScreen({ onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricReady, setBiometricReady] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("المصادقة البيومترية");

  useEffect(() => {
    async function checkBiometric() {
      const [ready, support] = await Promise.all([
        canUseBiometricLogin(),
        getBiometricSupport(),
      ]);
      setBiometricReady(ready);
      setBiometricLabel(support.label);
    }
    void checkBiometric();
  }, []);

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
          ? `دخول عبر ${biometricLabel}`
          : `تسجيل دخول: ${data.user.name}`
      );
      onLogin();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ غير متوقع");
      await logActivity("error", "فشل تسجيل الدخول");
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
      const credentials = await getBiometricCredentials();
      if (!credentials) {
        setError("لم يتم العثور على بيانات الدخول المحفوظة");
        setBiometricReady(false);
        return;
      }
      await completeLogin(credentials.email, credentials.password, true);
    } catch {
      setError("فشل التحقق البيومتري");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Image source={require("../../assets/logo.png")} style={styles.logo} />
      <Text style={styles.title}>مسح حضور الفعاليات</Text>
      <Text style={styles.subtitle}>تسجيل دخول طاقم الاستقبال</Text>
      <Text style={styles.version}>الإصدار 1.1.0</Text>

      {biometricReady ? (
        <TouchableOpacity
          style={styles.biometricButton}
          onPress={() => void handleBiometricLogin()}
          disabled={loading}
        >
          <Text style={styles.biometricIcon}>🔐</Text>
          <Text style={styles.biometricText}>الدخول عبر {biometricLabel}</Text>
        </TouchableOpacity>
      ) : null}

      {biometricReady ? (
        <Text style={styles.orDivider}>— أو —</Text>
      ) : null}

      <TextInput
        style={styles.input}
        placeholder="البريد الإلكتروني"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        textAlign="right"
      />
      <TextInput
        style={styles.input}
        placeholder="كلمة المرور"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textAlign="right"
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
          <Text style={styles.buttonText}>دخول</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.hint}>
        يمكنك تفعيل الدخول البيومتري من الإعدادات بعد تسجيل الدخول
      </Text>
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
