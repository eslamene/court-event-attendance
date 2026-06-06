import { ApiError, scanQr } from "./api";
import {
  getOfflineQueue,
  setOfflineQueue,
  type OfflineScan,
} from "./storage";

export type SyncResult = {
  synced: number;
  pending: number;
  sessionExpired: boolean;
};

export async function syncOfflineQueue(token: string): Promise<SyncResult> {
  const queue = await getOfflineQueue();
  if (queue.length === 0) {
    return { synced: 0, pending: 0, sessionExpired: false };
  }

  const remaining: OfflineScan[] = [];
  let synced = 0;

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    try {
      await scanQr(token, item);
      synced++;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        const toKeep = queue.slice(i);
        await setOfflineQueue(toKeep);
        return {
          synced,
          pending: toKeep.length,
          sessionExpired: true,
        };
      }
      remaining.push(item);
    }
  }

  await setOfflineQueue(remaining);
  return {
    synced,
    pending: remaining.length,
    sessionExpired: false,
  };
}
