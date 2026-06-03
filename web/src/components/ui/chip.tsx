"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ChipProps = {
  icon?: LucideIcon;
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  size?: "sm" | "default";
  className?: string;
  type?: "button" | "submit";
};

export function Chip({
  icon: Icon,
  children,
  selected = false,
  onClick,
  disabled,
  size = "default",
  className,
  type = "button",
}: ChipProps) {
  const sizeClass =
    size === "sm" ? "h-7 gap-1 px-2.5 text-xs" : "h-8 gap-1.5 px-3 text-sm";

  if (!onClick) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border font-medium",
          sizeClass,
          selected
            ? "border-gold-dark bg-gold-dark text-white"
            : "border-border bg-card text-bronze",
          className
        )}
      >
        {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
        {children}
      </span>
    );
  }

  return (
    <Button
      type={type}
      variant={selected ? "brand" : "brandOutline"}
      disabled={disabled}
      onClick={onClick}
      className={cn("rounded-full font-medium", sizeClass, className)}
    >
      {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
      {children}
    </Button>
  );
}
