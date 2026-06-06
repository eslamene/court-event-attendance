import { useState } from "react";
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

  async function handleLogin() {
    setError("");
    setLoading(true);
    try {
      const data = await staffLogin(email.trim(), password);
      await saveSession(data.token, data.user, data.events);
      onLogin();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/logo.png")}
        style={styles.logo}
      />
      <Text style={styles.title}>مسح حضور الفعاليات</Text>
      <Text style={styles.subtitle}>تسجيل دخول طاقم الاستقبال</Text>

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
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>دخول</Text>
        )}
      </TouchableOpacity>
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
    marginBottom: 24,
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
});
