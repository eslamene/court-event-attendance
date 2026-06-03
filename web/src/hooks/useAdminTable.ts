"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_PAGE_SIZE } from "@/lib/admin-table-query";

type PaginatedPayload<T> = {
  items: T[];
  total: number;
  totalPages?: number;
  page?: number;
  pageSize?: number;
};

type Options = {
  fetchUrl: string;
  defaultSort: string;
  defaultOrder?: "asc" | "desc";
  initialPageSize?: number;
  debounceMs?: number;
  extraParams?: Record<string, string>;
};

export function useAdminTable<T>({
  fetchUrl,
  defaultSort,
  defaultOrder = "desc",
  initialPageSize = DEFAULT_PAGE_SIZE,
  debounceMs = 300,
  extraParams = {},
}: Options) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sort, setSort] = useState(defaultSort);
  const [order, setOrder] = useState<"asc" | "desc">(defaultOrder);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const hasLoadedOnce = useRef(false);

  // Inline `extraParams={{ tab }}` creates a new object every render — stabilize deps.
  const extraParamsKey = JSON.stringify(extraParams);
  const columnFiltersKey = JSON.stringify(columnFilters);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    params.set("sort", sort);
    params.set("order", order);

    const filters = JSON.parse(columnFiltersKey) as Record<string, string>;
    for (const [key, value] of Object.entries(filters)) {
      if (value.trim()) params.set(key, value.trim());
    }

    const extra = JSON.parse(extraParamsKey) as Record<string, string>;
    for (const [key, value] of Object.entries(extra)) {
      const trimmed = String(value).trim();
      if (trimmed) params.set(key, trimmed);
    }

    return params;
  }, [page, pageSize, sort, order, columnFiltersKey, extraParamsKey]);

  const load = useCallback(async () => {
    if (!hasLoadedOnce.current) {
      setLoading(true);
    }

    const params = buildParams();
    const sep = fetchUrl.includes("?") ? "&" : "?";
    const res = await fetch(`${fetchUrl}${sep}${params}`);
    const data: PaginatedPayload<T> & Record<string, unknown> = await res.json();
    if (res.ok) {
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      const pages =
        data.totalPages ??
        Math.max(1, Math.ceil((data.total ?? 0) / pageSize));
      setTotalPages(pages);
      hasLoadedOnce.current = true;
    }
    setLoading(false);
    return data;
  }, [fetchUrl, buildParams, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), debounceMs);
    return () => clearTimeout(timer);
  }, [load, debounceMs]);

  const reload = useCallback(() => {
    hasLoadedOnce.current = false;
    return load();
  }, [load]);

  const toggleSort = useCallback((columnId: string) => {
    setPage(1);
    setSort((prev) => {
      if (prev === columnId) {
        setOrder((o) => (o === "asc" ? "desc" : "asc"));
        return prev;
      }
      setOrder("desc");
      return columnId;
    });
  }, []);

  const setColumnFilter = useCallback((columnId: string, value: string) => {
    setPage(1);
    setColumnFilters((prev) => {
      const next = { ...prev };
      if (value.trim()) next[columnId] = value;
      else delete next[columnId];
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setPage(1);
    setColumnFilters({});
  }, []);

  const handleSetPageSize = useCallback((size: number) => {
    setPage(1);
    setPageSize(size);
  }, []);

  return {
    items,
    total,
    totalPages,
    page,
    pageSize,
    sort,
    order,
    columnFilters,
    loading,
    setPage,
    setPageSize: handleSetPageSize,
    toggleSort,
    setColumnFilter,
    clearFilters,
    reload,
  };
}
