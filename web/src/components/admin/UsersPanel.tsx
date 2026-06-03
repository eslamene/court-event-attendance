"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, Plus, UserMinus, UserPlus } from "lucide-react";
import { TextField, SelectField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { VisualStatusBadge } from "@/components/admin/VisualStatusBadge";
import { ActionButton } from "@/components/ui/ActionButton";
import {
  CancelFormButton,
  PrimaryFormButton,
} from "@/components/ui/FormActions";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import {
  AdminDataTable,
  type AdminTableColumn,
} from "@/components/admin/AdminDataTable";
import { useI18n } from "@/components/I18nProvider";
import { useFeedback } from "@/components/ui/FeedbackProvider";
import { useAdminTable } from "@/hooks/useAdminTable";
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
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const table = useAdminTable<UserRow>({
    fetchUrl: "/api/admin/users",
    defaultSort: "createdAt",
    defaultOrder: "desc",
  });

  const columns = useMemo(
    (): AdminTableColumn[] => [
      {
        id: "name",
        label: t("admin.users.name"),
        sortable: true,
        filterable: true,
      },
      {
        id: "email",
        label: t("admin.users.colEmail"),
        sortable: true,
        filterable: true,
        align: "left",
      },
      {
        id: "role",
        label: t("admin.users.role"),
        sortable: true,
        filterable: true,
        filterType: "select",
        filterOptions: USER_ROLES.map((r) => ({
          value: r,
          label: t(`roles.${r}`),
        })),
      },
      {
        id: "isActive",
        label: t("admin.registrations.colStatus"),
        sortable: true,
        filterable: true,
        filterType: "select",
        filterOptions: [
          { value: "true", label: t("admin.users.enable") },
          { value: "false", label: t("admin.users.disable") },
        ],
      },
      {
        id: "actions",
        label: t("admin.users.colActions"),
      },
    ],
    [t]
  );

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
    table.reload();
  }

  async function toggleActive(user: UserRow) {
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    table.reload();
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
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {error && !creating && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-error">{error}</p>
      )}

      <AdminListToolbar
        count={table.total}
        countLabel={t("admin.common.viewAll")}
        actionLabel={t("admin.users.create")}
        onAction={() => {
          setError("");
          setCreating(true);
        }}
      />

      <AdminDataTable
        columns={columns}
        sort={table.sort}
        order={table.order}
        columnFilters={table.columnFilters}
        onSort={table.toggleSort}
        onFilterChange={table.setColumnFilter}
        onClearFilters={table.clearFilters}
        page={table.page}
        pageSize={table.pageSize}
        total={table.total}
        totalPages={table.totalPages}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        loading={table.loading}
        emptyMessage={t("admin.users.empty")}
        colSpan={columns.length}
      >
        {table.items.map((u) => (
          <tr
            key={u.id}
            className="border-t border-border transition hover:bg-[#faf8f5]"
          >
            <td className="px-4 py-3 font-medium">{u.name}</td>
            <td className="px-4 py-3 text-left" dir="ltr">
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
                  icon={KeyRound}
                  onClick={() => resetPassword(u.id)}
                >
                  {t("admin.users.resetPassword")}
                </ActionButton>
              </div>
            </td>
          </tr>
        ))}
      </AdminDataTable>

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
