import * as LocalAuthentication from "expo-local-authentication";
import {
  getBiometricCredentials,
  isBiometricEnabled,
} from "./settings";

export type BiometricSupport = {
  available: boolean;
  enrolled: boolean;
  label: string;
};

export async function getBiometricSupport(): Promise<BiometricSupport> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

  let label = "المصادقة البيومترية";
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    label = "Face ID";
  } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    label = "بصمة الإصبع";
  } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    label = "مسح القزحية";
  }

  return {
    available: hasHardware,
    enrolled,
    label,
  };
}

export async function authenticateWithBiometric(
  prompt = "تحقق من هويتك للمتابعة"
): Promise<boolean> {
  const support = await getBiometricSupport();
  if (!support.available || !support.enrolled) return false;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: prompt,
    cancelLabel: "إلغاء",
    disableDeviceFallback: false,
    fallbackLabel: "استخدام كلمة المرور",
  });

  return result.success;
}

export async function canUseBiometricLogin(): Promise<boolean> {
  const [enabled, support] = await Promise.all([
    isBiometricEnabled(),
    getBiometricSupport(),
  ]);
  if (!enabled || !support.available || !support.enrolled) return false;
  const credentials = await getBiometricCredentials();
  return credentials !== null;
}
