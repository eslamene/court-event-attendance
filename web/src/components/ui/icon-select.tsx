"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveFieldIcon } from "@/lib/field-icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SelectOption = {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
};

export function parseSelectOptionChildren(
  children: React.ReactNode
): SelectOption[] {
  const options: SelectOption[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement<{ value?: string; disabled?: boolean; children?: React.ReactNode }>(child)) {
      return;
    }
    if (child.type !== "option") return;
    const value = child.props.value;
    if (value === undefined) return;
    options.push({
      value: String(value),
      label: child.props.children ?? value,
      disabled: child.props.disabled,
    });
  });
  return options;
}

function resolveOptions(
  options?: SelectOption[],
  children?: React.ReactNode
): SelectOption[] {
  if (options?.length) return options;
  if (children) return parseSelectOptionChildren(children);
  return [];
}

export type IconSelectProps = {
  options?: SelectOption[];
  children?: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** HTML-select compatibility for controlled fields */
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  name?: string;
  placeholder?: string;
  icon?: LucideIcon;
  fieldKey?: string;
  fieldType?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  triggerClassName?: string;
  size?: "sm" | "default";
  id?: string;
  "aria-label"?: string;
};

export function IconSelect({
  options: optionsProp,
  children,
  value: valueProp,
  defaultValue,
  onValueChange,
  onChange,
  name,
  placeholder,
  icon,
  fieldKey,
  fieldType,
  disabled,
  required,
  className,
  triggerClassName,
  size = "default",
  id,
  "aria-label": ariaLabel,
}: IconSelectProps) {
  const options = resolveOptions(optionsProp, children);
  const resolvedKey = fieldKey ?? name;
  const ResolvedIcon = React.useMemo(
    () => icon ?? resolveFieldIcon({ key: resolvedKey, type: fieldType ?? "select" }),
    [icon, resolvedKey, fieldType]
  );

  const isControlled = valueProp !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = React.useState(
    defaultValue ?? ""
  );

  const value = isControlled ? (valueProp ?? "") : uncontrolledValue;

  const items = React.useMemo(
    () =>
      Object.fromEntries(
        options.map((opt) => [opt.value, opt.label])
      ) as Record<string, React.ReactNode>,
    [options]
  );

  const handleValueChange = React.useCallback(
    (next: string | null) => {
      const v = next ?? "";
      if (!isControlled) setUncontrolledValue(v);
      onValueChange?.(v);
      if (onChange) {
        onChange({
          target: { value: v },
        } as React.ChangeEvent<HTMLSelectElement>);
      }
    },
    [isControlled, onChange, onValueChange]
  );

  return (
    <div className={cn("relative w-full", className)}>
      <span
        className="pointer-events-none absolute start-0 top-1/2 z-10 flex w-9 -translate-y-1/2 items-center justify-center text-muted-foreground"
        aria-hidden
      >
        <ResolvedIcon className="size-4 shrink-0" />
      </span>
      <Select
        name={name}
        value={value}
        defaultValue={isControlled ? undefined : defaultValue}
        onValueChange={handleValueChange}
        disabled={disabled}
        required={required}
        items={items}
      >
        <SelectTrigger
          id={id}
          size={size}
          aria-label={ariaLabel}
          className={cn(
            "w-full min-w-0 bg-card ps-9 text-foreground",
            size === "default" && "h-10",
            "focus-visible:border-gold focus-visible:ring-gold/20",
            triggerClassName
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent align="start" className="max-h-60">
          {options.map((opt) => (
            <SelectItem
              key={opt.value || "__empty__"}
              value={opt.value}
              disabled={opt.disabled}
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
