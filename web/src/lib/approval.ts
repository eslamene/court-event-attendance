import { getPublicAppBaseUrl } from "./app-url";
import { prisma } from "./db";
import { buildQrPayload, generateQrToken } from "./qr";
import {
  sendQrEmail,
  sendQrSms,
  sendQrWhatsApp,
  type DeliveryResult,
} from "./notifications";
import type { Event, Registration } from "@/generated/prisma/client";
import { apiT } from "@/lib/i18n/api";
import {
  getSystemSettings,
  resolveQrInstructions,
  shouldSendSmsOnApprove,
} from "@/lib/system-settings";

export type ApprovalResult = {
  registration: Registration & { event: Event };
  notifications: DeliveryResult[];
};

export async function approveRegistration(
  registrationId: string,
  approvedById: string
): Promise<ApprovalResult> {
  const baseUrl = getPublicAppBaseUrl();

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { event: true },
  });

  if (!registration) throw new Error(await apiT("approval.notFound"));
  if (registration.status !== "PENDING") {
    throw new Error(await apiT("approval.cannotApprove"));
  }

  const qrToken = generateQrToken();
  const payload = buildQrPayload(qrToken, baseUrl);

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

  const [instructions, systemSettings, sendSms] = await Promise.all([
    resolveQrInstructions(),
    getSystemSettings(),
    shouldSendSmsOnApprove(),
  ]);

  const tasks: Promise<DeliveryResult>[] = [];

  if (systemSettings.notifyEmailOnApprove) {
    tasks.push(
      sendQrEmail({
        to: updated.email,
        judgeName: updated.fullName,
        eventName: updated.event.name,
        eventDate: updated.event.date,
        eventId: updated.eventId,
        eventLogoPath: updated.event.logoPath,
        qrToken,
        qrScanUrl: payload,
        instructions,
      })
    );
  }

  if (systemSettings.notifyWhatsAppOnApprove) {
    tasks.push(
      sendQrWhatsApp({
        to: updated.mobile,
        judgeName: updated.fullName,
        eventName: updated.event.name,
        eventDate: updated.event.date,
        qrToken,
        qrUrl: payload,
      })
    );
  }

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

export type ResendQrEmailResult = {
  registration: Registration & { event: Event };
  email: DeliveryResult;
};

export async function resendQrEmail(
  registrationId: string
): Promise<ResendQrEmailResult> {
  const baseUrl = getPublicAppBaseUrl();

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { event: true },
  });

  if (!registration) throw new Error(await apiT("approval.notFound"));
  if (
    registration.status !== "APPROVED" &&
    registration.status !== "ATTENDED"
  ) {
    throw new Error(await apiT("approval.cannotResendEmail"));
  }
  if (!registration.qrToken) {
    throw new Error(await apiT("approval.noQrToken"));
  }

  const payload = buildQrPayload(registration.qrToken, baseUrl);
  const instructions = await resolveQrInstructions();

  const email = await sendQrEmail({
    to: registration.email,
    judgeName: registration.fullName,
    eventName: registration.event.name,
    eventDate: registration.event.date,
    eventId: registration.eventId,
    eventLogoPath: registration.event.logoPath,
    qrToken: registration.qrToken,
    qrScanUrl: payload,
    instructions,
  });

  if (email.sent) {
    await prisma.registration.update({
      where: { id: registrationId },
      data: { qrSentAt: new Date() },
    });
  }

  return { registration, email };
}
