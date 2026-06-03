import QRCode from "qrcode";
import { nanoid } from "nanoid";

export const QR_RENDER_OPTIONS = {
  errorCorrectionLevel: "H" as const,
  margin: 2,
  width: 400,
  color: { dark: "#5c3d1e", light: "#ffffff" },
};

export function getAppBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

export function generateQrToken(): string {
  return `QR-${nanoid(32)}`;
}

export async function generateQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, QR_RENDER_OPTIONS);
}

export async function generateQrPngBuffer(payload: string): Promise<Buffer> {
  return QRCode.toBuffer(payload, QR_RENDER_OPTIONS);
}

export function buildQrPayload(token: string, baseUrl?: string): string {
  const base = (baseUrl ?? getAppBaseUrl()).replace(/\/$/, "");
  return `${base}/api/qr/${token}`;
}

/** Public HTTPS PNG for email clients (data: URLs are blocked by Gmail, etc.). */
export function buildQrImageUrl(token: string, baseUrl?: string): string {
  const base = (baseUrl ?? getAppBaseUrl()).replace(/\/$/, "");
  if (token === "test") {
    return `${base}/api/qr/test/image`;
  }
  return `${base}/api/qr/${encodeURIComponent(token)}/image`;
}
