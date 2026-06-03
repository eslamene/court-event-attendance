import type { RegistrationStatus } from "@/generated/prisma/client";

export const REGISTRATION_TAB_IDS = [
  "pending",
  "approved",
  "rejected",
  "withdrawn",
] as const;

export type RegistrationTabId = (typeof REGISTRATION_TAB_IDS)[number];

const TAB_STATUSES: Record<RegistrationTabId, RegistrationStatus[]> = {
  pending: ["PENDING"],
  approved: ["APPROVED", "ATTENDED"],
  rejected: ["REJECTED"],
  withdrawn: ["WITHDRAWN"],
};

export function statusesForRegistrationTab(
  tab: string | null | undefined
): RegistrationStatus[] {
  if (tab && tab in TAB_STATUSES) {
    return TAB_STATUSES[tab as RegistrationTabId];
  }
  return TAB_STATUSES.pending;
}

export function resolveRegistrationTab(
  params: Pick<URLSearchParams, "get">
): RegistrationTabId {
  const tab = params.get("tab");
  if (tab && REGISTRATION_TAB_IDS.includes(tab as RegistrationTabId)) {
    return tab as RegistrationTabId;
  }
  const status = params.get("status");
  if (status === "PENDING") return "pending";
  if (status === "APPROVED" || status === "ATTENDED") return "approved";
  if (status === "REJECTED") return "rejected";
  if (status === "WITHDRAWN") return "withdrawn";
  return "pending";
}
