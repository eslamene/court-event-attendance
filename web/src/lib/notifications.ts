import { Resend } from "resend";
import sgMail from "@sendgrid/mail";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { validateRecipientEmail } from "./email-address";
import {
  formatDeliveryError,
  formatResendError,
  formatSendGridError,
} from "./notification-errors";
import {
  isTwilioEmailConfigured,
  resolveTwilioEmailFrom,
  sendTwilioCommsEmail,
  sendTwilioMessage,
} from "./twilio-client";
import { fetchVerifiedEmailSenders } from "./sendgrid-senders";
import {
  renderEmailTemplate,
  resolveEmailTemplateForEvent,
} from "./email-template";
import { buildQrImageUrl } from "./qr";
import type { EmailProviderPreference } from "./system-settings";

export type NotificationChannel = "email" | "sms" | "whatsapp";

export type DeliveryResult = {
  sent: boolean;
  channel: NotificationChannel;
  error?: string;
  skipped?: boolean;
  provider?: string;
};

export type EmailProvider = "twilio" | "sendgrid" | "resend" | null;

function isFromFieldError(error?: string): boolean {
  return Boolean(
    error?.toLowerCase().includes("field 'from'") ||
      error?.toLowerCase().includes("sender identity")
  );
}

export function getEmailProvider(
  preference: EmailProviderPreference = "auto"
): EmailProvider {
  if (!process.env.EMAIL_FROM) return null;

  const envForced = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  const pref =
    preference !== "auto"
      ? preference
      : envForced && ["twilio", "sendgrid", "resend"].includes(envForced)
        ? envForced
        : "auto";

  if (pref === "sendgrid" && process.env.SENDGRID_API_KEY) return "sendgrid";
  if (pref === "resend" && process.env.RESEND_API_KEY) return "resend";
  if (pref === "twilio" && isTwilioEmailConfigured()) return "twilio";

  if (pref !== "auto") return null;

  if (isTwilioEmailConfigured()) return "twilio";
  if (process.env.SENDGRID_API_KEY) return "sendgrid";
  if (process.env.RESEND_API_KEY) return "resend";
  return null;
}

async function sendViaSendGrid(params: {
  to: string;
  from: string;
  subject: string;
  html: string;
}): Promise<DeliveryResult> {
  const toCheck = validateRecipientEmail(params.to, "Recipient");
  if (!toCheck.ok) {
    return { sent: false, channel: "email", error: toCheck.error };
  }

  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
    await sgMail.send({
      to: toCheck.address,
      from: params.from,
      subject: params.subject,
      html: params.html,
    });
    return { sent: true, channel: "email", provider: "Twilio SendGrid" };
  } catch (e) {
    return {
      sent: false,
      channel: "email",
      error: formatSendGridError(e),
    };
  }
}

function emailProviderLabel(provider: EmailProvider): string {
  if (provider === "twilio") return "Twilio Email";
  if (provider === "sendgrid") return "Twilio SendGrid";
  if (provider === "resend") return "Resend";
  return "—";
}

export async function getNotificationsSummary() {
  const { getSystemSettings } = await import("./system-settings");
  const settings = await getSystemSettings();
  const emailProvider = getEmailProvider(settings.emailProviderPreference);
  const twilioBase = Boolean(
    process.env.TWILIO_ACCOUNT_SID?.startsWith("AC") &&
      process.env.TWILIO_AUTH_TOKEN
  );

  const twilioFrom = resolveTwilioEmailFrom();
  const verified = await fetchVerifiedEmailSenders();

  return {
    email: {
      configured: Boolean(emailProvider),
      provider: emailProviderLabel(emailProvider),
      fromAddress: verified.configuredFrom ?? twilioFrom?.address ?? null,
      fromError: twilioFrom?.error ?? null,
      fromMatchesVerified: verified.matchesVerified,
      verifiedSenders: verified.singleSenders,
      verifiedDomains: verified.authenticatedDomains,
      senderHint: verified.hint ?? null,
    },
    sms: {
      configured: twilioBase && Boolean(process.env.TWILIO_PHONE_NUMBER),
      provider: "Twilio SMS",
    },
    whatsapp: {
      configured: twilioBase && Boolean(process.env.TWILIO_WHATSAPP_NUMBER),
      provider: "Twilio WhatsApp",
    },
  };
}

