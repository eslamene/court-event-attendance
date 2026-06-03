import { prisma } from "./db";
import { normalizeRecipientEmail } from "./email-address";
import { normalizeMobile } from "./validators";
import type { Registration } from "@/generated/prisma/client";

export const WITHDRAWABLE_STATUSES = ["PENDING", "APPROVED"] as const;

export function canWithdrawRegistration(registration: {
  status: string;
  attendedAt: Date | null;
  qrUsedAt: Date | null;
}): boolean {
  if (!WITHDRAWABLE_STATUSES.includes(registration.status as (typeof WITHDRAWABLE_STATUSES)[number])) {
    return false;
  }
  if (registration.attendedAt || registration.qrUsedAt) return false;
  return true;
}

export async function findRegistrationForWithdrawal(params: {
  eventId: string;
  email?: string;
  mobile?: string;
}): Promise<Registration | null> {
  const email = params.email?.trim()
    ? normalizeRecipientEmail(params.email)
    : undefined;
  const mobile = params.mobile?.trim()
    ? normalizeMobile(params.mobile)
    : undefined;

  if (!email && !mobile) return null;

  const or: { email?: string; mobile?: string }[] = [];
  if (email) or.push({ email });
  if (mobile) or.push({ mobile });

  return prisma.registration.findFirst({
    where: {
      eventId: params.eventId,
      status: { not: "WITHDRAWN" },
      OR: or,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function withdrawRegistration(
  registrationId: string,
  withdrawalNote?: string | null
): Promise<Registration> {
  const note = withdrawalNote?.trim() || null;
  return prisma.registration.update({
    where: { id: registrationId },
    data: {
      status: "WITHDRAWN",
      withdrawnAt: new Date(),
      withdrawalNote: note,
      qrToken: null,
      qrSentAt: null,
    },
  });
}
