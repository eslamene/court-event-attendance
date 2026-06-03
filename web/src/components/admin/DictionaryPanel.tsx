"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowsClockwise,
  Copy,
  FloppyDisk,
  Globe,
  Plus,
  X,
} from "@phosphor-icons/react";
import { DictionaryValueCell } from "@/components/admin/DictionaryValueCell";
import {
  AdminDataTable,
  type AdminTableColumn,
} from "@/components/admin/AdminDataTable";
import { Modal } from "@/components/ui/Modal";
import {
  CancelFormButton,
  PrimaryFormButton,
} from "@/components/ui/FormActions";
import { useI18n } from "@/components/I18nProvider";
import { useAdminTable } from "@/hooks/useAdminTable";
import { cn } from "@/lib/utils";

type EntryRow = {
  id: string;
  key: string;
  value: string;
  namespace: string;
};

type LocaleRow = {
  id: string;
  code: string;
  name: string;
  direction: string;
  isDefault: boolean;
  isActive: boolean;
  entryCount: number;
};

export function DictionaryPanel() {
  const { t } = useI18n();
  const [locales, setLocales] = useState<LocaleRow[]>([]);
  const [selectedCode, setSelectedCode] = useState("ar");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [localesLoading, setLocalesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddLocale, setShowAddLocale] = useState(false);
  const [showAddKey, setShowAddKey] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingSnapshot, setEditingSnapshot] = useState<string | null>(null);

  const table = useAdminTable<EntryRow>({
    fetchUrl: "/api/admin/dictionary",
    defaultSort: "key",
    defaultOrder: "asc",
    extraParams: { localeCode: selectedCode },
  });

  const columns = useMemo(
    (): AdminTableColumn[] => [
      {
        id: "key",
        label: t("admin.dictionary.key"),
        sortable: true,
        filterable: true,
        align: "left",
        className: "w-[28%] font-mono",
      },
      {
        id: "namespace",
        label: t("admin.dictionary.namespace"),
        sortable: true,
        filterable: true,
        className: "w-[14%]",
      },
      {
        id: "value",
        label: t("admin.dictionary.value"),
        sortable: true,
        filterable: true,
      },
    ],
    [t]
  );

  async function loadLocales() {
    setLocalesLoading(true);
    const res = await fetch("/api/admin/dictionary");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error");
      setLocalesLoading(false);
      return;
    }
    setLocales(data);
    if (!data.find((l: LocaleRow) => l.code === selectedCode) && data[0]) {
      setSelectedCode(data[0].code);
    }
    setLocalesLoading(false);
  }

  useEffect(() => {
    loadLocales();
  }, []);

  const dirtyCount = Object.keys(edits).length;

  async function onSave() {
    const changed = Object.entries(edits);
    if (!changed.length) {
      setMessage(t("admin.dictionary.saved"));
      return;
    }

    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/dictionary", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        localeCode: selectedCode,
        entries: changed.map(([key, value]) => ({ key, value })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Error");
      return;
    }
    setEdits({});
    setEditingKey(null);
    setEditingSnapshot(null);
    setMessage(t("admin.dictionary.saved"));
    await table.reload();
    await loadLocales();
  }

  async function onSeed() {
    setError("");
    const res = await fetch("/api/admin/dictionary/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ localeCode: selectedCode }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Error");
      return;
    }
    setMessage(t("admin.dictionary.seeded"));
    await table.reload();
    await loadLocales();
  }

  async function onAddLocale(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/dictionary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: form.get("code"),
        name: form.get("name"),
        direction: form.get("direction"),
        cloneFrom: form.get("cloneFrom") || selectedCode,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Error");
      return;
    }
    setShowAddLocale(false);
    setError("");
    await loadLocales();
  }

  async function onAddKey(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newKey.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/dictionary", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        localeCode: selectedCode,
        entries: [{ key: newKey.trim(), value: newValue }],
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Error");
      return;
    }
    setNewKey("");
    setNewValue("");
    setShowAddKey(false);
    setError("");
    await table.reload();
    await loadLocales();
  }

  function getValue(key: string, original: string) {
    return edits[key] ?? original;
  }

  function isDirty(key: string, original: string) {
    return key in edits && edits[key] !== original;
  }

  function discardEdits() {
    setEdits({});
    setEditingKey(null);
    setEditingSnapshot(null);
    setMessage("");
  }

  function startEditing(entryKey: string, currentValue: string) {
    setEditingKey(entryKey);
    setEditingSnapshot(currentValue);
  }

  function stopEditing() {
    setEditingKey(null);
    setEditingSnapshot(null);
  }

  function cancelEditing(entryKey: string, original: string) {
    if (editingSnapshot === null) {
      stopEditing();
      return;
    }
    setEdits((prev) => {
      const next = { ...prev };
      if (editingSnapshot === original) {
        delete next[entryKey];
      } else {
        next[entryKey] = editingSnapshot;
      }
      return next;
    });
    stopEditing();
  }

  async function copyKey(key: string) {
    try {
      await navigator.clipboard.writeText(key);
      setMessage(t("admin.dictionary.keyCopied"));
    } catch {
      setError(t("register.errorNetwork"));
    }
  }

  if (localesLoading) {
    return (
      <p className="rounded-xl border border-border bg-card px-6 py-12 text-center text-bronze">
        {t("admin.registrations.loading")}
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="shrink-0 space-y-3">
        {message && (
          <p className="rounded-lg bg-green-50 px-4 py-2 text-sm text-success">
            {message}
          </p>
        )}
        {error && !showAddLocale && !showAddKey && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-error">
            {error}
          </p>
        )}

        <div className="rounded-xl border border-border bg-card p-3 shadow-sm md:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f5f0e8] px-3 py-1 text-sm font-medium text-gold-dark">
                {t("admin.dictionary.entries")}
                <span className="text-bronze">({table.total})</span>
              </span>
              {dirtyCount > 0 && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-950">
                  {dirtyCount} {t("admin.dictionary.unsaved")}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setError("");
                setShowAddKey(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gold-dark px-4 py-2 text-sm font-semibold text-white hover:bg-bronze"
            >
              <Plus size={18} weight="bold" aria-hidden />
              {t("admin.dictionary.addKey")}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Globe size={18} className="text-bronze" aria-hidden />
              {locales.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => {
                    setSelectedCode(l.code);
                    setEdits({});
                    setEditingKey(null);
                    setEditingSnapshot(null);
                    table.setPage(1);
                    table.clearFilters();
                  }}
                  className={cn(
                    "rounded-full px-3 py-1 text-sm font-medium transition",
                    selectedCode === l.code
                      ? "bg-gold-dark text-white shadow-sm"
                      : "border border-border bg-card text-bronze hover:bg-[#f5f0e8]"
                  )}
                >
                  {l.name}
                  <span className="ms-1 opacity-70" dir="ltr">
                    ({l.code})
                  </span>
                  {l.isDefault && (
                    <span className="ms-1 text-[10px] uppercase opacity-80">
                      ★
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setError("");
                setShowAddLocale(true);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-gold-dark hover:bg-[#f5f0e8]"
            >
              <Plus size={14} weight="bold" aria-hidden />
              {t("admin.dictionary.addLocale")}
            </button>
            <button
              type="button"
              onClick={onSeed}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-bronze hover:bg-[#f5f0e8]"
            >
              <ArrowsClockwise size={14} aria-hidden />
              {t("admin.dictionary.seed")}
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving || dirtyCount === 0}
              className="inline-flex items-center gap-1 rounded-lg bg-gold-dark px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              <FloppyDisk size={16} aria-hidden />
              {saving ? "…" : t("admin.dictionary.save")}
            </button>
          </div>
        </div>
      </div>

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
        colSpan={columns.length}
      >
        {table.items.map((entry) => (
          <tr
            key={entry.id}
            className={cn(
              "border-b border-border/60 align-top transition-colors hover:bg-[#faf8f5]",
              isDirty(entry.key, entry.value) && "bg-amber-50/50",
              editingKey === entry.key && "bg-gold/5"
            )}
          >
            <td className="px-3 py-2" dir="ltr">
              <div className="flex items-start gap-1">
                <code className="min-w-0 flex-1 break-all font-mono text-xs leading-relaxed text-bronze">
                  {entry.key}
                </code>
                <button
                  type="button"
                  onClick={() => copyKey(entry.key)}
                  title={t("admin.dictionary.copyKey")}
                  className="shrink-0 rounded p-1 text-bronze opacity-60 transition hover:bg-white hover:opacity-100"
                >
                  <Copy size={14} aria-hidden />
                </button>
              </div>
            </td>
            <td className="px-3 py-2">
              <span className="inline-block rounded-full bg-[#f5f0e8] px-2 py-0.5 text-xs font-medium text-gold-dark">
                {entry.namespace}
              </span>
            </td>
            <td className="px-3 py-2">
              <DictionaryValueCell
                value={getValue(entry.key, entry.value)}
                isEditing={editingKey === entry.key}
                isDirty={isDirty(entry.key, entry.value)}
                emptyLabel={t("admin.dictionary.emptyValue")}
                clickToEditLabel={t("admin.dictionary.clickToEdit")}
                onStartEdit={() =>
                  startEditing(entry.key, getValue(entry.key, entry.value))
                }
                onEndEdit={stopEditing}
                onChange={(value) =>
                  setEdits((prev) => ({
                    ...prev,
                    [entry.key]: value,
                  }))
                }
                onCancel={() => cancelEditing(entry.key, entry.value)}
              />
            </td>
          </tr>
        ))}
      </AdminDataTable>

      {dirtyCount > 0 && (
        <div className="sticky bottom-0 z-20 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-lg">
          <p className="text-sm font-medium text-amber-950">
            {dirtyCount} {t("admin.dictionary.unsaved")}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={discardEdits}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-bronze hover:bg-[#f5f0e8]"
            >
              <X size={16} aria-hidden />
              {t("admin.dictionary.discard")}
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gold-dark px-4 py-1.5 text-sm font-semibold text-white hover:bg-bronze disabled:opacity-50"
            >
              <FloppyDisk size={16} aria-hidden />
              {saving ? "…" : t("admin.dictionary.save")}
            </button>
          </div>
        </div>
      )}

      {showAddLocale && (
        <Modal
          title={t("admin.dictionary.addLocale")}
          onClose={() => {
            setShowAddLocale(false);
            setError("");
          }}
        >
          <form onSubmit={onAddLocale} className="grid gap-3 sm:grid-cols-2">
            <input
              name="code"
              placeholder={t("admin.dictionary.code")}
              required
              className="rounded-lg border border-border px-3 py-2"
              dir="ltr"
            />
            <input
              name="name"
              placeholder={t("admin.dictionary.name")}
              required
              className="rounded-lg border border-border px-3 py-2"
            />
            <select
              name="direction"
              className="rounded-lg border border-border px-3 py-2"
            >
              <option value="rtl">RTL</option>
              <option value="ltr">LTR</option>
            </select>
            <select
              name="cloneFrom"
              className="rounded-lg border border-border px-3 py-2"
            >
              {locales.map((l) => (
                <option key={l.code} value={l.code}>
                  Clone from {l.name}
                </option>
              ))}
            </select>
            {error && (
              <p className="sm:col-span-2 text-sm text-error">{error}</p>
            )}
            <div className="flex gap-3 pt-2 sm:col-span-2">
              <PrimaryFormButton icon={Globe}>
                {t("admin.common.create")}
              </PrimaryFormButton>
              <CancelFormButton onClick={() => setShowAddLocale(false)}>
                {t("admin.common.cancel")}
              </CancelFormButton>
            </div>
          </form>
        </Modal>
      )}

      {showAddKey && (
        <Modal
          title={t("admin.dictionary.addKey")}
          onClose={() => {
            setShowAddKey(false);
            setError("");
          }}
        >
          <form onSubmit={onAddKey} className="space-y-3">
            <input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder={t("admin.dictionary.key")}
              required
              className="w-full rounded-lg border border-border px-3 py-2 font-mono text-sm"
              dir="ltr"
            />
            <textarea
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={t("admin.dictionary.value")}
              rows={3}
              className="w-full rounded-lg border border-border px-3 py-2"
            />
            {error && <p className="text-sm text-error">{error}</p>}
            <div className="flex gap-3 pt-2">
              <PrimaryFormButton icon={Plus}>
                {t("admin.common.create")}
              </PrimaryFormButton>
              <CancelFormButton onClick={() => setShowAddKey(false)}>
                {t("admin.common.cancel")}
              </CancelFormButton>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
