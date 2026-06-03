export const RANK_OPTIONS = [
  "نائب نقض",
  "قاضي بالنقض",
  "رئيس نيابة",
  "قاضي",
] as const;

export const ENTITY_OPTIONS = [
  "محكمة النقض",
  "المكتب الفني لمحكمة النقض",
  "النيابة العامة لدى محكمة النقض",
] as const;

export type RankOption = (typeof RANK_OPTIONS)[number];
export type EntityOption = (typeof ENTITY_OPTIONS)[number];

export const REGISTRATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد المراجعة",
  APPROVED: "موافق عليه",
  REJECTED: "مرفوض",
  ATTENDED: "تم الحضور",
};

export const USER_ROLE_LABELS: Record<string, string> = {
  ADMIN: "مدير النظام",
  APPROVAL_MANAGER: "مدير الموافقات",
  EVENT_STAFF: "طاقم الفعالية",
};
