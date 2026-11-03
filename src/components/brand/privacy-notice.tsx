"use client";

import { ShieldCheck, X } from "lucide-react";

export const privacyPoints = [
  "No account or sign-up. We never ask who you are.",
  "Your classes and settings are saved only in this browser on this device. Nothing is uploaded to or stored on our servers.",
  "Wallpapers and calendar files are made right on your device.",
  "Share links carry your schedule inside the link itself. It goes straight to the classmate you send it to, never through our servers.",
  "We count anonymous visits (no cookies, nothing you type) to see how many students use SmartSched.",
  "The holiday lookup only sends your country to a public holiday service, plus your approximate location if you tap Detect.",
  "Clearing your browser data erases your schedule, so save a backup if you switch phones.",
];

/** Short, dismissible privacy note for the Today tab. */
export function PrivacyBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3"
      role="note"
    >
      <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">Private by design</p>
        <p className="mt-0.5 text-sm leading-6 text-muted">
          Nothing you enter is saved on our servers. Your schedule stays only on this device.
        </p>
      </div>
      <button
        type="button"
        className="icon-button -mr-2 -mt-1 size-9"
        onClick={onDismiss}
        aria-label="Dismiss privacy note"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
