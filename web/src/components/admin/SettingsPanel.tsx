"use client";

import { FormEvent, useEffect, useState } from "react";
import { TextField } from "@/components/ui/Field";

type Status = {
  email: { configured: boolean; provider: string };
  sms: { configured: boolean; provider: string };
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
      setTestResult("تم الإرسال بنجاح");
    } else {
      setTestResult(data.error || data.skipped ? "لم يُرسل — تحقق من الإعدادات" : "فشل الإرسال");
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 font-bold text-gold-dark">حالة الإشعارات</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-lg bg-[#f5f0e8] px-4 py-3">
            <span>البريد الإلكتروني (Resend)</span>
            <StatusBadge ok={status?.email.configured} />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-[#f5f0e8] px-4 py-3">
            <span>الرسائل النصية (Twilio)</span>
            <StatusBadge ok={status?.sms.configured} />
          </div>
        </div>
        <p className="mt-4 text-xs text-bronze leading-relaxed">
          أضف المفاتيح في متغيرات البيئة على Vercel أو Railway:{" "}
          <code className="text-gold-dark">RESEND_API_KEY</code>,{" "}
          <code className="text-gold-dark">EMAIL_FROM</code>,{" "}
          <code className="text-gold-dark">TWILIO_*</code>
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
            <option value="sms">رسالة نصية</option>
          </select>
        </label>
        <TextField
          name="to"
          label="المستلم (بريد أو +20xxxxxxxxxx)"
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
          <p className={`text-sm ${testResult.includes("نجاح") ? "text-success" : "text-error"}`}>
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
