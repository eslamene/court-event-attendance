import { NextResponse } from "next/server";
import { scanSchema } from "@/lib/validators";
import { getStaffTokenFromRequest, verifyStaffToken } from "@/lib/staff-auth";
import { processScan } from "@/lib/scan";

export async function POST(req: Request) {
  const token = getStaffTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const staff = await verifyStaffToken(token);
  if (!staff) {
    return NextResponse.json({ error: "جلسة غير صالحة" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const parsed = scanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات المسح غير صالحة" }, { status: 400 });
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
