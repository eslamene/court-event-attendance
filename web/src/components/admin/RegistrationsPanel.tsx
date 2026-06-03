"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle,
  EnvelopeSimple,
  FileCsv,
  FileXls,
  Funnel,
  FunnelX,
  XCircle,
} from "@phosphor-icons/react";
import { useSession } from "next-auth/react";
import { REGISTRATION_STATUSES } from "@/lib/constants";
import { useI18n } from "@/components/I18nProvider";
import { useFeedback } from "@/components/ui/FeedbackProvider";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import { VisualStatusBadge } from "@/components/admin/VisualStatusBadge";
import { ActionButton } from "@/components/ui/ActionButton";
import { parseJsonStringArray } from "@/lib/i18n/translate";
import { format } from "date-fns";

type Registration = {
  id: string;
  fullName: string;
  rank: string;
  entity: string;
  email: string;
  mobile: string;
  notes: string | null;
  status: string;
  eventName: string;
  eventDate: string;
  createdAt: string;
};

type EventItem = { id: string; name: string };

export function RegistrationsPanel() {
  const { t, dict } = useI18n();
  const { toastSuccess, toastError, confirm } = useFeedback();
  const ranks = parseJsonStringArray(dict, "options.ranks");
  const entities = parseJsonStringArray(dict, "options.entities");
  const { data: session } = useSession();
  const canApprove =
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "APPROVAL_MANAGER";

  const [events, setEvents] = useState<EventItem[]>([]);
  const [rows, setRows] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventId, setEventId] = useState("");
  const [status, setStatus] = useState("");
  const [rank, setRank] = useState("");
  const [entity, setEntity] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (eventId) params.set("eventId", eventId);
    if (status) params.set("status", status);
    if (rank) params.set("rank", rank);
    if (entity) params.set("entity", entity);

    const [evRes, regRes] = await Promise.all([
      fetch("/api/admin/events"),
      fetch(`/api/admin/registrations?${params}`),
    ]);
    const evData = await evRes.json();
    const regData = await regRes.json();
    setEvents(
      evData.map((e: { id: string; name: string }) => ({ id: e.id, name: e.name }))
    );
    setRows(regData);
    setLoading(false);
  }, [eventId, status, rank, entity]);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(id: string) {
    setActionId(id);
    const res = await fetch(`/api/admin/registrations/${id}/approve`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    await load();
    setActionId(null);
    if (res.ok) {
      toastSuccess(data.message ?? t("api.approveSuccess"));
    } else {
      toastError(data.error ?? t("api.operationFailed"));
    }
  }

  async function reject(id: string) {
    const ok = await confirm({
      title: t("admin.registrations.rejectTitle"),
      message: t("admin.registrations.rejectConfirm"),
      confirmLabel: t("admin.registrations.reject"),
      destructive: true,
    });
    if (!ok) return;
    setActionId(id);
    const res = await fetch(`/api/admin/registrations/${id}/reject`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    await load();
    setActionId(null);
    if (res.ok) {
      toastSuccess(t("api.rejectSuccess"));
    } else {
      toastError(data.error ?? t("api.operationFailed"));
    }
  }

  async function resendEmail(id: string) {
    setActionId(id);
    const res = await fetch(
      `/api/admin/registrations/${id}/resend-email`,
      { method: "POST" }
    );
    const data = await res.json().catch(() => ({}));
    setActionId(null);
    if (res.ok && data.sent) {
      toastSuccess(data.message ?? t("api.resendEmailSuccess"));
      return;
    }
    const err =
      data.error ??
      data.message ??
      (data.skipped
        ? `${t("api.resendEmailFailed")} — ${data.error || "Email not configured"}`
        : t("api.resendEmailFailed"));
    toastError(err);
  }

  function exportData(fmt: "xlsx" | "csv") {
    const params = new URLSearchParams({ format: fmt });
    if (eventId) params.set("eventId", eventId);
    window.open(`/api/admin/export?${params}`, "_blank");
  }

  function clearFilters() {
    setEventId("");
    setStatus("");
    setRank("");
    setEntity("");
  }

  const hasFilters = Boolean(eventId || status || rank || entity);

  const colSpan = canApprove ? 7 : 6;

  return (
    <div className="space-y-4">
      <AdminListToolbar
        count={rows.length}
        countLabel={t("admin.registrations.countLabel")}
      >
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 text-sm text-gold-dark underline hover:text-bronze"
          >
            <FunnelX size={16} aria-hidden />
            {t("admin.common.cancel")}
          </button>
        )}
      </AdminListToolbar>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-gold-dark">
          <Funnel size={18} weight="duotone" aria-hidden />
          {t("admin.registrations.filters")}
        </p>
        <div className="flex flex-wrap gap-3">
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="min-w-[160px] flex-1 rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">{t("admin.registrations.allEvents")}</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="min-w-[140px] rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">{t("admin.registrations.allStatuses")}</option>
            {REGISTRATION_STATUSES.map((k) => (
              <option key={k} value={k}>
                {t(`status.${k}`)}
              </option>
            ))}
          </select>
          <select
            value={rank}
            onChange={(e) => setRank(e.target.value)}
            className="min-w-[140px] rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">{t("admin.registrations.allRanks")}</option>
            {ranks.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            className="min-w-[160px] flex-1 rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">{t("admin.registrations.allEntities")}</option>
            {entities.map((ent) => (
              <option key={ent} value={ent}>
                {ent}
              </option>
            ))}
          </select>
          <div className="flex w-full gap-2 sm:mr-auto sm:w-auto">
            <button
              type="button"
              onClick={() => exportData("xlsx")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gold-dark px-4 py-2 text-sm text-white hover:bg-bronze"
            >
              <FileXls size={18} aria-hidden />
              {t("admin.registrations.exportExcel")}
            </button>
            <button
              type="button"
              onClick={() => exportData("csv")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm hover:bg-[#f5f0e8]"
            >
              <FileCsv size={18} aria-hidden />
              {t("admin.registrations.exportCsv")}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="sticky top-0 bg-[#f5f0e8] text-gold-dark">
            <tr>
              <th className="px-4 py-3 text-right">
                {t("admin.registrations.colName")}
              </th>
              <th className="px-4 py-3 text-right">
                {t("admin.registrations.colRank")}
              </th>
              <th className="px-4 py-3 text-right">
                {t("admin.registrations.colEntity")}
              </th>
              <th className="px-4 py-3 text-right">
                {t("admin.registrations.colEvent")}
              </th>
              <th className="px-4 py-3 text-right">
                {t("admin.registrations.colStatus")}
              </th>
              <th className="px-4 py-3 text-right">
                {t("admin.registrations.colDate")}
              </th>
              {canApprove && (
                <th className="px-4 py-3 text-right">
                  {t("admin.registrations.colActions")}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-8 text-center text-bronze">
                  {t("admin.registrations.loading")}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-12 text-center text-bronze">
                  {t("admin.registrations.empty")}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-border transition hover:bg-[#faf8f5]"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.fullName}</div>
                    <div className="text-xs text-bronze" dir="ltr">
                      {r.email}
                    </div>
                    <div className="text-xs text-bronze" dir="ltr">
                      {r.mobile}
                    </div>
                  </td>
                  <td className="px-4 py-3">{r.rank}</td>
                  <td className="px-4 py-3 max-w-[180px]">{r.entity}</td>
                  <td className="px-4 py-3">
                    <div>{r.eventName}</div>
                    <div className="text-xs text-bronze">
                      {format(new Date(r.eventDate), "yyyy-MM-dd")}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <VisualStatusBadge kind="registration" status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-bronze">
                    {format(new Date(r.createdAt), "yyyy-MM-dd HH:mm")}
                  </td>
                  {canApprove && (
                    <td className="px-4 py-3">
                      {r.status === "PENDING" ? (
                        <div className="flex flex-wrap gap-2">
                          <ActionButton
                            icon={CheckCircle}
                            variant="success"
                            disabled={actionId === r.id}
                            onClick={() => approve(r.id)}
                            className="!border-success bg-success !text-white hover:!bg-success/90"
                          >
                            {t("admin.registrations.approve")}
                          </ActionButton>
                          <ActionButton
                            icon={XCircle}
                            variant="danger"
                            disabled={actionId === r.id}
                            onClick={() => reject(r.id)}
                            className="!border-error bg-error !text-white hover:!bg-error/90"
                          >
                            {t("admin.registrations.reject")}
                          </ActionButton>
                        </div>
                      ) : r.status === "APPROVED" || r.status === "ATTENDED" ? (
                        <ActionButton
                          icon={EnvelopeSimple}
                          variant="default"
                          disabled={actionId === r.id}
                          onClick={() => resendEmail(r.id)}
                          className="whitespace-nowrap"
                        >
                          {t("admin.registrations.resendEmail")}
                        </ActionButton>
                      ) : null}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
