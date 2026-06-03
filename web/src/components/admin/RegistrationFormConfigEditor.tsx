"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from "react";
import {
  ArrowCounterClockwise,
  ArrowDown,
  ArrowUp,
  Calendar,
  CaretDown,
  Copy,
  DotsSixVertical,
  Envelope,
  Eye,
  EyeSlash,
  FloppyDisk,
  Hash,
  Link as LinkIcon,
  Phone,
  Plus,
  TextAlignLeft,
  TextT,
  Trash,
  type IconProps,
} from "@phosphor-icons/react";
import { useI18n } from "@/components/I18nProvider";
import { RegistrationFormEditorPreview } from "@/components/admin/RegistrationFormEditorPreview";
import { useFeedback } from "@/components/ui/FeedbackProvider";
import { Modal } from "@/components/ui/Modal";
import {
  CheckboxField,
  TextField,
  TextAreaField,
} from "@/components/ui/Field";
import {
  CancelFormButton,
  PrimaryFormButton,
} from "@/components/ui/FormActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  REGISTRATION_FIELD_TYPES,
  createCustomFieldKey,
  getBuiltinRegistrationFormConfig,
  getFieldLabel,
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

const FIELD_TYPE_ICONS: Record<
  RegistrationFieldType,
  ComponentType<IconProps>
> = {
  text: TextT,
  email: Envelope,
  tel: Phone,
  select: CaretDown,
  textarea: TextAlignLeft,
  number: Hash,
  date: Calendar,
  url: LinkIcon,
};

const PREVIEW_ON_SAVE_KEY = "registration-form-preview-on-save";

function readPreviewOnSavePreference(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PREVIEW_ON_SAVE_KEY) === "1";
}

function EditorSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="space-y-3 lg:col-span-5">
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
      <div className="space-y-3 lg:col-span-7">
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function RegistrationFormConfigEditor({
  mode,
  eventId,
  eventName,
  embedded = false,
  onClose,
}: Props) {
  const { t, locale } = useI18n();
  const { toastSuccess, toastError, confirm } = useFeedback();
  const [fields, setFields] = useState<RegistrationFormFieldConfig[]>([]);
  const [defaultFields, setDefaultFields] = useState<
    RegistrationFormFieldConfig[]
  >([]);
  const [hasOverride, setHasOverride] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDraft, setPreviewDraft] = useState(true);
  const [previewOnSave, setPreviewOnSave] = useState(false);

  useEffect(() => {
    setPreviewOnSave(readPreviewOnSavePreference());
  }, []);

  function openPreview(manual: boolean) {
    setPreviewDraft(manual);
    setPreviewOpen(true);
  }

  function togglePreviewOnSave(checked: boolean) {
    setPreviewOnSave(checked);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PREVIEW_ON_SAVE_KEY, checked ? "1" : "0");
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function fetchConfig() {
      setLoading(true);
      const url =
        mode === "default"
          ? "/api/admin/registration-form"
          : `/api/admin/events/${eventId}/registration-form`;
      const res = await fetch(url);
      const data = await res.json();
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        toastError(data.error || t("admin.registrationForm.loadFailed"));
        return;
      }
      const nextFields: RegistrationFormFieldConfig[] = data.fields ?? [];
      setFields(nextFields);
      setDefaultFields(data.defaultFields ?? data.fields ?? []);
      setHasOverride(Boolean(data.hasOverride));
      setSelectedKey((prev) =>
        prev && nextFields.some((f) => f.key === prev)
          ? prev
          : (nextFields[0]?.key ?? null)
      );
    }

    void fetchConfig();
    return () => {
      cancelled = true;
    };
  }, [mode, eventId, t, toastError]);

  const load = useCallback(async () => {
    const url =
      mode === "default"
        ? "/api/admin/registration-form"
        : `/api/admin/events/${eventId}/registration-form`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) {
      toastError(data.error || t("admin.registrationForm.loadFailed"));
      return;
    }
    const nextFields: RegistrationFormFieldConfig[] = data.fields ?? [];
    setFields(nextFields);
    setDefaultFields(data.defaultFields ?? data.fields ?? []);
    setHasOverride(Boolean(data.hasOverride));
    setSelectedKey((prev) =>
      prev && nextFields.some((f) => f.key === prev)
        ? prev
        : (nextFields[0]?.key ?? null)
    );
  }, [mode, eventId, t, toastError]);

  const selectedIndex = useMemo(
    () => fields.findIndex((f) => f.key === selectedKey),
    [fields, selectedKey]
  );

  const selectedField =
    selectedIndex >= 0 ? fields[selectedIndex] : undefined;

  const stats = useMemo(() => {
    const enabled = fields.filter((f) => f.enabled).length;
    const required = fields.filter((f) => f.enabled && f.required).length;
    return { total: fields.length, enabled, required };
  }, [fields]);

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
    const key = createCustomFieldKey();
    setFields((prev) => [
      ...prev,
      {
        key,
        enabled: true,
        required: false,
        labelAr: t("admin.registrationForm.newFieldLabelAr"),
        labelEn: t("admin.registrationForm.newFieldLabelEn"),
        type: "text",
        order: maxOrder + 1,
      },
    ]);
    setSelectedKey(key);
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
    const next = fields
      .filter((_, i) => i !== index)
      .map((f, i) => ({ ...f, order: i + 1 }));
    setFields(next);
    if (field.key === selectedKey) {
      setSelectedKey(next[Math.min(index, next.length - 1)]?.key ?? null);
    }
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
    const merged = [...builtin, ...custom].map((f, i) => ({
      ...f,
      order: i + 1,
    }));
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
    if (previewOnSave) {
      openPreview(false);
    }
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
    <form
      onSubmit={onSave}
      className="flex min-h-0 flex-1 flex-col gap-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="max-w-2xl text-sm leading-relaxed text-bronze">
            {t("admin.registrationForm.intro")}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-gold/30 bg-[#faf8f5] text-gold-dark">
              {t("admin.registrationForm.statsFields", {
                total: String(stats.total),
              })}
            </Badge>
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
              {t("admin.registrationForm.statsVisible", {
                count: String(stats.enabled),
              })}
            </Badge>
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-900">
              {t("admin.registrationForm.statsRequired", {
                count: String(stats.required),
              })}
            </Badge>
            {mode === "event" && (
              <Badge
                variant="outline"
                className={
                  hasOverride
                    ? "border-sky-200 bg-sky-50 text-sky-900"
                    : "border-border bg-muted text-muted-foreground"
                }
              >
                {hasOverride
                  ? t("admin.registrationForm.customFormActive")
                  : t("admin.registrationForm.usingGlobalForm")}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="text-xs text-bronze">
            {t("admin.registrationForm.unsavedHint")}
          </p>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={previewOnSave}
              onChange={(e) => togglePreviewOnSave(e.target.checked)}
              className="size-4 rounded border-border text-gold-dark focus:ring-gold"
            />
            <span className="text-gold-dark">
              {t("admin.registrationForm.previewOnSave")}
            </span>
          </label>
        </div>
      </div>

      {loading ? (
        <EditorSkeleton />
      ) : (
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-12 lg:items-stretch">
          {/* Field list */}
          <div className="flex min-h-[280px] flex-col rounded-xl border border-border bg-card shadow-sm lg:col-span-5 lg:min-h-[520px]">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-gold-dark">
                {t("admin.registrationForm.fieldList")}
              </h3>
              <span className="text-xs tabular-nums text-bronze">
                {stats.total}
              </span>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {fields.map((field, index) => {
                const TypeIcon = FIELD_TYPE_ICONS[field.type];
                const isSelected = field.key === selectedKey;
                const label = getFieldLabel(field, locale);

                return (
                  <div
                    key={field.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedKey(field.key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedKey(field.key);
                      }
                    }}
                    className={cn(
                      "group relative rounded-xl border p-3 transition-all",
                      isSelected
                        ? "border-gold-dark/50 bg-gradient-to-br from-[#f5f0e8] to-card shadow-sm ring-2 ring-gold/25"
                        : "border-border/80 bg-[#faf8f5] hover:border-gold/30 hover:shadow-sm",
                      !field.enabled && "opacity-60"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-card text-gold-dark shadow-sm"
                        aria-hidden
                      >
                        <TypeIcon size={18} weight="duotone" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate font-medium text-foreground">
                            {label}
                          </p>
                          {!field.enabled && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                              <EyeSlash size={10} className="me-0.5" />
                              {t("admin.registrationForm.hidden")}
                            </Badge>
                          )}
                          {field.required && field.enabled && (
                            <span className="text-[10px] font-semibold text-amber-700">
                              *
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-bronze">
                          {t(FIELD_TYPE_LABEL_KEYS[field.type])}
                          {" · "}
                          <span dir="ltr" className="font-mono">
                            {field.key}
                          </span>
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <Badge
                            variant="outline"
                            className={cn(
                              "h-5 px-1.5 text-[10px]",
                              isBuiltinFieldKey(field.key)
                                ? "border-gold/30 bg-gold/10 text-gold-dark"
                                : "border-sky-200 bg-sky-50 text-sky-800"
                            )}
                          >
                            {isBuiltinFieldKey(field.key)
                              ? t("admin.registrationForm.builtinBadge")
                              : t("admin.registrationForm.customBadge")}
                          </Badge>
                          {field.type === "select" && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                              {t("admin.registrationForm.optionsCount", {
                                count: String(field.options?.length ?? 0),
                              })}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                disabled={index === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveField(index, -1);
                                }}
                                aria-label={t("admin.registrationForm.moveUp")}
                              />
                            }
                          >
                            <ArrowUp size={14} />
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("admin.registrationForm.moveUp")}
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                disabled={index === fields.length - 1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveField(index, 1);
                                }}
                                aria-label={t("admin.registrationForm.moveDown")}
                              />
                            }
                          >
                            <ArrowDown size={14} />
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("admin.registrationForm.moveDown")}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    <span
                      className="absolute start-1.5 top-1/2 hidden -translate-y-1/2 text-bronze/40 lg:block"
                      aria-hidden
                    >
                      <DotsSixVertical size={14} />
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-border p-3">
              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed border-gold/40 text-gold-dark hover:border-gold hover:bg-[#f5f0e8]"
                onClick={addField}
              >
                <Plus size={18} weight="bold" />
                {t("admin.registrationForm.addField")}
              </Button>
            </div>
          </div>

          {/* Field editor */}
          <div className="flex min-h-[320px] flex-col rounded-xl border border-border bg-card shadow-sm lg:col-span-7 lg:min-h-[520px]">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-gold-dark">
                {t("admin.registrationForm.fieldSettings")}
              </h3>
            </div>

            {selectedField && selectedIndex >= 0 ? (
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">
                      {getFieldLabel(selectedField, locale)}
                    </p>
                    <p className="font-mono text-xs text-bronze" dir="ltr">
                      {selectedField.key}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={fields.length <= 1}
                    onClick={() => removeField(selectedIndex)}
                  >
                    <Trash size={16} />
                    {t("admin.registrationForm.removeAction")}
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <CheckboxField
                    label={t("admin.registrationForm.enabled")}
                    checked={selectedField.enabled}
                    onChange={(v) =>
                      updateField(selectedIndex, { enabled: v })
                    }
                  />
                  <CheckboxField
                    label={t("admin.registrationForm.required")}
                    checked={selectedField.required}
                    disabled={!selectedField.enabled}
                    onChange={(v) =>
                      updateField(selectedIndex, { required: v })
                    }
                  />
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-gold-dark">
                    {t("admin.registrationForm.fieldType")}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {REGISTRATION_FIELD_TYPES.map((type) => {
                      const Icon = FIELD_TYPE_ICONS[type];
                      const active = selectedField.type === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() =>
                            updateField(selectedIndex, { type })
                          }
                          className={cn(
                            "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition",
                            active
                              ? "border-gold-dark bg-gold/10 shadow-sm ring-2 ring-gold/25"
                              : "border-border bg-[#faf8f5] hover:border-gold/40 hover:bg-card"
                          )}
                        >
                          <Icon
                            size={20}
                            weight={active ? "fill" : "duotone"}
                            className="text-gold-dark"
                          />
                          <span className="text-[11px] font-medium leading-tight text-foreground">
                            {t(FIELD_TYPE_LABEL_KEYS[type])}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    label={t("admin.registrationForm.labelAr")}
                    value={selectedField.labelAr}
                    onChange={(e) =>
                      updateField(selectedIndex, { labelAr: e.target.value })
                    }
                    required
                  />
                  <TextField
                    label={t("admin.registrationForm.labelEn")}
                    value={selectedField.labelEn}
                    onChange={(e) =>
                      updateField(selectedIndex, { labelEn: e.target.value })
                    }
                    dir="ltr"
                    className="text-left"
                    required
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    label={t("admin.registrationForm.placeholderAr")}
                    value={selectedField.placeholderAr ?? ""}
                    onChange={(e) =>
                      updateField(selectedIndex, {
                        placeholderAr: e.target.value || undefined,
                      })
                    }
                    placeholder={t("admin.registrationForm.placeholderOptional")}
                  />
                  <TextField
                    label={t("admin.registrationForm.placeholderEn")}
                    value={selectedField.placeholderEn ?? ""}
                    onChange={(e) =>
                      updateField(selectedIndex, {
                        placeholderEn: e.target.value || undefined,
                      })
                    }
                    dir="ltr"
                    className="text-left"
                    placeholder={t("admin.registrationForm.placeholderOptional")}
                  />
                </div>

                {selectedField.type === "select" && (
                  <div className="rounded-xl border border-border bg-[#faf8f5] p-4">
                    <TextAreaField
                      label={t("admin.registrationForm.options")}
                      value={optionsToText(selectedField.options)}
                      onChange={(e) =>
                        updateField(selectedIndex, {
                          options: textToOptions(e.target.value),
                        })
                      }
                      rows={5}
                      placeholder={t("admin.registrationForm.optionsHint")}
                    />
                    {(selectedField.options?.length ?? 0) > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {selectedField.options!.map((opt) => (
                          <span
                            key={opt}
                            className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-foreground"
                          >
                            {opt}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
                <p className="text-sm text-bronze">
                  {t("admin.registrationForm.selectFieldHint")}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {previewOpen && (
        <Modal
          title={t("admin.registrationForm.livePreview")}
          onClose={() => setPreviewOpen(false)}
          size="lg"
          elevated
        >
          <p className="mb-4 text-sm text-bronze">
            {previewDraft
              ? t("admin.registrationForm.previewDraftNote")
              : t("admin.registrationForm.previewSavedNote")}
          </p>
          <RegistrationFormEditorPreview
            fields={fields}
            eventName={eventName}
            compact
          />
        </Modal>
      )}

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <PrimaryFormButton icon={FloppyDisk} disabled={saving || loading}>
          {saving
            ? t("admin.registrationForm.saving")
            : t("admin.registrationForm.save")}
        </PrimaryFormButton>

        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => openPreview(true)}
        >
          <Eye size={18} weight="duotone" />
          {t("admin.registrationForm.previewButton")}
        </Button>

        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={restoreBuiltinFields}
        >
          {t("admin.registrationForm.restoreBuiltin")}
        </Button>

        {mode === "event" && (
          <Button type="button" variant="outline" onClick={copyFromDefault}>
            <Copy size={18} />
            {t("admin.registrationForm.copyFromDefault")}
          </Button>
        )}

        {mode === "default" && (
          <Button type="button" variant="outline" onClick={onResetDefault}>
            <ArrowCounterClockwise size={18} />
            {t("admin.registrationForm.resetAction")}
          </Button>
        )}

        {mode === "event" && hasOverride && (
          <Button type="button" variant="destructive" onClick={onClearOverride}>
            {t("admin.registrationForm.clearAction")}
          </Button>
        )}

        {onClose && <CancelFormButton type="button" onClick={onClose} />}
      </div>
    </form>
  );

  if (embedded) {
    return form;
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
