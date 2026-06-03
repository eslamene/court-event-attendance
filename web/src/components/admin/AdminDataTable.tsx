"use client";

import { CaretDown, CaretUp, FunnelX } from "@phosphor-icons/react";
import { useI18n } from "@/components/I18nProvider";
import { cn } from "@/lib/utils";
import { MAX_PAGE_SIZE } from "@/lib/admin-table-query";

export type AdminTableColumn = {
  id: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: "text" | "select";
  filterOptions?: { value: string; label: string }[];
  align?: "left" | "right";
  className?: string;
};

type AdminDataTableProps = {
  columns: AdminTableColumn[];
  sort: string;
  order: "asc" | "desc";
  columnFilters: Record<string, string>;
  onSort: (columnId: string) => void;
  onFilterChange: (columnId: string, value: string) => void;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  loading: boolean;
  emptyMessage?: string;
  colSpan: number;
  onClearFilters?: () => void;
  headerPrefix?: React.ReactNode;
  filterPrefix?: React.ReactNode;
  children: React.ReactNode;
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100].filter((n) => n <= MAX_PAGE_SIZE);

function alignClass(align?: "left" | "right") {
  return align === "left" ? "text-left" : "text-right";
}

function AdminTablePagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: Pick<
  AdminDataTableProps,
  "page" | "pageSize" | "total" | "totalPages" | "onPageChange" | "onPageSizeChange"
>) {
  const { t } = useI18n();
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-[#faf8f5] px-3 py-2.5 text-sm">
      <p className="text-bronze">
        {total === 0 ? (
          t("admin.table.noResults")
        ) : (
          <>
            {t("admin.table.page")} {from}–{to} {t("admin.table.of")} {total}
          </>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-bronze">
          <span>{t("admin.table.rowsPerPage")}</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-lg border border-border bg-white px-2 py-1 text-gold-dark"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded-lg border border-border px-2.5 py-1 text-gold-dark hover:bg-[#f5f0e8] disabled:opacity-40"
          >
            ‹
          </button>
          <span className="min-w-[4rem] text-center text-gold-dark">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="rounded-lg border border-border px-2.5 py-1 text-gold-dark hover:bg-[#f5f0e8] disabled:opacity-40"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminDataTable({
  columns,
  sort,
  order,
  columnFilters,
  onSort,
  onFilterChange,
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  loading,
  emptyMessage,
  colSpan,
  onClearFilters,
  headerPrefix,
  filterPrefix,
  children,
}: AdminDataTableProps) {
  const { t } = useI18n();
  const hasFilters = columns.some((c) => c.filterable);
  const hasActiveFilters = Object.values(columnFilters).some(Boolean);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 border-b border-border bg-[#f5f0e8] text-gold-dark shadow-sm">
            <tr>
              {headerPrefix}
              {columns.map((col) => {
                const active = sort === col.id;
                const ariaSort = active
                  ? order === "asc"
                    ? "ascending"
                    : "descending"
                  : undefined;
                return (
                  <th
                    key={col.id}
                    aria-sort={ariaSort}
                    className={cn(
                      "px-3 py-3 font-semibold",
                      alignClass(col.align),
                      col.className
                    )}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => onSort(col.id)}
                        title={
                          active && order === "asc"
                            ? t("admin.table.sortAsc")
                            : t("admin.table.sortDesc")
                        }
                        className={cn(
                          "inline-flex w-full items-center gap-1 hover:text-bronze",
                          col.align === "left" ? "justify-start" : "justify-end"
                        )}
                      >
                        <span>{col.label}</span>
                        <span className="inline-flex flex-col text-bronze">
                          <CaretUp
                            size={12}
                            weight="bold"
                            className={cn(
                              "-mb-1",
                              active && order === "asc"
                                ? "text-gold-dark"
                                : "opacity-30"
                            )}
                            aria-hidden
                          />
                          <CaretDown
                            size={12}
                            weight="bold"
                            className={cn(
                              active && order === "desc"
                                ? "text-gold-dark"
                                : "opacity-30"
                            )}
                            aria-hidden
                          />
                        </span>
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                );
              })}
            </tr>
            {hasFilters && (
              <tr className="border-b border-border/80 bg-[#f5f0e8]/80">
                {filterPrefix}
                {columns.map((col) => (
                  <th
                    key={`filter-${col.id}`}
                    className={cn("px-2 py-2 font-normal", col.className)}
                  >
                    {col.filterable ? (
                      col.filterType === "select" ? (
                        <select
                          value={columnFilters[col.id] ?? ""}
                          onChange={(e) =>
                            onFilterChange(col.id, e.target.value)
                          }
                          className="w-full rounded-lg border border-border bg-white px-2 py-1.5 text-sm text-gold-dark"
                        >
                          <option value="">
                            {t("admin.table.filterPlaceholder")}
                          </option>
                          {col.filterOptions?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="search"
                          value={columnFilters[col.id] ?? ""}
                          onChange={(e) =>
                            onFilterChange(col.id, e.target.value)
                          }
                          placeholder={t("admin.table.filterPlaceholder")}
                          className="w-full rounded-lg border border-border bg-white px-2 py-1.5 text-sm"
                        />
                      )
                    ) : null}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-16 text-center text-bronze"
                >
                  …
                </td>
              </tr>
            ) : total === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-16 text-center text-bronze"
                >
                  {emptyMessage ?? t("admin.table.noResults")}
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
      {hasActiveFilters && onClearFilters && (
        <div className="border-t border-border px-3 py-2">
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-bronze hover:bg-[#f5f0e8]"
          >
            <FunnelX size={16} aria-hidden />
            {t("admin.table.clearFilters")}
          </button>
        </div>
      )}
      <AdminTablePagination
        page={page}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
