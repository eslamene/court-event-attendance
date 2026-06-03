/** Status/role keys — resolve labels via useI18n: t(`status.${status}`) */
export const REGISTRATION_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "ATTENDED",
  "WITHDRAWN",
] as const;

export const USER_ROLE_KEYS = [
  "ADMIN",
  "APPROVAL_MANAGER",
  "EVENT_STAFF",
] as const;
