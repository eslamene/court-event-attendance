import { z } from "zod";
import { normalizeMobile } from "./i18n/schemas";
import type { Dictionary } from "./i18n/types";

/** Built-in keys mapped to Registration table columns */
export const REGISTRATION_BUILTIN_KEYS = [
  "fullName",
  "rank",
  "entity",
  "email",
  "mobile",
  "notes",
] as const;

export type RegistrationBuiltinKey = (typeof REGISTRATION_BUILTIN_KEYS)[number];

/** @deprecated Use REGISTRATION_BUILTIN_KEYS */
export const REGISTRATION_FIELD_KEYS = REGISTRATION_BUILTIN_KEYS;

export type RegistrationFieldKey = RegistrationBuiltinKey;

export const REGISTRATION_FIELD_TYPES = [
  "text",
  "email",
  "tel",
  "select",
  "textarea",
  "number",
  "date",
  "url",
] as const;

export type RegistrationFieldType = (typeof REGISTRATION_FIELD_TYPES)[number];

export type RegistrationFormFieldConfig = {
  key: string;
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

const CUSTOM_KEY_REGEX = /^custom_[a-z0-9][a-z0-9_]{0,47}$/i;
const MAX_FIELDS = 40;

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
  RegistrationBuiltinKey,
  { ar: string; en: string; type: RegistrationFieldType }
> = {
  fullName: { ar: "الاسم الكامل", en: "Full name", type: "text" },
  rank: { ar: "الرتبة / الدرجة", en: "Rank / grade", type: "select" },
  entity: { ar: "الجهة / الانتماء", en: "Affiliation", type: "select" },
  email: { ar: "البريد الإلكتروني", en: "Email", type: "email" },
  mobile: { ar: "رقم الجوال", en: "Mobile number", type: "tel" },
  notes: { ar: "ملاحظات (اختياري)", en: "Notes (optional)", type: "textarea" },
};

export function isBuiltinFieldKey(key: string): key is RegistrationBuiltinKey {
  return (REGISTRATION_BUILTIN_KEYS as readonly string[]).includes(key);
}

export function isValidFieldKey(key: string): boolean {
  return isBuiltinFieldKey(key) || CUSTOM_KEY_REGEX.test(key);
}

export function createCustomFieldKey(): string {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 10)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `custom_${id.toLowerCase()}`;
}

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
  key: z.string().min(1).max(64),
  enabled: z.boolean(),
  required: z.boolean(),
  labelAr: z.string().min(1),
  labelEn: z.string().min(1),
  type: z.enum(REGISTRATION_FIELD_TYPES),
  options: z.array(z.string()).optional(),
  order: z.number().int(),
  placeholderAr: z.string().optional(),
  placeholderEn: z.string().optional(),
});

const configSchema = z.object({
  fields: z.array(fieldSchema).min(1).max(MAX_FIELDS),
});

export function parseRegistrationFormConfigJson(
  json: string
): RegistrationFormFieldConfig[] {
  try {
    const parsed = configSchema.safeParse(JSON.parse(json));
    if (!parsed.success) {
      return getBuiltinRegistrationFormConfig().fields;
    }
    const sanitized = sanitizeRegistrationFormFields(parsed.data.fields);
    return sanitized.ok ? sanitized.fields : getBuiltinRegistrationFormConfig().fields;
  } catch {
    return getBuiltinRegistrationFormConfig().fields;
  }
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

export function sanitizeRegistrationFormFields(
  fields: RegistrationFormFieldConfig[]
): { ok: true; fields: RegistrationFormFieldConfig[] } | { ok: false; error: string } {
  const seen = new Set<string>();
  const normalized: RegistrationFormFieldConfig[] = [];

  for (const raw of sortFields(fields)) {
    const key = raw.key.trim();
    if (!isValidFieldKey(key)) {
      return {
        ok: false,
        error: `Invalid field key "${key}". Use a built-in key or custom_<id>.`,
      };
    }
    if (seen.has(key)) {
      return { ok: false, error: `Duplicate field key "${key}"` };
    }
    seen.add(key);

    const type = raw.type;
    const options =
      type === "select"
        ? (raw.options ?? []).map((o) => o.trim()).filter(Boolean)
        : undefined;

    normalized.push({
      key,
      enabled: raw.enabled,
      required: raw.required,
      labelAr: raw.labelAr.trim(),
      labelEn: raw.labelEn.trim(),
      type,
      options,
      order: normalized.length + 1,
      placeholderAr: raw.placeholderAr?.trim() || undefined,
      placeholderEn: raw.placeholderEn?.trim() || undefined,
    });
  }

  if (normalized.length === 0) {
    return { ok: false, error: "At least one field is required" };
  }

  const parsed = configSchema.safeParse({ fields: normalized });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid config",
    };
  }

  return { ok: true, fields: parsed.data.fields };
}

const egyptMobileRegex = /^(?:\+20|0020|0)?1[0125]\d{8}$/;

function msg(dict: Dictionary, key: string) {
  return dict[key] ?? key;
}

function requiredMessage(dict: Dictionary, label: string) {
  return `${label}: ${msg(dict, "validation.fieldRequired")}`;
}