export async function sendQrEmail(params: {
  to: string;
  judgeName: string;
  eventName: string;
  eventDate: Date;
  eventId?: string | null;
  eventLogoPath?: string | null;
  qrToken: string;
  qrScanUrl?: string;
  instructions: string;
}): Promise<DeliveryResult> {
  const toCheck = validateRecipientEmail(params.to, "Recipient");
  if (!toCheck.ok) {
    return {
      sent: false,
      channel: "email",
      error: formatDeliveryError(toCheck.error, {
        to: params.to,
        channel: "email",
      }),
    };
  }

  const dateStr = format(params.eventDate, "EEEE d MMMM yyyy", { locale: ar });
  const qrImageUrl = buildQrImageUrl(params.qrToken);
  const template = await resolveEmailTemplateForEvent(params.eventId);
  const { subject, html } = renderEmailTemplate(template, {
    judgeName: params.judgeName,
    eventName: params.eventName,
    eventDate: dateStr,
    instructions: params.instructions,
    qrImageUrl,
    qrScanUrl: params.qrScanUrl,
    eventLogoPath: params.eventLogoPath,
  });
  const from = process.env.EMAIL_FROM;
  const { getSystemSettings } = await import("./system-settings");
  const settings = await getSystemSettings();
  const provider = getEmailProvider(settings.emailProviderPreference);

  if (!provider || !from) {
    if (process.env.NODE_ENV === "development") {
      console.info("[email:dev] Would send QR to", params.to);
    }
    return {
      sent: false,
      channel: "email",
      skipped: true,
      error:
        "Email not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and EMAIL_FROM (or SENDGRID_API_KEY / RESEND_API_KEY).",
    };
  }

  const plainText = [
    `تأكيد حضور — ${params.eventName} — ${dateStr}`,
    params.instructions,
    params.qrScanUrl
      ? `رمز QR: ${params.qrScanUrl}`
      : `صورة QR: ${qrImageUrl}`,
  ].join("\n");

  try {
    if (provider === "twilio") {
      const result = await sendTwilioCommsEmail({
        to: toCheck.address,
        toName: params.judgeName,
        fromRaw: from,
        subject,
        html,
        text: plainText,
      });
      if (!result.ok) {
        if (
          process.env.SENDGRID_API_KEY &&
          isFromFieldError(result.error)
        ) {
          const fallback = await sendViaSendGrid({
            to: toCheck.address,
            from,
            subject,
            html,
          });
          if (!fallback.sent && fallback.error) {
            return {
              sent: false,
              channel: "email",
              error: `${result.error} — SendGrid fallback: ${fallback.error}`,
            };
          }
          return fallback;
        }
        return {
          sent: false,
          channel: "email",
          error: formatDeliveryError(result.error, {
            to: toCheck.address,
            channel: "email",
            provider: "Twilio Email",
          }),
        };
      }
      return { sent: true, channel: "email", provider: "Twilio Email" };
    }

    if (provider === "sendgrid") {
      return sendViaSendGrid({
        to: toCheck.address,
        from,
        subject,
        html,
      });
    }

    const resend = new Resend(process.env.RESEND_API_KEY!);
    const { error } = await resend.emails.send({
      from,
      to: toCheck.address,
      subject,
      html,
    });
    if (error) {
      return {
        sent: false,
        channel: "email",
        error: formatResendError(error.message),
      };
    }
    return { sent: true, channel: "email", provider: "Resend" };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Email failed";
    return {
      sent: false,
      channel: "email",
      error: formatDeliveryError(message, {
        to: toCheck.address,
        channel: "email",
      }),
    };
  }
}

