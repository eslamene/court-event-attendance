"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowsClockwise,
  FloppyDisk,
  Globe,
  MagnifyingGlass,
  Plus,
} from "@phosphor-icons/react";
import { Modal } from "@/components/ui/Modal";
import {
  CancelFormButton,
  PrimaryFormButton,
} from "@/components/ui/FormActions";
import { useI18n } from "@/components/I18nProvider";
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
  entries: EntryRow[];
};

export function DictionaryPanel() {
  const { t } = useI18n();
  const [locales, setLocales] = useState<LocaleRow[]>([]);
  const [selectedCode, setSelectedCode] = useState("ar");
  const [search, setSearch] = useState("");
  const [namespace, setNamespace] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddLocale, setShowAddLocale] = useState(false);
  const [showAddKey, setShowAddKey] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/dictionary");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error");
      setLoading(false);
      return;
    }
    setLocales(data);
    if (!data.find((l: LocaleRow) => l.code === selectedCode) && data[0]) {
      setSelectedCode(data[0].code);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const selected = locales.find((l) => l.code === selectedCode);

  const namespaces = useMemo(() => {
    if (!selected) return [];
    const set = new Set(selected.entries.map((e) => e.namespace));
    return Array.from(set).sort();
  }, [selected]);

  const filteredEntries = useMemo(() => {
    if (!selected) return [];
    return selected.entries.filter((e) => {
      if (namespace && e.namespace !== namespace) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        e.key.toLowerCase().includes(q) || e.value.toLowerCase().includes(q)
      );
    });
  }, [selected, namespace, search]);

  const dirtyCount = useMemo(() => {
    if (!selected) return 0;
    return Object.entries(edits).filter(([key, value]) => {
      const orig = selected.entries.find((e) => e.key === key);
      return orig && orig.value !== value;
    }).length;
  }, [edits, selected]);

  async function onSave() {
    const changed = Object.entries(edits).filter(([key, value]) => {
      const orig = selected?.entries.find((e) => e.key === key);
      return orig && orig.value !== value;
    });
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
    setMessage(t("admin.dictionary.saved"));
    load();
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
    load();
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
    load();
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
    load();
  }

  function getValue(key: string, original: string) {
    return edits[key] ?? original;
  }

  function isDirty(key: string, original: string) {
    return key in edits && edits[key] !== original;
  }

  if (loading) {
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
                <span className="text-bronze">({filteredEntries.length})</span>
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
            <label className="flex items-center gap-2 text-sm">
              <Globe size={18} className="text-bronze" aria-hidden />
              <select
                value={selectedCode}
                onChange={(e) => {
                  setSelectedCode(e.target.value);
                  setEdits({});
                  setNamespace("");
                }}
                className="rounded-lg border border-border bg-card px-3 py-1.5"
              >
                {locales.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name} ({l.code})
                  </option>
                ))}
              </select>
            </label>
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

          <div className="mt-3 flex flex-wrap gap-2">
            <div className="relative min-w-[200px] flex-1">
              <MagnifyingGlass
                size={18}
                className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-bronze"
                aria-hidden
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("admin.dictionary.search")}
                className="w-full rounded-lg border border-border py-2 ps-3 pe-10 text-sm"
              />
            </div>
            <select
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
              className="min-w-[160px] rounded-lg border border-border px-3 py-2 text-sm"
            >
              <option value="">
                {t("admin.dictionary.namespace")} — {t("admin.common.viewAll")}
              </option>
              {namespaces.map((ns) => (
                <option key={ns} value={ns}>
                  {ns}
                </option>
              ))}
            </select>
          </div>

          {namespaces.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setNamespace("")}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium transition",
                  !namespace
                    ? "bg-gold-dark text-white"
                    : "bg-[#f5f0e8] text-bronze hover:bg-gold-dark/10"
                )}
              >
                {t("admin.common.viewAll")}
              </button>
              {namespaces.map((ns) => (
                <button
                  key={ns}
                  type="button"
                  onClick={() => setNamespace(ns)}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium transition",
                    namespace === ns
                      ? "bg-gold-dark text-white"
                      : "bg-[#f5f0e8] text-bronze hover:bg-gold-dark/10"
                  )}
                >
                  {ns}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="h-full overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-[#f5f0e8] text-right text-gold-dark shadow-sm">
              <tr>
                <th className="w-[28%] px-3 py-3 font-mono font-semibold" dir="ltr">
                  {t("admin.dictionary.key")}
                </th>
                <th className="w-[14%] px-3 py-3 font-semibold">
                  {t("admin.dictionary.namespace")}
                </th>
                <th className="px-3 py-3 font-semibold">
                  {t("admin.dictionary.value")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-16 text-center text-bronze">
                    —
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className={cn(
                      "border-b border-border/60 align-top hover:bg-[#faf8f5]",
                      isDirty(entry.key, entry.value) && "bg-amber-50/60"
                    )}
                  >
                    <td
                      className="px-3 py-2 font-mono text-xs text-bronze"
                      dir="ltr"
                    >
                      {entry.key}
                    </td>
                    <td className="px-3 py-2 text-bronze">{entry.namespace}</td>
                    <td className="px-3 py-2">
                      <textarea
                        value={getValue(entry.key, entry.value)}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [entry.key]: e.target.value,
                          }))
                        }
                        rows={entry.value.length > 120 ? 4 : 2}
                        className="w-full min-w-[200px] resize-y rounded border border-border px-2 py-1.5 text-sm leading-relaxed focus:border-gold-dark/50 focus:outline-none focus:ring-1 focus:ring-gold-dark/30"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
