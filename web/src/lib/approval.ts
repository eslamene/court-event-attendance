import { prisma } from "./db";
import { buildQrPayload, generateQrDataUrl, generateQrToken } from "./qr";
import { sendQrEmail, sendQrSms, type DeliveryResult } from "./notifications";
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

  const notifications = await Promise.all([
    sendQrEmail({
      to: updated.email,
      judgeName: updated.fullName,
      eventName: updated.event.name,
      eventDate: updated.event.date,
      qrDataUrl,
      instructions,
    }),
    sendQrSms({
      to: updated.mobile,
      judgeName: updated.fullName,
      eventName: updated.event.name,
      eventDate: updated.event.date,
      qrUrl: payload,
    }),
  ]);

  return { registration: updated, notifications };
}
