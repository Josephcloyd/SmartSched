"use client";

import { useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import type { SchoolPaletteId } from "@/lib/types";
import { getSchoolPalette } from "@/lib/school-palettes";
import { formatWallpaperSize } from "@/lib/wallpaper-renderer";
import { Field } from "@/components/ui/form-controls";
import type { SelectedWallpaperSize } from "@/components/wallpaper/wallpaper-modal";

const feedbackKinds = {
  report: "Bug / Problem",
  suggestion: "Feature Suggestion",
  school: "Add / Correct My School",
  general: "General Feedback",
} as const;

type FeedbackKind = keyof typeof feedbackKinds;

export function FeedbackWidget({
  schoolPaletteId,
  deviceSize,
  onEmailOpened,
}: {
  schoolPaletteId: SchoolPaletteId;
  deviceSize: SelectedWallpaperSize;
  onEmailOpened: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>("report");
  const [replyEmail, setReplyEmail] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  function submitFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedFeedback = feedback.trim();
    if (!trimmedFeedback) {
      setError("Describe the problem, suggestion, or feedback before continuing.");
      return;
    }

    const school = getSchoolPalette(schoolPaletteId);
    const subject = `[SmartSched] ${feedbackKinds[kind]}`;
    const body = [
      `Type: ${feedbackKinds[kind]}`,
      `School palette: ${school.name}`,
      `Wallpaper size: ${formatWallpaperSize(deviceSize.width, deviceSize.height)}`,
      replyEmail.trim() ? `Reply email: ${replyEmail.trim()}` : "Reply email: Not provided",
      "",
      "Message:",
      trimmedFeedback.slice(0, 1600),
      "",
      `Page: ${window.location.href}`,
      `Browser: ${navigator.userAgent.slice(0, 260)}`,
    ].join("\n");

    setError("");
    setOpen(false);
    setFeedback("");
    onEmailOpened();
    window.location.href = `mailto:danojosephclyde@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  if (!open) {
    return (
      <button
        type="button"
        className="fixed bottom-4 right-4 z-40 inline-flex size-12 items-center justify-center rounded-full border-2 border-primary-strong bg-primary p-0 text-sm font-bold text-white shadow-[0_14px_34px_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5 sm:bottom-6 sm:right-6 sm:h-12 sm:w-auto sm:gap-2 sm:px-4"
        aria-label="Report a problem or send feedback"
        onClick={() => setOpen(true)}
      >
        <MessageCircle aria-hidden="true" className="size-5" />
        <span className="sr-only sm:not-sr-only">Report / Feedback</span>
      </button>
    );
  }

  return (
    <aside
      className="neo-card fixed inset-x-4 bottom-4 z-40 max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[390px] sm:p-5"
      role="dialog"
      aria-modal="false"
      aria-labelledby="feedback-title"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id="feedback-title" className="text-lg font-semibold text-foreground">
            Report or send feedback
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            Your email app will open with the report addressed to the developer.
          </p>
        </div>
        <button
          type="button"
          className="secondary-button min-h-10 px-3"
          aria-label="Close feedback form"
          onClick={() => setOpen(false)}
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>

      <form className="grid gap-3" onSubmit={submitFeedback}>
        <Field label="Feedback type">
          <select
            className="field"
            value={kind}
            onChange={(event) => setKind(event.target.value as FeedbackKind)}
          >
            {Object.entries(feedbackKinds).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Your email (optional)">
          <input
            className="field"
            type="email"
            autoComplete="email"
            placeholder="So the developer can reply"
            value={replyEmail}
            onChange={(event) => setReplyEmail(event.target.value)}
          />
        </Field>
        <Field label="What happened or what should improve?">
          <textarea
            className="field min-h-32 resize-y py-3 leading-6"
            required
            maxLength={1600}
            placeholder="Include the steps, expected result, or your enhancement idea."
            value={feedback}
            onChange={(event) => {
              setFeedback(event.target.value);
              if (error) {
                setError("");
              }
            }}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
        </Field>
        <div className="flex items-center justify-between gap-3 text-xs text-muted">
          <span>{feedback.length}/1600</span>
          <span>Ctrl/⌘ + Enter to continue</span>
        </div>
        {error ? (
          <p className="rounded-lg border-2 border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <button className="primary-button" type="submit">
          <Send aria-hidden="true" className="size-4" />
          Continue to email
        </button>
        <p className="text-center text-xs leading-5 text-muted">
          Sends to danojosephclyde@gmail.com after you confirm in your email app.
        </p>
      </form>
    </aside>
  );
}
