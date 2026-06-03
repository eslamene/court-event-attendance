import { getPublicAppBaseUrl } from "./app-url";
import { prisma } from "./db";
import { buildQrPayload, generateQrToken } from "./qr";
import {
  sendQrEmail,
  sendQrSms,
  sendQrWhatsApp,
  type DeliveryResult,
} from "./notifications";
import type { Event, Registration, SeatTier } from "@/generated/prisma/client";
import { apiT } from "@/lib/i18n/api";
import {
  getSystemSettings,
  resolveQrInstructions,
  shouldSendSmsOnApprove,
} from "@/lib/system-settings";
import { assignSeatForRegistration, formatSeatLabel } from "./seating";

export type ApprovalResult = {
  registration: Registration & {
    event: Event;
    seatTier: SeatTier | null;
  };
  notifications: DeliveryResult[];
  seatLabel?: string;
};

export async function approveRegistration(
  registrationId: string,
  approvedById: string,
  options?: { seatTierId?: string | null }
): Promise<ApprovalResult> {
  const baseUrl = getPublicAppBaseUrl();

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { event: true },
  });

  if (!registration) throw new Error(await apiT("approval.notFound"));
  if (
    registration.status !== "PENDING" &&
    registration.status !== "REJECTED"
  ) {
    throw new Error(await apiT("approval.cannotApprove"));
  }

  let seatLabel: string | undefined;
  if (registration.event.seatingEnabled) {
    const assigned = await assignSeatForRegistration(registrationId, {
      seatTierId: options?.seatTierId ?? registration.seatTierId,
    });
    seatLabel = assigned.seatLabel;
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
      rejectedAt: null,
    },
    include: { event: true, seatTier: true },
  });

  if (!seatLabel && updated.seatTier && updated.seatNumber) {
    seatLabel = formatSeatLabel(updated.seatTier.name, updated.seatNumber);
  }

  const tierName = updated.seatTier?.name;

  const [instructions, systemSettings, sendSms] = await Promise.all([
    resolveQrInstructions(),
    getSystemSettings(),
    shouldSendSmsOnApprove(),
  ]);

  const notifyBase = {
    judgeName: updated.fullName,
    eventName: updated.event.name,
    eventDate: updated.event.date,
    seatLabel,
    tierName,
  };

  const tasks: Promise<DeliveryResult>[] = [];

  if (systemSettings.notifyEmailOnApprove) {
    tasks.push(
      sendQrEmail({
        to: updated.email,
        ...notifyBase,
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
        ...notifyBase,
        qrToken,
        qrUrl: payload,
      })
    );
  }

  if (sendSms) {
    tasks.push(
      sendQrSms({
        to: updated.mobile,
        ...notifyBase,
        qrUrl: payload,
      })
    );
  }

  const notifications = await Promise.all(tasks);

  return { registration: updated, notifications, seatLabel };
}

export async function rejectRegistration(
  registrationId: string
): Promise<Registration & { event: Event }> {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { event: true },
  });

  if (!registration) throw new Error(await apiT("api.registrationNotFound"));
  if (registration.status !== "PENDING") {
    throw new Error(await apiT("api.cannotReject"));
  }

  return prisma.registration.update({
    where: { id: registrationId },
    data: { status: "REJECTED", rejectedAt: new Date() },
    include: { event: true },
  });
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
    include: { event: true, seatTier: true },
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
  const seatLabel =
    registration.seatTier && registration.seatNumber
      ? formatSeatLabel(registration.seatTier.name, registration.seatNumber)
      : undefined;

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
    seatLabel,
    tierName: registration.seatTier?.name,
  });

  if (email.sent) {
    await prisma.registration.update({
      where: { id: registrationId },
      data: { qrSentAt: new Date() },
    });
  }

  return { registration, email };
}
