import { z } from "zod";
import type { Dictionary } from "./types";
import { parseJsonStringArray } from "./translate";

const egyptMobileRegex = /^(?:\+20|0020|0)?1[0125]\d{8}$/;

export function normalizeMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, "");
  if (digits.startsWith("20") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+20${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("1")) return `+20${digits}`;
  return mobile.trim();
}

export const USER_ROLES = ["ADMIN", "APPROVAL_MANAGER", "EVENT_STAFF"] as const;

function msg(dict: Dictionary, key: string) {
  return dict[key] ?? key;
}

export function createRegistrationSchema(dict: Dictionary) {
  const ranks = parseJsonStringArray(dict, "options.ranks");
  const entities = parseJsonStringArray(dict, "options.entities");

  return z.object({
    fullName: z.string().min(3, msg(dict, "validation.fullNameRequired")),
    rank: z
      .string()
      .refine((v) => ranks.length === 0 || ranks.includes(v), {
        message: msg(dict, "validation.rankRequired"),
      }),
    entity: z
      .string()
      .refine((v) => entities.length === 0 || entities.includes(v), {
        message: msg(dict, "validation.entityRequired"),
      }),
    email: z.string().email(msg(dict, "validation.emailInvalid")),
    mobile: z
      .string()
      .min(10, msg(dict, "validation.mobileRequired"))
      .refine((v) => egyptMobileRegex.test(normalizeMobile(v)), {
        message: msg(dict, "validation.mobileInvalid"),
      }),
    notes: z.string().max(1000).optional(),
  });
}

export function createEventSchema(dict: Dictionary) {
  return z.object({
    name: z.string().min(3, msg(dict, "validation.eventNameRequired")),
    date: z.string().min(1, msg(dict, "validation.eventDateRequired")),
  });
}

export function createUpdateEventSchema(dict: Dictionary) {
  return z.object({
    name: z.string().min(3).optional(),
    date: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
    logoUrl: z
      .string()
      .optional()
      .refine((v) => !v || v === "" || /^https?:\/\//.test(v), {
        message: msg(dict, "validation.logoUrlInvalid"),
      }),
  });
}

export function createClearEventDataSchema(dict: Dictionary) {
  const phrase = dict["admin.clearConfirmPhrase"] ?? "مسح البيانات";
  return z.object({
    adminPassword: z
      .string()
      .min(6, msg(dict, "validation.adminPasswordRequired")),
    confirmPhrase: z.string().refine((v) => v === phrase, {
      message: msg(dict, "validation.clearConfirmPhrase"),
    }),
  });
}

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

export function createUserSchema(dict: Dictionary) {
  return z.object({
    email: z.string().email(msg(dict, "validation.emailInvalid")),
    name: z.string().min(2, msg(dict, "validation.nameRequired")),
    password: z.string().min(8, msg(dict, "validation.passwordMin")),
    role: z.enum(USER_ROLES, { message: msg(dict, "validation.roleRequired") }),
  });
}

export function createUpdateUserSchema(dict: Dictionary) {
  return z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
    role: z.enum(USER_ROLES).optional(),
    isActive: z.boolean().optional(),
  });
}

export const notificationTestSchema = z.object({
  channel: z.enum(["email", "sms", "whatsapp"]),
  to: z.string().min(5),
});
