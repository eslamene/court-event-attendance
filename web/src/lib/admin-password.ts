import bcrypt from "bcryptjs";
import { apiT } from "@/lib/i18n/api";
import { prisma } from "./db";

export async function verifyAdminPassword(
  userId: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive || user.role !== "ADMIN") {
    return { ok: false, error: await apiT("api.adminRequired") };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { ok: false, error: await apiT("api.wrongAdminPassword") };
  }

  return { ok: true };
}
