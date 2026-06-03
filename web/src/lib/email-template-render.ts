import { PLATFORM_LOGO_PATH } from "./platform-logo";

export const EMAIL_TEMPLATE_PLACEHOLDERS = [
  { key: "judgeName", descriptionKey: "admin.emailTemplate.ph.judgeName" },
  { key: "eventName", descriptionKey: "admin.emailTemplate.ph.eventName" },
  { key: "eventDate", descriptionKey: "admin.emailTemplate.ph.eventDate" },
  { key: "instructions", descriptionKey: "admin.emailTemplate.ph.instructions" },
  { key: "qrImageUrl", descriptionKey: "admin.emailTemplate.ph.qrImageUrl" },
  { key: "qrScanUrl", descriptionKey: "admin.emailTemplate.ph.qrScanUrl" },
  { key: "logoUrl", descriptionKey: "admin.emailTemplate.ph.logoUrl" },
  { key: "logoBlock", descriptionKey: "admin.emailTemplate.ph.logoBlock" },
  { key: "qrLinkBlock", descriptionKey: "admin.emailTemplate.ph.qrLinkBlock" },
] as const;

export type EmailTemplateRecord = {
  subject: string;
  htmlBody: string;
  source: "builtin" | "default" | "event";
};

export function getBuiltinDefaultEmailTemplate(): EmailTemplateRecord {
  return {
    subject: "تأكيد حضور — {{eventName}}",
    htmlBody: `<div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #faf8f5; padding: 24px;">
{{logoBlock}}
<h2 style="color: #5c3d1e; text-align: center;">تأكيد حضور الفعالية</h2>
<p>السيد/ة <strong>{{judgeName}}</strong>،</p>
<p>تمت الموافقة على تسجيلكم لحضور:</p>
<p style="background:#fff;padding:16px;border-radius:8px;border:1px solid #e8dcc8;">
  <strong>{{eventName}}</strong><br/>{{eventDate}}
</p>
<p>{{instructions}}</p>
<p style="text-align:center; margin: 24px 0;">
  <img src="{{qrImageUrl}}" alt="رمز QR" width="280" height="280" style="border:4px solid #5c3d1e;border-radius:8px;display:block;margin:0 auto;"/>
</p>
{{qrLinkBlock}}
<p style="color:#666; font-size: 13px; text-align:center;">
  رمز الاستجابة السريعة للاستخدام مرة واحدة عند الوصول. يرجى إبرازه لطاقم الاستقبال.
</p>
</div>`,
    source: "builtin",
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type RenderEmailTemplateInput = {
  judgeName: string;
  eventName: string;
  eventDate: string;
  instructions: string;
  qrImageUrl: string;
  qrScanUrl?: string;
  eventLogoPath?: string | null;
};

export function buildEmailTemplateVars(
  input: RenderEmailTemplateInput
): Record<string, string> {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const platformLogo = appUrl ? `${appUrl}${PLATFORM_LOGO_PATH}` : "";
  const eventLogo =
    input.eventLogoPath && appUrl
      ? input.eventLogoPath.startsWith("http")
        ? input.eventLogoPath
        : `${appUrl}${input.eventLogoPath.startsWith("/") ? "" : "/"}${input.eventLogoPath}`
      : "";

  const logoUrl = eventLogo || platformLogo;
  const logoBlock = logoUrl
    ? `<p style="text-align:center"><img src="${logoUrl}" alt="شعار الفعالية" width="100" style="border-radius:50%"/></p>`
    : "";

  const qrLinkBlock = input.qrScanUrl
    ? `<p style="text-align:center;font-size:13px;"><a href="${escapeHtml(input.qrScanUrl)}" style="color:#5c3d1e;">فتح رمز QR في المتصفح</a></p>`
    : "";

  return {
    judgeName: escapeHtml(input.judgeName),
    eventName: escapeHtml(input.eventName),
    eventDate: escapeHtml(input.eventDate),
    instructions: escapeHtml(input.instructions),
    qrImageUrl: escapeHtml(input.qrImageUrl),
    qrScanUrl: input.qrScanUrl ? escapeHtml(input.qrScanUrl) : "",
    logoUrl: escapeHtml(logoUrl),
    logoBlock,
    qrLinkBlock,
  };
}

/** Sample data for admin live preview (client-safe). */
export function getSampleEmailPreviewInput(
  eventName?: string
): RenderEmailTemplateInput {
  const base =
    (typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_APP_URL
      : "") || "https://court-events.flagshipfintech.com";
  const appUrl = base.replace(/\/$/, "");
  return {
    judgeName: "أحمد محمد علي",
    eventName: eventName || "فعالية تجريبية",
    eventDate: "الأربعاء 3 يونيو 2026",
    instructions:
      "يرجى إبراز رمز QR عند الوصول إلى مقر الفعالية. الرمز صالح لمرة واحدة فقط.",
    qrImageUrl: `${appUrl}/api/qr/test/image`,
    qrScanUrl: `${appUrl}/api/qr/test`,
    eventLogoPath: null,
  };
}

export function renderEmailTemplate(
  template: { subject: string; htmlBody: string },
  input: RenderEmailTemplateInput
): { subject: string; html: string } {
  const vars = buildEmailTemplateVars(input);
  let subject = template.subject;
  let html = template.htmlBody;

  for (const [key, value] of Object.entries(vars)) {
    subject = subject.replaceAll(`{{${key}}}`, value);
    html = html.replaceAll(`{{${key}}}`, value);
  }

  return { subject, html };
}
