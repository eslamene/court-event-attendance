/**
 * pg / pg-connection-string v2 treats sslmode=require as verify-full.
 * Use verify-full explicitly to avoid deprecation warnings and keep Neon-safe TLS.
 * @see https://www.postgresql.org/docs/current/libpq-ssl.html
 */
export function normalizePgSslMode(connectionString: string): string {
  if (
    !connectionString ||
    connectionString.startsWith("file:") ||
    !connectionString.includes("sslmode=")
  ) {
    return connectionString;
  }

  try {
    const url = new URL(connectionString);
    const mode = url.searchParams.get("sslmode");
    if (mode === "require" || mode === "prefer" || mode === "verify-ca") {
      url.searchParams.set("sslmode", "verify-full");
      return url.toString();
    }
    return connectionString;
  } catch {
    return connectionString.replace(
      /([?&])sslmode=(require|prefer|verify-ca)\b/,
      "$1sslmode=verify-full"
    );
  }
}
