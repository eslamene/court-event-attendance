"use client";

import { ListBullets, Plus } from "@phosphor-icons/react";

type Props = {
  count: number;
  countLabel: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: React.ReactNode;
};

export function AdminListToolbar({
  count,
  countLabel,
  actionLabel,
  onAction,
  children,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f5f0e8] px-3 py-1 text-sm font-medium text-gold-dark">
          <ListBullets size={16} weight="duotone" className="text-bronze" aria-hidden />
          {countLabel}
          <span className="text-bronze">({count})</span>
        </span>
        {children}
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gold-dark px-5 py-2 text-sm font-semibold text-white hover:bg-bronze"
        >
          <Plus size={18} weight="bold" aria-hidden />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
