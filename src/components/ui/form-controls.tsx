import React from "react";
import { clampNumber } from "@/lib/wallpaper-renderer";

export function Panel({
  title,
  children,
  sectionRef,
  action,
}: {
  title: string;
  children: React.ReactNode;
  sectionRef?: React.RefObject<HTMLElement | null>;
  action?: React.ReactNode;
}) {
  return (
    <section
      ref={sectionRef}
      className="neo-card p-4 sm:p-5"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground sm:text-lg">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  inputRef,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  required?: boolean;
}) {
  return (
    <Field label={label}>
      <input
        ref={inputRef}
        className="field"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </Field>
  );
}

export function RangeControl({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <div className="grid grid-cols-[1fr_64px] items-center gap-3">
        <input
          className="accent-primary"
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <input
          aria-label={`${label} value`}
          className="field px-2 text-center"
          type="number"
          min={min}
          max={max}
          value={String(value)}
          onChange={(event) =>
            onChange(clampNumber(Number(event.target.value), min, max, value))
          }
        />
      </div>
    </Field>
  );
}

export function ToggleControl({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface px-3 text-sm font-semibold text-foreground shadow-[inset_4px_4px_9px_var(--neo-soft-shadow),inset_-4px_-4px_9px_var(--neo-highlight)]">
      <span>{label}</span>
      <input
        className="size-5 accent-primary"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="neo-card min-w-0 p-3 sm:p-4">
      <p className="truncate text-xs font-medium text-muted sm:text-sm">{label}</p>
      <p className="mt-1 truncate text-base font-semibold text-foreground sm:mt-2 sm:text-2xl">{value}</p>
    </div>
  );
}
