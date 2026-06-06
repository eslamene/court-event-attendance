import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LoginScreen } from "./src/screens/LoginScreen";
import { AppLogo } from "./src/components/ui/AppLogo";
import { MainTabs } from "./src/navigation/MainTabs";
import { I18nProvider } from "./src/context/I18nContext";
import { getStoredLocale, translate } from "./src/i18n";
import { ApiError, fetchSession, staffLogin } from "./src/api";
import { authenticateWithBiometric } from "./src/lib/biometric";
import { logActivity } from "./src/lib/activity-log";
import {
  getBiometricCredentials,
  isBiometricEnabled,
} from "./src/lib/settings";
import { clearSession, getToken, saveEvents, saveSession, saveUser } from "./src/storage";
import { colors, spacing } from "./src/theme/tokens";

function AppRoot() {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    async function restoreSession() {
      const locale = await getStoredLocale();
      const t = (key: string) => translate(locale, key);

      try {
        const biometricEnabled = await isBiometricEnabled();

        if (biometricEnabled) {
          const unlocked = await authenticateWithBiometric(
            t("biometric.unlockApp"),
            {
              cancel: t("biometric.cancel"),
              usePassword: t("biometric.usePassword"),
            }
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
              await logActivity("session_refresh", t("session.refreshBiometric"));
              return;
            } catch (error) {
              if (!(error instanceof ApiError && error.status === 401)) {
                setLoggedIn(false);
                return;
              }
            }
          }

          const credentials = await getBiometricCredentials(
            t("biometric.credentialsPrompt")
          );
          if (credentials) {
            const data = await staffLogin(credentials.email, credentials.password);
            await saveSession(data.token, data.user, data.events);
            setLoggedIn(true);
            await logActivity("session_refresh", t("session.autoBiometricLogin"));
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
        await logActivity("session_refresh", t("session.refresh"));
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
    const locale = await getStoredLocale();
    await logActivity("logout", translate(locale, "session.logout"));
    await clearSession();
    setLoggedIn(false);
  }

  if (!ready) {
    return (
      <SafeAreaProvider>
        <View style={styles.boot}>
          <AppLogo size={88} variant="platform" style={styles.bootLogo} />
          <ActivityIndicator size="large" color={colors.goldAccent} />
          <StatusBar style="light" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {loggedIn ? (
        <MainTabs onLogout={() => void handleLogout()} />
      ) : (
        <LoginScreen onLogin={() => setLoggedIn(true)} />
      )}
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppRoot />
    </I18nProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.gold,
    gap: spacing.lg,
  },
  bootLogo: { marginBottom: spacing.xs },
});
