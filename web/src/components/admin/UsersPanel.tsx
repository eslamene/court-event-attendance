"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Key, Plus, UserMinus, UserPlus } from "@phosphor-icons/react";
import { TextField, SelectField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { VisualStatusBadge } from "@/components/admin/VisualStatusBadge";
import { ActionButton } from "@/components/ui/ActionButton";
import {
  CancelFormButton,
  PrimaryFormButton,
} from "@/components/ui/FormActions";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import { useI18n } from "@/components/I18nProvider";
import { useFeedback } from "@/components/ui/FeedbackProvider";
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
  const { toastSuccess, toastError, prompt } = useFeedback();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

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
  }, [t]);

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
    setCreating(false);
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
    const password = await prompt({
      title: t("admin.users.resetPasswordTitle"),
      label: t("admin.users.passwordPrompt"),
      type: "password",
      minLength: 8,
      invalidMessage: t("validation.passwordMin"),
    });
    if (!password) return;
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) toastSuccess(t("admin.users.passwordUpdated"));
    else {
      const data = await res.json();
      toastError(data.error || t("admin.users.updateFailed"));
    }
  }

  return (
    <div className="space-y-4">
      {error && !creating && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-error">{error}</p>
      )}

      <AdminListToolbar
        count={users.length}
        countLabel={t("admin.common.viewAll")}
        actionLabel={t("admin.users.create")}
        onAction={() => {
          setError("");
          setCreating(true);
        }}
      />

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-[#f5f0e8] text-gold-dark">
            <tr>
              <th className="px-4 py-3 text-right">{t("admin.users.name")}</th>
              <th className="px-4 py-3 text-right">{t("admin.users.colEmail")}</th>
              <th className="px-4 py-3 text-right">{t("admin.users.role")}</th>
              <th className="px-4 py-3 text-right">
                {t("admin.registrations.colStatus")}
              </th>
              <th className="px-4 py-3 text-right">{t("admin.users.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-bronze">
                  {t("admin.registrations.loading")}
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <p className="text-bronze">{t("admin.users.empty")}</p>
                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-gold-dark underline"
                  >
                    <Plus size={16} weight="bold" aria-hidden />
                    {t("admin.users.create")}
                  </button>
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  className="border-t border-border transition hover:bg-[#faf8f5]"
                >
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3" dir="ltr">
                    {u.email}
                  </td>
                  <td className="px-4 py-3">{t(`roles.${u.role}`)}</td>
                  <td className="px-4 py-3">
                    <VisualStatusBadge kind="user" active={u.isActive} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <ActionButton
                        icon={u.isActive ? UserMinus : UserPlus}
                        onClick={() => toggleActive(u)}
                      >
                        {u.isActive
                          ? t("admin.users.disable")
                          : t("admin.users.enable")}
                      </ActionButton>
                      <ActionButton
                        icon={Key}
                        onClick={() => resetPassword(u.id)}
                      >
                        {t("admin.users.resetPassword")}
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <Modal
          title={t("admin.users.addTitle")}
          onClose={() => {
            setCreating(false);
            setError("");
          }}
        >
          <form onSubmit={onCreate} className="space-y-4">
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
            <SelectField
              name="role"
              label={t("admin.users.role")}
              required
              defaultValue="APPROVAL_MANAGER"
            >
              {USER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`roles.${r}`)}
                </option>
              ))}
            </SelectField>
            {error && <p className="text-sm text-error">{error}</p>}
            <div className="flex gap-3 pt-2">
              <PrimaryFormButton icon={UserPlus}>
                {t("admin.common.create")}
              </PrimaryFormButton>
              <CancelFormButton
                onClick={() => {
                  setCreating(false);
                  setError("");
                }}
              >
                {t("admin.common.cancel")}
              </CancelFormButton>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
