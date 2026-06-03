import { API_BASE_URL } from "./config";

export type EventItem = {
  id: string;
  name: string;
  date: string;
  slug: string;
};

export type ScanResult = {
  success: boolean;
  result: string;
  message: string;
  registration?: {
    fullName: string;
    rank: string;
    entity: string;
    eventName: string;
  };
};

export async function staffLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/api/mobile/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "فشل تسجيل الدخول");
  return data as {
    token: string;
    user: { id: string; name: string; email: string };
    events: EventItem[];
  };
}

export async function scanQr(
  token: string,
  payload: {
    qrToken: string;
    eventId: string;
    offlineId?: string;
    scannedAt?: string;
  }
): Promise<ScanResult> {
  const res = await fetch(`${API_BASE_URL}/api/mobile/scan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "فشل المسح");
  return data;
}
