import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { EventItem, StaffUser } from "./api";

const TOKEN_KEY = "staff_token";
const USER_KEY = "staff_user";
const EVENTS_KEY = "staff_events";
const SELECTED_EVENT_KEY = "selected_event_id";
const OFFLINE_QUEUE_KEY = "offline_scan_queue";

export async function saveSession(
  token: string,
  user: StaffUser,
  events: EventItem[]
) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

export async function saveEvents(events: EventItem[]) {
  await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

export async function saveUser(user: StaffUser) {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getUser(): Promise<StaffUser | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function getEvents(): Promise<EventItem[]> {
  const raw = await AsyncStorage.getItem(EVENTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function getSelectedEventId() {
  return AsyncStorage.getItem(SELECTED_EVENT_KEY);
}

export async function setSelectedEventId(id: string) {
  await AsyncStorage.setItem(SELECTED_EVENT_KEY, id);
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await AsyncStorage.multiRemove([USER_KEY, EVENTS_KEY, SELECTED_EVENT_KEY]);
}

export type OfflineScan = {
  offlineId: string;
  qrToken: string;
  eventId: string;
  scannedAt: string;
};

export async function getOfflineQueue(): Promise<OfflineScan[]> {
  const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function enqueueOfflineScan(scan: OfflineScan) {
  const queue = await getOfflineQueue();
  queue.push(scan);
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export async function setOfflineQueue(queue: OfflineScan[]) {
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}
