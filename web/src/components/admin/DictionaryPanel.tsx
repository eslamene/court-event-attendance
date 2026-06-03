"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
    load();
  }

  function getValue(key: string, original: string) {
    return edits[key] ?? original;
  }

  if (loading) {
    return <p className="text-bronze">…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-gold-dark">
          {t("admin.dictionary.locales")}
        </label>
        <select
          value={selectedCode}
          onChange={(e) => {
            setSelectedCode(e.target.value);
            setEdits({});
            setNamespace("");
          }}
          className="rounded-lg border border-border bg-card px-3 py-2"
        >
          {locales.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name} ({l.code}) — {l.entryCount}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowAddLocale((v) => !v)}
          className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-[#f5f0e8]"
        >
          {t("admin.dictionary.addLocale")}
        </button>
        <button
          type="button"
          onClick={onSeed}
          className="rounded-lg border border-gold px-3 py-2 text-sm text-gold-dark hover:bg-[#f5f0e8]"
        >
          {t("admin.dictionary.seed")}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-gold-dark px-4 py-2 text-sm text-white hover:bg-bronze disabled:opacity-60"
        >
          {saving ? "…" : t("admin.dictionary.save")}
        </button>
      </div>

      {showAddLocale && (
        <form
          onSubmit={onAddLocale}
          className="grid max-w-lg gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-2"
        >
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
          <select name="direction" className="rounded-lg border border-border px-3 py-2">
            <option value="rtl">RTL</option>
            <option value="ltr">LTR</option>
          </select>
          <select name="cloneFrom" className="rounded-lg border border-border px-3 py-2">
            {locales.map((l) => (
              <option key={l.code} value={l.code}>
                Clone from {l.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="md:col-span-2 rounded-lg bg-gold-dark py-2 text-white"
          >
            {t("admin.dictionary.addLocale")}
          </button>
        </form>
      )}

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("admin.dictionary.search")}
          className="min-w-[200px] flex-1 rounded-lg border border-border px-3 py-2"
        />
        <select
          value={namespace}
          onChange={(e) => setNamespace(e.target.value)}
          className="rounded-lg border border-border px-3 py-2"
        >
          <option value="">{t("admin.dictionary.namespace")} — All</option>
          {namespaces.map((ns) => (
            <option key={ns} value={ns}>
              {ns}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowAddKey((v) => !v)}
          className="rounded-lg border border-border px-3 py-2 text-sm"
        >
          {t("admin.dictionary.addKey")}
        </button>
      </div>

      {showAddKey && (
        <form
          onSubmit={onAddKey}
          className="space-y-2 rounded-xl border border-border bg-card p-4"
        >
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
            rows={2}
            className="w-full rounded-lg border border-border px-3 py-2"
          />
          <button type="submit" className="rounded-lg bg-gold-dark px-4 py-2 text-white text-sm">
            {t("admin.dictionary.addKey")}
          </button>
        </form>
      )}

      {message && <p className="text-sm text-success">{message}</p>}
      {error && <p className="text-sm text-error">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-[#f5f0e8] text-right">
              <th className="px-3 py-2 font-mono" dir="ltr">
                {t("admin.dictionary.key")}
              </th>
              <th className="px-3 py-2">{t("admin.dictionary.namespace")}</th>
              <th className="px-3 py-2">{t("admin.dictionary.value")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry) => (
              <tr key={entry.id} className="border-b border-border/60">
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
            ))}
          </tbody>
        </table>
        {!filteredEntries.length && (
          <p className="p-6 text-center text-bronze">—</p>
        )}
      </div>
    </div>
  );
}
