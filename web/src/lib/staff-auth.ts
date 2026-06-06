import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { roleHasPermission } from "./roles-store";

const secret = new TextEncoder().encode(
  process.env.STAFF_JWT_SECRET || process.env.AUTH_SECRET || "dev-staff-secret-change-me"
);

export async function authenticateStaff(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });
  if (!user || !user.isActive) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  if (!(await roleHasPermission(user.roleId, "mobile_scan"))) return null;

  return user;
}

export async function createStaffToken(userId: string, email: string, name: string) {
  return new SignJWT({ sub: userId, email, name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);
}

export async function verifyStaffToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

export function getStaffTokenFromRequest(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}
