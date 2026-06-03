import { getPublicAppBaseUrl } from "./app-url";
import { prisma } from "./db";
import { apiT } from "./i18n/api";

export const SYSTEM_SETTINGS_ID = "global";

export const EMAIL_PROVIDER_PREFERENCES = [
  "auto",
  "twilio",
  "sendgrid",
  "resend",
] as const;

export type EmailProviderPreference =
  (typeof EMAIL_PROVIDER_PREFERENCES)[number];

export type SystemSettingsData = {
  platformName: string;
  supportEmail: string | null;
  supportPhone: string | null;
  qrInstructionsOverride: string | null;
  notifyEmailOnApprove: boolean;
  notifyWhatsAppOnApprove: boolean;
  notifySmsOnApprove: boolean;
  smsWhenWhatsAppUnavailable: boolean;
  emailProviderPreference: EmailProviderPreference;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  requireRegistrationNotes: boolean;
  allowPublicRegistration: boolean;
};

export type SystemEnvironmentInfo = {
  nodeEnv: string;
  appUrl: string | null;
  appVersion: string;
  databaseOk: boolean;
  authSecretConfigured: boolean;
  staffJwtConfigured: boolean;
  emailFromConfigured: boolean;
  twilioConfigured: boolean;
};

const DEFAULTS: SystemSettingsData = {
  platformName: "Court Events",
  supportEmail: null,
  supportPhone: null,
  qrInstructionsOverride: null,
  notifyEmailOnApprove: true,
  notifyWhatsAppOnApprove: true,
  notifySmsOnApprove: false,
  smsWhenWhatsAppUnavailable: true,
  emailProviderPreference: "auto",
  maintenanceMode: false,
  maintenanceMessage: null,
  requireRegistrationNotes: false,
  allowPublicRegistration: true,
};

let cache: { data: SystemSettingsData; at: number } | null = null;
const CACHE_MS = 10_000;

function rowToData(row: {
  platformName: string;
  supportEmail: string | null;
  supportPhone: string | null;
  qrInstructionsOverride: string | null;
  notifyEmailOnApprove: boolean;
  notifyWhatsAppOnApprove: boolean;
  notifySmsOnApprove: boolean;
  smsWhenWhatsAppUnavailable: boolean;
  emailProviderPreference: string;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  requireRegistrationNotes: boolean;
  allowPublicRegistration: boolean;
}): SystemSettingsData {
  const pref = row.emailProviderPreference.toLowerCase();
  const emailProviderPreference = EMAIL_PROVIDER_PREFERENCES.includes(
    pref as EmailProviderPreference
  )
    ? (pref as EmailProviderPreference)
    : "auto";

  return {
    platformName: row.platformName,
    supportEmail: row.supportEmail,
    supportPhone: row.supportPhone,
    qrInstructionsOverride: row.qrInstructionsOverride,
    notifyEmailOnApprove: row.notifyEmailOnApprove,
    notifyWhatsAppOnApprove: row.notifyWhatsAppOnApprove,
    notifySmsOnApprove: row.notifySmsOnApprove,
    smsWhenWhatsAppUnavailable: row.smsWhenWhatsAppUnavailable,
    emailProviderPreference,
    maintenanceMode: row.maintenanceMode,
    maintenanceMessage: row.maintenanceMessage,
    requireRegistrationNotes: row.requireRegistrationNotes,
    allowPublicRegistration: row.allowPublicRegistration,
  };
}

export function invalidateSystemSettingsCache(): void {
  cache = null;
}

export async function ensureSystemSettingsSeeded(): Promise<void> {
  await prisma.systemSettings.upsert({
    where: { id: SYSTEM_SETTINGS_ID },
    update: {},
    create: { id: SYSTEM_SETTINGS_ID, ...DEFAULTS },
  });
}

export async function getSystemSettings(): Promise<SystemSettingsData> {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return cache.data;
  }

  await ensureSystemSettingsSeeded();
  const row = await prisma.systemSettings.findUniqueOrThrow({
    where: { id: SYSTEM_SETTINGS_ID },
  });
  const data = rowToData(row);
  cache = { data, at: Date.now() };
  return data;
}

