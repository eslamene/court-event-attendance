"use client";

import type { IconProps } from "@phosphor-icons/react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: React.ComponentType<IconProps>;
  variant?: "default" | "danger" | "success";
};

export function ActionButton({
  icon: Icon,
  children,
  variant = "default",
  className = "",
  ...props
}: Props) {
  const variants = {
    default: "border-border text-foreground hover:bg-[#f5f0e8]",
    danger: "border-error/40 text-error hover:bg-red-50",
    success: "border-success/40 text-success hover:bg-green-50",
  };

  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs transition ${variants[variant]} ${className}`}
      {...props}
    >
      <Icon size={14} weight="regular" aria-hidden />
      {children}
    </button>
  );
}
