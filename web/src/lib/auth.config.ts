import type { NextAuthConfig } from "next-auth";

/** Edge-safe config for proxy only. JWT/session callbacks live in auth.ts. */
export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isAdmin = request.nextUrl.pathname.startsWith("/admin");
      const isLogin = request.nextUrl.pathname === "/admin/login";
      const isLoggedIn = !!auth?.user;

      if (isAdmin && !isLogin && !isLoggedIn) return false;
      if (isLogin && isLoggedIn) {
        return Response.redirect(new URL("/admin", request.nextUrl));
      }
      return true;
    },
  },
};
