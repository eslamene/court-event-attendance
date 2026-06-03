"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowCounterClockwise, FloppyDisk } from "@phosphor-icons/react";
import { useI18n } from "@/components/I18nProvider";
import { useFeedback } from "@/components/ui/FeedbackProvider";
import { Modal } from "@/components/ui/Modal";
import {
  CancelFormButton,
  PrimaryFormButton,
} from "@/components/ui/FormActions";

type Placeholder = { key: string; descriptionKey: string };

type Props = {
  mode: "default" | "event";
  eventId?: string;
  eventName?: string;
  embedded?: boolean;
  onClose?: () => void;
};

export function EmailTemplateEditor({
  mode,
  eventId,
  eventName,
  embedded = false,
  onClose,
}: Props) {
  const { t } = useI18n();
  const { toastSuccess, toastError, confirm } = useFeedback();
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [hasOverride, setHasOverride] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const url =
      mode === "default"
        ? "/api/admin/email-template"
        : `/api/admin/events/${eventId}/email-template`;
    const res = await fetch(url);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toastError(data.error || t("admin.emailTemplate.loadFailed"));
      return;
    }
    setSubject(data.subject ?? "");
    setHtmlBody(data.htmlBody ?? "");
    setPlaceholders(data.placeholders ?? []);
    setHasOverride(Boolean(data.hasOverride));
  }, [mode, eventId, t, toastError]);

  useEffect(() => {
    load();
  }, [load]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url =
      mode === "default"
        ? "/api/admin/email-template"
        : `/api/admin/events/${eventId}/email-template`;
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, htmlBody }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      toastError(data.error || t("admin.emailTemplate.saveFailed"));
      return;
    }
    setHasOverride(mode === "event" ? true : hasOverride);
    toastSuccess(data.message ?? t("admin.emailTemplate.saved"));
  }

  async function onResetDefault() {
    const ok = await confirm({
      title: t("admin.emailTemplate.resetTitle"),
      message: t("admin.emailTemplate.resetConfirm"),
      destructive: true,
      confirmLabel: t("admin.emailTemplate.resetAction"),
    });
    if (!ok) return;

    const res = await fetch("/api/admin/email-template/reset", {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) {
      toastError(data.error || t("admin.emailTemplate.saveFailed"));
      return;
    }
    setSubject(data.subject);
    setHtmlBody(data.htmlBody);
    toastSuccess(data.message ?? t("admin.emailTemplate.resetDone"));
    if (mode === "event") await load();
  }

  async function onClearOverride() {
    if (!eventId) return;
    const ok = await confirm({
      title: t("admin.emailTemplate.clearTitle"),
      message: t("admin.emailTemplate.clearConfirm"),
      confirmLabel: t("admin.emailTemplate.clearAction"),
    });
    if (!ok) return;

    const res = await fetch(`/api/admin/events/${eventId}/email-template`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      toastError(data.error || t("admin.emailTemplate.saveFailed"));
      return;
    }
    toastSuccess(data.message ?? t("admin.emailTemplate.cleared"));
    await load();
  }

  const form = (
    <form onSubmit={onSave} className="space-y-4">
      {mode === "event" && (
        <p className="text-sm text-bronze">
          {hasOverride
            ? t("admin.emailTemplate.eventOverrideActive")
            : t("admin.emailTemplate.eventUsingDefault")}
          {eventName ? ` — ${eventName}` : ""}
        </p>
      )}

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-gold-dark">
          {t("admin.emailTemplate.subject")}
        </span>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          dir="rtl"
          className="w-full rounded-lg border border-border bg-card px-4 py-2.5"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-gold-dark">
          {t("admin.emailTemplate.htmlBody")}
        </span>
        <textarea
          value={htmlBody}
          onChange={(e) => setHtmlBody(e.target.value)}
          required
          rows={14}
          dir="ltr"
          className="w-full rounded-lg border border-border bg-card px-4 py-2.5 font-mono text-sm"
          spellCheck={false}
        />
      </label>

      <div className="rounded-lg bg-[#f5f0e8] px-4 py-3 text-xs text-bronze">
        <p className="mb-2 font-medium text-gold-dark">
          {t("admin.emailTemplate.placeholders")}
        </p>
        <ul className="grid gap-1 sm:grid-cols-2">
          {placeholders.map((ph) => (
            <li key={ph.key}>
              <code className="text-gold-dark">{`{{${ph.key}}}`}</code>
              {" — "}
              {t(ph.descriptionKey)}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        <PrimaryFormButton icon={FloppyDisk} disabled={saving || loading}>
          {saving ? t("admin.emailTemplate.saving") : t("admin.emailTemplate.save")}
        </PrimaryFormButton>
        {mode === "default" && (
          <button
            type="button"
            onClick={onResetDefault}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm hover:bg-[#f5f0e8]"
          >
            <ArrowCounterClockwise size={18} aria-hidden />
            {t("admin.emailTemplate.resetAction")}
          </button>
        )}
        {mode === "event" && hasOverride && (
          <button
            type="button"
            onClick={onClearOverride}
            className="inline-flex items-center gap-1.5 rounded-xl border border-error/40 px-4 py-2.5 text-sm text-error hover:bg-red-50"
          >
            {t("admin.emailTemplate.clearAction")}
          </button>
        )}
        {onClose && <CancelFormButton type="button" onClick={onClose} />}
      </div>
    </form>
  );

  if (loading) {
    const loadingEl = (
      <p className="py-8 text-center text-bronze">{t("admin.emailTemplate.loading")}</p>
    );
    if (embedded) return loadingEl;
    if (onClose) {
      return (
        <Modal title={t("admin.emailTemplate.title")} onClose={onClose}>
          {loadingEl}
        </Modal>
      );
    }
    return loadingEl;
  }

  if (embedded) {
    return (
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 font-bold text-gold-dark">
          {t("admin.emailTemplate.title")}
        </h2>
        <p className="mb-4 text-sm text-bronze">{t("admin.emailTemplate.intro")}</p>
        {form}
      </section>
    );
  }

  if (onClose) {
    return (
      <Modal
        title={
          mode === "event"
            ? t("admin.emailTemplate.eventTitle", { name: eventName ?? "" })
            : t("admin.emailTemplate.title")
        }
        onClose={onClose}
        size="lg"
      >
        {form}
      </Modal>
    );
  }

  return form;
}
