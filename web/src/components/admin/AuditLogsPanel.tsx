"use client";

import { useCallback, useEffect, useState } from "react";
import { MagnifyingGlass, Scroll } from "@phosphor-icons/react";
import { useI18n } from "@/components/I18nProvider";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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

type Filters = {
  actions: string[];
  entityTypes: string[];
};

function actionLabelKey(action: string) {
  return `audit.action.${action.replace(/\./g, "_")}`;
}

export function AuditLogsPanel() {
  const { t } = useI18n();
  const [items, setItems] = useState<AuditItem[]>([]);
  const [filters, setFilters] = useState<Filters>({ actions: [], entityTypes: [] });
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(
    async (cursor?: string, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (action) params.set("action", action);
      if (entityType) params.set("entityType", entityType);
      if (search.trim()) params.set("q", search.trim());
      if (cursor) params.set("cursor", cursor);
      params.set("limit", "50");

      const res = await fetch(`/api/admin/audit-logs?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error");
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      setItems((prev) => (append ? [...prev, ...data.items] : data.items));
      setNextCursor(data.nextCursor);
      setFilters(data.filters ?? { actions: [], entityTypes: [] });
      setLoading(false);
      setLoadingMore(false);
    },
    [action, entityType, search]
  );

  useEffect(() => {
    const timer = setTimeout(() => load(), 300);
    return () => clearTimeout(timer);
  }, [load]);

  function actorDisplay(row: AuditItem) {
    if (row.actorType === "PUBLIC") {
      return t("audit.actor.public");
    }
    if (row.actorName) return row.actorName;
    return t("audit.actor.system");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="shrink-0 rounded-xl border border-border bg-card p-3 shadow-sm md:p-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f5f0e8] px-3 py-1 text-sm font-medium text-gold-dark">
            <Scroll size={16} weight="duotone" className="text-bronze" aria-hidden />
            {t("audit.entries")}
            <span className="text-bronze">({items.length})</span>
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <div className="relative min-w-[200px] flex-1">
            <MagnifyingGlass
              size={18}
              className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-bronze"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("audit.search")}
              className="w-full rounded-lg border border-border py-2 ps-3 pe-10 text-sm"
            />
          </div>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="min-w-[180px] rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">{t("audit.filterAction")}</option>
            {filters.actions.map((a) => (
              <option key={a} value={a}>
                {t(actionLabelKey(a)) !== actionLabelKey(a)
                  ? t(actionLabelKey(a))
                  : a}
              </option>
            ))}
          </select>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="min-w-[140px] rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">{t("audit.filterEntity")}</option>
            {filters.entityTypes.map((et) => (
              <option key={et} value={et}>
                {et}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="shrink-0 rounded-lg bg-red-50 px-4 py-2 text-sm text-error">
          {error}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="h-full overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-[#f5f0e8] text-right text-gold-dark shadow-sm">
              <tr>
                <th className="whitespace-nowrap px-3 py-3 font-semibold">
                  {t("audit.colWhen")}
                </th>
                <th className="px-3 py-3 font-semibold">{t("audit.colAction")}</th>
                <th className="px-3 py-3 font-semibold">{t("audit.colWho")}</th>
                <th className="px-3 py-3 font-semibold">{t("audit.colTarget")}</th>
                <th className="px-3 py-3 font-semibold">{t("audit.colDetails")}</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-bronze">
                    {t("admin.registrations.loading")}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-bronze">
                    {t("audit.empty")}
                  </td>
                </tr>
              ) : (
                items.map((row) => (
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {nextCursor && (
        <div className="shrink-0 text-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => load(nextCursor, true)}
            className={cn(
              "rounded-xl border border-border bg-card px-6 py-2 text-sm font-medium text-gold-dark hover:bg-[#f5f0e8]",
              loadingMore && "opacity-60"
            )}
          >
            {loadingMore ? "…" : t("audit.loadMore")}
          </button>
        </div>
      )}
    </div>
  );
}
