import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { LoginScreen } from "./src/screens/LoginScreen";
import { MainTabs } from "./src/navigation/MainTabs";
import { ApiError, fetchSession, staffLogin } from "./src/api";
import { authenticateWithBiometric } from "./src/lib/biometric";
import { logActivity } from "./src/lib/activity-log";
import {
  getBiometricCredentials,
  isBiometricEnabled,
} from "./src/lib/settings";
import { clearSession, getToken, saveEvents, saveSession, saveUser } from "./src/storage";

export default function App() {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    async function restoreSession() {
      try {
        const biometricEnabled = await isBiometricEnabled();

        if (biometricEnabled) {
          const unlocked = await authenticateWithBiometric(
            "تحقق من هويتك لفتح التطبيق"
          );
          if (!unlocked) {
            setLoggedIn(false);
            return;
          }

          const token = await getToken();
          if (token) {
            try {
              const session = await fetchSession(token);
              await saveUser(session.user);
              await saveEvents(session.events);
              setLoggedIn(true);
              await logActivity("session_refresh", "استعادة الجلسة بعد التحقق البيومتري");
              return;
            } catch (error) {
              if (!(error instanceof ApiError && error.status === 401)) {
                setLoggedIn(false);
                return;
              }
            }
          }

          const credentials = await getBiometricCredentials();
          if (credentials) {
            const data = await staffLogin(credentials.email, credentials.password);
            await saveSession(data.token, data.user, data.events);
            setLoggedIn(true);
            await logActivity("biometric_login", "تسجيل دخول بيومتري تلقائي");
            return;
          }
        }

        const token = await getToken();
        if (!token) {
          setLoggedIn(false);
          return;
        }

        const session = await fetchSession(token);
        await saveUser(session.user);
        await saveEvents(session.events);
        setLoggedIn(true);
        await logActivity("session_refresh", "استعادة الجلسة");
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await clearSession();
        }
        setLoggedIn(false);
      } finally {
        setReady(true);
      }
    }

    void restoreSession();
  }, []);

  async function handleLogout() {
    await logActivity("logout", "تسجيل خروج");
    await clearSession();
    setLoggedIn(false);
  }

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color="#5c3d1e" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      {loggedIn ? (
        <MainTabs onLogout={() => void handleLogout()} />
      ) : (
        <LoginScreen onLogin={() => setLoggedIn(true)} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#5c3d1e",
  },
});
