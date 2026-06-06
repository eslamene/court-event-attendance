import * as LocalAuthentication from "expo-local-authentication";
import {
  getBiometricCredentials,
  isBiometricEnabled,
} from "./settings";

export type BiometricSupport = {
  available: boolean;
  enrolled: boolean;
  label: string;
  type: "face" | "fingerprint" | "iris" | "generic";
};

type BiometricLabels = {
  generic: string;
  faceId: string;
  fingerprint: string;
  iris: string;
  cancel: string;
  usePassword: string;
};

export async function getBiometricSupport(
  labels: BiometricLabels
): Promise<BiometricSupport> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

  let label = labels.generic;
  let type: BiometricSupport["type"] = "generic";

  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    label = labels.faceId;
    type = "face";
  } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    label = labels.fingerprint;
    type = "fingerprint";
  } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    label = labels.iris;
    type = "iris";
  }

  return {
    available: hasHardware,
    enrolled,
    label,
    type,
  };
}

export async function authenticateWithBiometric(
  prompt: string,
  labels: Pick<BiometricLabels, "cancel" | "usePassword">
): Promise<boolean> {
  const support = await getBiometricSupport({
    generic: "",
    faceId: "",
    fingerprint: "",
    iris: "",
    ...labels,
  });
  if (!support.available || !support.enrolled) return false;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: prompt,
    cancelLabel: labels.cancel,
    disableDeviceFallback: false,
    fallbackLabel: labels.usePassword,
  });

  return result.success;
}

export async function canUseBiometricLogin(
  authPrompt?: string
): Promise<boolean> {
  const [enabled, hasHardware, enrolled] = await Promise.all([
    isBiometricEnabled(),
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  if (!enabled || !hasHardware || !enrolled) return false;
  const credentials = await getBiometricCredentials(authPrompt);
  return credentials !== null;
}
