import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { buildQrPayload } from "@/lib/qr";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const registration = await prisma.registration.findUnique({
    where: { qrToken: token },
  });

  if (!registration || registration.status === "REJECTED") {
    return new NextResponse("Not found", { status: 404 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const payload = buildQrPayload(token, baseUrl);
  const buffer = await QRCode.toBuffer(payload, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 400,
    color: { dark: "#5c3d1e", light: "#ffffff" },
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
