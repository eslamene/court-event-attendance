import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildQrPayload, generateQrDataUrl } from "@/lib/qr";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const registration = await prisma.registration.findUnique({
    where: { qrToken: token },
    include: { event: true },
  });

  if (!registration || registration.status === "REJECTED") {
    return NextResponse.json({ valid: false }, { status: 404 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const payload = buildQrPayload(token, baseUrl);
  const dataUrl = await generateQrDataUrl(payload);

  return NextResponse.json({
    valid: true,
    used: Boolean(registration.qrUsedAt),
    judgeName: registration.fullName,
    eventName: registration.event.name,
    eventDate: registration.event.date.toISOString(),
    qrImage: dataUrl,
  });
}
