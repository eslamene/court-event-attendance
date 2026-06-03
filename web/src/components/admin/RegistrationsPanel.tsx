"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle,
  EnvelopeSimple,
  FileCsv,
  FileXls,
  XCircle,
} from "@phosphor-icons/react";
import { useSession } from "next-auth/react";
import { useI18n } from "@/components/I18nProvider";
import { useFeedback } from "@/components/ui/FeedbackProvider";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";
import {
  AdminDataTable,
  type AdminTableColumn,
} from "@/components/admin/AdminDataTable";
import { VisualStatusBadge } from "@/components/admin/VisualStatusBadge";
import { ActionButton } from "@/components/ui/ActionButton";
import { Button } from "@/components/ui/button";
import { parseJsonStringArray } from "@/lib/i18n/translate";
import { useAdminTable } from "@/hooks/useAdminTable";
import {
  REGISTRATION_TAB_IDS,
  resolveRegistrationTab,
  type RegistrationTabId,
} from "@/lib/registration-tabs";
import { cn } from "@/lib/utils";
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
  withdrawalNote?: string | null;
  createdAt: string;
};

type EventItem = { id: string; name: string };

const TAB_LABEL_KEYS: Record<RegistrationTabId, string> = {
  pending: "admin.registrations.tabPending",
  approved: "admin.registrations.tabApproved",
  rejected: "admin.registrations.tabRejected",
  withdrawn: "admin.registrations.tabWithdrawn",
};

