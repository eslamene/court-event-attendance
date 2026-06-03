/** Preview URLs for template variables when editing email HTML visually. */
const PREVIEW_SRC: Record<string, string> = {
  qrImageUrl: "/api/qr/test/image",
  logoUrl: "/logo.png",
};

export function getPreviewSrcForPlaceholder(key: string): string | null {
  return PREVIEW_SRC[key] ?? null;
}
