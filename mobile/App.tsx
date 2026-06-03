import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { LoginScreen } from "./src/screens/LoginScreen";
import { ScannerScreen } from "./src/screens/ScannerScreen";
import { getToken, clearSession } from "./src/storage";

export default function App() {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    getToken().then((t) => {
      setLoggedIn(!!t);
      setReady(true);
    });
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
