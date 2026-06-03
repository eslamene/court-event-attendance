"use client";

import type { LucideIcon } from "lucide-react";
import { Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BtnProps = React.ComponentProps<typeof Button> & {
  icon?: LucideIcon;
};

export function PrimaryFormButton({
  icon: Icon = Save,
  children,
  className,
  size = "lg",
  ...props
}: BtnProps) {
  return (
    <Button
      type="submit"
      variant="brand"
      size={size}
      className={cn("gap-1.5 rounded-xl px-6", className)}
      {...props}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {children}
    </Button>
  );
}

export function DangerFormButton({
  icon: Icon = Trash2,
  children,
  className,
  size = "lg",
  ...props
}: BtnProps) {
  return (
    <Button
      type="submit"
      variant="destructive"
      size={size}
      className={cn(
        "gap-1.5 rounded-xl bg-error px-6 text-white hover:bg-error/90",
        className
      )}
      {...props}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {children}
    </Button>
  );
}

export function CancelFormButton({
  children,
  className,
  size = "lg",
  ...props
}: BtnProps) {
  return (
    <Button
      type="button"
      variant="brandOutline"
      size={size}
      className={cn("gap-1.5 rounded-xl px-6", className)}
      {...props}
    >
      <X className="size-4 shrink-0" aria-hidden />
      {children}
    </Button>
  );
}
