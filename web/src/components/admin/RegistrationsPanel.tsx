"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  Ban,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FileText,
  Hand,
  Mail,
  XCircle,
} from "lucide-react";
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
import { IconTabBar } from "@/components/ui/icon-tabs";
import { Modal } from "@/components/ui/Modal";
import { SelectField } from "@/components/ui/Field";
import {
  CancelFormButton,
  PrimaryFormButton,
} from "@/components/ui/FormActions";
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
  eventId: string;
  eventName: string;
  eventDate: string;
  eventSeatingEnabled?: boolean;
  seatTierId?: string | null;
  seatNumber?: number | null;
  seatTierName?: string | null;
  seatLabel?: string | null;
  preferredTierName?: string | null;
  withdrawalNote?: string | null;
  createdAt: string;
};

type TierOption = {
  id: string;
  name: string;
  seatCount: number;
  assigned: number;
  available: number;
};

type ApproveModalState = {
  registration: Registration;
  tiers: TierOption[];
  selectedTierId: string;
};

type EventItem = { id: string; name: string };

const TAB_LABEL_KEYS: Record<RegistrationTabId, string> = {
  pending: "admin.registrations.tabPending",
  approved: "admin.registrations.tabApproved",
  rejected: "admin.registrations.tabRejected",
  withdrawn: "admin.registrations.tabWithdrawn",
};

const TAB_ICONS = {
  pending: Clock,
  approved: BadgeCheck,
  rejected: Ban,
  withdrawn: Hand,
} as const;

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
  const [approveModal, setApproveModal] = useState<ApproveModalState | null>(
    null
  );
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
      {
        id: "seat",
        label: t("admin.registrations.colSeat"),
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

  async function postApprove(id: string, seatTierId?: string) {
    setActionId(id);
    const res = await fetch(`/api/admin/registrations/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(seatTierId ? { seatTierId } : {}),
    });
    const data = await res.json().catch(() => ({}));
    await table.reload();
    setActionId(null);
    if (res.ok) {
      toastSuccess(
        data.seatLabel
          ? `${data.message ?? t("api.approveSuccess")} — ${data.seatLabel}`
          : (data.message ?? t("api.approveSuccess"))
      );
    } else {
      toastError(data.error ?? t("api.operationFailed"));
    }
  }

  async function approve(reg: Registration) {
    if (!reg.eventSeatingEnabled) {
      await postApprove(reg.id);
      return;
    }

    const res = await fetch(`/api/admin/events/${reg.eventId}/seating`);
    const data = await res.json();
    if (!res.ok) {
      toastError(data.error ?? t("api.operationFailed"));
      return;
    }

    const tiers = (data.tiers ?? []) as TierOption[];
    const availableTiers = tiers.filter((tier) => tier.available > 0);

    if (availableTiers.length === 0) {
      toastError(t("seating.noSeatsAvailable"));
      return;
    }

    if (reg.seatTierId) {
      const preferred = availableTiers.find((tier) => tier.id === reg.seatTierId);
      await postApprove(reg.id, preferred?.id ?? reg.seatTierId);
      return;
    }

    if (availableTiers.length === 1) {
      await postApprove(reg.id, availableTiers[0].id);
      return;
    }

    setApproveModal({
      registration: reg,
      tiers: availableTiers,
      selectedTierId: availableTiers[0].id,
    });
  }

  async function confirmApproveWithTier() {
    if (!approveModal) return;
    const { registration, selectedTierId } = approveModal;
    setApproveModal(null);
    await postApprove(registration.id, selectedTierId);
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
      <IconTabBar
        value={activeTab}
        onValueChange={(tab) => selectTab(tab as RegistrationTabId)}
        items={REGISTRATION_TAB_IDS.map((tab) => ({
          value: tab,
          label: t(TAB_LABEL_KEYS[tab]),
          icon: TAB_ICONS[tab],
        }))}
      />

      <AdminListToolbar
        count={table.total}
        countLabel={t("admin.registrations.countLabel")}
      >
        <Button
          type="button"
          variant="brand"
          size="sm"
          onClick={() => exportData("xlsx")}
        >
          <FileSpreadsheet className="size-4" aria-hidden />
          {t("admin.registrations.exportExcel")}
        </Button>
        <Button
          type="button"
          variant="brandOutline"
          size="sm"
          onClick={() => exportData("csv")}
        >
          <FileText className="size-4" aria-hidden />
          {t("admin.registrations.exportCsv")}
        </Button>
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
            <CheckCircle2 className="size-4" />
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
              <XCircle className="size-4" />
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
            <td className="px-4 py-3 text-sm">
              {r.seatLabel ? (
                <span className="font-medium text-gold-dark">{r.seatLabel}</span>
              ) : r.preferredTierName ? (
                <span className="text-bronze">
                  {t("admin.registrations.preferredTier", {
                    tier: r.preferredTierName,
                  })}
                </span>
              ) : r.eventSeatingEnabled ? (
                <span className="text-bronze">—</span>
              ) : (
                <span className="text-bronze/60">—</span>
              )}
            </td>
            {canApprove && (
              <td className="px-4 py-3">
                {activeTab === "pending" && r.status === "PENDING" ? (
                  <div className="flex flex-wrap gap-2">
                    <ActionButton
                      icon={CheckCircle2}
                      variant="success"
                      disabled={actionId === r.id || batchProcessing}
                      onClick={() => approve(r)}
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
                    icon={CheckCircle2}
                    variant="success"
                    disabled={actionId === r.id || batchProcessing}
                    onClick={() => approve(r)}
                    className="!border-success bg-success !text-white hover:!bg-success/90"
                  >
                    {t("admin.registrations.approveRejected")}
                  </ActionButton>
                ) : activeTab === "approved" &&
                  (r.status === "APPROVED" || r.status === "ATTENDED") ? (
                  <ActionButton
                    icon={Mail}
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

      {approveModal && (
        <Modal
          title={t("seating.approveTitle")}
          onClose={() => setApproveModal(null)}
          size="md"
        >
          <p className="mb-4 text-sm text-bronze">
            {t("seating.approveMessage", {
              name: approveModal.registration.fullName,
            })}
          </p>
          <SelectField
            fieldKey="seatTierId"
            label={t("seating.selectTier")}
            value={approveModal.selectedTierId}
            onChange={(e) =>
              setApproveModal((prev) =>
                prev
                  ? { ...prev, selectedTierId: e.target.value }
                  : prev
              )
            }
          >
            {approveModal.tiers.map((tier) => (
              <option key={tier.id} value={tier.id}>
                {tier.name} ({t("seating.tierAvailable", { count: String(tier.available) })})
              </option>
            ))}
          </SelectField>
          <div className="mt-4 flex gap-2">
            <PrimaryFormButton type="button" onClick={confirmApproveWithTier}>
              {t("admin.registrations.approve")}
            </PrimaryFormButton>
            <CancelFormButton type="button" onClick={() => setApproveModal(null)}>
              {t("admin.common.cancel")}
            </CancelFormButton>
          </div>
        </Modal>
      )}
    </div>
  );
}