function zodForField(
  field: RegistrationFormFieldConfig,
  dict: Dictionary,
  locale: string
): z.ZodTypeAny {
  const label = getFieldLabel(field, locale);
  const req = requiredMessage(dict, label);

  const emptyToUndefined = z
    .union([z.string(), z.undefined(), z.null()])
    .transform((v) => {
      const s = v == null ? "" : String(v).trim();
      return s === "" ? undefined : s;
    });

  switch (field.type) {
    case "text":
      return field.required
        ? z.string().trim().min(1, req).max(500)
        : emptyToUndefined.pipe(z.string().max(500).optional());
    case "textarea":
      return field.required
        ? z.string().trim().min(1, req).max(2000)
        : emptyToUndefined.pipe(z.string().max(2000).optional());
    case "email":
      return field.required
        ? z.string().trim().email(msg(dict, "validation.emailInvalid"))
        : emptyToUndefined.pipe(
            z.string().email(msg(dict, "validation.emailInvalid")).optional()
          );
    case "tel": {
      const egyptCheck = (v: string) =>
        egyptMobileRegex.test(normalizeMobile(v));
      if (field.key === "mobile") {
        return field.required
          ? z
              .string()
              .trim()
              .min(10, msg(dict, "validation.mobileRequired"))
              .refine(egyptCheck, {
                message: msg(dict, "validation.mobileInvalid"),
              })
          : emptyToUndefined.pipe(
              z
                .string()
                .refine((v) => !v || egyptCheck(v), {
                  message: msg(dict, "validation.mobileInvalid"),
                })
                .optional()
            );
      }
      return field.required
        ? z.string().trim().min(8, req).max(30)
        : emptyToUndefined.pipe(z.string().max(30).optional());
    }
    case "select": {
      const opts = field.options ?? [];
      const selectSchema = z.string().refine(
        (v) => opts.length === 0 || opts.includes(v),
        { message: `${label}: ${msg(dict, "validation.selectRequired")}` }
      );
      return field.required
        ? z.string().trim().min(1, req).pipe(selectSchema)
        : emptyToUndefined.pipe(selectSchema.optional());
    }
    case "number":
      return field.required
        ? z
            .string()
            .trim()
            .min(1, req)
            .refine((v) => /^-?\d+(\.\d+)?$/.test(v), { message: req })
        : emptyToUndefined.pipe(
            z
              .string()
              .refine((v) => !v || /^-?\d+(\.\d+)?$/.test(v), { message: req })
              .optional()
          );
    case "date":
      return field.required
        ? z
            .string()
            .trim()
            .regex(/^\d{4}-\d{2}-\d{2}$/, req)
        : emptyToUndefined.pipe(
            z
              .string()
              .regex(/^\d{4}-\d{2}-\d{2}$/)
              .optional()
          );
    case "url":
      return field.required
        ? z.string().trim().url(msg(dict, "validation.urlInvalid"))
        : emptyToUndefined.pipe(
            z.string().url(msg(dict, "validation.urlInvalid")).optional()
          );
    default:
      return z.string().optional();
  }
}

export function createRegistrationSchemaFromConfig(
  config: RegistrationFormConfigRecord,
  dict: Dictionary,
  options?: { locale?: string }
) {
  const locale = options?.locale ?? "ar";
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of getEnabledFields(config)) {
    shape[field.key] = zodForField(field, dict, locale);
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

export type RegistrationSubmitPayload = {
  data: RegistrationSubmitData;
  customData: Record<string, string>;
};

export function mapRegistrationSubmitBody(
  config: RegistrationFormConfigRecord,
  raw: Record<string, unknown>
): RegistrationSubmitPayload {
  const enabled = getEnabledFields(config);
  const customData: Record<string, string> = {};

  const str = (key: string) => {
    const v = raw[key];
    if (v == null) return "";
    return String(v).trim();
  };

  for (const field of enabled) {
    if (!isBuiltinFieldKey(field.key)) {
      const val = str(field.key);
      if (val) customData[field.key] = val;
      else if (field.required) customData[field.key] = "";
    }
  }

  const has = (key: RegistrationBuiltinKey) =>
    enabled.some((f) => f.key === key);

  const email = has("email") ? str("email").toLowerCase() : "";
  const mobile = has("mobile") ? normalizeMobile(str("mobile")) : "";

  return {
    data: {
      fullName: has("fullName") ? str("fullName") || "—" : "—",
      rank: has("rank") ? str("rank") || "—" : "—",
      entity: has("entity") ? str("entity") || "—" : "—",
      email,
      mobile,
      notes: has("notes") ? str("notes") || null : null,
    },
    customData,
  };
}

export function validateRegistrationFormConfigPayload(
  fields: RegistrationFormFieldConfig[]
): { ok: true; fields: RegistrationFormFieldConfig[] } | { ok: false; error: string } {
  const sanitized = sanitizeRegistrationFormFields(fields);
  if (!sanitized.ok) return sanitized;

  const enabled = sanitized.fields.filter((f) => f.enabled);
  if (enabled.length === 0) {
    return { ok: false, error: "At least one field must be enabled" };
  }

  for (const field of enabled) {
    if (field.type === "select" && (!field.options || field.options.length === 0)) {
      return {
        ok: false,
        error: `Select field "${field.key}" needs at least one option`,
      };
    }
  }

  return { ok: true, fields: sanitized.fields };
}
