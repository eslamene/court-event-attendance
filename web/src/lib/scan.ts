import {
  AUDIT_ACTIONS,
  recordAudit,
} from "./audit-log";
import { prisma } from "./db";
import type { ScanResult } from "@/generated/prisma/client";
import { apiT } from "@/lib/i18n/api";

export type ScanResponse = {
  result: ScanResult;
  success: boolean;
  message: string;
  registration?: {
    fullName: string;
    rank: string;
    entity: string;
    eventName: string;
  };
};

function extractToken(raw: string): string {
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (last?.startsWith("QR-")) return last;
  } catch {
    /* not a URL */
  }
  if (trimmed.startsWith("QR-")) return trimmed;
  const match = trimmed.match(/QR-[A-Za-z0-9_-]+/);
  return match ? match[0] : trimmed;
}

export async function processScan(params: {
  qrRaw: string;
  eventId: string;
  scannedById: string;
  offlineId?: string;
  scannedAt?: Date;
}): Promise<ScanResponse> {
  const qrToken = extractToken(params.qrRaw);
  const scannedAt = params.scannedAt ?? new Date();

  if (params.offlineId) {
    const existing = await prisma.scanLog.findUnique({
      where: { offlineId: params.offlineId },
      include: { registration: { include: { event: true } } },
    });
    if (existing) {
      return await logResultFromExisting(existing);
    }
  }

  const registration = await prisma.registration.findUnique({
    where: { qrToken },
    include: { event: true },
  });

  if (!registration) {
    return finishScan({
      result: "INVALID",
      success: false,
      message: await apiT("scan.invalidQr"),
      registrationId: null,
      eventId: params.eventId,
      scannedById: params.scannedById,
      qrToken,
      offlineId: params.offlineId,
      scannedAt,
    });
  }

  if (registration.eventId !== params.eventId) {
    return finishScan({
      result: "WRONG_EVENT",
      success: false,
      message: await apiT("scan.wrongEvent"),
      registrationId: registration.id,
      eventId: params.eventId,
      scannedById: params.scannedById,
      qrToken,
      judgeName: registration.fullName,
      offlineId: params.offlineId,
      scannedAt,
    });
  }

  if (registration.status !== "APPROVED" && registration.status !== "ATTENDED") {
    return finishScan({
      result: "INVALID",
      success: false,
      message: await apiT("scan.notApproved"),
      registrationId: registration.id,
      eventId: params.eventId,
      scannedById: params.scannedById,
      qrToken,
      judgeName: registration.fullName,
      offlineId: params.offlineId,
      scannedAt,
    });
  }

  if (registration.qrUsedAt || registration.status === "ATTENDED") {
    return finishScan({
      result: "ALREADY_USED",
      success: false,
      message: await apiT("scan.alreadyUsed"),
      registrationId: registration.id,
      eventId: params.eventId,
      scannedById: params.scannedById,
      qrToken,
      judgeName: registration.fullName,
      offlineId: params.offlineId,
      scannedAt,
    });
  }

  await prisma.registration.update({
    where: { id: registration.id },
    data: {
      status: "ATTENDED",
      qrUsedAt: scannedAt,
      attendedAt: scannedAt,
    },
  });

  return finishScan({
    result: "SUCCESS",
    success: true,
    message: await apiT("scan.success"),
    registrationId: registration.id,
    eventId: params.eventId,
    scannedById: params.scannedById,
    qrToken,
    judgeName: registration.fullName,
    offlineId: params.offlineId,
    scannedAt,
    registration: {
      fullName: registration.fullName,
      rank: registration.rank,
      entity: registration.entity,
      eventName: registration.event.name,
    },
  });
}

async function finishScan(args: {
  result: ScanResult;
  success: boolean;
  message: string;
  registrationId: string | null;
  eventId: string;
  scannedById: string;
  qrToken: string;
  judgeName?: string;
  offlineId?: string;
  scannedAt: Date;
  registration?: ScanResponse["registration"];
}): Promise<ScanResponse> {
  await prisma.scanLog.create({
    data: {
      registrationId: args.registrationId,
      eventId: args.eventId,
      scannedById: args.scannedById,
      qrToken: args.qrToken,
      result: args.result,
      judgeName: args.judgeName,
      offlineId: args.offlineId,
      scannedAt: args.scannedAt,
      syncedAt: args.offlineId ? new Date() : null,
    },
  });

  const scanner = await prisma.user.findUnique({
    where: { id: args.scannedById },
    select: { id: true, name: true, email: true },
  });

  await recordAudit({
    action:
      args.result === "SUCCESS"
        ? AUDIT_ACTIONS.SCAN_SUCCESS
        : AUDIT_ACTIONS.SCAN_INVALID,
    actor: scanner
      ? { id: scanner.id, name: scanner.name, email: scanner.email }
      : null,
    entityType: "registration",
    entityId: args.registrationId ?? undefined,
    entityLabel: args.judgeName,
    metadata: {
      eventId: args.eventId,
      result: args.result,
      qrToken: args.qrToken,
    },
  });

  return {
    result: args.result,
    success: args.success,
    message: args.message,
    registration: args.registration,
  };
}

async function logResultFromExisting(log: {
  result: ScanResult;
  judgeName: string | null;
  registration: {
    fullName: string;
    rank: string;
    entity: string;
    event: { name: string };
  } | null;
}): Promise<ScanResponse> {
  const keyMap: Record<ScanResult, string> = {
    SUCCESS: "scan.success",
    INVALID: "scan.invalidQr",
    ALREADY_USED: "scan.alreadyUsed",
    WRONG_EVENT: "scan.wrongEvent",
  };

  return {
    result: log.result,
    success: log.result === "SUCCESS",
    message: await apiT(keyMap[log.result]),
    registration: log.registration
      ? {
          fullName: log.registration.fullName,
          rank: log.registration.rank,
          entity: log.registration.entity,
          eventName: log.registration.event.name,
        }
      : undefined,
  };
}
