import { Resend } from "resend";
import sgMail from "@sendgrid/mail";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { sendTwilioMessage } from "./twilio-client";
import { PLATFORM_LOGO_PATH } from "./platform-logo";

export type NotificationChannel = "email" | "sms" | "whatsapp";

export type DeliveryResult = {
  sent: boolean;
  channel: NotificationChannel;
  error?: string;
  skipped?: boolean;
  provider?: string;
};

export function getEmailProvider(): "sendgrid" | "resend" | null {
  if (process.env.SENDGRID_API_KEY && process.env.EMAIL_FROM) return "sendgrid";
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) return "resend";
  return null;
}

export function getNotificationsSummary() {
  const emailProvider = getEmailProvider();
  const twilioBase = Boolean(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  );

  return {
    email: {
      configured: Boolean(emailProvider),
      provider: emailProvider === "sendgrid" ? "Twilio SendGrid" : "Resend",
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

function buildEmailHtml(opts: {
  judgeName: string;
  eventName: string;
  dateStr: string;
  instructions: string;
  qrDataUrl: string;
}) {
  const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}${PLATFORM_LOGO_PATH}`;
  return `
    <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #faf8f5; padding: 24px;">
      ${logoUrl ? `<p style="text-align:center"><img src="${logoUrl}" alt="شعار الفعالية" width="100" style="border-radius:50%"/></p>` : ""}
      <h2 style="color: #5c3d1e; text-align: center;">تأكيد حضور الفعالية</h2>
      <p>السيد/ة <strong>${opts.judgeName}</strong>،</p>
      <p>تمت الموافقة على تسجيلكم لحضور:</p>
      <p style="background:#fff;padding:16px;border-radius:8px;border:1px solid #e8dcc8;">
        <strong>${opts.eventName}</strong><br/>${opts.dateStr}
      </p>
      <p>${opts.instructions}</p>
      <p style="text-align:center; margin: 24px 0;">
        <img src="${opts.qrDataUrl}" alt="رمز QR" width="280" height="280" style="border:4px solid #5c3d1e;border-radius:8px"/>
      </p>
      <p style="color:#666; font-size: 13px; text-align:center;">
        رمز الاستجابة السريعة للاستخدام مرة واحدة عند الوصول. يرجى إبرازه لطاقم الاستقبال.
      </p>
    </div>
  `;
}

export async function sendQrEmail(params: {
  to: string;
  judgeName: string;
  eventName: string;
  eventDate: Date;
  qrDataUrl: string;
  instructions: string;
}): Promise<DeliveryResult> {
  const dateStr = format(params.eventDate, "EEEE d MMMM yyyy", { locale: ar });
  const html = buildEmailHtml({
    judgeName: params.judgeName,
    eventName: params.eventName,
    dateStr,
    instructions: params.instructions,
    qrDataUrl: params.qrDataUrl,
  });
  const subject = `تأكيد حضور — ${params.eventName}`;
  const from = process.env.EMAIL_FROM;
  const provider = getEmailProvider();

  if (!provider || !from) {
    if (process.env.NODE_ENV === "development") {
      console.info("[email:dev] Would send QR to", params.to);
    }
    return {
      sent: false,
      channel: "email",
      skipped: true,
      error:
        "Email not configured. Set SENDGRID_API_KEY or RESEND_API_KEY plus EMAIL_FROM.",
    };
  }

  try {
    if (provider === "sendgrid") {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
      await sgMail.send({
        to: params.to,
        from,
        subject,
        html,
      });
      return { sent: true, channel: "email", provider: "Twilio SendGrid" };
    }

    const resend = new Resend(process.env.RESEND_API_KEY!);
    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject,
      html,
    });
    if (error) {
      return { sent: false, channel: "email", error: error.message };
    }
    return { sent: true, channel: "email", provider: "Resend" };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Email failed";
    return { sent: false, channel: "email", error: message };
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
      error: result.error,
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
    return { sent: false, channel: "whatsapp", error: result.error };
  }
  return { sent: true, channel: "whatsapp", provider: "Twilio WhatsApp" };
}

export async function sendTestEmail(to: string): Promise<DeliveryResult> {
  return sendQrEmail({
    to,
    judgeName: "اختبار النظام",
    eventName: "فعالية تجريبية",
    eventDate: new Date(),
    qrDataUrl:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23f5f0e8' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%235c3d1e' font-size='14'%3ETEST%3C/text%3E%3C/svg%3E",
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
    return { sent: false, channel: "whatsapp", error: result.error };
  }
  return { sent: true, channel: "whatsapp", provider: "Twilio WhatsApp" };
}
