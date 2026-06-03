"use client";

import { FormEvent, useState } from "react";
import {
  TextField,
  SelectField,
  TextAreaField,
  ReadOnlyField,
} from "@/components/ui/Field";
import { useI18n } from "@/components/I18nProvider";
import { parseJsonStringArray } from "@/lib/i18n/translate";

type Props = {
  slug: string;
  eventName: string;
  eventDate: string;
};

export function RegistrationForm({ slug, eventName, eventDate }: Props) {
  const { t, dict } = useI18n();
  const ranks = parseJsonStringArray(dict, "options.ranks");
  const entities = parseJsonStringArray(dict, "options.entities");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const body = {
      fullName: form.get("fullName"),
      rank: form.get("rank"),
      entity: form.get("entity"),
      email: form.get("email"),
      mobile: form.get("mobile"),
      notes: form.get("notes") || undefined,
    };

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
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-success">
          ✓
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

      <TextField
        name="fullName"
        label={t("register.fullName")}
        required
        autoComplete="name"
      />
      <SelectField
        name="rank"
        label={t("register.rank")}
        required
        defaultValue=""
      >
        <option value="" disabled>
          {t("register.selectRank")}
        </option>
        {ranks.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </SelectField>
      <SelectField
        name="entity"
        label={t("register.entity")}
        required
        defaultValue=""
      >
        <option value="" disabled>
          {t("register.selectEntity")}
        </option>
        {entities.map((e) => (
          <option key={e} value={e}>
            {e}
          </option>
        ))}
      </SelectField>
      <TextField
        name="email"
        label={t("register.email")}
        type="email"
        required
        dir="ltr"
        className="text-left"
        autoComplete="email"
      />
      <TextField
        name="mobile"
        label={t("register.mobile")}
        type="tel"
        required
        dir="ltr"
        className="text-left"
        placeholder="01xxxxxxxxx"
        autoComplete="tel"
      />
      <TextAreaField name="notes" label={t("register.notes")} rows={3} />

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-error">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gold-dark py-3 font-semibold text-white transition hover:bg-bronze disabled:opacity-60"
      >
        {loading ? t("register.submitting") : t("register.submit")}
      </button>
    </form>
  );
}
