import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { AUDIT_ACTIONS, recordAudit } from "./audit-log";
import { authConfig } from "./auth.config";
import type { RolePermission } from "./role-permissions";
import {
  getRoleByCode,
  listRolePermissions,
  roleHasPermission,
  userCanAccessAdminPanel,
} from "./roles-store";

type LegacyJwt = {
  id?: string;
  roleId?: string;
  roleCode?: string;
  roleName?: string;
  role?: string;
};

declare module "next-auth" {
  interface User {
    roleId: string;
    roleCode: string;
    roleName: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      roleId: string;
      roleCode: string;
      roleName: string;
    };
  }
}

async function hydrateTokenRole(token: LegacyJwt): Promise<LegacyJwt> {
  if (!token.id || token.roleId) return token;

  const legacyRole = token.role;
  if (legacyRole) {
    const role = await getRoleByCode(legacyRole);
    if (role) {
      token.roleId = role.id;
      token.roleCode = role.code;
      token.roleName = role.name;
      delete token.role;
      return token;
    }
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: token.id },
    include: { role: true },
  });

  if (dbUser?.role) {
    token.roleId = dbUser.roleId;
    token.roleCode = dbUser.role.code;
    token.roleName = dbUser.role.name;
    delete token.role;
  }

  return token;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.roleId = user.roleId;
        token.roleCode = user.roleCode;
        token.roleName = user.roleName;
        delete (token as LegacyJwt).role;
        return token;
      }

      return hydrateTokenRole(token as LegacyJwt);
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.roleId = token.roleId as string;
        session.user.roleCode = token.roleCode as string;
        session.user.roleName = token.roleName as string;
      }
      return session;
    },
  },
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

        const user = await prisma.user.findUnique({
          where: { email },
          include: { role: true },
        });
        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        if (!(await userCanAccessAdminPanel(user.roleId))) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          roleId: user.roleId,
          roleCode: user.role.code,
          roleName: user.role.name,
        };
      },
    }),
  ],
});

async function checkPermission(
  roleId: string | undefined | null,
  permission: RolePermission
) {
  return roleHasPermission(roleId, permission);
}

export async function canManageEvents(roleId: string | undefined | null) {
  return checkPermission(roleId, "manage_events");
}

export async function canManageSeating(roleId: string | undefined | null) {
  return checkPermission(roleId, "manage_seating");
}

export async function canManageUsers(roleId: string | undefined | null) {
  return checkPermission(roleId, "manage_users");
}

export async function canManageRoles(roleId: string | undefined | null) {
  return checkPermission(roleId, "manage_roles");
}

export async function canManageSettings(roleId: string | undefined | null) {
  return checkPermission(roleId, "manage_settings");
}

export async function canManageDictionary(roleId: string | undefined | null) {
  return checkPermission(roleId, "manage_dictionary");
}

export async function canManageRegistrations(roleId: string | undefined | null) {
  return checkPermission(roleId, "manage_registrations");
}

export async function canApprove(roleId: string | undefined | null) {
  return checkPermission(roleId, "approve_registrations");
}

export async function canViewAudit(roleId: string | undefined | null) {
  return checkPermission(roleId, "view_audit");
}

export async function getSessionPermissions(roleId: string | undefined | null) {
  return listRolePermissions(roleId);
}
