"use client";

import type { IconProps } from "@phosphor-icons/react";

type Props = {
  icon: React.ComponentType<IconProps>;
  children: React.ReactNode;
  size?: number;
  weight?: IconProps["weight"];
  className?: string;
};

export function IconLabel({
  icon: Icon,
  children,
  size = 18,
  weight = "regular",
  className = "",
}: Props) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <Icon size={size} weight={weight} aria-hidden className="shrink-0" />
      {children}
    </span>
  );
}
