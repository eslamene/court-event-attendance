/** Mirror server-side token extraction in web/src/lib/scan.ts */
export function extractQrToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (last?.startsWith("QR-")) return last;
  } catch {
    /* not a URL */
  }

  if (trimmed.startsWith("QR-")) return trimmed;

  const match = trimmed.match(/QR-[A-Za-z0-9_-]+/);
  return match ? match[0] : trimmed;
}

export function isLikelyQrPayload(raw: string): boolean {
  const token = extractQrToken(raw);
  return token.startsWith("QR-") && token.length > 10;
}