export async function sendQrSms(params: {
  to: string;
  judgeName: string;
  eventName: string;
  eventDate: Date;
  qrUrl: string;
}): Promise<DeliveryResult> {
  const dateStr = format(params.eventDate, "d/M/yyyy", { locale: ar });
  const body = `مرحباً ${params.judgeName}، تم تأكيد حضوركم لـ ${params.eventName} بتاريخ ${dateStr}. رمز الدخول: ${params.qrUrl}`;

  const result = await sendTwilioMessage({
    to: params.to,
    body,
    channel: "sms",
  });

  if (!process.env.TWILIO_PHONE_NUMBER) {
    return {
      sent: false,
      channel: "sms",
      skipped: true,
      error: "TWILIO_PHONE_NUMBER not set",
    };
  }

  if (!result.ok) {
    return {
      sent: false,
      channel: "sms",
      error: formatDeliveryError(result.error, {
        to: params.to,
        channel: "sms",
        provider: "Twilio SMS",
      }),
      skipped: !process.env.TWILIO_ACCOUNT_SID,
    };
  }
  return { sent: true, channel: "sms", provider: "Twilio SMS" };
}

export async function sendQrWhatsApp(params: {
  to: string;
  judgeName: string;
  eventName: string;
  eventDate: Date;
  qrToken: string;
  qrUrl: string;
}): Promise<DeliveryResult> {
  if (!process.env.TWILIO_WHATSAPP_NUMBER) {
    return {
      sent: false,
      channel: "whatsapp",
      skipped: true,
      error: "TWILIO_WHATSAPP_NUMBER not set",
    };
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const dateStr = format(params.eventDate, "EEEE d MMMM yyyy", { locale: ar });
  const mediaUrl = baseUrl ? `${baseUrl}/api/qr/${params.qrToken}/image` : undefined;

  const body = [
    `مرحباً ${params.judgeName}،`,
    `تم تأكيد حضوركم لـ *${params.eventName}*`,
    `التاريخ: ${dateStr}`,
    ``,
    `يرجى إبراز رمز QR المرفق عند الوصول (صالح لمرة واحدة).`,
    mediaUrl ? `` : `الرابط: ${params.qrUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await sendTwilioMessage({
    to: params.to,
    body,
    channel: "whatsapp",
    mediaUrl,
  });

  if (!result.ok) {
    return {
      sent: false,
      channel: "whatsapp",
      error: formatDeliveryError(result.error, {
        to: params.to,
        channel: "whatsapp",
        provider: "Twilio WhatsApp",
      }),
    };
  }
  return { sent: true, channel: "whatsapp", provider: "Twilio WhatsApp" };
}

export async function sendTestEmail(to: string): Promise<DeliveryResult> {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  return sendQrEmail({
    to,
    judgeName: "اختبار النظام",
    eventName: "فعالية تجريبية",
    eventDate: new Date(),
    qrToken: "test",
    qrScanUrl: baseUrl ? `${baseUrl}/api/qr/test` : undefined,
    instructions: "هذه رسالة اختبار من نظام تسجيل الحضور.",
  });
}

export async function sendTestSms(to: string): Promise<DeliveryResult> {
  return sendQrSms({
    to,
    judgeName: "اختبار",
    eventName: "فعالية تجريبية",
    eventDate: new Date(),
    qrUrl: process.env.NEXT_PUBLIC_APP_URL || "https://example.com",
  });
}

export async function sendTestWhatsApp(to: string): Promise<DeliveryResult> {
  if (!process.env.TWILIO_WHATSAPP_NUMBER) {
    return {
      sent: false,
      channel: "whatsapp",
      skipped: true,
      error: "TWILIO_WHATSAPP_NUMBER not set",
    };
  }

  const result = await sendTwilioMessage({
    to,
    body:
      "اختبار نظام تسجيل حضور الفعاليات — Court Event Attendance.\nإذا وصلتكم هذه الرسالة، فإعداد WhatsApp يعمل بنجاح.",
    channel: "whatsapp",
  });

  if (!result.ok) {
    return {
      sent: false,
      channel: "whatsapp",
      error: formatDeliveryError(result.error, {
        to,
        channel: "whatsapp",
        provider: "Twilio WhatsApp",
      }),
    };
  }
  return { sent: true, channel: "whatsapp", provider: "Twilio WhatsApp" };
}
