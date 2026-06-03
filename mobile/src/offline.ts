import { scanQr } from "./api";
import {
  getOfflineQueue,
  setOfflineQueue,
  type OfflineScan,
} from "./storage";

export async function syncOfflineQueue(token: string) {
  const queue = await getOfflineQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  const remaining: OfflineScan[] = [];
  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      await scanQr(token, item);
      synced++;
    } catch {
      remaining.push(item);
      failed++;
    }
  }

  await setOfflineQueue(remaining);
  return { synced, failed };
}
