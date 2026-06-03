import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

type BaseProps = {
  label: string;
  error?: string;
  required?: boolean;
};

export function TextField({
  label,
  error,
  required,
  ...props
}: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-gold-dark">
        {label}
        {required && <span className="text-error mr-1">*</span>}
      </span>
      <input
        {...props}
        className={`w-full rounded-lg border bg-card px-4 py-2.5 text-foreground outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20 ${error ? "border-error" : "border-border"} ${props.className ?? ""}`}
      />
      {error && <p className="text-sm text-error">{error}</p>}
    </label>
  );
}

export function SelectField({
  label,
  error,
  required,
  children,
  ...props
}: BaseProps & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-gold-dark">
        {label}
        {required && <span className="text-error mr-1">*</span>}
      </span>
      <select
        {...props}
        className={`w-full rounded-lg border bg-card px-4 py-2.5 text-foreground outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20 ${error ? "border-error" : "border-border"} ${props.className ?? ""}`}
      >
        {children}
      </select>
      {error && <p className="text-sm text-error">{error}</p>}
    </label>
  );
}

export function TextAreaField({
  label,
  error,
  required,
  ...props
}: BaseProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-gold-dark">
        {label}
        {required && <span className="text-error mr-1">*</span>}
      </span>
      <textarea
        {...props}
        className={`w-full rounded-lg border bg-card px-4 py-2.5 text-foreground outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20 ${error ? "border-error" : "border-border"} ${props.className ?? ""}`}
      />
      {error && <p className="text-sm text-error">{error}</p>}
    </label>
  );
}

export function CheckboxField({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 transition hover:border-gold/40 ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-border text-gold-dark focus:ring-gold"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-gold-dark">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-bronze leading-relaxed">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

export function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium text-gold-dark">{label}</span>
      <div className="rounded-lg border border-border bg-[#f5f0e8] px-4 py-2.5 text-foreground">
        {value}
      </div>
    </div>
  );
}
