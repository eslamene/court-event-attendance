import { z } from "zod";
import { ENTITY_OPTIONS, RANK_OPTIONS } from "./constants";

const egyptMobileRegex = /^(?:\+20|0020|0)?1[0125]\d{8}$/;

export function normalizeMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, "");
  if (digits.startsWith("20") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+20${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("1")) return `+20${digits}`;
  return mobile.trim();
}

export const registrationSchema = z.object({
  fullName: z.string().min(3, "الاسم الكامل مطلوب"),
  rank: z.enum(RANK_OPTIONS, { message: "الرتبة مطلوبة" }),
  entity: z.enum(ENTITY_OPTIONS, { message: "الجهة مطلوبة" }),
  email: z.string().email("البريد الإلكتروني غير صالح"),
  mobile: z
    .string()
    .min(10, "رقم الجوال مطلوب")
    .refine((v) => egyptMobileRegex.test(normalizeMobile(v)), {
      message: "رقم الجوال غير صالح (مثال: 01xxxxxxxxx)",
    }),
  notes: z.string().max(1000).optional(),
});

export const eventSchema = z.object({
  name: z.string().min(3, "اسم الفعالية مطلوب"),
  date: z.string().min(1, "تاريخ الفعالية مطلوب"),
});

export const updateEventSchema = z.object({
  name: z.string().min(3).optional(),
  date: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  logoUrl: z
    .string()
    .optional()
    .refine((v) => !v || v === "" || /^https?:\/\//.test(v), {
      message: "رابط الشعار يجب أن يبدأ بـ http:// أو https://",
    }),
});

export const clearEventDataSchema = z.object({
  adminPassword: z.string().min(6, "كلمة مرور المدير مطلوبة"),
  confirmPhrase: z
    .string()
    .refine((v) => v === "مسح البيانات", {
      message: 'اكتب "مسح البيانات" للتأكيد',
    }),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const staffLoginSchema = loginSchema;

export const scanSchema = z.object({
  qrToken: z.string().min(8),
  eventId: z.string().min(1),
  offlineId: z.string().optional(),
  scannedAt: z.string().optional(),
});

export const USER_ROLES = ["ADMIN", "APPROVAL_MANAGER", "EVENT_STAFF"] as const;

export const createUserSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح"),
  name: z.string().min(2, "الاسم مطلوب"),
  password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل"),
  role: z.enum(USER_ROLES, { message: "الدور مطلوب" }),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(USER_ROLES).optional(),
  isActive: z.boolean().optional(),
});

export const notificationTestSchema = z.object({
  channel: z.enum(["email", "sms", "whatsapp"]),
  to: z.string().min(5),
});
