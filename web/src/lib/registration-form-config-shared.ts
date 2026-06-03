import { z } from "zod";
import { normalizeMobile } from "./i18n/schemas";
import type { Dictionary } from "./i18n/types";

export const REGISTRATION_FIELD_KEYS = [
  "fullName",
  "rank",
  "entity",
  "email",
  "mobile",
  "notes",
] as const;

export type RegistrationFieldKey = (typeof REGISTRATION_FIELD_KEYS)[number];

export type RegistrationFieldType =
  | "text"
  | "email"
  | "tel"
  | "select"
  | "textarea";

export type RegistrationFormFieldConfig = {
  key: RegistrationFieldKey;
  enabled: boolean;
  required: boolean;
  labelAr: string;
  labelEn: string;
  type: RegistrationFieldType;
  options?: string[];
  order: number;
  placeholderAr?: string;
  placeholderEn?: string;
};

export type RegistrationFormConfigRecord = {
  fields: RegistrationFormFieldConfig[];
  source: "builtin" | "default" | "event";
};

const DEFAULT_RANKS = [
  "نائب نقض",
  "قاضي بالنقض",
  "رئيس نيابة",
  "قاضي",
];

const DEFAULT_ENTITIES = [
  "محكمة النقض",
  "المكتب الفني لمحكمة النقض",
  "النيابة العامة لدى محكمة النقض",
];

const DEFAULT_LABELS: Record<
  RegistrationFieldKey,
  { ar: string; en: string; type: RegistrationFieldType }
> = {
  fullName: { ar: "الاسم الكامل", en: "Full name", type: "text" },
  rank: { ar: "الرتبة / الدرجة", en: "Rank / grade", type: "select" },
  entity: { ar: "الجهة / الانتماء", en: "Affiliation", type: "select" },
  email: { ar: "البريد الإلكتروني", en: "Email", type: "email" },
  mobile: { ar: "رقم الجوال", en: "Mobile number", type: "tel" },
  notes: { ar: "ملاحظات (اختياري)", en: "Notes (optional)", type: "textarea" },
};

export function getBuiltinRegistrationFormConfig(): RegistrationFormConfigRecord {
  const fields: RegistrationFormFieldConfig[] = [
    {
      key: "fullName",
      enabled: true,
      required: true,
      labelAr: DEFAULT_LABELS.fullName.ar,
      labelEn: DEFAULT_LABELS.fullName.en,
      type: "text",
      order: 1,
    },
    {
      key: "rank",
      enabled: true,
      required: true,
      labelAr: DEFAULT_LABELS.rank.ar,
      labelEn: DEFAULT_LABELS.rank.en,
      type: "select",
      options: [...DEFAULT_RANKS],
      order: 2,
      placeholderAr: "— اختر الرتبة —",
      placeholderEn: "— Select rank —",
    },
    {
      key: "entity",
      enabled: true,
      required: true,
      labelAr: DEFAULT_LABELS.entity.ar,
      labelEn: DEFAULT_LABELS.entity.en,
      type: "select",
      options: [...DEFAULT_ENTITIES],
      order: 3,
      placeholderAr: "— اختر الجهة —",
      placeholderEn: "— Select entity —",
    },
    {
      key: "email",
      enabled: true,
      required: true,
      labelAr: DEFAULT_LABELS.email.ar,
      labelEn: DEFAULT_LABELS.email.en,
      type: "email",
      order: 4,
    },
    {
      key: "mobile",
      enabled: true,
      required: true,
      labelAr: DEFAULT_LABELS.mobile.ar,
      labelEn: DEFAULT_LABELS.mobile.en,
      type: "tel",
      order: 5,
      placeholderAr: "01xxxxxxxxx",
      placeholderEn: "01xxxxxxxxx",
    },
    {
      key: "notes",
      enabled: true,
      required: false,
      labelAr: DEFAULT_LABELS.notes.ar,
      labelEn: DEFAULT_LABELS.notes.en,
      type: "textarea",
      order: 6,
    },
  ];
  return { fields, source: "builtin" };
}

const fieldSchema = z.object({
  key: z.enum(REGISTRATION_FIELD_KEYS),
  enabled: z.boolean(),
  required: z.boolean(),
  labelAr: z.string().min(1),
  labelEn: z.string().min(1),
  type: z.enum(["text", "email", "tel", "select", "textarea"]),
  options: z.array(z.string()).optional(),
  order: z.number().int(),
  placeholderAr: z.string().optional(),
  placeholderEn: z.string().optional(),
});

const configSchema = z.object({
  fields: z.array(fieldSchema).min(1),
});

export function parseRegistrationFormConfigJson(
  json: string
): RegistrationFormFieldConfig[] {
  const parsed = configSchema.safeParse(JSON.parse(json));
  if (!parsed.success) {
    return getBuiltinRegistrationFormConfig().fields;
  }
  return sortFields(parsed.data.fields);
}

export function sortFields(
  fields: RegistrationFormFieldConfig[]
): RegistrationFormFieldConfig[] {
  return [...fields].sort((a, b) => a.order - b.order);
}

