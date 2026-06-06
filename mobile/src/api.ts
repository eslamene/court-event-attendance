import { API_BASE_URL } from "./config";
import { getStoredLocale, type Locale } from "./i18n";
import type { VenueCapacityProfile } from "./lib/seating-capacity";
import { getToken } from "./storage";

export type SeatingMapRenderMode = "full" | "sections" | "tier";

export type SectionBound = {
  tierId: string;
  tierName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  seatCount: number;
  assigned: number;
};

export type SeatingMapTier = {
  id: string;
  name: string;
  seatCount: number;
  sortOrder: number;
  assigned: number;
  available: number;
  seats: Array<{
    number: number;
    status: SeatCellStatus;
    registrationId?: string;
    fullName?: string;
    rank?: string;
  }>;
  occupiedSeats?: Array<{
    number: number;
    status: "approved" | "attended";
    registrationId?: string;
    fullName?: string;
    rank?: string;
  }>;
};

export type EventItem = {
  id: string;
  name: string;
  date: string;
  slug: string;
  logoPath?: string | null;
  seatingEnabled?: boolean;
};

export type SeatGuideTarget = {
  guestName: string;
  seatLabel: string;
  seatTierId: string;
  seatNumber: number;
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
  seatTierId?: string | null;
  seatTierName?: string | null;
  seatNumber?: number | null;
};

export type SeatCellStatus = "free" | "approved" | "attended";

export type SeatingMap = {
  eventId: string;
  eventName: string;
  seatingEnabled: boolean;
  seatingRevision?: number;
  layoutType: string;
  venue: {
    type: string;
    config?: { stagePosition?: string; stageLabel?: string };
    stage: { x: number; y: number; width: number; height: number; label: string };
    seats: Array<{
      number: number;
      tierId: string;
      tierName: string;
      x: number;
      y: number;
      seat: { status: SeatCellStatus };
    }>;
    renderMode?: SeatingMapRenderMode;
    sectionBounds?: SectionBound[];
    focusedTierId?: string;
  };
  updatedAt?: string;
  tiers?: SeatingMapTier[];
  totalSeats?: number;
  capacityProfile?: VenueCapacityProfile;
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

async function mobileHeaders(
  token?: string,
  locale?: Locale
): Promise<Record<string, string>> {
  const lang = locale ?? (await getStoredLocale());
  const headers: Record<string, string> = {
    "Accept-Language": lang,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function staffLogin(email: string, password: string) {
  const headers = await mobileHeaders();
  const res = await fetch(`${API_BASE_URL}/api/mobile/login`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
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
    headers: await mobileHeaders(token),
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
      ...(await mobileHeaders(token)),
      "Content-Type": "application/json",
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

export type AttendanceScan = {
  id: string;
  result: ScanResultCode;
  judgeName: string | null;
  qrToken: string;
  scannedAt: string;
  scannedBy: { id: string; name: string; email: string };
  registration: {
    fullName: string;
    rank: string;
    entity: string;
    seatLabel: string | null;
    seatTierId?: string | null;
    seatTierName?: string | null;
    seatNumber?: number | null;
  } | null;
};

export type AttendanceLogResponse = {
  event: { id: string; name: string };
  scope: "all" | "mine";
  scans: AttendanceScan[];
  summary: { total: number; success: number; mine: boolean };
};

export async function fetchEventScans(
  token: string,
  eventId: string,
  scope: "all" | "mine" = "all"
): Promise<AttendanceLogResponse> {
  const res = await fetch(
    `${API_BASE_URL}/api/mobile/events/${eventId}/scans?scope=${scope}&limit=200`,
    { headers: await mobileHeaders(token) }
  );
  const data = await parseJson(res);
  if (!res.ok) {
    throw new ApiError(String(data.error || "تعذّر تحميل السجل"), res.status);
  }
  return data as AttendanceLogResponse;
}

export async function fetchEventSeating(
  eventId: string,
  options?: {
    focus?: { seatTierId: string; seatNumber: number };
    tierId?: string;
  }
): Promise<SeatingMap> {
  const token = await getToken();
  if (!token) {
    throw new ApiError("Session expired", 401);
  }
  const params = new URLSearchParams();
  if (options?.focus) {
    params.set("seatTierId", options.focus.seatTierId);
    params.set("seatNumber", String(options.focus.seatNumber));
  }
  if (options?.tierId) {
    params.set("tierId", options.tierId);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(
    `${API_BASE_URL}/api/mobile/events/${eventId}/seating${query}`,
    { headers: await mobileHeaders(token) }
  );
  const data = await parseJson(res);
  if (!res.ok) {
    throw new ApiError(String(data.error || "Failed to load seating map"), res.status);
  }
  return data as SeatingMap;
}

export function hasSeatAssignment(
  reg?: Pick<
    ScanRegistration,
    "seatTierId" | "seatNumber" | "seatLabel"
  > | null
): reg is ScanRegistration & {
  seatTierId: string;
  seatNumber: number;
  seatLabel: string;
} {
  return Boolean(
    reg?.seatTierId &&
      reg.seatNumber != null &&
      reg.seatLabel
  );
}

export function formatRegistrationDetails(
  registration?: ScanRegistration,
  formatSeat?: (label: string) => string
): string {
  if (!registration) return "";
  const lines = [
    registration.fullName,
    registration.rank,
    registration.entity,
  ];
  if (registration.seatLabel) {
    lines.push(
      formatSeat
        ? formatSeat(registration.seatLabel)
        : registration.seatLabel
    );
  }
  return lines.filter(Boolean).join("\n");
}
