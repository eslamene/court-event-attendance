import bcrypt from "bcryptjs";
import { prisma } from "./db";

export async function verifyAdminPassword(
  userId: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive || user.role !== "ADMIN") {
    return { ok: false, error: "يتطلب هذا الإجراء حساب مدير النظام" };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { ok: false, error: "كلمة مرور المدير غير صحيحة" };
  }

  return { ok: true };
}
