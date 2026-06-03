"use client";

import { FormEvent, useEffect, useState } from "react";
import { TextField } from "@/components/ui/Field";

type Status = {
  email: { configured: boolean; provider: string };
  sms: { configured: boolean; provider: string };
  whatsapp: { configured: boolean; provider: string };
};

export function SettingsPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [testResult, setTestResult] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/notifications/status")
      .then((r) => r.json())
      .then(setStatus);
  }, []);

  async function onTest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTestResult("");
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
      setTestResult(`تم الإرسال بنجاح (${data.provider || data.channel})`);
    } else {
      setTestResult(data.error || "لم يُرسل — تحقق من الإعدادات");
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 font-bold text-gold-dark">حالة الإشعارات</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-lg bg-[#f5f0e8] px-4 py-3">
            <span>
              البريد ({status?.email.provider ?? "SendGrid / Resend"})
            </span>
            <StatusBadge ok={status?.email.configured} />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-[#f5f0e8] px-4 py-3">
            <span>WhatsApp (Twilio)</span>
            <StatusBadge ok={status?.whatsapp.configured} />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-[#f5f0e8] px-4 py-3">
            <span>SMS (Twilio — اختياري)</span>
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
          label="المستلم (بريد أو +201xxxxxxxxx للواتساب/SMS)"
          required
          dir="ltr"
          className="text-left"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-gold-dark px-6 py-2.5 text-white hover:bg-bronze disabled:opacity-60"
        >
          {loading ? "جاري الإرسال..." : "إرسال اختبار"}
        </button>
        {testResult && (
          <p
            className={`text-sm ${testResult.includes("نجاح") ? "text-success" : "text-error"}`}
          >
            {testResult}
          </p>
        )}
      </form>
    </div>
  );
}

function StatusBadge({ ok }: { ok?: boolean }) {
  if (ok === undefined) return <span className="text-bronze">...</span>;
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ok ? "bg-green-100 text-green-900" : "bg-amber-100 text-amber-900"}`}
    >
      {ok ? "مفعّل" : "غير مُعد"}
    </span>
  );
}