export function RegistrationsPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, dict } = useI18n();
  const { toastSuccess, toastError, confirm } = useFeedback();
  const ranks = parseJsonStringArray(dict, "options.ranks");
  const entities = parseJsonStringArray(dict, "options.entities");
  const { data: session } = useSession();
  const canApprove =
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "APPROVAL_MANAGER";

  const [activeTab, setActiveTab] = useState<RegistrationTabId>(() =>
    resolveRegistrationTab(searchParams)
  );
  const [events, setEvents] = useState<EventItem[]>([]);
  const [actionId, setActionId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const batchMode =
    canApprove && (activeTab === "pending" || activeTab === "rejected");

  const table = useAdminTable<Registration>({
    fetchUrl: "/api/admin/registrations",
    defaultSort: "createdAt",
    defaultOrder: "desc",
    extraParams: { tab: activeTab },
  });

  useEffect(() => {
    setActiveTab(resolveRegistrationTab(searchParams));
  }, [searchParams]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab, table.page]);

  const selectableIds = useMemo(() => {
    if (activeTab === "pending") {
      return table.items
        .filter((r) => r.status === "PENDING")
        .map((r) => r.id);
    }
    if (activeTab === "rejected") {
      return table.items
        .filter((r) => r.status === "REJECTED")
        .map((r) => r.id);
    }
    return [];
  }, [activeTab, table.items]);

  const allSelectableChecked =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selectedIds.has(id));
  const someSelectableChecked =
    selectableIds.some((id) => selectedIds.has(id)) && !allSelectableChecked;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelectableChecked;
    }
  }, [someSelectableChecked]);

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelectableChecked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(selectableIds));
  }

  async function runBatch(action: "approve" | "reject") {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    const ok = await confirm({
      title: t(
        action === "approve"
          ? "admin.registrations.batchApproveTitle"
          : "admin.registrations.batchRejectTitle"
      ),
      message: t(
        action === "approve"
          ? "admin.registrations.batchApproveConfirm"
          : "admin.registrations.batchRejectConfirm",
        { count: String(ids.length) }
      ),
      confirmLabel: t(
        action === "approve"
          ? "admin.registrations.batchApprove"
          : "admin.registrations.batchReject"
      ),
      destructive: action === "reject",
    });
    if (!ok) return;

    setBatchProcessing(true);
    const res = await fetch("/api/admin/registrations/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action }),
    });
    const data = await res.json().catch(() => ({}));
    setBatchProcessing(false);
    setSelectedIds(new Set());
    await table.reload();

    if (!res.ok) {
      toastError(data.error ?? t("api.operationFailed"));
      return;
    }
    if ((data.failed ?? 0) > 0) {
      toastError(data.message ?? t("api.batchPartial", { ok: data.succeeded, fail: data.failed }));
    } else {
      toastSuccess(data.message ?? t("api.approveSuccess"));
    }
  }

  useEffect(() => {
    fetch("/api/admin/events?compact=1")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setEvents(data);
      })
      .catch(() => {});
  }, []);

  const selectTab = useCallback(
    (tab: RegistrationTabId) => {
      setActiveTab(tab);
      table.setPage(1);
      table.clearFilters();
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      params.delete("status");
      router.replace(`/admin/registrations?${params.toString()}`, {
        scroll: false,
      });
    },
    [router, searchParams, table]
  );

  const columns = useMemo((): AdminTableColumn[] => {
    const cols: AdminTableColumn[] = [
      {
        id: "fullName",
        label: t("admin.registrations.colName"),
        sortable: true,
        filterable: true,
      },
      {
        id: "rank",
        label: t("admin.registrations.colRank"),
        sortable: true,
        filterable: true,
        filterType: "select",
        filterOptions: ranks.map((r) => ({ value: r, label: r })),
      },
      {
        id: "entity",
        label: t("admin.registrations.colEntity"),
        sortable: true,
        filterable: true,
        filterType: "select",
        filterOptions: entities.map((e) => ({ value: e, label: e })),
      },
      {
        id: "eventId",
        label: t("admin.registrations.colEvent"),
        sortable: true,
        filterable: true,
        filterType: "select",
        filterOptions: events.map((e) => ({ value: e.id, label: e.name })),
      },
      {
        id: "status",
        label: t("admin.registrations.colStatus"),
        sortable: true,
      },
      {
        id: "createdAt",
        label: t("admin.registrations.colDate"),
        sortable: true,
      },
    ];
    if (canApprove) {
      cols.push({
        id: "actions",
        label: t("admin.registrations.colActions"),
      });
    }
    return cols;
  }, [t, ranks, entities, events, canApprove]);

  async function approve(id: string) {
    setActionId(id);
    const res = await fetch(`/api/admin/registrations/${id}/approve`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    await table.reload();
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
    await table.reload();
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
    if (table.columnFilters.eventId) {
      params.set("eventId", table.columnFilters.eventId);
    }
    window.open(`/api/admin/export?${params}`, "_blank");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
        {REGISTRATION_TAB_IDS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => selectTab(tab)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              activeTab === tab
                ? "bg-gold-dark text-white shadow-sm"
                : "text-bronze hover:bg-[#f5f0e8] hover:text-gold-dark"
            )}
          >
            {t(TAB_LABEL_KEYS[tab])}
          </button>
        ))}
      </div>

      <AdminListToolbar
        count={table.total}
        countLabel={t("admin.registrations.countLabel")}
      >
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
      </AdminListToolbar>

      {selectedIds.size > 0 && batchMode && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gold/30 bg-gradient-to-r from-[#f5f0e8] to-card px-4 py-3 shadow-sm">
          <span className="text-sm font-medium text-gold-dark">
            {t("admin.registrations.batchSelected", {
              count: String(selectedIds.size),
            })}
          </span>
          <Button
            type="button"
            size="sm"
            disabled={batchProcessing}
            className="bg-success text-white hover:bg-success/90"
            onClick={() => runBatch("approve")}
          >
            <CheckCircle size={16} weight="bold" />
            {batchProcessing
              ? t("admin.registrations.batchProcessing")
              : t("admin.registrations.batchApprove")}
          </Button>
          {activeTab === "pending" && (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={batchProcessing}
              onClick={() => runBatch("reject")}
            >
              <XCircle size={16} weight="bold" />
              {t("admin.registrations.batchReject")}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={batchProcessing}
            onClick={() => setSelectedIds(new Set())}
          >
            {t("admin.registrations.batchClear")}
          </Button>
        </div>
      )}

      <AdminDataTable
        columns={columns}
        sort={table.sort}
        order={table.order}
        columnFilters={table.columnFilters}
        onSort={table.toggleSort}
        onFilterChange={table.setColumnFilter}
        onClearFilters={table.clearFilters}
        page={table.page}
        pageSize={table.pageSize}
        total={table.total}
        totalPages={table.totalPages}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        loading={table.loading}
        emptyMessage={t("admin.registrations.empty")}
        colSpan={columns.length + (batchMode ? 1 : 0)}
        headerPrefix={
          batchMode ? (
            <th className="w-10 px-3 py-3">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allSelectableChecked}
                disabled={selectableIds.length === 0 || batchProcessing}
                onChange={toggleSelectAll}
                aria-label={t("admin.registrations.selectAll")}
                className="size-4 rounded border-border text-gold-dark focus:ring-gold"
              />
            </th>
          ) : undefined
        }
        filterPrefix={batchMode ? <th className="w-10 px-2 py-2" /> : undefined}
      >
        {table.items.map((r) => {
          const selectable =
            (activeTab === "pending" && r.status === "PENDING") ||
            (activeTab === "rejected" && r.status === "REJECTED");

          return (
          <tr
            key={r.id}
            className={cn(
              "border-t border-border transition hover:bg-[#faf8f5]",
              selectedIds.has(r.id) && "bg-[#f5f0e8]/80"
            )}
          >
            {batchMode && (
              <td className="px-3 py-3">
                {selectable ? (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(r.id)}
                    disabled={batchProcessing}
                    onChange={() => toggleRow(r.id)}
                    aria-label={r.fullName}
                    className="size-4 rounded border-border text-gold-dark focus:ring-gold"
                  />
                ) : null}
              </td>
            )}
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
            <td className="max-w-[180px] px-4 py-3">{r.entity}</td>
            <td className="px-4 py-3">
              <div>{r.eventName}</div>
              <div className="text-xs text-bronze">
                {format(new Date(r.eventDate), "yyyy-MM-dd")}
              </div>
            </td>
            <td className="px-4 py-3">
              <VisualStatusBadge kind="registration" status={r.status} />
              {r.status === "WITHDRAWN" && r.withdrawalNote && (
                <p
                  className="mt-1 max-w-[200px] line-clamp-2 text-xs text-bronze"
                  title={r.withdrawalNote}
                >
                  {r.withdrawalNote}
                </p>
              )}
            </td>
            <td className="px-4 py-3 text-xs text-bronze">
              {format(new Date(r.createdAt), "yyyy-MM-dd HH:mm")}
            </td>
            {canApprove && (
              <td className="px-4 py-3">
                {activeTab === "pending" && r.status === "PENDING" ? (
                  <div className="flex flex-wrap gap-2">
                    <ActionButton
                      icon={CheckCircle}
                      variant="success"
                      disabled={actionId === r.id || batchProcessing}
                      onClick={() => approve(r.id)}
                      className="!border-success bg-success !text-white hover:!bg-success/90"
                    >
                      {t("admin.registrations.approve")}
                    </ActionButton>
                    <ActionButton
                      icon={XCircle}
                      variant="danger"
                      disabled={actionId === r.id || batchProcessing}
                      onClick={() => reject(r.id)}
                      className="!border-error bg-error !text-white hover:!bg-error/90"
                    >
                      {t("admin.registrations.reject")}
                    </ActionButton>
                  </div>
                ) : activeTab === "rejected" && r.status === "REJECTED" ? (
                  <ActionButton
                    icon={CheckCircle}
                    variant="success"
                    disabled={actionId === r.id || batchProcessing}
                    onClick={() => approve(r.id)}
                    className="!border-success bg-success !text-white hover:!bg-success/90"
                  >
                    {t("admin.registrations.approveRejected")}
                  </ActionButton>
                ) : activeTab === "approved" &&
                  (r.status === "APPROVED" || r.status === "ATTENDED") ? (
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
          );
        })}
      </AdminDataTable>
    </div>
  );
}
