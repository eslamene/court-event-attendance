/**
 * Canonical public site URL for judge-facing links (registration, QR).
 * Prefer APP_PUBLIC_URL or a custom-domain NEXT_PUBLIC_APP_URL — never *.vercel.app.
 */

export function normalizeAppBaseUrl(raw?: string | null): string | null {
  if (!raw?.trim()) return null;
  return raw.trim().replace(/\/$/, "");
}

export function isVercelPreviewHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname.endsWith(".vercel.app") || hostname === "vercel.app";
  } catch {
    return false;
  }
}

function pickCanonicalBase(candidates: (string | null | undefined)[]): string | null {
  for (const raw of candidates) {
    const base = normalizeAppBaseUrl(raw);
    if (base && !isVercelPreviewHost(base)) return base;
  }
  return null;
}

/** Server + shared: canonical public origin for outbound links. */
export function getPublicAppBaseUrl(): string {
  return (
    pickCanonicalBase([
      process.env.APP_PUBLIC_URL,
      process.env.NEXT_PUBLIC_APP_URL,
    ]) ?? "http://localhost:3000"
  );
}

/** Client components (NEXT_PUBLIC_* only at runtime). */
export function getClientPublicAppBaseUrl(): string {
  return (
    pickCanonicalBase([process.env.NEXT_PUBLIC_APP_URL]) ??
    "http://localhost:3000"
  );
}

export function buildRegistrationUrl(slug: string, baseUrl?: string): string {
  const base = (baseUrl ?? getPublicAppBaseUrl()).replace(/\/$/, "");
  return `${base}/register/${encodeURIComponent(slug)}`;
}

/** Prefer custom domain when API still returns a Vercel deployment URL. */
export function resolveRegistrationUrl(
  slug: string,
  fromApi?: string | null
): string {
  const canonical = buildRegistrationUrl(slug, getClientPublicAppBaseUrl());
  if (!fromApi) return canonical;
  if (isVercelPreviewHost(fromApi)) return canonical;
  return fromApi;
}
