"use client";

import { FormEvent, useState } from "react";
import {
  CheckCircle,
  CircleNotch,
  PaperPlaneTilt,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  TextField,
  SelectField,
  TextAreaField,
  ReadOnlyField,
} from "@/components/ui/Field";
import { useI18n } from "@/components/I18nProvider";
import {
  getEnabledFields,
  getFieldLabel,
  getFieldPlaceholder,
  type RegistrationFormConfigRecord,
  type RegistrationFormFieldConfig,
} from "@/lib/registration-form-config-shared";

type Props = {
  slug: string;
  eventName: string;
  eventDate: string;
  formConfig: RegistrationFormConfigRecord;
};

function renderField(
  field: RegistrationFormFieldConfig,
  locale: string
) {
  const label = getFieldLabel(field, locale);
  const placeholder = getFieldPlaceholder(field, locale);

  switch (field.type) {
    case "select":
      return (
        <SelectField
          key={field.key}
          name={field.key}
          label={label}
          required={field.required}
          defaultValue=""
        >
          <option value="" disabled>
            {placeholder ?? "—"}
          </option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </SelectField>
      );
    case "textarea":
      return (
        <TextAreaField
          key={field.key}
          name={field.key}
          label={label}
          required={field.required}
          rows={3}
          placeholder={placeholder}
        />
      );
    case "email":
      return (
        <TextField
          key={field.key}
          name={field.key}
          label={label}
          type="email"
          required={field.required}
          dir="ltr"
          className="text-left"
          autoComplete="email"
          placeholder={placeholder}
        />
      );
    case "tel":
      return (
        <TextField
          key={field.key}
          name={field.key}
          label={label}
          type="tel"
          required={field.required}
          dir="ltr"
          className="text-left"
          autoComplete="tel"
          placeholder={placeholder ?? "01xxxxxxxxx"}
        />
      );
    default:
      return (
        <TextField
          key={field.key}
          name={field.key}
          label={label}
          required={field.required}
          autoComplete={field.key === "fullName" ? "name" : undefined}
          placeholder={placeholder}
        />
      );
  }
}

export function RegistrationForm({
  slug,
  eventName,
  eventDate,
  formConfig,
}: Props) {
  const { t, locale } = useI18n();
  const fields = getEnabledFields(formConfig);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const body: Record<string, FormDataEntryValue | null> = {};
    for (const field of fields) {
      const val = form.get(field.key);
      body[field.key] = val;
    }

    try {
      const res = await fetch(`/api/register/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("register.errorGeneric"));
        return;
      }
      setSuccess(true);
    } catch {
      setError(t("register.errorNetwork"));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-success">
          <CheckCircle size={48} weight="fill" aria-hidden />
        </div>
        <h2 className="mb-3 text-xl font-bold text-gold-dark">
          {t("register.successTitle")}
        </h2>
        <p className="leading-relaxed text-bronze">{t("register.successBody")}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8"
    >
      <h2 className="border-b border-border pb-4 text-center text-lg font-bold text-gold-dark">
        {t("register.formTitle")}
      </h2>

      <ReadOnlyField label={t("register.eventName")} value={eventName} />
      <ReadOnlyField label={t("register.eventDate")} value={eventDate} />

      {fields.map((field) => renderField(field, locale))}

      {error && (
        <p className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-error">
          <WarningCircle size={20} className="shrink-0" weight="fill" aria-hidden />
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold-dark py-3 font-semibold text-white transition hover:bg-bronze disabled:opacity-60"
      >
        {loading ? (
          <>
            <CircleNotch size={20} className="animate-spin" aria-hidden />
            {t("register.submitting")}
          </>
        ) : (
          <>
            <PaperPlaneTilt size={20} weight="fill" aria-hidden />
            {t("register.submit")}
          </>
        )}
      </button>
    </form>
  );
}
