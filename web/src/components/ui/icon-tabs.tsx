"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type IconTabItem = {
  value: string;
  label: React.ReactNode;
  icon?: LucideIcon;
  disabled?: boolean;
};

type IconTabBarProps = {
  items: IconTabItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  listClassName?: string;
  fullWidth?: boolean;
};

export function IconTabBar({
  items,
  value,
  onValueChange,
  className,
  listClassName,
  fullWidth = true,
}: IconTabBarProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onValueChange(String(v))}
      className={cn("gap-0", className)}
    >
      <TabsList
        className={cn(
          "h-auto gap-1 rounded-xl border border-border bg-[#faf8f5] p-1",
          fullWidth && "w-full",
          listClassName
        )}
      >
        {items.map((item) => (
          <TabsTrigger
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            className={cn(
              "gap-2 rounded-lg px-4 py-2 text-sm font-medium text-bronze",
              "data-active:bg-gold-dark data-active:text-white data-active:shadow-sm",
              "hover:bg-card hover:text-gold-dark",
              fullWidth && "flex-1"
            )}
          >
            {item.icon ? (
              <item.icon className="size-4 shrink-0" aria-hidden />
            ) : null}
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
