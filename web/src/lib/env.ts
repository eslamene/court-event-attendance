import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(16).optional(),
  STAFF_JWT_SECRET: z.string().min(16).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  SENDGRID_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(5).optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  TWILIO_WHATSAPP_NUMBER: z.string().optional(),
  NOTIFY_SMS: z.enum(["true", "false"]).optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export function getEnv(): AppEnv {
  return envSchema.parse(process.env);
}

export { getNotificationsSummary as getNotificationStatus } from "./notifications";

export function assertProductionSecrets() {
  if (process.env.NODE_ENV !== "production") return;

  const missing: string[] = [];
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    missing.push("AUTH_SECRET (min 32 chars)");
  }
  if (!process.env.STAFF_JWT_SECRET || process.env.STAFF_JWT_SECRET.length < 32) {
    missing.push("STAFF_JWT_SECRET (min 32 chars)");
  }
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    missing.push("NEXT_PUBLIC_APP_URL");
  }

  if (missing.length > 0) {
    console.warn(
      `[env] Production missing recommended secrets: ${missing.join(", ")}`
    );
  }
}
