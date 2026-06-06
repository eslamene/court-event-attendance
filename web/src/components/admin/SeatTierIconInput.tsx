"use client";

import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: React.HTMLInputTypeAttribute;
  min?: number;
  max?: number;
  placeholder?: string;
  error?: string;
  dir?: "ltr" | "rtl";
  className?: string;
  inputClassName?: string;
};

export function SeatTierIconInput({
  icon: Icon,
  label,
  value,
  onChange,
  type = "text",
  min,
  max,
  placeholder,
  error,
  dir,
  className,
  inputClassName,
}: Props) {
  return (
    <div className={cn("min-w-0 space-y-0.5", className)}>
      <div className="relative">
        <span
          className="pointer-events-none absolute start-0 top-0 flex h-7 w-7 items-center justify-center text-bronze/55"
          title={label}
          aria-hidden
        >
          <Icon className="size-3.5" />
        </span>
        <Input
          type={type}
          min={min}
          max={max}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          dir={dir}
          aria-label={label}
          aria-invalid={Boolean(error)}
          className={cn(
            "h-7 ps-7 text-xs",
            dir === "ltr" && "text-left",
            error && "border-destructive",
            inputClassName
          )}
        />
      </div>
      {error ? (
        <p className="text-[9px] leading-tight text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
