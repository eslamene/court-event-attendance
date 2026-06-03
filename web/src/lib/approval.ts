import { prisma } from "./db";
import { buildQrPayload, generateQrDataUrl, generateQrToken } from "./qr";
import {
  sendQrEmail,
  sendQrSms,
  sendQrWhatsApp,
  type DeliveryResult,
} from "./notifications";
import type { Event, Registration } from "@/generated/prisma/client";

export type ApprovalResult = {
  registration: Registration & { event: Event };
  notifications: DeliveryResult[];
};

export async function approveRegistration(
  registrationId: string,
  approvedById: string
): Promise<ApprovalResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { event: true },
  });

  if (!registration) throw new Error("التسجيل غير موجود");
  if (registration.status !== "PENDING") {
    throw new Error("لا يمكن الموافقة على هذا التسجيل");
  }

  const qrToken = generateQrToken();
  const payload = buildQrPayload(qrToken, baseUrl);
  const qrDataUrl = await generateQrDataUrl(payload);

  const updated = await prisma.registration.update({
    where: { id: registrationId },
    data: {
      status: "APPROVED",
      qrToken,
      approvedAt: new Date(),
      approvedById,
      qrSentAt: new Date(),
    },
    include: { event: true },
  });

  const instructions =
    "يرجى إبراز رمز QR عند الوصول إلى مقر الفعالية. الرمز صالح لمرة واحدة فقط.";

  const sendSms =
    process.env.NOTIFY_SMS === "true" ||
    (!process.env.TWILIO_WHATSAPP_NUMBER && process.env.TWILIO_PHONE_NUMBER);

  const tasks: Promise<DeliveryResult>[] = [
    sendQrEmail({
      to: updated.email,
      judgeName: updated.fullName,
      eventName: updated.event.name,
      eventDate: updated.event.date,
      qrDataUrl,
      instructions,
    }),
    sendQrWhatsApp({
      to: updated.mobile,
      judgeName: updated.fullName,
      eventName: updated.event.name,
      eventDate: updated.event.date,
      qrToken,
      qrUrl: payload,
    }),
  ];

  if (sendSms) {
    tasks.push(
      sendQrSms({
        to: updated.mobile,
        judgeName: updated.fullName,
        eventName: updated.event.name,
        eventDate: updated.event.date,
        qrUrl: payload,
      })
    );
  }

  const notifications = await Promise.all(tasks);

  return { registration: updated, notifications };
}
