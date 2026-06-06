import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { LoginScreen } from "./src/screens/LoginScreen";
import { ScannerScreen } from "./src/screens/ScannerScreen";
import { ApiError, fetchSession } from "./src/api";
import { clearSession, getToken, saveEvents, saveUser } from "./src/storage";

export default function App() {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    async function restoreSession() {
      const token = await getToken();
      if (!token) {
        setLoggedIn(false);
        setReady(true);
        return;
      }

      try {
        const session = await fetchSession(token);
        await saveUser(session.user);
        await saveEvents(session.events);
        setLoggedIn(true);
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
    await clearSession();
    setLoggedIn(false);
  }

  if (!ready) return null;

  return (
    <>
      <StatusBar style="light" />
      {loggedIn ? (
        <ScannerScreen onLogout={handleLogout} />
      ) : (
        <LoginScreen onLogin={() => setLoggedIn(true)} />
      )}
    </>
  );
}
