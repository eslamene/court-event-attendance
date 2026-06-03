import QRCode from "qrcode";
import { nanoid } from "nanoid";

export function generateQrToken(): string {
  return `QR-${nanoid(32)}`;
}

export async function generateQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 400,
    color: { dark: "#5c3d1e", light: "#ffffff" },
  });
}

export function buildQrPayload(token: string, baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/api/qr/${token}`;
}
