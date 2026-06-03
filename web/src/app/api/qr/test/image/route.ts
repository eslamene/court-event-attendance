import { NextResponse } from "next/server";
import { generateQrPngBuffer, getAppBaseUrl } from "@/lib/qr";

/** Test QR image for admin email tests (no registration required). */
export async function GET() {
  const payload = `${getAppBaseUrl()}/api/qr/test`;
  const buffer = await generateQrPngBuffer(payload);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=300",
    },
  });
}
