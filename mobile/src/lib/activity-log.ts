import AsyncStorage from "@react-native-async-storage/async-storage";

const ACTIVITY_LOG_KEY = "app_activity_log";
const MAX_ENTRIES = 200;

export type ActivityType =
  | "login"
  | "logout"
  | "biometric_login"
  | "scan_success"
  | "scan_warning"
  | "scan_error"
  | "offline_queue"
  | "sync"
  | "settings"
  | "session_refresh"
  | "error";

export type ActivityEntry = {
  id: string;
  type: ActivityType;
  message: string;
  at: string;
  meta?: Record<string, string>;
};

async function readLog(): Promise<ActivityEntry[]> {
  const raw = await AsyncStorage.getItem(ACTIVITY_LOG_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ActivityEntry[];
  } catch {
    return [];
  }
}

export async function logActivity(
  type: ActivityType,
  message: string,
  meta?: Record<string, string>
) {
  const entry: ActivityEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    message,
    at: new Date().toISOString(),
    meta,
  };

  const log = await readLog();
  log.unshift(entry);
  await AsyncStorage.setItem(
    ACTIVITY_LOG_KEY,
    JSON.stringify(log.slice(0, MAX_ENTRIES))
  );
}

export async function getActivityLog(): Promise<ActivityEntry[]> {
  return readLog();
}

export async function clearActivityLog() {
  await AsyncStorage.removeItem(ACTIVITY_LOG_KEY);
}
