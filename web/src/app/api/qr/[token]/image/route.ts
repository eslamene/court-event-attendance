import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildQrPayload, generateQrPngBuffer } from "@/lib/qr";

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

  const payload = buildQrPayload(token);
  const buffer = await generateQrPngBuffer(payload);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
