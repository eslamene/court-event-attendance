"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

type TagProps = {
  icon?: LucideIcon;
  children: React.ReactNode;
  variant?: VariantProps<typeof badgeVariants>["variant"];
  className?: string;
  title?: string;
};

export function Tag({
  icon: Icon,
  children,
  variant = "outline",
  className,
  title,
}: TagProps) {
  return (
    <Badge
      variant={variant}
      title={title}
      className={cn(
        "h-6 gap-1 rounded-full px-2.5 py-0 text-xs font-semibold",
        className
      )}
    >
      {Icon ? <Icon className="size-3 shrink-0 opacity-90" aria-hidden /> : null}
      {children}
    </Badge>
  );
}
