"use client";

import {
  SelectField,
  TextAreaField,
  TextField,
  ReadOnlyField,
} from "@/components/ui/Field";
import { useI18n } from "@/components/I18nProvider";
import {
  getEnabledFields,
  getFieldLabel,
  getFieldPlaceholder,
  type RegistrationFormFieldConfig,
} from "@/lib/registration-form-config-shared";
import { Eye } from "@phosphor-icons/react";
import { useMemo } from "react";

type Props = {
  fields: RegistrationFormFieldConfig[];
  eventName?: string;
  compact?: boolean;
};

function PreviewField({
  field,
  locale,
}: {
  field: RegistrationFormFieldConfig;
  locale: string;
}) {
  const label = getFieldLabel(field, locale);
  const placeholder = getFieldPlaceholder(field, locale);

  switch (field.type) {
    case "select":
      return (
        <SelectField
          fieldKey={field.key}
          fieldType={field.type}
          label={label}
          required={field.required}
          defaultValue=""
          disabled
        >
          <option value="">{placeholder ?? "—"}</option>
          {(field.options ?? []).slice(0, 3).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </SelectField>
      );
    case "textarea":
      return (
        <TextAreaField
          fieldKey={field.key}
          fieldType={field.type}
          label={label}
          required={field.required}
          rows={2}
          placeholder={placeholder}
          disabled
          value=""
          readOnly
        />
      );
    case "email":
      return (
        <TextField
          fieldKey={field.key}
          fieldType={field.type}
          label={label}
          type="email"
          required={field.required}
          dir="ltr"
          className="text-left opacity-90"
          placeholder={placeholder}
          disabled
          value=""
          readOnly
        />
      );
    case "tel":
      return (
        <TextField
          fieldKey={field.key}
          fieldType={field.type}
          label={label}
          type="tel"
          required={field.required}
          dir="ltr"
          className="text-left opacity-90"
          placeholder={placeholder ?? "01xxxxxxxxx"}
          disabled
          value=""
          readOnly
        />
      );
    case "number":
      return (
        <TextField
          fieldKey={field.key}
          fieldType={field.type}
          label={label}
          type="number"
          required={field.required}
          dir="ltr"
          className="text-left opacity-90"
          placeholder={placeholder}
          disabled
          value=""
          readOnly
        />
      );
    case "date":
      return (
        <TextField
          fieldKey={field.key}
          fieldType={field.type}
          label={label}
          type="date"
          required={field.required}
          dir="ltr"
          className="text-left opacity-90"
          disabled
          value=""
          readOnly
        />
      );
    case "url":
      return (
        <TextField
          fieldKey={field.key}
          fieldType={field.type}
          label={label}
          type="url"
          required={field.required}
          dir="ltr"
          className="text-left opacity-90"
          placeholder={placeholder ?? "https://"}
          disabled
          value=""
          readOnly
        />
      );
    default:
      return (
        <TextField
          fieldKey={field.key}
          fieldType={field.type}
          label={label}
          required={field.required}
          placeholder={placeholder}
          disabled
          value=""
          readOnly
        />
      );
  }
}

export function RegistrationFormEditorPreview({
  fields,
  eventName,
  compact = false,
}: Props) {
  const { t, locale } = useI18n();
  const enabled = getEnabledFields({ fields, source: "default" });
  const sampleEvent = eventName || t("admin.registrationForm.previewEventName");
  const sampleDate = useMemo(
    () =>
      new Date().toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [locale]
  );

  const formBody = (
    <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-5 shadow-md ring-1 ring-gold/10 md:p-6">
      <h3 className="mb-4 border-b border-border pb-3 text-center text-base font-bold text-gold-dark">
        {t("register.formTitle")}
      </h3>

      <div className="pointer-events-none space-y-4 opacity-95">
        <ReadOnlyField
          fieldKey="eventName"
          label={t("register.eventName")}
          value={sampleEvent}
        />
        <ReadOnlyField
          fieldKey="eventDate"
          label={t("register.eventDate")}
          value={sampleDate}
        />

        {enabled.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-[#faf8f5] px-4 py-8 text-center text-sm text-bronze">
            {t("admin.registrationForm.previewEmpty")}
          </p>
        ) : (
          enabled.map((field) => (
            <PreviewField key={field.key} field={field} locale={locale} />
          ))
        )}

        <div className="rounded-xl bg-gold-dark/90 py-2.5 text-center text-sm font-semibold text-white">
          {t("register.submit")}
        </div>
      </div>
    </div>
  );

  if (compact) {
    return formBody;
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-gradient-to-b from-[#faf8f5] to-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="flex size-8 items-center justify-center rounded-lg bg-gold/15 text-gold-dark">
          <Eye size={18} weight="duotone" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gold-dark">
            {t("admin.registrationForm.livePreview")}
          </p>
          <p className="text-xs text-bronze">
            {t("admin.registrationForm.previewHint")}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">{formBody}</div>
    </div>
  );
}
