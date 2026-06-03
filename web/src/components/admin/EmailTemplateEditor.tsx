"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { formatPlaceholderToken } from "@/lib/email-template-placeholders";
import {
  ArrowCounterClockwise,
  Copy,
  Eye,
  FloppyDisk,
  PencilSimple,
  type IconProps,
} from "@phosphor-icons/react";
import { useI18n } from "@/components/I18nProvider";
import { useFeedback } from "@/components/ui/FeedbackProvider";
import { Modal } from "@/components/ui/Modal";
import {
  CancelFormButton,
  PrimaryFormButton,
} from "@/components/ui/FormActions";
import { EmailTemplatePlaceholderCommand } from "@/components/admin/EmailTemplatePlaceholderCommand";
import {
  EmailHtmlEditor,
  type EmailHtmlEditorHandle,
} from "@/components/admin/EmailHtmlEditor";
import {
  getSampleEmailPreviewInput,
  renderEmailTemplate,
} from "@/lib/email-template-render";

type Placeholder = { key: string; descriptionKey: string };

type Props = {
  mode: "default" | "event";
  eventId?: string;
  eventName?: string;
  embedded?: boolean;
  onClose?: () => void;
};

type ActiveField = "subject" | "body";

function insertAtCursor(
  value: string,
  insertion: string,
  start: number,
  end: number
): { next: string; cursor: number } {
  const next = value.slice(0, start) + insertion + value.slice(end);
  const cursor = start + insertion.length;
  return { next, cursor };
}

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
  const [defaultSubject, setDefaultSubject] = useState("");
  const [defaultHtmlBody, setDefaultHtmlBody] = useState("");
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [hasOverride, setHasOverride] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [activeField, setActiveField] = useState<ActiveField>("body");

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyEditorRef = useRef<EmailHtmlEditorHandle>(null);

  const resolvePlaceholderLabel = useCallback(
    (key: string) => {
      const ph = placeholders.find((p) => p.key === key);
      return ph ? t(ph.descriptionKey) : key;
    },
    [placeholders, t]
  );

  const preview = useMemo(() => {
    try {
      return renderEmailTemplate(
        { subject, htmlBody },
        getSampleEmailPreviewInput(eventName)
      );
    } catch {
      return { subject: "", html: "" };
    }
  }, [subject, htmlBody, eventName]);

  const load = useCallback(async () => {
    setLoading(true);
    const url =
      mode === "default"
        ? "/api/admin/email-template"
        : `/api/admin/events/${eventId}/email-template`;
    const res = await fetch(url);
    let data: Record<string, unknown> = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    setLoading(false);
    if (!res.ok) {
      toastError(
        (typeof data.error === "string" && data.error) ||
          t("admin.emailTemplate.loadFailed")
      );
      return;
    }
    setSubject(String(data.subject ?? ""));
    setHtmlBody(String(data.htmlBody ?? ""));
    setDefaultSubject(String(data.defaultSubject ?? data.subject ?? ""));
    setDefaultHtmlBody(String(data.defaultHtmlBody ?? data.htmlBody ?? ""));
    setPlaceholders((data.placeholders as Placeholder[]) ?? []);
    setHasOverride(Boolean(data.hasOverride));
  }, [mode, eventId, t, toastError]);

  useEffect(() => {
    load();
  }, [load]);

  function applyPlaceholder(key: string) {
    const token = formatPlaceholderToken(key);
    if (activeField === "subject" && subjectRef.current) {
      const el = subjectRef.current;
      const start = el.selectionStart ?? subject.length;
      const end = el.selectionEnd ?? start;
      const { next, cursor } = insertAtCursor(subject, token, start, end);
      setSubject(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(cursor, cursor);
      });
      return;
    }
    bodyEditorRef.current?.insertText(token);
    bodyEditorRef.current?.focus();
  }

  function copyFromDefault() {
    setSubject(defaultSubject);
    setHtmlBody(defaultHtmlBody);
    toastSuccess(t("admin.emailTemplate.copiedFromDefault"));
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !htmlBody.trim()) {
      toastError(t("admin.emailTemplate.saveFailed"));
      return;
    }
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
    let data: Record<string, unknown> = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    setSaving(false);
    if (!res.ok) {
      toastError(
        (typeof data.error === "string" && data.error) ||
          t("admin.emailTemplate.saveFailed")
      );
      return;
    }
    if (mode === "event") setHasOverride(true);
    toastSuccess(
      (typeof data.message === "string" && data.message) ||
        t("admin.emailTemplate.saved")
    );
  }

  async function onResetDefault() {
    const ok = await confirm({
      title: t("admin.emailTemplate.resetTitle"),
      message: t("admin.emailTemplate.resetConfirm"),
      destructive: true,
      confirmLabel: t("admin.emailTemplate.resetAction"),
    });
    if (!ok) return;

    const res = await fetch("/api/admin/email-template/reset", { method: "POST" });
    let data: Record<string, unknown> = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    if (!res.ok) {
      toastError(
        (typeof data.error === "string" && data.error) ||
          t("admin.emailTemplate.saveFailed")
      );
      return;
    }
    setSubject(String(data.subject ?? ""));
    setHtmlBody(String(data.htmlBody ?? ""));
    toastSuccess(
      (typeof data.message === "string" && data.message) ||
        t("admin.emailTemplate.resetDone")
    );
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
    let data: Record<string, unknown> = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    if (!res.ok) {
      toastError(
        (typeof data.error === "string" && data.error) ||
          t("admin.emailTemplate.saveFailed")
      );
      return;
    }
    toastSuccess(
      (typeof data.message === "string" && data.message) ||
        t("admin.emailTemplate.cleared")
    );
    await load();
  }

  const statusBadge =
    mode === "event" ? (
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
          hasOverride
            ? "bg-blue-100 text-blue-900"
            : "bg-[#f5f0e8] text-gold-dark"
        }`}
      >
        {hasOverride
          ? t("admin.emailTemplate.badgeCustom")
          : t("admin.emailTemplate.badgeDefault")}
      </span>
    ) : (
      <span className="inline-flex rounded-full bg-[#f5f0e8] px-3 py-1 text-xs font-medium text-gold-dark">
        {t("admin.emailTemplate.badgeGlobal")}
      </span>
    );

  const editorPanel = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {statusBadge}
          {placeholders.length > 0 && (
            <EmailTemplatePlaceholderCommand
              placeholders={placeholders}
              activeField={activeField}
              onActiveFieldChange={setActiveField}
              onInsert={applyPlaceholder}
            />
          )}
        </div>
        {mode === "event" && eventName && (
          <span className="truncate text-xs text-bronze">{eventName}</span>
        )}
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-gold-dark">
          {t("admin.emailTemplate.subject")}
        </span>
        <input
          ref={subjectRef}
          value={subject}
          onFocus={() => setActiveField("subject")}
          onChange={(e) => setSubject(e.target.value)}
          required
          dir="rtl"
          className="w-full rounded-lg border border-border bg-card px-4 py-2.5 focus:border-gold focus:ring-2 focus:ring-gold/20"
          placeholder={t("admin.emailTemplate.subjectPlaceholder")}
        />
      </label>

      <div className="space-y-1.5">
        <span className="text-sm font-medium text-gold-dark">
          {t("admin.emailTemplate.htmlBody")}
        </span>
        <EmailHtmlEditor
          ref={bodyEditorRef}
          value={htmlBody}
          onChange={setHtmlBody}
          onFocus={() => setActiveField("body")}
          resolvePlaceholderLabel={resolvePlaceholderLabel}
          placeholder={t("admin.emailTemplate.bodyPlaceholder")}
        />
      </div>
    </div>
  );

  const previewPanel = (
    <div className="flex h-full min-h-[320px] flex-col rounded-xl border border-border bg-[#faf8f5]">
      <div className="border-b border-border px-4 py-2.5">
        <p className="text-xs font-medium text-gold-dark">
          {t("admin.emailTemplate.previewTitle")}
        </p>
        <p className="mt-0.5 truncate text-xs text-bronze" dir="rtl">
          {t("admin.emailTemplate.previewSubject")}: {preview.subject}
        </p>
      </div>
      <div
        className="min-h-[360px] flex-1 overflow-auto rounded-b-xl bg-white"
        dangerouslySetInnerHTML={{ __html: preview.html }}
      />
    </div>
  );

  const form = (
    <form onSubmit={onSave} className="space-y-4">
      <div className="flex gap-2 border-b border-border lg:hidden">
        <TabButton
          active={activeTab === "edit"}
          icon={PencilSimple}
          label={t("admin.emailTemplate.tabEdit")}
          onClick={() => setActiveTab("edit")}
        />
        <TabButton
          active={activeTab === "preview"}
          icon={Eye}
          label={t("admin.emailTemplate.tabPreview")}
          onClick={() => setActiveTab("preview")}
        />
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-6">
        <div className={activeTab === "preview" ? "hidden lg:block" : ""}>
          {editorPanel}
        </div>
        <div className={activeTab === "edit" ? "hidden lg:block" : ""}>
          {previewPanel}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <PrimaryFormButton icon={FloppyDisk} disabled={saving || loading}>
          {saving ? t("admin.emailTemplate.saving") : t("admin.emailTemplate.save")}
        </PrimaryFormButton>
        {mode === "event" && (
          <button
            type="button"
            onClick={copyFromDefault}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm hover:bg-[#f5f0e8]"
          >
            <Copy size={18} aria-hidden />
            {t("admin.emailTemplate.copyFromDefault")}
          </button>
        )}
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
      <p className="py-12 text-center text-bronze">{t("admin.emailTemplate.loading")}</p>
    );
    if (embedded) return loadingEl;
    if (onClose) {
      return (
        <Modal title={t("admin.emailTemplate.title")} onClose={onClose} size="xl">
          {loadingEl}
        </Modal>
      );
    }
    return loadingEl;
  }

  const shell = embedded ? (
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-gold-dark">{t("admin.emailTemplate.title")}</h2>
        {statusBadge}
      </div>
      {form}
    </section>
  ) : onClose ? (
    <Modal
      title={
        mode === "event"
          ? t("admin.emailTemplate.eventTitle", { name: eventName ?? "" })
          : t("admin.emailTemplate.title")
      }
      onClose={onClose}
      size="xl"
    >
      {form}
    </Modal>
  ) : (
    form
  );

  return shell;
}

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ComponentType<IconProps>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex flex-1 items-center justify-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition ${
        active
          ? "border-gold-dark text-gold-dark"
          : "border-transparent text-bronze hover:text-foreground"
      }`}
    >
      <Icon size={18} aria-hidden />
      {label}
    </button>
  );
}
