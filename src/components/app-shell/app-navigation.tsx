"use client";

import { CalendarCheck2, CalendarDays, Ellipsis, MessageCircle, Share2, type LucideIcon } from "lucide-react";
import type { AppTab } from "@/lib/types";

const tabs: { id: AppTab; label: string; icon: LucideIcon }[] = [
  { id: "today", label: "Today", icon: CalendarCheck2 },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "more", label: "More", icon: Ellipsis },
];

type NavProps = {
  activeTab: AppTab;
  onSelect: (tab: AppTab) => void;
};

/** Pill tab switcher in the header (tablets and up). */
export function DesktopTabs({ activeTab, onSelect }: NavProps) {
  return (
    <nav className="hidden items-center gap-1 rounded-2xl border border-border bg-surface p-1 md:flex" aria-label="Main">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          aria-current={activeTab === id ? "page" : undefined}
          onClick={() => onSelect(id)}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === id
              ? "bg-primary-fill text-white shadow-[var(--shadow-sm)]"
              : "text-muted hover:bg-surface-2 hover:text-foreground"
          }`}
        >
          <Icon aria-hidden="true" className="size-4" />
          {label}
        </button>
      ))}
    </nav>
  );
}

/** Bottom tab bar (phones and small tablets). */
export function BottomTabBar({ activeTab, onSelect }: NavProps) {
  return (
    <nav
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 backdrop-blur-lg md:hidden"
      aria-label="Main"
    >
      <div className="mx-auto grid max-w-sm grid-cols-3 px-2 pt-1.5">
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => onSelect(id)}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[11px] font-semibold transition active:scale-95 ${
                active ? "text-primary" : "text-muted"
              }`}
            >
              <span
                className={`relative flex h-8 w-14 items-center justify-center rounded-full transition ${
                  active ? "bg-primary/15" : ""
                }`}
              >
                <Icon aria-hidden="true" className="size-5" strokeWidth={active ? 2.4 : 2} />
              </span>
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Header "Share" button, same shape as the gold Support button but neutral. */
export function ShareButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Share your schedule with a classmate"
      className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-2.5 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:text-primary active:scale-[0.97] sm:px-4"
    >
      <Share2 aria-hidden="true" className="size-4" />
      <span className="hidden sm:inline">Share</span>
    </button>
  );
}

/**
 * Floating "report / feedback" bubble, lower right. On phones it stacks above the
 * add-class button (when that's showing) so the two never overlap.
 */
export function FeedbackBubble({ onClick, isAboveFab }: { onClick: () => void; isAboveFab: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Report a problem or send feedback"
      title="Report a problem or send feedback"
      // right-[22px] centres the 44px bubble over the 56px add-class button (right-4).
      className={`group fixed right-[22px] z-30 flex size-11 items-center justify-center rounded-full border border-border bg-surface text-primary shadow-[var(--shadow-lg)] transition hover:border-primary/40 active:scale-95 md:right-6 md:bottom-6 md:size-12 ${
        isAboveFab
          ? "bottom-[calc(152px+env(safe-area-inset-bottom))]"
          : "bottom-[calc(84px+env(safe-area-inset-bottom))]"
      }`}
    >
      <MessageCircle aria-hidden="true" className="size-5" />
      <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-semibold text-background opacity-0 shadow-[var(--shadow-md)] transition group-hover:opacity-100 md:block">
        Report or suggest
      </span>
    </button>
  );
}

export type Toast = {
  id: number;
  text: string;
  action?: { label: string; onClick: () => void };
};

/**
 * Bottom toast. On phones it sits above the floating buttons (feedback bubble,
 * and the add-class button when shown) so they never overlap.
 */
export function AppToast({ toast, isAboveFab }: { toast: Toast; isAboveFab: boolean }) {
  return (
    <div
      className={`pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4 md:bottom-6 ${
        isAboveFab
          ? "bottom-[calc(212px+env(safe-area-inset-bottom))]"
          : "bottom-[calc(144px+env(safe-area-inset-bottom))]"
      }`}
    >
      <div
        key={toast.id}
        role="status"
        className="animate-fade-up pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-foreground px-4 py-3 text-sm font-medium text-background shadow-[var(--shadow-lg)]"
      >
        <span className="min-w-0">{toast.text}</span>
        {toast.action ? (
          <button
            type="button"
            className="shrink-0 rounded-lg px-2 py-1 font-bold text-background underline-offset-2 hover:underline"
            onClick={toast.action.onClick}
          >
            {toast.action.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}
