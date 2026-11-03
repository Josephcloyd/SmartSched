"use client";

import { CalendarPlus, Replace } from "lucide-react";
import { Sheet } from "@/components/ui/form-controls";
import type { SharedSchedule } from "@/lib/share-link";
import { formatTimeRange, sortEntries } from "@/lib/utils";

const PREVIEW_LIMIT = 8;

type ImportSharedSheetProps = {
  shared: SharedSchedule;
  existingCount: number;
  onAdd: () => void;
  onReplace: () => void;
  onClose: () => void;
};

function shortDays(days: string[]) {
  return days.map((day) => day.slice(0, 3)).join(", ");
}

export function ImportSharedSheet({ shared, existingCount, onAdd, onReplace, onClose }: ImportSharedSheetProps) {
  const preview = sortEntries(shared.entries).slice(0, PREVIEW_LIMIT);
  const hiddenCount = shared.entries.length - preview.length;
  const count = `${shared.entries.length} ${shared.entries.length === 1 ? "class" : "classes"}`;

  return (
    <Sheet
      title="Add a shared schedule?"
      description={`Someone sent you “${shared.title}” with ${count}.`}
      onClose={onClose}
    >
      <ul className="grid gap-2">
        {preview.map((entry) => (
          <li key={entry.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
            <span aria-hidden="true" className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: entry.accentColor }} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">
                {[entry.code, entry.title].filter(Boolean).join(" · ")}
              </span>
              <span className="block truncate text-xs text-muted">
                {shortDays(entry.days)} · {formatTimeRange(entry.start, entry.end)}
                {entry.room ? ` · ${entry.room}` : ""}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 ? <p className="mt-2 text-xs text-muted">+ {hiddenCount} more</p> : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button type="button" className="primary-button" onClick={onAdd}>
          <CalendarPlus aria-hidden="true" className="size-4" />
          {existingCount > 0 ? "Add to my schedule" : "Add these classes"}
        </button>
        {existingCount > 0 ? (
          <button type="button" className="secondary-button" onClick={onReplace}>
            <Replace aria-hidden="true" className="size-4" />
            Replace my {existingCount} {existingCount === 1 ? "class" : "classes"}
          </button>
        ) : null}
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">
        Only add schedules from people you trust. You can undo right after.
      </p>
    </Sheet>
  );
}
