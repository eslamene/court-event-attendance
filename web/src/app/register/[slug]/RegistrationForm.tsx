"use client";

import { FormEvent, useState } from "react";
import {
  TextField,
  SelectField,
  TextAreaField,
  ReadOnlyField,
} from "@/components/ui/Field";
import { ENTITY_OPTIONS, RANK_OPTIONS } from "@/lib/constants";

type Props = {
  slug: string;
  eventName: string;
  eventDate: string;
};

export function RegistrationForm({ slug, eventName, eventDate }: Props) {
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
        setError(data.error || "حدث خطأ أثناء التسجيل");
        return;
      }
      setSuccess(true);
    } catch {
      setError("تعذر الاتصال بالخادم. يرجى المحاولة لاحقاً.");
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
        <h2 className="mb-3 text-xl font-bold text-gold-dark">تم استلام طلبكم</h2>
        <p className="leading-relaxed text-bronze">
          شكراً لتسجيلكم. طلبكم قيد المراجعة من قبل الإدارة. سيتم إرسال رمز QR
          إلى بريدكم الإلكتروني ورقم جوالكم عند الموافقة.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8"
    >
      <h2 className="border-b border-border pb-4 text-center text-lg font-bold text-gold-dark">
        بيانات التسجيل
      </h2>

      <ReadOnlyField label="اسم الفعالية" value={eventName} />
      <ReadOnlyField label="تاريخ الفعالية" value={eventDate} />

      <TextField
        name="fullName"
        label="الاسم الكامل"
        required
        autoComplete="name"
      />
      <SelectField name="rank" label="الرتبة / الدرجة" required defaultValue="">
        <option value="" disabled>
          — اختر الرتبة —
        </option>
        {RANK_OPTIONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </SelectField>
      <SelectField name="entity" label="الجهة / الانتماء" required defaultValue="">
        <option value="" disabled>
          — اختر الجهة —
        </option>
        {ENTITY_OPTIONS.map((e) => (
          <option key={e} value={e}>
            {e}
          </option>
        ))}
      </SelectField>
      <TextField
        name="email"
        label="البريد الإلكتروني"
        type="email"
        required
        dir="ltr"
        className="text-left"
        autoComplete="email"
      />
      <TextField
        name="mobile"
        label="رقم الجوال"
        type="tel"
        required
        dir="ltr"
        className="text-left"
        placeholder="01xxxxxxxxx"
        autoComplete="tel"
      />
      <TextAreaField name="notes" label="ملاحظات (اختياري)" rows={3} />

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-error">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gold-dark py-3 font-semibold text-white transition hover:bg-bronze disabled:opacity-60"
      >
        {loading ? "جاري الإرسال..." : "إرسال طلب التسجيل"}
      </button>
    </form>
  );
}