export async function updateSystemSettings(
  input: Partial<SystemSettingsData>
): Promise<SystemSettingsData> {
  await ensureSystemSettingsSeeded();

  const data: Record<string, unknown> = {};
  if (input.platformName !== undefined) {
    data.platformName = input.platformName.trim() || DEFAULTS.platformName;
  }
  if (input.supportEmail !== undefined) {
    data.supportEmail = input.supportEmail?.trim() || null;
  }
  if (input.supportPhone !== undefined) {
    data.supportPhone = input.supportPhone?.trim() || null;
  }
  if (input.qrInstructionsOverride !== undefined) {
    data.qrInstructionsOverride =
      input.qrInstructionsOverride?.trim() || null;
  }
  if (input.notifyEmailOnApprove !== undefined) {
    data.notifyEmailOnApprove = input.notifyEmailOnApprove;
  }
  if (input.notifyWhatsAppOnApprove !== undefined) {
    data.notifyWhatsAppOnApprove = input.notifyWhatsAppOnApprove;
  }
  if (input.notifySmsOnApprove !== undefined) {
    data.notifySmsOnApprove = input.notifySmsOnApprove;
  }
  if (input.smsWhenWhatsAppUnavailable !== undefined) {
    data.smsWhenWhatsAppUnavailable = input.smsWhenWhatsAppUnavailable;
  }
  if (input.emailProviderPreference !== undefined) {
    data.emailProviderPreference = EMAIL_PROVIDER_PREFERENCES.includes(
      input.emailProviderPreference
    )
      ? input.emailProviderPreference
      : "auto";
  }
  if (input.maintenanceMode !== undefined) {
    data.maintenanceMode = input.maintenanceMode;
  }
  if (input.maintenanceMessage !== undefined) {
    data.maintenanceMessage = input.maintenanceMessage?.trim() || null;
  }
  if (input.requireRegistrationNotes !== undefined) {
    data.requireRegistrationNotes = input.requireRegistrationNotes;
  }
  if (input.allowPublicRegistration !== undefined) {
    data.allowPublicRegistration = input.allowPublicRegistration;
  }

  const row = await prisma.systemSettings.update({
    where: { id: SYSTEM_SETTINGS_ID },
    data,
  });

  invalidateSystemSettingsCache();
  return rowToData(row);
}

export async function resolveQrInstructions(): Promise<string> {
  const settings = await getSystemSettings();
  if (settings.qrInstructionsOverride?.trim()) {
    return settings.qrInstructionsOverride.trim();
  }
  return apiT("approval.qrInstructions");
}

export async function shouldSendSmsOnApprove(): Promise<boolean> {
  const settings = await getSystemSettings();
  if (settings.notifySmsOnApprove) return true;
  if (!settings.smsWhenWhatsAppUnavailable) return false;
  if (process.env.NOTIFY_SMS === "true") return true;
  return (
    !process.env.TWILIO_WHATSAPP_NUMBER &&
    Boolean(process.env.TWILIO_PHONE_NUMBER)
  );
}

export async function isRegistrationOpen(): Promise<{
  open: boolean;
  message: string | null;
}> {
  const settings = await getSystemSettings();
  if (!settings.allowPublicRegistration) {
    return {
      open: false,
      message:
        settings.maintenanceMessage?.trim() ||
        (await apiT("system.registrationClosed")),
    };
  }
  if (settings.maintenanceMode) {
    return {
      open: false,
      message:
        settings.maintenanceMessage?.trim() ||
        (await apiT("system.maintenanceDefault")),
    };
  }
  return { open: true, message: null };
}

export async function getSystemEnvironmentInfo(): Promise<SystemEnvironmentInfo> {
  let databaseOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseOk = true;
  } catch {
    databaseOk = false;
  }

  const twilioConfigured = Boolean(
    process.env.TWILIO_ACCOUNT_SID?.startsWith("AC") &&
      process.env.TWILIO_AUTH_TOKEN
  );

  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    appUrl: getPublicAppBaseUrl(),
    appVersion: process.env.npm_package_version ?? "0.1.0",
    databaseOk,
    authSecretConfigured: Boolean(
      process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 16
    ),
    staffJwtConfigured: Boolean(
      process.env.STAFF_JWT_SECRET && process.env.STAFF_JWT_SECRET.length >= 16
    ),
    emailFromConfigured: Boolean(process.env.EMAIL_FROM),
    twilioConfigured,
  };
}
