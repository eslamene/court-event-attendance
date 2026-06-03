"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { TextField, SelectField } from "@/components/ui/Field";
import { useI18n } from "@/components/I18nProvider";
import { USER_ROLES } from "@/lib/i18n/schemas";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

export function UsersPanel() {
  const { t } = useI18n();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || t("admin.users.loadFailed"));
      setLoading(false);
      return;
    }
    setUsers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        name: form.get("name"),
        password: form.get("password"),
        role: form.get("role"),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || t("admin.users.createFailed"));
      return;
    }
    (e.target as HTMLFormElement).reset();
    load();
  }

  async function toggleActive(user: UserRow) {
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    load();
  }

  async function resetPassword(id: string) {
    const password = prompt(t("admin.users.passwordPrompt"));
    if (!password || password.length < 8) return;
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) alert(t("admin.users.passwordUpdated"));
    else {
      const data = await res.json();
      alert(data.error || t("admin.users.updateFailed"));
    }
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={onCreate}
        className="max-w-lg space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <h2 className="font-bold text-gold-dark">{t("admin.users.addTitle")}</h2>
        <TextField name="name" label={t("admin.users.name")} required />
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
          minLength={8}
          dir="ltr"
          className="text-left"
        />
        <SelectField name="role" label={t("admin.users.role")} required defaultValue="APPROVAL_MANAGER">
          {USER_ROLES.map((r) => (
            <option key={r} value={r}>
              {t(`roles.${r}`)}
            </option>
          ))}
        </SelectField>
        {error && <p className="text-sm text-error">{error}</p>}
        <button
          type="submit"
          className="rounded-xl bg-gold-dark px-6 py-2.5 text-white hover:bg-bronze"
        >
          {t("admin.users.create")}
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-[#f5f0e8] text-gold-dark">
            <tr>
              <th className="px-4 py-3 text-right">{t("admin.users.name")}</th>
              <th className="px-4 py-3 text-right">{t("admin.users.colEmail")}</th>
              <th className="px-4 py-3 text-right">{t("admin.users.role")}</th>
              <th className="px-4 py-3 text-right">{t("admin.registrations.colStatus")}</th>
              <th className="px-4 py-3 text-right">{t("admin.users.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center">
                  {t("admin.registrations.loading")}
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3" dir="ltr">
                    {u.email}
                  </td>
                  <td className="px-4 py-3">
                    {t(`roles.${u.role}`)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${u.isActive ? "bg-green-100 text-green-900" : "bg-red-100 text-red-900"}`}
                    >
                      {u.isActive ? t("admin.users.active") : t("admin.users.inactive")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => toggleActive(u)}
                        className="rounded border border-border px-2 py-1 text-xs hover:bg-[#f5f0e8]"
                      >
                        {u.isActive ? t("admin.users.disable") : t("admin.users.enable")}
                      </button>
                      <button
                        onClick={() => resetPassword(u.id)}
                        className="rounded border border-border px-2 py-1 text-xs hover:bg-[#f5f0e8]"
                      >
                        {t("admin.users.resetPassword")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
