"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Copy, FloppyDisk, Plus, Trash } from "@phosphor-icons/react";
import {
  EventRowActionsCommand,
  type EventRowAction,
} from "@/components/admin/EventRowActionsCommand";
import { VisualStatusBadge } from "@/components/admin/VisualStatusBadge";
import { EmailTemplateEditor } from "@/components/admin/EmailTemplateEditor";
import { EventLogoUploader } from "@/components/admin/EventLogoUploader";
import { RegistrationFormConfigEditor } from "@/components/admin/RegistrationFormConfigEditor";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import {
  CancelFormButton,
  DangerFormButton,
  PrimaryFormButton,
} from "@/components/ui/FormActions";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import { useI18n } from "@/components/I18nProvider";
import { useFeedback } from "@/components/ui/FeedbackProvider";
import { resolveRegistrationUrl } from "@/lib/app-url";
import { PLATFORM_LOGO_PATH } from "@/lib/platform-logo";
import { format } from "date-fns";

type EventRow = {
  id: string;
  name: string;
  date: string;
  slug: string;
  logoPath: string | null;
  isActive: boolean;
  registrationCount: number;
  registrationUrl: string;
};

export function EventsPanel() {
  const { t } = useI18n();
  const { confirm, toastError, toastSuccess } = useFeedback();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [clearing, setClearing] = useState<EventRow | null>(null);
  const [emailTemplateEvent, setEmailTemplateEvent] = useState<EventRow | null>(
    null
  );
  const [registrationFormEvent, setRegistrationFormEvent] =
    useState<EventRow | null>(null);
  const [createLogoFile, setCreateLogoFile] = useState<File | null>(null);
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingUpdate, setSavingUpdate] = useState(false);
  const createSubmitLock = useRef(false);
  const updateSubmitLock = useRef(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/events");
    const data = await res.json();
    if (Array.isArray(data)) {
      setEvents(
        data.map((e: EventRow) => ({
          ...e,
          registrationUrl: resolveRegistrationUrl(e.slug, e.registrationUrl),
        }))
      );
    } else {
      setEvents([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function copyRegistrationUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toastSuccess(t("admin.events.urlCopied"));
    } catch {
      toastError(t("admin.events.urlCopyFailed"));
    }
  }

  function openCreate() {
    setError("");
    createSubmitLock.current = false;
    setSavingCreate(false);
    setCreating(true);
  }

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (createSubmitLock.current || savingCreate) return;
    createSubmitLock.current = true;
    setSavingCreate(true);
    setError("");
    setMessage("");

    try {
      const form = new FormData(e.currentTarget);
      const name = form.get("name") as string;
      const date = form.get("date") as string;
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, date }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("admin.events.createFailed"));
        return;
      }

      if (createLogoFile) {
        const fd = new FormData();
        fd.append("logo", createLogoFile);
        await fetch(`/api/admin/events/${data.id}/logo`, {
          method: "POST",
          body: fd,
        });
      }

      setCreating(false);
      setCreateLogoFile(null);
      const publicUrl = resolveRegistrationUrl(
        data.slug,
        data.registrationUrl
      );
      setMessage(t("admin.events.created", { url: publicUrl }));
      await load();
    } finally {
      createSubmitLock.current = false;
      setSavingCreate(false);
    }
  }

  async function onUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing || updateSubmitLock.current || savingUpdate) return;
    updateSubmitLock.current = true;
    setSavingUpdate(true);
    setError("");

    try {
      const form = new FormData(e.currentTarget);

      const res = await fetch(`/api/admin/events/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          date: form.get("date"),
          slug: form.get("slug"),
          isActive: form.get("isActive") === "true",
          logoUrl: form.get("logoUrl") || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("admin.events.updateFailed"));
        return;
      }

      setEditing(null);
      setMessage(t("admin.events.updated"));
      await load();
    } finally {
      updateSubmitLock.current = false;
      setSavingUpdate(false);
    }
  }

  async function onClearData(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!clearing) return;
    setError("");
    const form = new FormData(e.currentTarget);

    const res = await fetch(`/api/admin/events/${clearing.id}/clear-data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminPassword: form.get("adminPassword"),
        confirmPhrase: form.get("confirmPhrase"),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || t("admin.events.clearFailed"));
      return;
    }

    setMessage(data.message || t("admin.events.cleared"));
    setClearing(null);
    load();
  }

  async function onDeleteEvent(ev: EventRow) {
    const ok = await confirm({
      title: t("admin.events.deleteTitle"),
      message: t("admin.events.deleteConfirm", { name: ev.name }),
      destructive: true,
      confirmLabel: t("admin.events.deleteEvent"),
    });
    if (!ok) return;

    setError("");
    setMessage("");
    const res = await fetch(`/api/admin/events/${ev.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      const msg = data.error || t("admin.events.deleteFailed");
      setError(msg);
      toastError(msg);
      return;
    }

    setMessage(data.message || t("admin.events.deleted"));
    load();
  }

  function handleEventAction(ev: EventRow, action: EventRowAction) {
    setError("");
    switch (action) {
      case "edit":
        setEditing(ev);
        setClearing(null);
        setEmailTemplateEvent(null);
        setRegistrationFormEvent(null);
        break;
      case "emailTemplate":
        setEmailTemplateEvent(ev);
        setRegistrationFormEvent(null);
        setEditing(null);
        setClearing(null);
        break;
      case "registrationForm":
        setRegistrationFormEvent(ev);
        setEmailTemplateEvent(null);
        setEditing(null);
        setClearing(null);
        break;
      case "clearData":
        setClearing(ev);
        setEditing(null);
        setEmailTemplateEvent(null);
        setRegistrationFormEvent(null);
        break;
      case "deleteEvent":
        void onDeleteEvent(ev);
        setEditing(null);
        setEmailTemplateEvent(null);
        setRegistrationFormEvent(null);
        break;
      default:
        break;
    }
  }

  return (
    <div className="space-y-4">
      {message && (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-success">
          {message}
        </p>
      )}
      {error && !creating && !editing && !clearing && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-error">{error}</p>
      )}

      <AdminListToolbar
        count={events.length}
        countLabel={t("admin.common.viewAll")}
        actionLabel={t("admin.events.createAction")}
        onAction={openCreate}
      />

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-[#f5f0e8] text-gold-dark">
            <tr>
              <th className="px-4 py-3 text-right">{t("admin.events.colLogo")}</th>
              <th className="px-4 py-3 text-right">{t("admin.events.colEvent")}</th>
              <th className="px-4 py-3 text-right">{t("admin.events.colDate")}</th>
              <th className="px-4 py-3 text-right">
                {t("admin.events.colRegistrations")}
              </th>
              <th className="px-4 py-3 text-right">{t("admin.events.colStatus")}</th>
              <th className="px-4 py-3 text-right">{t("admin.events.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-bronze">
                  {t("admin.registrations.loading")}
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <p className="text-bronze">{t("admin.events.empty")}</p>
                  <button
                    type="button"
                    onClick={openCreate}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-gold-dark underline hover:text-bronze"
                  >
                    <Plus size={16} weight="bold" aria-hidden />
                    {t("admin.events.createAction")}
                  </button>
                </td>
              </tr>
            ) : (
              events.map((ev) => (
                <tr
                  key={ev.id}
                  className="border-t border-border transition hover:bg-[#faf8f5]"
                >
                  <td className="px-4 py-3">
                    <EventLogoThumb path={ev.logoPath} name={ev.name} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{ev.name}</div>
                    <div
                      className="mt-1 flex flex-wrap items-center gap-1.5"
                      dir="ltr"
                    >
                      <a
                        href={ev.registrationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="max-w-[220px] truncate text-xs text-gold-dark underline hover:text-bronze"
                        title={ev.registrationUrl}
                      >
                        {ev.registrationUrl}
                      </a>
                      <button
                        type="button"
                        onClick={() => void copyRegistrationUrl(ev.registrationUrl)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-gold-dark transition hover:border-gold/50 hover:bg-[#f5f0e8]"
                        title={t("admin.events.copyUrl")}
                      >
                        <Copy size={14} weight="bold" aria-hidden />
                        {t("admin.events.copyUrl")}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {format(new Date(ev.date), "yyyy-MM-dd")}
                  </td>
                  <td className="px-4 py-3">{ev.registrationCount}</td>
                  <td className="px-4 py-3">
                    <VisualStatusBadge kind="event" active={ev.isActive} />
                  </td>
                  <td className="min-w-[7.5rem] px-3 py-3 text-end">
                    <EventRowActionsCommand
                      event={ev}
                      onAction={(action) => handleEventAction(ev, action)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <Modal
          title={t("admin.events.createTitle")}
          onClose={() => {
            if (savingCreate) return;
            setCreating(false);
            setCreateLogoFile(null);
            createSubmitLock.current = false;
            setError("");
          }}
        >
          <form
            onSubmit={onCreate}
            className="space-y-4"
            aria-busy={savingCreate}
          >
            <TextField name="name" label={t("admin.events.name")} required />
            <TextField
              name="date"
              label={t("admin.events.date")}
              type="date"
              required
            />
            <EventLogoUploader
              label={t("admin.events.logoUpload")}
              onPendingFile={setCreateLogoFile}
              disabled={savingCreate}
            />
            {error && <p className="text-sm text-error">{error}</p>}
            <div className="flex gap-3 pt-2">
              <PrimaryFormButton icon={Plus} disabled={savingCreate}>
                {savingCreate
                  ? t("admin.common.saving")
                  : t("admin.common.create")}
              </PrimaryFormButton>
              <CancelFormButton
                disabled={savingCreate}
                onClick={() => {
                  setCreating(false);
                  setCreateLogoFile(null);
                  createSubmitLock.current = false;
                  setError("");
                }}
              >
                {t("admin.common.cancel")}
              </CancelFormButton>
            </div>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal
          title={`${t("admin.events.editTitle")}: ${editing.name}`}
          onClose={() => {
            if (savingUpdate) return;
            setEditing(null);
          }}
        >
          <form onSubmit={onUpdate} className="space-y-4">
            <TextField
              name="name"
              label={t("admin.events.name")}
              defaultValue={editing.name}
              required
            />
            <TextField
              name="date"
              label={t("admin.events.date")}
              type="date"
              defaultValue={format(new Date(editing.date), "yyyy-MM-dd")}
              required
            />
            <div className="space-y-1.5">
              <TextField
                name="slug"
                label={t("admin.events.registrationSlug")}
                defaultValue={editing.slug}
                required
                dir="ltr"
                className="text-left font-mono"
                placeholder="golden-jubilee-2026"
              />
              <p className="text-xs text-bronze" dir="ltr">
                {t("admin.events.registrationUrlPreview")}:{" "}
                <a
                  href={editing.registrationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-gold-dark underline break-all"
                >
                  {editing.registrationUrl}
                </a>
              </p>
              <p className="text-xs text-bronze">
                {t("admin.events.slugHint")}
              </p>
            </div>
            <fieldset className="block space-y-2">
              <legend className="text-sm font-medium text-gold-dark">
                {t("admin.events.colStatus")}
              </legend>
              <div className="flex flex-wrap gap-3">
                <label className="inline-flex cursor-pointer rounded-full ring-offset-2 has-[:checked]:ring-2 has-[:checked]:ring-gold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold/50">
                  <input
                    type="radio"
                    name="isActive"
                    value="true"
                    defaultChecked={editing.isActive}
                    className="sr-only"
                  />
                  <VisualStatusBadge kind="event" active />
                </label>
                <label className="inline-flex cursor-pointer rounded-full ring-offset-2 has-[:checked]:ring-2 has-[:checked]:ring-gold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold/50">
                  <input
                    type="radio"
                    name="isActive"
                    value="false"
                    defaultChecked={!editing.isActive}
                    className="sr-only"
                  />
                  <VisualStatusBadge kind="event" active={false} />
                </label>
              </div>
            </fieldset>
            <EventLogoUploader
              label={t("admin.events.logoUpload")}
              eventId={editing.id}
              currentLogoUrl={editing.logoPath}
              onLogoChange={(logoPath) =>
                setEditing((prev) => (prev ? { ...prev, logoPath } : null))
              }
            />
            <TextField
              name="logoUrl"
              label={t("admin.events.logoUrl")}
              defaultValue={
                editing.logoPath?.startsWith("http") ? editing.logoPath : ""
              }
              dir="ltr"
              className="text-left"
            />
            <p className="-mt-2 text-xs text-bronze">
              {t("admin.events.logoUrlOr")}
            </p>
            {error && <p className="text-sm text-error">{error}</p>}
            <div className="flex gap-3 pt-2">
              <PrimaryFormButton icon={FloppyDisk} disabled={savingUpdate}>
                {savingUpdate
                  ? t("admin.common.saving")
                  : t("admin.common.save")}
              </PrimaryFormButton>
              <CancelFormButton
                disabled={savingUpdate}
                onClick={() => setEditing(null)}
              >
                {t("admin.common.cancel")}
              </CancelFormButton>
            </div>
          </form>
        </Modal>
      )}

      {clearing && (
        <Modal
          title={`${t("admin.events.clearTitle")}: ${clearing.name}`}
          onClose={() => setClearing(null)}
        >
          <p className="mb-4 text-sm text-error">
            {t("admin.events.clearWarning", {
              count: clearing.registrationCount,
            })}
          </p>
          <form onSubmit={onClearData} className="space-y-4">
            <TextField
              name="adminPassword"
              label={t("admin.events.adminPassword")}
              type="password"
              required
              dir="ltr"
              className="text-left"
            />
            <TextField
              name="confirmPhrase"
              label={t("admin.events.clearConfirmLabel")}
              required
              placeholder={t("admin.clearConfirmPhrase")}
            />
            {error && <p className="text-sm text-error">{error}</p>}
            <div className="flex gap-3 pt-2">
              <DangerFormButton icon={Trash}>
                {t("admin.events.clearData")}
              </DangerFormButton>
              <CancelFormButton onClick={() => setClearing(null)}>
                {t("admin.common.cancel")}
              </CancelFormButton>
            </div>
          </form>
        </Modal>
      )}
      {emailTemplateEvent && (
        <EmailTemplateEditor
          mode="event"
          eventId={emailTemplateEvent.id}
          eventName={emailTemplateEvent.name}
          onClose={() => setEmailTemplateEvent(null)}
        />
      )}
      {registrationFormEvent && (
        <RegistrationFormConfigEditor
          mode="event"
          eventId={registrationFormEvent.id}
          eventName={registrationFormEvent.name}
          onClose={() => setRegistrationFormEvent(null)}
        />
      )}
    </div>
  );
}

function EventLogoThumb({
  path,
  name,
}: {
  path: string | null;
  name: string;
}) {
  const src = path || PLATFORM_LOGO_PATH;
  return (
    <Image
      src={src}
      alt={name}
      width={48}
      height={48}
      className="rounded-full object-cover"
      unoptimized={src.startsWith("http")}
    />
  );
}
