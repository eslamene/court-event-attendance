"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  ChatCircle,
  DeviceMobile,
  EnvelopeSimple,
  PaperPlaneTilt,
} from "@phosphor-icons/react";
import { TextField } from "@/components/ui/Field";
import { PrimaryFormButton } from "@/components/ui/FormActions";
import { useI18n } from "@/components/I18nProvider";
import { EmailTemplateEditor } from "@/components/admin/EmailTemplateEditor";
import { useFeedback } from "@/components/ui/FeedbackProvider";

type Status = {
  email: {
    configured: boolean;
    provider: string;
    fromAddress?: string | null;
    fromError?: string | null;
    fromMatchesVerified?: boolean | null;
    verifiedSenders?: string[];
    verifiedDomains?: string[];
    senderHint?: string | null;
  };
  sms: { configured: boolean; provider: string };
  whatsapp: { configured: boolean; provider: string };
};

export function SettingsPanel() {
  const { t } = useI18n();
  const { toastSuccess, toastError } = useFeedback();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/notifications/status")
      .then((r) => r.json())
      .then(setStatus);
  }, []);

  async function onTest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/notifications/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: form.get("channel"),
        to: form.get("to"),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.sent) {
      toastSuccess(
        t("admin.settings.testSuccess", {
          provider: data.provider || data.channel,
        })
      );
    } else {
      toastError(
        [data.error, data.message].filter(Boolean).join(" — ") ||
          t("admin.settings.testFailed")
      );
    }
  }

  return (
    <div className="max-w-4xl space-y-8">
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 font-bold text-gold-dark">{t("admin.settings.title")}</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-lg bg-[#f5f0e8] px-4 py-3">
            <span className="inline-flex items-center gap-2">
              <EnvelopeSimple size={20} className="text-gold-dark" aria-hidden />
              {t("admin.settings.email", {
                provider: status?.email.provider ?? "SendGrid / Resend",
              })}
            </span>
            <StatusBadge ok={status?.email.configured} />
          </div>
          {status?.email.fromAddress && (
            <p className="text-xs text-bronze" dir="ltr">
              From: {status.email.fromAddress}
            </p>
          )}
          {status?.email.fromError && (
            <p className="text-xs text-error">{status.email.fromError}</p>
          )}
          {status?.email.fromMatchesVerified === false && (
            <p className="rounded-lg border border-error/30 bg-red-50 px-3 py-2 text-xs text-error">
              {status.email.senderHint ??
                t("admin.settings.fromNotVerified")}
            </p>
          )}
          {status?.email.verifiedSenders &&
            status.email.verifiedSenders.length > 0 && (
              <div className="text-xs text-bronze">
                <p className="font-medium text-gold-dark">
                  {t("admin.settings.verifiedSenders")}
                </p>
                <ul className="mt-1 list-inside list-disc" dir="ltr">
                  {status.email.verifiedSenders.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          {status?.email.verifiedDomains &&
            status.email.verifiedDomains.length > 0 && (
              <div className="text-xs text-bronze">
                <p className="font-medium text-gold-dark">
                  {t("admin.settings.verifiedDomains")}
                </p>
                <ul className="mt-1 list-inside list-disc" dir="ltr">
                  {status.email.verifiedDomains.map((d) => (
                    <li key={d}>any address @{d}</li>
                  ))}
                </ul>
              </div>
            )}
          {status?.email.senderHint &&
            status?.email.fromMatchesVerified !== false && (
              <p className="text-xs text-bronze">{status.email.senderHint}</p>
            )}
          <div className="flex items-center justify-between rounded-lg bg-[#f5f0e8] px-4 py-3">
            <span className="inline-flex items-center gap-2">
              <ChatCircle size={20} className="text-gold-dark" aria-hidden />
              WhatsApp (Twilio)
            </span>
            <StatusBadge ok={status?.whatsapp.configured} />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-[#f5f0e8] px-4 py-3">
            <span className="inline-flex items-center gap-2">
              <DeviceMobile size={20} className="text-gold-dark" aria-hidden />
              SMS (Twilio — اختياري)
            </span>
            <StatusBadge ok={status?.sms.configured} />
          </div>
        </div>
        <p className="mt-4 text-xs text-bronze leading-relaxed">
          دليل الإعداد الكامل:{" "}
          <code className="text-gold-dark">docs/TWILIO_INTEGRATION.md</code> في
          المستودع
        </p>
      </section>

      <form
        onSubmit={onTest}
        className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <h2 className="font-bold text-gold-dark">إرسال رسالة اختبار</h2>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-gold-dark">القناة</span>
          <select
            name="channel"
            className="w-full rounded-lg border border-border bg-card px-4 py-2.5"
            defaultValue="email"
          >
            <option value="email">بريد إلكتروني</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="sms">SMS</option>
          </select>
        </label>
        <TextField
          name="to"
          label={t("admin.settings.testRecipient")}
          required
          dir="ltr"
          className="text-left"
        />
        <PrimaryFormButton icon={PaperPlaneTilt} disabled={loading}>
          {loading ? t("admin.settings.testSending") : t("admin.settings.testSend")}
        </PrimaryFormButton>
      </form>

      <EmailTemplateEditor mode="default" embedded />
    </div>
  );
}

function StatusBadge({ ok }: { ok?: boolean }) {
  const { t } = useI18n();
  if (ok === undefined) return <span className="text-bronze">...</span>;
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ok ? "bg-green-100 text-green-900" : "bg-amber-100 text-amber-900"}`}
    >
      {ok ? t("admin.settings.enabled") : t("admin.settings.disabled")}
    </span>
  );
}
