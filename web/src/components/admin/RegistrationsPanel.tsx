"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { REGISTRATION_STATUSES } from "@/lib/constants";
import { useI18n } from "@/components/I18nProvider";
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
    setEvents(evData.map((e: { id: string; name: string }) => ({ id: e.id, name: e.name })));
    setRows(regData);
    setLoading(false);
  }, [eventId, status, rank, entity]);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(id: string) {
    setActionId(id);
    await fetch(`/api/admin/registrations/${id}/approve`, { method: "POST" });
    await load();
    setActionId(null);
  }

  async function reject(id: string) {
    if (!confirm(t("admin.registrations.rejectConfirm"))) return;
    setActionId(id);
    await fetch(`/api/admin/registrations/${id}/reject`, { method: "POST" });
    await load();
    setActionId(null);
  }

  function exportData(fmt: "xlsx" | "csv") {
    const params = new URLSearchParams({ format: fmt });
    if (eventId) params.set("eventId", eventId);
    window.open(`/api/admin/export?${params}`, "_blank");
  }

  const statusColor: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-900",
    APPROVED: "bg-blue-100 text-blue-900",
    REJECTED: "bg-red-100 text-red-900",
    ATTENDED: "bg-green-100 text-green-900",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-card p-4">
        <select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-sm"
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
          className="rounded-lg border border-border px-3 py-2 text-sm"
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
          className="rounded-lg border border-border px-3 py-2 text-sm"
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
          className="rounded-lg border border-border px-3 py-2 text-sm"
        >
          <option value="">{t("admin.registrations.allEntities")}</option>
          {entities.map((ent) => (
            <option key={ent} value={ent}>
              {ent}
            </option>
          ))}
        </select>
        <div className="mr-auto flex gap-2">
          <button
            onClick={() => exportData("xlsx")}
            className="rounded-lg bg-gold-dark px-4 py-2 text-sm text-white hover:bg-bronze"
          >
            {t("admin.registrations.exportExcel")}
          </button>
          <button
            onClick={() => exportData("csv")}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-[#f5f0e8]"
          >
            {t("admin.registrations.exportCsv")}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-[#f5f0e8] text-gold-dark">
            <tr>
              <th className="px-4 py-3 text-right">{t("admin.registrations.colName")}</th>
              <th className="px-4 py-3 text-right">{t("admin.registrations.colRank")}</th>
              <th className="px-4 py-3 text-right">{t("admin.registrations.colEntity")}</th>
              <th className="px-4 py-3 text-right">{t("admin.registrations.colEvent")}</th>
              <th className="px-4 py-3 text-right">{t("admin.registrations.colStatus")}</th>
              <th className="px-4 py-3 text-right">{t("admin.registrations.colDate")}</th>
              {canApprove && (
                <th className="px-4 py-3 text-right">{t("admin.registrations.colActions")}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-bronze">
                  {t("admin.registrations.loading")}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-bronze">
                  {t("admin.registrations.empty")}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-[#faf8f5]">
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
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColor[r.status] ?? ""}`}
                    >
                      {t(`status.${r.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-bronze">
                    {format(new Date(r.createdAt), "yyyy-MM-dd HH:mm")}
                  </td>
                  {canApprove && (
                    <td className="px-4 py-3">
                      {r.status === "PENDING" && (
                        <div className="flex gap-2">
                          <button
                            disabled={actionId === r.id}
                            onClick={() => approve(r.id)}
                            className="rounded bg-success px-3 py-1 text-xs text-white disabled:opacity-50"
                          >
                            {t("admin.registrations.approve")}
                          </button>
                          <button
                            disabled={actionId === r.id}
                            onClick={() => reject(r.id)}
                            className="rounded bg-error px-3 py-1 text-xs text-white disabled:opacity-50"
                          >
                            {t("admin.registrations.reject")}
                          </button>
                        </div>
                      )}
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
