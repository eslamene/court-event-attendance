import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { LOCALE_COOKIE } from "@/lib/i18n/constants";

const LOCALE_PREFIXES = new Set(["en", "ar"]);

/** Paths sometimes requested with a locale prefix but not defined in this app. */
const LOCALE_ONLY_REDIRECT_HOME = new Set(["profile"]);

function redirectLocalePrefixedPath(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  const match = pathname.match(/^\/([^/]+)(?:\/(.*))?$/);
  if (!match) return null;

  const maybeLocale = match[1];
  if (!LOCALE_PREFIXES.has(maybeLocale)) return null;

  const rest = match[2] ?? "";
  const targetPath =
    !rest || LOCALE_ONLY_REDIRECT_HOME.has(rest) ? "/" : `/${rest}`;

  const url = request.nextUrl.clone();
  url.pathname = targetPath;

  const response = NextResponse.redirect(url);
  response.cookies.set(LOCALE_COOKIE, maybeLocale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}

const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const localeRedirect = redirectLocalePrefixedPath(request);
  if (localeRedirect) return localeRedirect;

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
