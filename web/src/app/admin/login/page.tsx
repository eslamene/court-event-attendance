"use client";

import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { CircleNotch, SignIn } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { LogoHeader } from "@/components/LogoHeader";
import { TextField } from "@/components/ui/Field";
import { useI18n } from "@/components/I18nProvider";

export default function AdminLoginPage() {
  const { t } = useI18n();
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
      setError(t("admin.login.error"));
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="min-h-screen">
      <LogoHeader subtitle={t("header.adminSubtitle")} />
      <form
        onSubmit={onSubmit}
        className="mx-auto mt-12 max-w-md space-y-5 rounded-2xl border border-border bg-card p-8 shadow-sm"
      >
        <h2 className="text-center text-lg font-bold text-gold-dark">
          {t("admin.login.title")}
        </h2>
        <TextField
          name="email"
          label={t("register.email")}
          type="email"
          required
          dir="ltr"
          className="text-left"
        />
        <TextField
          name="password"
          label={t("admin.login.password")}
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
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold-dark py-3 font-semibold text-white hover:bg-bronze disabled:opacity-60"
        >
          {loading ? (
            <>
              <CircleNotch size={20} className="animate-spin" aria-hidden />
              {t("admin.login.submitting")}
            </>
          ) : (
            <>
              <SignIn size={20} weight="bold" aria-hidden />
              {t("admin.login.submit")}
            </>
          )}
        </button>
      </form>
    </main>
  );
}
