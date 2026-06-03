"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import {
  AdminDataTable,
  type AdminTableColumn,
} from "@/components/admin/AdminDataTable";
import { useAdminTable } from "@/hooks/useAdminTable";
import { format } from "date-fns";

type AuditItem = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  entityLabel: string | null;
  actorType: string;
  actorName: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  metadata: unknown;
  ipAddress: string | null;
  createdAt: string;
};

type FilterMeta = {
  actions: string[];
  entityTypes: string[];
};

function actionLabelKey(action: string) {
  return `audit.action.${action.replace(/\./g, "_")}`;
}

export function AuditLogsPanel() {
  const { t } = useI18n();
  const [filterMeta, setFilterMeta] = useState<FilterMeta>({
    actions: [],
    entityTypes: [],
  });
  const table = useAdminTable<AuditItem>({
    fetchUrl: "/api/admin/audit-logs",
    defaultSort: "createdAt",
    defaultOrder: "desc",
  });

  useEffect(() => {
    fetch("/api/admin/audit-logs?page=1&pageSize=1")
      .then((r) => r.json())
      .then((data) => {
        if (data.filters) setFilterMeta(data.filters);
      })
      .catch(() => {});
  }, []);

  const columns = useMemo((): AdminTableColumn[] => {
    const actionLabel = (a: string) => {
      const key = actionLabelKey(a);
      const label = t(key);
      return label !== key ? label : a;
    };
    return [
      {
        id: "createdAt",
        label: t("audit.colWhen"),
        sortable: true,
      },
      {
        id: "action",
        label: t("audit.colAction"),
        sortable: true,
        filterable: true,
        filterType: "select",
        filterOptions: filterMeta.actions.map((a) => ({
          value: a,
          label: actionLabel(a),
        })),
      },
      {
        id: "actorName",
        label: t("audit.colWho"),
        sortable: true,
        filterable: true,
      },
      {
        id: "entityType",
        label: t("audit.colTarget"),
        sortable: true,
        filterable: true,
        filterType: "select",
        filterOptions: filterMeta.entityTypes.map((et) => ({
          value: et,
          label: et,
        })),
      },
      {
        id: "entityLabel",
        label: t("audit.colDetails"),
        sortable: true,
        filterable: true,
      },
    ];
  }, [t, filterMeta]);

  function actorDisplay(row: AuditItem) {
    if (row.actorType === "PUBLIC") {
      return t("audit.actor.public");
    }
    if (row.actorName) return row.actorName;
    return t("audit.actor.system");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
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
        emptyMessage={t("audit.empty")}
        colSpan={columns.length}
      >
        {table.items.map((row) => (
          <tr
            key={row.id}
            className="border-b border-border/60 align-top hover:bg-[#faf8f5]"
          >
            <td className="whitespace-nowrap px-3 py-2 text-xs text-bronze">
              {format(new Date(row.createdAt), "yyyy-MM-dd HH:mm:ss")}
            </td>
            <td className="px-3 py-2">
              <span className="font-medium text-gold-dark">
                {t(actionLabelKey(row.action)) !== actionLabelKey(row.action)
                  ? t(actionLabelKey(row.action))
                  : row.action}
              </span>
            </td>
            <td className="px-3 py-2">
              <div className="font-medium">{actorDisplay(row)}</div>
              {row.actorEmail && row.actorType === "USER" && (
                <div className="text-xs text-bronze" dir="ltr">
                  {row.actorEmail}
                </div>
              )}
              {row.actorRole && (
                <div className="mt-0.5 text-xs text-bronze">
                  {t(`roles.${row.actorRole}`)}
                </div>
              )}
              {row.ipAddress && (
                <div className="text-xs text-bronze" dir="ltr">
                  {row.ipAddress}
                </div>
              )}
            </td>
            <td className="px-3 py-2">
              {row.entityType && (
                <span className="text-xs uppercase text-bronze">
                  {row.entityType}
                </span>
              )}
              {row.entityLabel && (
                <div className="font-medium">{row.entityLabel}</div>
              )}
              {row.entityId && (
                <div
                  className="max-w-[140px] truncate font-mono text-xs text-bronze"
                  dir="ltr"
                  title={row.entityId}
                >
                  {row.entityId}
                </div>
              )}
            </td>
            <td className="max-w-[280px] px-3 py-2">
              {row.metadata &&
              typeof row.metadata === "object" &&
              Object.keys(row.metadata as object).length > 0 ? (
                <pre
                  className="max-h-24 overflow-auto rounded bg-[#f5f0e8] p-2 font-mono text-[10px] leading-relaxed text-bronze"
                  dir="ltr"
                >
                  {JSON.stringify(row.metadata, null, 2)}
                </pre>
              ) : (
                <span className="text-bronze">—</span>
              )}
            </td>
          </tr>
        ))}
      </AdminDataTable>
    </div>
  );
}
