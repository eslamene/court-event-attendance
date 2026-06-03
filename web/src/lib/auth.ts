import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { AUDIT_ACTIONS, recordAudit } from "./audit-log";
import { authConfig } from "./auth.config";
import type { UserRole } from "@/generated/prisma/client";

declare module "next-auth" {
  interface User {
    role: UserRole;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  events: {
    async signIn({ user }) {
      if (user?.id) {
        await recordAudit({
          action: AUDIT_ACTIONS.AUTH_SIGN_IN,
          actor: {
            id: user.id,
            name: user.name ?? "",
            email: user.email ?? "",
          },
          entityType: "user",
          entityId: user.id,
          entityLabel: user.name ?? user.email ?? undefined,
        });
      }
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        if (user.role === "EVENT_STAFF") return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});

export function canManageEvents(role: UserRole) {
  return role === "ADMIN";
}

export function canApprove(role: UserRole) {
  return role === "ADMIN" || role === "APPROVAL_MANAGER";
}
