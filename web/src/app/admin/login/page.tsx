"use client";

import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LogoHeader } from "@/components/LogoHeader";
import { TextField } from "@/components/ui/Field";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);

    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });

    setLoading(false);
    if (result?.error) {
      setError("بيانات الدخول غير صحيحة");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="min-h-screen">
      <LogoHeader subtitle="لوحة الإدارة" />
      <form
        onSubmit={onSubmit}
        className="mx-auto mt-12 max-w-md space-y-5 rounded-2xl border border-border bg-card p-8 shadow-sm"
      >
        <h2 className="text-center text-lg font-bold text-gold-dark">تسجيل الدخول</h2>
        <TextField
          name="email"
          label="البريد الإلكتروني"
          type="email"
          required
          dir="ltr"
          className="text-left"
        />
        <TextField
          name="password"
          label="كلمة المرور"
          type="password"
          required
          dir="ltr"
          className="text-left"
        />
        {error && (
          <p className="text-center text-sm text-error">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gold-dark py-3 font-semibold text-white hover:bg-bronze disabled:opacity-60"
        >
          {loading ? "جاري الدخول..." : "دخول"}
        </button>
      </form>
    </main>
  );
}
