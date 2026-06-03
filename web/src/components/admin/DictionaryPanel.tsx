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
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import { useI18n } from "@/components/I18nProvider";

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

  if (loading) {
    return (
      <p className="rounded-xl border border-border bg-card px-6 py-12 text-center text-bronze">
        {t("admin.registrations.loading")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-success">
          {message}
        </p>
      )}
      {error && !showAddLocale && !showAddKey && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-error">{error}</p>
      )}

      <AdminListToolbar
        count={filteredEntries.length}
        countLabel={t("admin.dictionary.entries")}
        actionLabel={t("admin.dictionary.addKey")}
        onAction={() => {
          setError("");
          setShowAddKey(true);
        }}
      >
        <label className="flex items-center gap-2 text-sm">
          <Globe size={18} className="text-bronze" aria-hidden />
          <span className="text-gold-dark">{t("admin.dictionary.locales")}:</span>
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
          className="inline-flex items-center gap-1 text-sm text-gold-dark underline hover:text-bronze"
        >
          <Plus size={14} weight="bold" aria-hidden />
          {t("admin.dictionary.addLocale")}
        </button>
        <button
          type="button"
          onClick={onSeed}
          className="inline-flex items-center gap-1 text-sm text-bronze underline hover:text-gold-dark"
        >
          <ArrowsClockwise size={14} aria-hidden />
          {t("admin.dictionary.seed")}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-1 rounded-lg bg-gold-dark px-3 py-1.5 text-sm text-white disabled:opacity-60"
        >
          <FloppyDisk size={16} aria-hidden />
          {saving ? "…" : t("admin.dictionary.save")}
        </button>
      </AdminListToolbar>

      <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-card p-4">
        <div className="relative min-w-[200px] flex-1">
          <MagnifyingGlass
            size={18}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-bronze"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.dictionary.search")}
            className="w-full rounded-lg border border-border py-2 pl-3 pr-10 text-sm"
          />
        </div>
        <select
          value={namespace}
          onChange={(e) => setNamespace(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-sm"
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

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-[#f5f0e8] text-right text-gold-dark">
              <th className="px-3 py-3 font-mono" dir="ltr">
                {t("admin.dictionary.key")}
              </th>
              <th className="px-3 py-3">{t("admin.dictionary.namespace")}</th>
              <th className="px-3 py-3">{t("admin.dictionary.value")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center text-bronze">
                  —
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-border/60 hover:bg-[#faf8f5]"
                >
                  <td className="px-3 py-2 font-mono text-xs text-bronze" dir="ltr">
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
                      rows={entry.value.length > 80 ? 3 : 1}
                      className="w-full min-w-[240px] rounded border border-border px-2 py-1"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
