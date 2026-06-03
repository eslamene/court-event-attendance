import { NextResponse } from "next/server";
import { scanSchema } from "@/lib/i18n/schemas";
import { getStaffTokenFromRequest, verifyStaffToken } from "@/lib/staff-auth";
import { processScan } from "@/lib/scan";
import { apiT } from "@/lib/i18n/api";
import { jsonInvalidData, jsonUnauthorized } from "@/lib/i18n/responses";

export async function POST(req: Request) {
  const token = getStaffTokenFromRequest(req);
  if (!token) {
    return jsonUnauthorized();
  }

  const staff = await verifyStaffToken(token);
  if (!staff) {
    return NextResponse.json(
      { error: await apiT("api.invalidSession") },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonInvalidData();
  }

  const parsed = scanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: await apiT("api.invalidScanData") },
      { status: 400 }
    );
  }

  const scannedAt = parsed.data.scannedAt
    ? new Date(parsed.data.scannedAt)
    : new Date();

  const result = await processScan({
    qrRaw: parsed.data.qrToken,
    eventId: parsed.data.eventId,
    scannedById: staff.userId,
    offlineId: parsed.data.offlineId,
    scannedAt,
  });

  return NextResponse.json(result);
}
