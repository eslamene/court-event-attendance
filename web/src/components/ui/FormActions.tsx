"use client";

import type { IconProps } from "@phosphor-icons/react";
import { X } from "@phosphor-icons/react";

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: React.ComponentType<IconProps>;
};

export function PrimaryFormButton({
  icon: Icon,
  children,
  className = "",
  ...props
}: BtnProps) {
  return (
    <button
      type="submit"
      className={`inline-flex items-center gap-1.5 rounded-xl bg-gold-dark px-6 py-2.5 text-white hover:bg-bronze disabled:opacity-60 ${className}`}
      {...props}
    >
      {Icon && <Icon size={18} weight="bold" aria-hidden />}
      {children}
    </button>
  );
}

export function DangerFormButton({
  icon: Icon,
  children,
  className = "",
  ...props
}: BtnProps) {
  return (
    <button
      type="submit"
      className={`inline-flex items-center gap-1.5 rounded-xl bg-error px-6 py-2.5 text-white hover:opacity-90 disabled:opacity-60 ${className}`}
      {...props}
    >
      {Icon && <Icon size={18} weight="bold" aria-hidden />}
      {children}
    </button>
  );
}

export function CancelFormButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1.5 rounded-xl border border-border px-6 py-2.5 hover:bg-[#f5f0e8] ${className}`}
      {...props}
    >
      <X size={18} aria-hidden />
      {children}
    </button>
  );
}
