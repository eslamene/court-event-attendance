"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  ArrowCounterClockwise,
  ArrowDown,
  ArrowUp,
  Copy,
  FloppyDisk,
  ListBullets,
} from "@phosphor-icons/react";
import { useI18n } from "@/components/I18nProvider";
import { useFeedback } from "@/components/ui/FeedbackProvider";
import { Modal } from "@/components/ui/Modal";
import { TextField, TextAreaField } from "@/components/ui/Field";
import {
  CancelFormButton,
  PrimaryFormButton,
} from "@/components/ui/FormActions";
import type { RegistrationFormFieldConfig } from "@/lib/registration-form-config-shared";

type Props = {
  mode: "default" | "event";
  eventId?: string;
  eventName?: string;
  embedded?: boolean;
  onClose?: () => void;
};

export function RegistrationFormConfigEditor({
  mode,
  eventId,
  eventName,
  embedded = false,
  onClose,
}: Props) {
  const { t } = useI18n();
  const { toastSuccess, toastError, confirm } = useFeedback();
  const [fields, setFields] = useState<RegistrationFormFieldConfig[]>([]);
  const [defaultFields, setDefaultFields] = useState<RegistrationFormFieldConfig[]>(
    []
  );
  const [hasOverride, setHasOverride] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const url =
      mode === "default"
        ? "/api/admin/registration-form"
        : `/api/admin/events/${eventId}/registration-form`;
    const res = await fetch(url);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toastError(data.error || t("admin.registrationForm.loadFailed"));
      return;
    }
    setFields(data.fields ?? []);
    setDefaultFields(data.defaultFields ?? data.fields ?? []);
    setHasOverride(Boolean(data.hasOverride));
  }, [mode, eventId, t, toastError]);

  useEffect(() => {
    load();
  }, [load]);

  function updateField(
    index: number,
    patch: Partial<RegistrationFormFieldConfig>
  ) {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...patch } : f))
    );
  }

  function moveField(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= fields.length) return;
    setFields((prev) => {
      const copy = [...prev];
      const a = copy[index];
      const b = copy[next];
      copy[index] = { ...b, order: a.order };
      copy[next] = { ...a, order: b.order };
      return copy.sort((x, y) => x.order - y.order);
    });
  }

  function optionsToText(opts?: string[]) {
    return (opts ?? []).join("\n");
  }

  function textToOptions(text: string) {
    return text
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url =
      mode === "default"
        ? "/api/admin/registration-form"
        : `/api/admin/events/${eventId}/registration-form`;
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      toastError(data.error || t("admin.registrationForm.saveFailed"));
      return;
    }
    if (mode === "event") setHasOverride(true);
    toastSuccess(data.message || t("admin.registrationForm.saved"));
  }

  async function onResetDefault() {
    const ok = await confirm({
      title: t("admin.registrationForm.resetTitle"),
      message: t("admin.registrationForm.resetConfirm"),
      destructive: true,
      confirmLabel: t("admin.registrationForm.resetAction"),
    });
    if (!ok) return;
    const res = await fetch("/api/admin/registration-form/reset", {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) {
      toastError(data.error || t("admin.registrationForm.saveFailed"));
      return;
    }
    setFields(data.fields ?? []);
    toastSuccess(data.message || t("admin.registrationForm.resetDone"));
    if (mode === "event") await load();
  }

  function copyFromDefault() {
    setFields(defaultFields.map((f) => ({ ...f })));
    toastSuccess(t("admin.registrationForm.copiedFromDefault"));
  }

  async function onClearOverride() {
    if (!eventId) return;
    const ok = await confirm({
      title: t("admin.registrationForm.clearTitle"),
      message: t("admin.registrationForm.clearConfirm"),
      confirmLabel: t("admin.registrationForm.clearAction"),
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/events/${eventId}/registration-form`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      toastError(data.error || t("admin.registrationForm.saveFailed"));
      return;
    }
    toastSuccess(data.message || t("admin.registrationForm.cleared"));
    await load();
  }

  const form = (
    <form onSubmit={onSave} className="space-y-4">
      <p className="text-sm text-bronze">{t("admin.registrationForm.intro")}</p>

      {loading ? (
        <p className="py-8 text-center text-bronze">
          {t("admin.registrationForm.loading")}
        </p>
      ) : (
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div
              key={field.key}
              className="rounded-xl border border-border bg-[#faf8f5] p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs text-bronze" dir="ltr">
                  {field.key}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveField(index, -1)}
                    disabled={index === 0}
                    className="rounded p-1 hover:bg-card disabled:opacity-30"
                    aria-label={t("admin.registrationForm.moveUp")}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveField(index, 1)}
                    disabled={index === fields.length - 1}
                    className="rounded p-1 hover:bg-card disabled:opacity-30"
                    aria-label={t("admin.registrationForm.moveDown")}
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={field.enabled}
                    onChange={(e) =>
                      updateField(index, { enabled: e.target.checked })
                    }
                  />
                  {t("admin.registrationForm.enabled")}
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={field.required}
                    disabled={!field.enabled}
                    onChange={(e) =>
                      updateField(index, { required: e.target.checked })
                    }
                  />
                  {t("admin.registrationForm.required")}
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label={t("admin.registrationForm.labelAr")}
                  value={field.labelAr}
                  onChange={(e) =>
                    updateField(index, { labelAr: e.target.value })
                  }
                  required
                />
                <TextField
                  label={t("admin.registrationForm.labelEn")}
                  value={field.labelEn}
                  onChange={(e) =>
                    updateField(index, { labelEn: e.target.value })
                  }
                  dir="ltr"
                  className="text-left"
                  required
                />
              </div>

              {field.type === "select" && (
                <TextAreaField
                  label={t("admin.registrationForm.options")}
                  value={optionsToText(field.options)}
                  onChange={(e) =>
                    updateField(index, {
                      options: textToOptions(e.target.value),
                    })
                  }
                  rows={4}
                  placeholder={t("admin.registrationForm.optionsHint")}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <PrimaryFormButton icon={FloppyDisk} disabled={saving || loading}>
          {saving
            ? t("admin.registrationForm.saving")
            : t("admin.registrationForm.save")}
        </PrimaryFormButton>
        {mode === "event" && (
          <button
            type="button"
            onClick={copyFromDefault}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm hover:bg-[#f5f0e8]"
          >
            <Copy size={18} aria-hidden />
            {t("admin.registrationForm.copyFromDefault")}
          </button>
        )}
        {mode === "default" && (
          <button
            type="button"
            onClick={onResetDefault}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm hover:bg-[#f5f0e8]"
          >
            <ArrowCounterClockwise size={18} aria-hidden />
            {t("admin.registrationForm.resetAction")}
          </button>
        )}
        {mode === "event" && hasOverride && (
          <button
            type="button"
            onClick={onClearOverride}
            className="inline-flex items-center gap-1.5 rounded-xl border border-error/40 px-4 py-2.5 text-sm text-error hover:bg-red-50"
          >
            {t("admin.registrationForm.clearAction")}
          </button>
        )}
        {onClose && <CancelFormButton type="button" onClick={onClose} />}
      </div>
    </form>
  );

  if (embedded) {
    return (
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 inline-flex items-center gap-2 font-bold text-gold-dark">
          <ListBullets size={22} aria-hidden />
          {t("admin.registrationForm.title")}
        </h2>
        {form}
      </section>
    );
  }

  if (onClose) {
    return (
      <Modal
        title={t("admin.registrationForm.eventTitle", {
          name: eventName ?? "",
        })}
        onClose={onClose}
        size="xl"
      >
        {form}
      </Modal>
    );
  }

  return form;
}
