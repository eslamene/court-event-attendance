"use client";

import { useEffect, useRef } from "react";
import { PencilSimple } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  isEditing: boolean;
  isDirty: boolean;
  emptyLabel: string;
  clickToEditLabel: string;
  onStartEdit: () => void;
  onEndEdit: () => void;
  onChange: (value: string) => void;
  onCancel: () => void;
};

function resizeTextarea(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${Math.max(el.scrollHeight, 40)}px`;
}

export function DictionaryValueCell({
  value,
  isEditing,
  isDirty,
  emptyLabel,
  clickToEditLabel,
  onStartEdit,
  onEndEdit,
  onChange,
  onCancel,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isEditing || !ref.current) return;
    resizeTextarea(ref.current);
    ref.current.focus();
    const len = ref.current.value.length;
    ref.current.setSelectionRange(len, len);
  }, [isEditing]);

  if (isEditing) {
    return (
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          resizeTextarea(e.target);
        }}
        onBlur={onEndEdit}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        rows={1}
        aria-label={clickToEditLabel}
        className="w-full min-w-[200px] resize-none rounded-lg border border-gold-dark/40 bg-white px-2.5 py-2 text-sm leading-relaxed shadow-sm focus:border-gold-dark focus:outline-none focus:ring-2 focus:ring-gold-dark/20"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={onStartEdit}
      title={clickToEditLabel}
      className={cn(
        "group w-full rounded-lg border px-2.5 py-2 text-start text-sm leading-relaxed transition",
        isDirty
          ? "border-amber-300/80 bg-amber-50/90 hover:bg-amber-50"
          : "border-transparent hover:border-border hover:bg-white"
      )}
    >
      <span className="flex items-start gap-2">
        <span
          className={cn(
            "min-w-0 flex-1 whitespace-pre-wrap break-words",
            !value && "italic text-muted-foreground"
          )}
        >
          {value || emptyLabel}
        </span>
        <PencilSimple
          size={14}
          weight="bold"
          aria-hidden
          className="mt-0.5 shrink-0 text-bronze opacity-0 transition group-hover:opacity-70"
        />
      </span>
    </button>
  );
}
