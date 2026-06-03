"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveFieldIcon } from "@/lib/field-icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { IconSelect, type SelectOption } from "@/components/ui/icon-select";

type BaseProps = {
  label: string;
  error?: string;
  required?: boolean;
  icon?: LucideIcon;
  /** Maps to form field name for automatic icon resolution */
  fieldKey?: string;
  fieldType?: string;
};

function useResolvedIcon(
  icon: LucideIcon | undefined,
  fieldKey: string | undefined,
  fieldType: string | undefined,
  inputType?: string
) {
  return React.useMemo(
    () =>
      icon ??
      resolveFieldIcon({
        key: fieldKey,
        type: fieldType,
        inputType,
      }),
    [icon, fieldKey, fieldType, inputType]
  );
}

function FieldLabel({
  htmlFor,
  label,
  required,
}: {
  htmlFor?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <Label
      htmlFor={htmlFor}
      className="font-medium text-gold-dark group-data-[disabled=true]/field:opacity-60"
    >
      {label}
      {required ? (
        <span className="text-destructive" aria-hidden>
          *
        </span>
      ) : null}
    </Label>
  );
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-sm text-destructive">{error}</p>;
}

function IconAffix({
  icon: Icon,
  position,
}: {
  icon: LucideIcon;
  position: "start" | "end";
}) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute inset-y-0 flex w-9 items-center justify-center text-muted-foreground",
        position === "start" ? "start-0" : "end-0"
      )}
    >
      <Icon className="size-4" aria-hidden />
    </span>
  );
}

const controlClass = cn(
  "h-10 w-full bg-card text-foreground",
  "focus-visible:border-gold focus-visible:ring-gold/20"
);

export function TextField({
  label,
  error,
  required,
  icon,
  fieldKey,
  fieldType,
  className,
  name,
  type,
  id: idProp,
  ...props
}: BaseProps & React.ComponentProps<typeof Input>) {
  const autoId = React.useId();
  const id = idProp ?? (typeof name === "string" ? name : autoId);
  const resolvedKey =
    fieldKey ?? (typeof name === "string" ? name : undefined);
  const ResolvedIcon = useResolvedIcon(icon, resolvedKey, fieldType, type);

  return (
    <div
      className="group/field space-y-2"
      data-disabled={props.disabled ? true : undefined}
    >
      <FieldLabel htmlFor={id} label={label} required={required} />
      <div className="relative">
        <IconAffix icon={ResolvedIcon} position="start" />
        <Input
          id={id}
          name={name}
          type={type}
          required={required}
          aria-invalid={!!error}
          className={cn(controlClass, "ps-9", className)}
          {...props}
        />
      </div>
      <FieldError error={error} />
    </div>
  );
}

export function SelectField({
  label,
  error,
  required,
  icon,
  fieldKey,
  fieldType,
  children,
  options,
  className,
  name,
  id: idProp,
  value,
  defaultValue,
  onChange,
  onValueChange,
  disabled,
  placeholder,
  ...props
}: BaseProps & {
  children?: React.ReactNode;
  options?: SelectOption[];
  className?: string;
  name?: string;
  id?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const autoId = React.useId();
  const id = idProp ?? (typeof name === "string" ? name : autoId);
  const resolvedKey =
    fieldKey ?? (typeof name === "string" ? name : undefined);

  return (
    <div
      className="group/field space-y-2"
      data-disabled={disabled ? true : undefined}
    >
      <FieldLabel htmlFor={id} label={label} required={required} />
      <IconSelect
        id={id}
        name={name}
        options={options}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        onValueChange={onValueChange}
        disabled={disabled}
        required={required}
        icon={icon}
        fieldKey={resolvedKey}
        fieldType={fieldType ?? "select"}
        placeholder={placeholder}
        className={cn(error && "[&_button]:border-destructive", className)}
        aria-label={typeof label === "string" ? label : undefined}
      >
        {children}
      </IconSelect>
      <FieldError error={error} />
    </div>
  );
}

export function TextAreaField({
  label,
  error,
  required,
  icon,
  fieldKey,
  fieldType,
  className,
  name,
  id: idProp,
  ...props
}: BaseProps & React.ComponentProps<typeof Textarea>) {
  const autoId = React.useId();
  const id = idProp ?? (typeof name === "string" ? name : autoId);
  const resolvedKey =
    fieldKey ?? (typeof name === "string" ? name : undefined);
  const ResolvedIcon = useResolvedIcon(
    icon,
    resolvedKey,
    fieldType ?? "textarea"
  );

  return (
    <div
      className="group/field space-y-2"
      data-disabled={props.disabled ? true : undefined}
    >
      <FieldLabel htmlFor={id} label={label} required={required} />
      <div className="relative">
        <span className="pointer-events-none absolute start-0 top-3 flex w-9 justify-center text-muted-foreground">
          <ResolvedIcon className="size-4" aria-hidden />
        </span>
        <Textarea
          id={id}
          name={name}
          required={required}
          aria-invalid={!!error}
          className={cn(
            "min-h-20 w-full bg-card ps-9 text-foreground",
            "focus-visible:border-gold focus-visible:ring-gold/20",
            className
          )}
          {...props}
        />
      </div>
      <FieldError error={error} />
    </div>
  );
}

export function CheckboxField({
  label,
  description,
  checked,
  onChange,
  disabled,
  icon,
  fieldKey,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  icon?: LucideIcon;
  fieldKey?: string;
}) {
  const id = React.useId();
  const ResolvedIcon = useResolvedIcon(icon, fieldKey, undefined);

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 transition hover:border-gold/40",
        disabled && "cursor-not-allowed opacity-60"
      )}
      data-disabled={disabled ? true : undefined}
    >
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onChange(value === true)}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1 space-y-0.5">
        <Label
          htmlFor={id}
          className={cn(
            "cursor-pointer gap-1.5 font-medium text-gold-dark",
            disabled && "cursor-not-allowed"
          )}
        >
          {ResolvedIcon ? (
            <ResolvedIcon className="size-4 shrink-0 text-bronze" aria-hidden />
          ) : null}
          {label}
        </Label>
        {description ? (
          <p className="text-xs leading-relaxed text-bronze">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

export function ReadOnlyField({
  label,
  value,
  icon,
  fieldKey,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  fieldKey?: string;
}) {
  const ResolvedIcon = useResolvedIcon(icon, fieldKey, undefined);

  return (
    <div className="group/field space-y-2">
      <FieldLabel label={label} />
      <div className="relative">
        <IconAffix icon={ResolvedIcon} position="start" />
        <div
          className={cn(
            controlClass,
            "flex items-center rounded-lg border border-input bg-[#f5f0e8] px-2.5 ps-9 text-foreground"
          )}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
