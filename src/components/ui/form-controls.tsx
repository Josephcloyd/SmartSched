"use client";

import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { clampNumber } from "@/lib/wallpaper-renderer";

export function Panel({
  title,
  description,
  icon,
  children,
  sectionRef,
  action,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  sectionRef?: React.RefObject<HTMLElement | null>;
  action?: React.ReactNode;
}) {
  return (
    <section ref={sectionRef} className="neo-card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {icon ? (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {icon}
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground sm:text-lg">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-sm leading-6 text-muted">{description}</p>
            ) : null}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-foreground">
      <span>{label}</span>
      {children}
      {hint ? <span className="text-xs font-normal text-muted">{hint}</span> : null}
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
  hint,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  required?: boolean;
  hint?: string;
  min?: number;
  max?: number;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        ref={inputRef}
        className="field"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
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
      <div className="grid grid-cols-[1fr_72px] items-center gap-3">
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
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border bg-surface-2/60 px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary/40">
      <span className="min-w-0">
        <span className="block">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs font-normal leading-5 text-muted">
            {description}
          </span>
        ) : null}
      </span>
      <span className="relative inline-flex shrink-0">
        <input
          className="peer sr-only"
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="h-7 w-12 rounded-full bg-border transition-colors peer-checked:bg-primary-fill peer-focus-visible:ring-4 peer-focus-visible:ring-primary/25" />
        <span className="pointer-events-none absolute left-1 top-1 size-5 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function Metric({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneClass = {
    default: "text-foreground",
    good: "text-emerald-600 dark:text-emerald-400",
    warn: "text-amber-600 dark:text-amber-400",
    bad: "text-rose-600 dark:text-rose-400",
  }[tone];

  return (
    <div className="neo-card min-w-0 p-4">
      <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1.5 truncate text-2xl font-bold tabular-nums ${toneClass}`}>{value}</p>
      {hint ? <p className="mt-0.5 truncate text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

/**
 * Modal surface: a bottom sheet on phones, a centered dialog on larger screens.
 * Locks page scroll and closes on Escape, backdrop click, or (on touch) a swipe down
 * from the handle/header.
 */
export function Sheet({
  title,
  description,
  onClose,
  children,
  footer,
  size = "md",
}: {
  title: string;
  description?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "xl";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus({ preventScroll: true });

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, []);

  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    if (dragStartY === null) return;
    const startY = dragStartY;

    function handleMove(event: PointerEvent) {
      setDragOffset(Math.max(0, event.clientY - startY));
    }
    function handleEnd(event: PointerEvent) {
      if (event.clientY - startY > 110) onCloseRef.current();
      setDragStartY(null);
      setDragOffset(0);
    }
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleEnd);
    window.addEventListener("pointercancel", handleEnd);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleEnd);
      window.removeEventListener("pointercancel", handleEnd);
    };
  }, [dragStartY]);

  function startDrag(event: React.PointerEvent) {
    // Touch/pen only, and never hijack taps on the close button.
    if (event.pointerType === "mouse" || (event.target as HTMLElement).closest("button")) return;
    setDragStartY(event.clientY);
  }

  const titleId = `sheet-${title.replace(/\W+/g, "-").toLowerCase()}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="animate-fade-in absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`animate-sheet-up relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-surface shadow-[var(--shadow-lg)] outline-none sm:rounded-3xl ${
          size === "xl" ? "sm:max-w-6xl" : "sm:max-w-xl"
        }`}
        style={{
          // `translate` (not `transform`) so it composes with the open animation's fill state.
          translate: dragOffset ? `0 ${dragOffset}px` : undefined,
          transition: dragStartY === null ? "translate 220ms var(--ease-out)" : "none",
        }}
      >
        <div
          className="flex shrink-0 cursor-grab touch-none justify-center pb-1 pt-2.5 sm:hidden"
          onPointerDown={startDrag}
          aria-hidden="true"
        >
          <span className="h-1.5 w-10 rounded-full bg-border" />
        </div>
        <header
          className="flex shrink-0 touch-none items-start justify-between gap-3 border-b border-border px-5 pb-4 pt-2 sm:touch-auto sm:pt-5"
          onPointerDown={startDrag}
        >
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-foreground">
              {title}
            </h2>
            {description ? (
              <div className="mt-0.5 text-sm text-muted">{description}</div>
            ) : null}
          </div>
          <button type="button" className="icon-button -mr-2" aria-label="Close" onClick={onClose}>
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
        {footer ? (
          <footer className="pb-safe shrink-0 border-t border-border bg-surface px-5 pt-3 sm:pb-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="neo-inset flex flex-col items-center px-5 py-8 text-center">
      {icon ? (
        <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-surface text-primary shadow-[var(--shadow-sm)]">
          {icon}
        </span>
      ) : null}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm leading-6 text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
