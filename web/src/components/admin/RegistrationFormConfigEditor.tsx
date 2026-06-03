"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  ArrowCounterClockwise,
  ArrowDown,
  ArrowUp,
  Copy,
  FloppyDisk,
  ListBullets,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import { useI18n } from "@/components/I18nProvider";
import { useFeedback } from "@/components/ui/FeedbackProvider";
import { Modal } from "@/components/ui/Modal";
import { TextField, TextAreaField, SelectField } from "@/components/ui/Field";
import {
  CancelFormButton,
  PrimaryFormButton,
} from "@/components/ui/FormActions";
import {
  REGISTRATION_FIELD_TYPES,
  createCustomFieldKey,
  getBuiltinRegistrationFormConfig,
  isBuiltinFieldKey,
  type RegistrationFieldType,
  type RegistrationFormFieldConfig,
} from "@/lib/registration-form-config-shared";

type Props = {
  mode: "default" | "event";
  eventId?: string;
  eventName?: string;
  embedded?: boolean;
  onClose?: () => void;
};

const FIELD_TYPE_LABEL_KEYS: Record<RegistrationFieldType, string> = {
  text: "admin.registrationForm.typeText",
  email: "admin.registrationForm.typeEmail",
  tel: "admin.registrationForm.typeTel",
  select: "admin.registrationForm.typeSelect",
  textarea: "admin.registrationForm.typeTextarea",
  number: "admin.registrationForm.typeNumber",
  date: "admin.registrationForm.typeDate",
  url: "admin.registrationForm.typeUrl",
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
      prev.map((f, i) => {
        if (i !== index) return f;
        const next = { ...f, ...patch };
        if (patch.type && patch.type !== "select") {
          next.options = undefined;
        }
        if (patch.type === "select" && !next.options?.length) {
          next.options = [];
        }
        return next;
      })
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

  function addField() {
    const maxOrder = fields.reduce((m, f) => Math.max(m, f.order), 0);
    setFields((prev) => [
      ...prev,
      {
        key: createCustomFieldKey(),
        enabled: true,
        required: false,
        labelAr: t("admin.registrationForm.newFieldLabelAr"),
        labelEn: t("admin.registrationForm.newFieldLabelEn"),
        type: "text",
        order: maxOrder + 1,
      },
    ]);
  }

  async function removeField(index: number) {
    if (fields.length <= 1) {
      toastError(t("admin.registrationForm.minOneField"));
      return;
    }
    const field = fields[index];
    const ok = await confirm({
      title: t("admin.registrationForm.removeTitle"),
      message: t("admin.registrationForm.removeConfirm", {
        label: field.labelAr,
      }),
      destructive: true,
      confirmLabel: t("admin.registrationForm.removeAction"),
    });
    if (!ok) return;
    setFields((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((f, i) => ({ ...f, order: i + 1 }))
    );
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

  function restoreBuiltinFields() {
    const builtin = getBuiltinRegistrationFormConfig().fields;
    const custom = fields.filter((f) => !isBuiltinFieldKey(f.key));
    const merged = [...builtin, ...custom].map((f, i) => ({ ...f, order: i + 1 }));
    setFields(merged);
    toastSuccess(t("admin.registrationForm.builtinRestored"));
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
    if (data.fields) setFields(data.fields);
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
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-bronze" dir="ltr">
                    {field.key}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                      isBuiltinFieldKey(field.key)
                        ? "bg-gold/15 text-gold-dark"
                        : "bg-sky-100 text-sky-800"
                    }`}
                  >
                    {isBuiltinFieldKey(field.key)
                      ? t("admin.registrationForm.builtinBadge")
                      : t("admin.registrationForm.customBadge")}
                  </span>
                </div>
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
                  <button
                    type="button"
                    onClick={() => removeField(index)}
                    disabled={fields.length <= 1}
                    className="rounded p-1 text-error hover:bg-red-50 disabled:opacity-30"
                    aria-label={t("admin.registrationForm.removeAction")}
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>

              <SelectField
                label={t("admin.registrationForm.fieldType")}
                value={field.type}
                onChange={(e) =>
                  updateField(index, {
                    type: e.target.value as RegistrationFieldType,
                  })
                }
              >
                {REGISTRATION_FIELD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(FIELD_TYPE_LABEL_KEYS[type])}
                  </option>
                ))}
              </SelectField>

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

          <button
            type="button"
            onClick={addField}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gold/50 bg-card py-3 text-sm font-medium text-gold-dark transition hover:border-gold hover:bg-[#f5f0e8]"
          >
            <Plus size={20} weight="bold" aria-hidden />
            {t("admin.registrationForm.addField")}
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <PrimaryFormButton icon={FloppyDisk} disabled={saving || loading}>
          {saving
            ? t("admin.registrationForm.saving")
            : t("admin.registrationForm.save")}
        </PrimaryFormButton>
        <button
          type="button"
          onClick={restoreBuiltinFields}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm hover:bg-[#f5f0e8]"
        >
          {t("admin.registrationForm.restoreBuiltin")}
        </button>
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
