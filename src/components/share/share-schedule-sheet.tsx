"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Sheet } from "@/components/ui/form-controls";
import { MAX_QR_URL_LENGTH, createShareLink, isShareLinkSupported } from "@/lib/share-link";
import type { ScheduleEntry, SchoolPaletteId } from "@/lib/types";

type ShareScheduleSheetProps = {
  entries: ScheduleEntry[];
  title: string;
  schoolPaletteId: SchoolPaletteId;
  canShare: boolean;
  onMessage: (text: string) => void;
  onClose: () => void;
};

type LinkState =
  | { status: "loading" }
  | { status: "ready"; link: string; qrSvg: string | null }
  | { status: "error"; reason: string };

const COPIED_FEEDBACK_MS = 2000;

async function buildQrSvg(link: string) {
  if (link.length > MAX_QR_URL_LENGTH) return null;
  // Loaded on demand so the QR library isn't in the main bundle.
  const QRCode = await import("qrcode");
  return QRCode.toString(link, { type: "svg", errorCorrectionLevel: "L", margin: 2 });
}

export function ShareScheduleSheet({
  entries,
  title,
  schoolPaletteId,
  canShare,
  onMessage,
  onClose,
}: ShareScheduleSheetProps) {
  const [state, setState] = useState<LinkState>({ status: "loading" });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function build() {
      if (!isShareLinkSupported()) {
        setState({ status: "error", reason: "This browser can't make share links. Try Chrome or Safari." });
        return;
      }
      try {
        const link = await createShareLink(window.location.origin, { title, schoolPaletteId, entries });
        const qrSvg = await buildQrSvg(link);
        if (!cancelled) setState({ status: "ready", link, qrSvg });
      } catch {
        if (!cancelled) setState({ status: "error", reason: "Couldn't create the link. Please try again." });
      }
    }
    void build();
    return () => {
      cancelled = true;
    };
  }, [entries, schoolPaletteId, title]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      onMessage("Couldn't copy automatically. Long-press the link to copy it.");
    }
  }

  async function shareLink(link: string) {
    try {
      await navigator.share({ title: `${title} – SmartSched`, text: "Here's my class schedule:", url: link });
    } catch {
      // Share sheet dismissed.
    }
  }

  const classCount = `${entries.length} ${entries.length === 1 ? "class" : "classes"}`;

  return (
    <Sheet
      title="Share with a classmate"
      description={`Sends your ${classCount}. They can add them to their own SmartSched in one tap.`}
      onClose={onClose}
    >
      {state.status === "loading" ? (
        <p className="py-8 text-center text-sm text-muted">Making your link…</p>
      ) : state.status === "error" ? (
        <p className="py-8 text-center text-sm text-danger">{state.reason}</p>
      ) : (
        <div className="grid gap-4">
          {state.qrSvg ? (
            <div className="mx-auto w-full max-w-[16rem] rounded-2xl border-4 border-white bg-white p-1 shadow-[var(--shadow-md)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/svg+xml;utf8,${encodeURIComponent(state.qrSvg)}`}
                alt="QR code for your schedule link. Scan it with a phone camera."
                className="block aspect-square w-full"
                draggable={false}
              />
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-surface-2 p-3 text-sm text-muted">
              Your schedule is too big for a QR code. Send the link instead.
            </p>
          )}
          {state.qrSvg ? (
            <p className="text-center text-xs text-muted">Let your classmate scan this with their phone camera.</p>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" className="primary-button" onClick={() => copyLink(state.link)}>
              {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
              {copied ? "Link copied" : "Copy link"}
            </button>
            {canShare ? (
              <button type="button" className="secondary-button" onClick={() => shareLink(state.link)}>
                <Share2 aria-hidden="true" className="size-4" />
                Send via…
              </button>
            ) : null}
          </div>

          <p className="text-xs leading-5 text-muted">
            The schedule is packed inside the link itself, so it never goes through our servers.
            Anyone with the link can see these classes. Reminders, holidays and your other
            settings aren&apos;t included.
          </p>
        </div>
      )}
    </Sheet>
  );
}
