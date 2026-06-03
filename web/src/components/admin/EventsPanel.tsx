"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import {
  ArrowSquareOut,
  EnvelopeSimple,
  FloppyDisk,
  PencilSimple,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import { EmailTemplateEditor } from "@/components/admin/EmailTemplateEditor";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ActionButton } from "@/components/ui/ActionButton";
import {
  CancelFormButton,
  DangerFormButton,
  PrimaryFormButton,
} from "@/components/ui/FormActions";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import { useI18n } from "@/components/I18nProvider";
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

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/events");
    setEvents(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setError("");
    setCreating(true);
  }

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;
    const date = form.get("date") as string;
    const logoFile = form.get("logo") as File | null;

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

    if (logoFile && logoFile.size > 0) {
      const fd = new FormData();
      fd.append("logo", logoFile);
      await fetch(`/api/admin/events/${data.id}/logo`, {
        method: "POST",
        body: fd,
      });
    }

    setMessage(t("admin.events.created", { url: data.registrationUrl }));
    setCreating(false);
    load();
  }

  async function onUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setError("");
    const form = new FormData(e.currentTarget);

    const res = await fetch(`/api/admin/events/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        date: form.get("date"),
        isActive: form.get("isActive") === "true",
        logoUrl: form.get("logoUrl") || "",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || t("admin.events.updateFailed"));
      return;
    }

    const logoFile = form.get("logo") as File | null;
    if (logoFile && logoFile.size > 0) {
      const fd = new FormData();
      fd.append("logo", logoFile);
      await fetch(`/api/admin/events/${editing.id}/logo`, {
        method: "POST",
        body: fd,
      });
    }

    setMessage(t("admin.events.updated"));
    setEditing(null);
    load();
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
        <table className="w-full min-w-[800px] text-sm">
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
                    <a
                      href={ev.registrationUrl}
                      className="inline-flex items-center gap-1 text-xs text-gold-dark underline"
                      target="_blank"
                      rel="noreferrer"
                      dir="ltr"
                    >
                      /register/{ev.slug}
                      <ArrowSquareOut size={12} aria-hidden />
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    {format(new Date(ev.date), "yyyy-MM-dd")}
                  </td>
                  <td className="px-4 py-3">{ev.registrationCount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${ev.isActive ? "bg-green-100 text-green-900" : "bg-gray-100 text-gray-700"}`}
                    >
                      {ev.isActive
                        ? t("admin.events.active")
                        : t("admin.events.inactive")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <ActionButton
                        icon={PencilSimple}
                        onClick={() => {
                          setEditing(ev);
                          setClearing(null);
                          setError("");
                        }}
                      >
                        {t("admin.events.edit")}
                      </ActionButton>
                      <ActionButton
                        icon={EnvelopeSimple}
                        onClick={() => {
                          setEmailTemplateEvent(ev);
                          setEditing(null);
                          setClearing(null);
                          setError("");
                        }}
                      >
                        {t("admin.events.emailTemplate")}
                      </ActionButton>
                      <ActionButton
                        icon={Trash}
                        variant="danger"
                        onClick={() => {
                          setClearing(ev);
                          setEditing(null);
                          setEmailTemplateEvent(null);
                          setError("");
                        }}
                      >
                        {t("admin.events.clearData")}
                      </ActionButton>
                    </div>
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
            setCreating(false);
            setError("");
          }}
        >
          <form onSubmit={onCreate} className="space-y-4">
            <TextField name="name" label={t("admin.events.name")} required />
            <TextField
              name="date"
              label={t("admin.events.date")}
              type="date"
              required
            />
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-gold-dark">
                {t("admin.events.logoUpload")}
              </span>
              <input
                type="file"
                name="logo"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="w-full text-sm"
              />
            </label>
            {error && <p className="text-sm text-error">{error}</p>}
            <div className="flex gap-3 pt-2">
              <PrimaryFormButton icon={Plus}>
                {t("admin.common.create")}
              </PrimaryFormButton>
              <CancelFormButton
                onClick={() => {
                  setCreating(false);
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
          onClose={() => setEditing(null)}
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
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-gold-dark">
                {t("admin.events.colStatus")}
              </span>
              <select
                name="isActive"
                defaultValue={editing.isActive ? "true" : "false"}
                className="w-full rounded-lg border border-border px-4 py-2.5"
              >
                <option value="true">{t("admin.events.statusActive")}</option>
                <option value="false">{t("admin.events.statusInactive")}</option>
              </select>
            </label>
            <TextField
              name="logoUrl"
              label={t("admin.events.logoUrl")}
              defaultValue={
                editing.logoPath?.startsWith("http") ? editing.logoPath : ""
              }
              dir="ltr"
              className="text-left"
            />
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-gold-dark">
                {t("admin.events.logoUrlOr")}
              </span>
              <input
                type="file"
                name="logo"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="w-full text-sm"
              />
            </label>
            {error && <p className="text-sm text-error">{error}</p>}
            <div className="flex gap-3 pt-2">
              <PrimaryFormButton icon={FloppyDisk}>
                {t("admin.common.save")}
              </PrimaryFormButton>
              <CancelFormButton onClick={() => setEditing(null)}>
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
