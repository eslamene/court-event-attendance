import { Resend } from "resend";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { getNotificationStatus } from "./env";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export type DeliveryResult = {
  sent: boolean;
  channel: "email" | "sms";
  error?: string;
  skipped?: boolean;
};

export async function sendQrEmail(params: {
  to: string;
  judgeName: string;
  eventName: string;
  eventDate: Date;
  qrDataUrl: string;
  instructions: string;
}): Promise<DeliveryResult> {
  const dateStr = format(params.eventDate, "EEEE d MMMM yyyy", { locale: ar });
  const resend = getResend();
  const from = process.env.EMAIL_FROM;

  if (!resend || !from) {
    if (process.env.NODE_ENV === "development") {
      console.info("[email:dev] Would send QR to", params.to);
    }
    return {
      sent: false,
      channel: "email",
      skipped: true,
      error: "Email not configured (RESEND_API_KEY, EMAIL_FROM)",
    };
  }

  try {
    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject: `تأكيد حضور — ${params.eventName}`,
      html: buildEmailHtml({
        judgeName: params.judgeName,
        eventName: params.eventName,
        dateStr,
        instructions: params.instructions,
        qrDataUrl: params.qrDataUrl,
      }),
    });

    if (error) {
      return { sent: false, channel: "email", error: error.message };
    }
    return { sent: true, channel: "email" };
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
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    if (process.env.NODE_ENV === "development") {
      console.info("[sms:dev] Would send to", params.to);
    }
    return {
      sent: false,
      channel: "sms",
      skipped: true,
      error: "SMS not configured (TWILIO_* env vars)",
    };
  }

  const dateStr = format(params.eventDate, "d/M/yyyy", { locale: ar });
  const body = `مرحباً ${params.judgeName}، تم تأكيد حضوركم لـ ${params.eventName} بتاريخ ${dateStr}. رمز الدخول: ${params.qrUrl}`;

  try {
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const form = new URLSearchParams({
      To: params.to,
      From: from,
      Body: body,
    });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
      }
    );
    if (!res.ok) {
      const text = await res.text();
      return { sent: false, channel: "sms", error: text.slice(0, 500) };
    }
    return { sent: true, channel: "sms" };
  } catch (e) {
    const message = e instanceof Error ? e.message : "SMS failed";
    return { sent: false, channel: "sms", error: message };
  }
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

export function getNotificationsSummary() {
  return getNotificationStatus();
}

function buildEmailHtml(opts: {
  judgeName: string;
  eventName: string;
  dateStr: string;
  instructions: string;
  qrDataUrl: string;
}) {
  const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/logo.jpeg`;
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
