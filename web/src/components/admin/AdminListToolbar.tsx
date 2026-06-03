"use client";

import { List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";

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
        <Tag
          icon={List}
          className="h-7 gap-1.5 border-gold/20 bg-[#f5f0e8] px-3 text-sm text-gold-dark"
        >
          {countLabel}
          <span className="font-normal text-bronze">({count})</span>
        </Tag>
        {children}
      </div>
      {actionLabel && onAction && (
        <Button type="button" variant="brand" size="sm" onClick={onAction}>
          <Plus className="size-4" aria-hidden />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
