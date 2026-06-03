"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Copy,
  Globe,
  Languages,
  Plus,
  RefreshCw,
  Save,
  X,
} from "lucide-react";
import { DictionaryValueCell } from "@/components/admin/DictionaryValueCell";
import {
  AdminDataTable,
  type AdminTableColumn,
} from "@/components/admin/AdminDataTable";
import { Modal } from "@/components/ui/Modal";
import { SelectField } from "@/components/ui/Field";
import { Chip } from "@/components/ui/chip";
import { Tag } from "@/components/ui/tag";
import { Button } from "@/components/ui/button";
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
              <Tag
                icon={Languages}
                className="h-7 gap-1.5 border-gold/20 bg-[#f5f0e8] px-3 text-sm text-gold-dark"
              >
                {t("admin.dictionary.entries")}
                <span className="font-normal text-bronze">({table.total})</span>
              </Tag>
              {dirtyCount > 0 && (
                <Tag className="border-amber-200/80 bg-amber-50 text-amber-950">
                  {dirtyCount} {t("admin.dictionary.unsaved")}
                </Tag>
              )}
            </div>
            <Button
              type="button"
              variant="brand"
              size="sm"
              onClick={() => {
                setError("");
                setShowAddKey(true);
              }}
            >
              <Plus className="size-4" aria-hidden />
              {t("admin.dictionary.addKey")}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {locales.map((l) => (
                <Chip
                  key={l.code}
                  icon={Globe}
                  selected={selectedCode === l.code}
                  onClick={() => {
                    setSelectedCode(l.code);
                    setEdits({});
                    setEditingKey(null);
                    setEditingSnapshot(null);
                    table.setPage(1);
                    table.clearFilters();
                  }}
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
                </Chip>
              ))}
            </div>
            <Button
              type="button"
              variant="brandOutline"
              size="sm"
              onClick={() => {
                setError("");
                setShowAddLocale(true);
              }}
            >
              <Plus className="size-3.5" aria-hidden />
              {t("admin.dictionary.addLocale")}
            </Button>
            <Button
              type="button"
              variant="brandOutline"
              size="sm"
              onClick={onSeed}
            >
              <RefreshCw className="size-3.5" aria-hidden />
              {t("admin.dictionary.seed")}
            </Button>
            <Button
              type="button"
              variant="brand"
              size="sm"
              onClick={onSave}
              disabled={saving || dirtyCount === 0}
            >
              <Save className="size-4" aria-hidden />
              {saving ? "…" : t("admin.dictionary.save")}
            </Button>
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
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => copyKey(entry.key)}
                  title={t("admin.dictionary.copyKey")}
                  className="shrink-0 text-bronze"
                >
                  <Copy className="size-3.5" aria-hidden />
                </Button>
              </div>
            </td>
            <td className="px-3 py-2">
              <Tag className="border-gold/20 bg-[#f5f0e8] text-gold-dark">
                {entry.namespace}
              </Tag>
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
            <Button
              type="button"
              variant="brandOutline"
              size="sm"
              onClick={discardEdits}
            >
              <X className="size-4" aria-hidden />
              {t("admin.dictionary.discard")}
            </Button>
            <Button
              type="button"
              variant="brand"
              size="sm"
              onClick={onSave}
              disabled={saving}
            >
              <Save className="size-4" aria-hidden />
              {saving ? "…" : t("admin.dictionary.save")}
            </Button>
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
            <SelectField
              name="direction"
              fieldKey="direction"
              label={t("admin.dictionary.direction")}
              defaultValue="rtl"
              options={[
                { value: "rtl", label: "RTL" },
                { value: "ltr", label: "LTR" },
              ]}
            />
            <SelectField
              name="cloneFrom"
              fieldKey="cloneFrom"
              label={t("admin.dictionary.cloneFrom")}
              options={locales.map((l) => ({
                value: l.code,
                label: `${t("admin.dictionary.cloneFrom")} ${l.name}`,
              }))}
            />
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
