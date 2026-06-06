import { API_BASE_URL } from "./config";

export type EventItem = {
  id: string;
  name: string;
  date: string;
  slug: string;
};

export type ScanResultCode =
  | "SUCCESS"
  | "INVALID"
  | "ALREADY_USED"
  | "WRONG_EVENT";

export type ScanRegistration = {
  fullName: string;
  rank: string;
  entity: string;
  eventName: string;
  seatLabel?: string | null;
};

export type ScanResult = {
  success: boolean;
  result: ScanResultCode;
  message: string;
  registration?: ScanRegistration;
};

export type StaffUser = {
  id: string;
  name: string;
  email: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function staffLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/api/mobile/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new ApiError(String(data.error || "فشل تسجيل الدخول"), res.status);
  }
  return data as {
    token: string;
    user: StaffUser;
    events: EventItem[];
  };
}

export async function fetchSession(token: string) {
  const res = await fetch(`${API_BASE_URL}/api/mobile/session`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new ApiError(String(data.error || "انتهت الجلسة"), res.status);
  }
  return data as {
    user: StaffUser;
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
  const data = await parseJson(res);
  if (!res.ok) {
    throw new ApiError(String(data.error || "فشل المسح"), res.status);
  }
  return data as ScanResult;
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof ApiError) {
    return error.status >= 500 || error.status === 0;
  }
  return false;
}

export function formatRegistrationDetails(
  registration?: ScanRegistration
): string {
  if (!registration) return "";
  const lines = [
    registration.fullName,
    registration.rank,
    registration.entity,
  ];
  if (registration.seatLabel) {
    lines.push(`المقعد: ${registration.seatLabel}`);
  }
  return lines.filter(Boolean).join("\n");
}
