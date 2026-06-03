"use client";

import { FormEvent, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Send,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  seatTiers?: { id: string; name: string; seatCount: number }[];
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
          fieldKey={field.key}
          fieldType={field.type}
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
          fieldKey={field.key}
          fieldType={field.type}
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
          fieldKey={field.key}
          fieldType={field.type}
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
          fieldKey={field.key}
          fieldType={field.type}
          label={label}
          type="tel"
          required={field.required}
          dir="ltr"
          className="text-left"
          autoComplete="tel"
          placeholder={placeholder ?? "01xxxxxxxxx"}
        />
      );
    case "number":
      return (
        <TextField
          key={field.key}
          name={field.key}
          fieldKey={field.key}
          fieldType={field.type}
          label={label}
          type="number"
          required={field.required}
          dir="ltr"
          className="text-left"
          placeholder={placeholder}
        />
      );
    case "date":
      return (
        <TextField
          key={field.key}
          name={field.key}
          fieldKey={field.key}
          fieldType={field.type}
          label={label}
          type="date"
          required={field.required}
          dir="ltr"
          className="text-left"
        />
      );
    case "url":
      return (
        <TextField
          key={field.key}
          name={field.key}
          fieldKey={field.key}
          fieldType={field.type}
          label={label}
          type="url"
          required={field.required}
          dir="ltr"
          className="text-left"
          placeholder={placeholder ?? "https://"}
        />
      );
    default:
      return (
        <TextField
          key={field.key}
          name={field.key}
          fieldKey={field.key}
          fieldType={field.type}
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
  seatTiers = [],
}: Props) {
  const { t, locale } = useI18n();
  const fields = getEnabledFields(formConfig);
  const showTierSelect = seatTiers.length > 0;
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
    if (showTierSelect) {
      body.seatTierId = form.get("seatTierId");
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
          <CheckCircle2 className="size-12 text-success" aria-hidden />
        </div>
        <h2 className="mb-3 text-xl font-bold text-gold-dark">
          {t("register.successTitle")}
        </h2>
        <p className="leading-relaxed text-bronze">{t("register.successBody")}</p>
        <p className="mt-4 text-sm text-bronze">{t("register.withdraw.afterRegisterHint")}</p>
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

      <ReadOnlyField
        fieldKey="eventName"
        label={t("register.eventName")}
        value={eventName}
      />
      <ReadOnlyField
        fieldKey="eventDate"
        label={t("register.eventDate")}
        value={eventDate}
      />

      {fields.map((field) => renderField(field, locale))}

      {showTierSelect && (
        <SelectField
          name="seatTierId"
          label={t("register.seatTier")}
          required={seatTiers.length > 1}
          defaultValue={seatTiers.length === 1 ? seatTiers[0].id : ""}
        >
          {seatTiers.length > 1 && (
            <option value="" disabled>
              {t("register.seatTierPlaceholder")}
            </option>
          )}
          {seatTiers.map((tier) => (
            <option key={tier.id} value={tier.id}>
              {tier.name}
            </option>
          ))}
        </SelectField>
      )}

      {error && (
        <p className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-error">
          <AlertCircle className="size-5 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      <Button
        type="submit"
        variant="brand"
        size="lg"
        disabled={loading}
        className="w-full rounded-xl"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t("register.submitting")}
          </>
        ) : (
          <>
            <Send className="size-4" aria-hidden />
            {t("register.submit")}
          </>
        )}
      </Button>
    </form>
  );
}
