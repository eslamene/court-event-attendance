"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = Omit<React.ComponentProps<typeof Button>, "variant"> & {
  icon: LucideIcon;
  variant?: "default" | "danger" | "success";
};

export function ActionButton({
  icon: Icon,
  children,
  variant = "default",
  className,
  size = "sm",
  ...props
}: Props) {
  const buttonVariant =
    variant === "danger"
      ? "destructive"
      : variant === "success"
        ? "successSolid"
        : "brandOutline";

  return (
    <Button
      type="button"
      variant={buttonVariant}
      size={size}
      className={cn("h-7 gap-1 rounded-md px-2 text-xs", className)}
      {...props}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {children}
    </Button>
  );
}
