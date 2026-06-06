import * as SecureStore from "expo-secure-store";

const BIOMETRIC_ENABLED_KEY = "biometric_enabled";
const CREDENTIALS_KEY = "biometric_credentials";

export type StoredCredentials = {
  email: string;
  password: string;
};

function secureOptions(prompt: string): SecureStore.SecureStoreOptions {
  return {
    requireAuthentication: true,
    authenticationPrompt: prompt,
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  };
}

export async function isBiometricEnabled(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
  return value === "true";
}

export async function setBiometricEnabled(enabled: boolean) {
  if (enabled) {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "true");
    return;
  }
  await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
  await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
}

export async function saveBiometricCredentials(
  credentials: StoredCredentials,
  authPrompt: string
) {
  await SecureStore.setItemAsync(
    CREDENTIALS_KEY,
    JSON.stringify(credentials),
    secureOptions(authPrompt)
  );
  await setBiometricEnabled(true);
}

export async function getBiometricCredentials(
  authPrompt?: string
): Promise<StoredCredentials | null> {
  const options = authPrompt ? secureOptions(authPrompt) : undefined;
  const raw = await SecureStore.getItemAsync(CREDENTIALS_KEY, options);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredCredentials;
  } catch {
    return null;
  }
}

export async function clearBiometricCredentials() {
  await setBiometricEnabled(false);
}
