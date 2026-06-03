"use client";

import { FormEvent, useState } from "react";
import {
  CheckCircle,
  CircleNotch,
  HandWaving,
  WarningCircle,
} from "@phosphor-icons/react";
import { TextField, TextAreaField } from "@/components/ui/Field";
import { useI18n } from "@/components/I18nProvider";
import {
  getEnabledFields,
  type RegistrationFormConfigRecord,
} from "@/lib/registration-form-config-shared";

type Props = {
  slug: string;
  formConfig: RegistrationFormConfigRecord;
};

export function WithdrawRegistrationPanel({ slug, formConfig }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const enabled = getEnabledFields(formConfig);
  const emailEnabled = enabled.some((f) => f.key === "email");
  const mobileEnabled = enabled.some((f) => f.key === "mobile");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    const email = form.get("email");
    const mobile = form.get("mobile");
    const withdrawalNote = form.get("withdrawalNote");
    if (typeof email === "string" && email.trim()) body.email = email.trim();
    if (typeof mobile === "string" && mobile.trim()) body.mobile = mobile.trim();
    if (typeof withdrawalNote === "string" && withdrawalNote.trim()) {
      body.withdrawalNote = withdrawalNote.trim();
    }

    try {
      const res = await fetch(`/api/register/${slug}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("register.withdraw.errorGeneric"));
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
      <div className="mt-8 rounded-2xl border border-amber-200/80 bg-amber-50/80 p-6 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-900">
          <CheckCircle size={40} weight="fill" aria-hidden />
        </div>
        <h3 className="mb-2 text-lg font-bold text-gold-dark">
          {t("register.withdraw.successTitle")}
        </h3>
        <p className="text-sm leading-relaxed text-bronze">
          {t("register.withdraw.successBody")}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border border-border bg-[#f5f0e8]/60 p-5 shadow-sm md:p-6">
      {!open ? (
        <div className="text-center">
          <p className="mb-3 text-sm leading-relaxed text-bronze">
            {t("register.withdraw.intro")}
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gold-dark/30 bg-card px-5 py-2.5 text-sm font-semibold text-gold-dark transition hover:bg-gold-dark/5"
          >
            <HandWaving size={20} weight="duotone" aria-hidden />
            {t("register.withdraw.openForm")}
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="border-b border-border pb-3 text-center">
            <h3 className="text-lg font-bold text-gold-dark">
              {t("register.withdraw.formTitle")}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-bronze">
              {t("register.withdraw.formHint")}
            </p>
          </div>

          {emailEnabled && (
            <TextField
              name="email"
              label={t("register.email")}
              type="email"
              required={!mobileEnabled}
              dir="ltr"
              className="text-left"
              autoComplete="email"
            />
          )}
          {mobileEnabled && (
            <TextField
              name="mobile"
              label={t("register.mobile")}
              type="tel"
              required={!emailEnabled}
              dir="ltr"
              className="text-left"
              autoComplete="tel"
              placeholder="01xxxxxxxxx"
            />
          )}

          <TextAreaField
            name="withdrawalNote"
            label={t("register.withdraw.noteLabel")}
            rows={3}
            placeholder={t("register.withdraw.notePlaceholder")}
          />

          {error && (
            <p className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-error">
              <WarningCircle
                size={20}
                className="shrink-0"
                weight="fill"
                aria-hidden
              />
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-700/40 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-950 transition hover:bg-amber-100 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <CircleNotch size={18} className="animate-spin" aria-hidden />
                  {t("register.withdraw.submitting")}
                </>
              ) : (
                <>
                  <HandWaving size={18} weight="duotone" aria-hidden />
                  {t("register.withdraw.submit")}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError("");
              }}
              className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-bronze transition hover:bg-muted"
            >
              {t("admin.common.cancel")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