export function getEnabledFields(
  config: RegistrationFormConfigRecord
): RegistrationFormFieldConfig[] {
  return sortFields(config.fields).filter((f) => f.enabled);
}

export function getFieldLabel(
  field: RegistrationFormFieldConfig,
  locale: string
): string {
  return locale === "en" ? field.labelEn : field.labelAr;
}

export function getFieldPlaceholder(
  field: RegistrationFormFieldConfig,
  locale: string
): string | undefined {
  const p = locale === "en" ? field.placeholderEn : field.placeholderAr;
  return p?.trim() || undefined;
}

function normalizeFields(
  fields: RegistrationFormFieldConfig[]
): RegistrationFormFieldConfig[] {
  const byKey = new Map(fields.map((f) => [f.key, f]));
  const merged = REGISTRATION_FIELD_KEYS.map((key, index) => {
    const existing = byKey.get(key);
    const defaults = getBuiltinRegistrationFormConfig().fields.find(
      (f) => f.key === key
    )!;
    return existing
      ? {
          ...defaults,
          ...existing,
          key,
          options:
            existing.type === "select"
              ? (existing.options ?? defaults.options ?? []).filter(Boolean)
              : undefined,
        }
      : { ...defaults, order: index + 1 };
  });
  return sortFields(merged);
}

const egyptMobileRegex = /^(?:\+20|0020|0)?1[0125]\d{8}$/;

function msg(dict: Dictionary, key: string) {
  return dict[key] ?? key;
}

export function createRegistrationSchemaFromConfig(
  config: RegistrationFormConfigRecord,
  dict: Dictionary,
  options?: { locale?: string }
) {
  const locale = options?.locale ?? "ar";
  const shape: Record<string, z.ZodTypeAny> = {};
  const enabled = getEnabledFields(config);

  for (const field of enabled) {
    const label = getFieldLabel(field, locale);
    switch (field.key) {
      case "fullName":
        shape.fullName = field.required
          ? z.string().min(3, msg(dict, "validation.fullNameRequired"))
          : z.string().optional();
        break;
      case "rank": {
        const opts = field.options ?? [];
        shape.rank = field.required
          ? z.string().refine((v) => opts.length === 0 || opts.includes(v), {
              message: `${label}: ${msg(dict, "validation.rankRequired")}`,
            })
          : z.string().optional();
        break;
      }
      case "entity": {
        const opts = field.options ?? [];
        shape.entity = field.required
          ? z.string().refine((v) => opts.length === 0 || opts.includes(v), {
              message: `${label}: ${msg(dict, "validation.entityRequired")}`,
            })
          : z.string().optional();
        break;
      }
      case "email":
        shape.email = field.required
          ? z.string().email(msg(dict, "validation.emailInvalid"))
          : z.string().optional();
        break;
      case "mobile":
        shape.mobile = field.required
          ? z
              .string()
              .min(10, msg(dict, "validation.mobileRequired"))
              .refine((v) => egyptMobileRegex.test(normalizeMobile(v)), {
                message: msg(dict, "validation.mobileInvalid"),
              })
          : z.string().optional();
        break;
      case "notes":
        shape.notes = field.required
          ? z
              .string()
              .min(1, msg(dict, "validation.notesRequired"))
              .max(1000)
          : z.string().max(1000).optional();
        break;
    }
  }

  return z.object(shape);
}

export type RegistrationSubmitData = {
  fullName: string;
  rank: string;
  entity: string;
  email: string;
  mobile: string;
  notes: string | null;
};

export function mapRegistrationSubmitBody(
  config: RegistrationFormConfigRecord,
  raw: Record<string, unknown>
): RegistrationSubmitData {
  const enabled = new Set(getEnabledFields(config).map((f) => f.key));
  const str = (key: RegistrationFieldKey) =>
    enabled.has(key) ? String(raw[key] ?? "").trim() : "";

  const email = str("email").toLowerCase();
  const mobile = enabled.has("mobile")
    ? normalizeMobile(str("mobile"))
    : "";

  return {
    fullName: str("fullName") || "—",
    rank: str("rank") || "—",
    entity: str("entity") || "—",
    email,
    mobile,
    notes: enabled.has("notes") ? str("notes") || null : null,
  };
}

export function validateRegistrationFormConfigPayload(
  fields: RegistrationFormFieldConfig[]
): { ok: true; fields: RegistrationFormFieldConfig[] } | { ok: false; error: string } {
  const normalized = normalizeFields(fields);
  const parsed = configSchema.safeParse({ fields: normalized });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid config" };
  }

  const enabled = normalized.filter((f) => f.enabled);
  if (enabled.length === 0) {
    return { ok: false, error: "At least one field must be enabled" };
  }

  for (const field of enabled) {
    if (field.type === "select" && (!field.options || field.options.length === 0)) {
      return { ok: false, error: `Select field "${field.key}" needs options` };
    }
  }

  return { ok: true, fields: normalized };
}
