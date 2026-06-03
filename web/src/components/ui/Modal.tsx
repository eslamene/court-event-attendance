"use client";

import { useEffect } from "react";
import { X } from "@phosphor-icons/react";

type Props = {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: "md" | "lg" | "xl";
};

const sizeClass = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-6xl",
};

export function Modal({ title, children, onClose, size = "md" }: Props) {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div
        className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl ${sizeClass[size]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 id="modal-title" className="font-bold text-gold-dark">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-bronze hover:bg-[#f5f0e8] hover:text-foreground"
            aria-label="Close"
          >
            <X size={20} weight="bold" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
