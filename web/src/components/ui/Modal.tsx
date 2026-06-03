"use client";

import { useEffect } from "react";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: "md" | "lg" | "xl" | "fullscreen";
  elevated?: boolean;
  headerActions?: React.ReactNode;
  /** Extra classes on the scrollable body (below header). */
  bodyClassName?: string;
};

const sizeClass = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-6xl",
  fullscreen: "max-w-none",
};

export function Modal({
  title,
  children,
  onClose,
  size = "md",
  elevated = false,
  headerActions,
  bodyClassName,
}: Props) {
  const isFullscreen = size === "fullscreen";
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className={cn(
        "fixed inset-0 flex bg-black/50",
        isFullscreen ? "p-0" : "items-center justify-center p-4",
        elevated ? "z-[60]" : "z-50"
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div
        className={cn(
          "flex w-full flex-col border-border bg-card shadow-xl",
          isFullscreen
            ? "h-[100dvh] max-h-none rounded-none border-0"
            : "max-h-[92vh] overflow-y-auto rounded-2xl border p-6",
          sizeClass[size]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            "flex shrink-0 items-start justify-between gap-4 border-border",
            isFullscreen ? "border-b px-4 py-3 sm:px-6" : "mb-4"
          )}
        >
          <h3 id="modal-title" className="font-bold text-gold-dark">
            {title}
          </h3>
          <div className="flex shrink-0 items-center gap-1">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-bronze hover:bg-[#f5f0e8] hover:text-foreground"
              aria-label="Close"
            >
              <X size={20} weight="bold" />
            </button>
          </div>
        </div>
        <div
          className={cn(
            "min-h-0 flex-1",
            isFullscreen
              ? "flex flex-col overflow-hidden px-4 pb-4 pt-3 sm:px-6 sm:pb-6"
              : undefined,
            bodyClassName
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
