"use client";

import { Download, Heart, HousePlus, ShieldCheck, X } from "lucide-react";
import { brand, donation } from "@/lib/brand";
import { Sheet, sheetTitleId } from "@/components/ui/form-controls";

const SHEET_TITLE = `Support ${brand.appName}`;

const donateSteps = [
  <>
    Open GCash, tap <strong className="text-foreground">QR</strong>, then scan the code.
  </>,
  <>On the same phone, save the QR first and upload it in the GCash scanner.</>,
  <>Choose any amount, verify the recipient inside GCash, then confirm.</>,
];

/** Gold "Support" button, matching the other GetLaunchPH tools. */
export function SupportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Support ${brand.appName}`}
      className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-gold-border bg-gold-bg px-2.5 text-sm font-semibold text-gold transition hover:brightness-110 active:scale-[0.97] sm:px-4"
    >
      <Heart aria-hidden="true" className="size-4 fill-current" />
      <span className="hidden sm:inline">Support</span>
    </button>
  );
}

/** GCash donation sheet, same layout and wording as ResumeFlow's. */
export function SupportSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title={SHEET_TITLE} onClose={onClose} size="lg" bare>
      <div className="relative overflow-hidden bg-gradient-to-br from-[var(--donate-from)] to-[var(--donate-to)] px-5 pb-6 pt-8 text-white sm:px-8">
        <div className="absolute -right-10 -top-10 size-32 rounded-full bg-white/10" aria-hidden="true" />
        <div className="absolute -bottom-12 -left-8 size-28 rounded-full bg-white/5" aria-hidden="true" />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white"
          aria-label="Close donation window"
        >
          <X aria-hidden="true" className="size-4" />
        </button>

        <div className="relative">
          <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
            <Heart aria-hidden="true" className="size-6 fill-current" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">{SHEET_TITLE}</p>
          <h2 id={sheetTitleId(SHEET_TITLE)} className="mt-1 text-xl font-bold tracking-tight">
            Donate through GCash
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85">
            Choose any amount you&apos;re comfortable with. Every contribution helps keep the
            schedule maker free for students.
          </p>
          <div className="mt-4 flex max-w-xl items-start gap-2.5 rounded-xl bg-white/10 px-3.5 py-3 text-sm leading-relaxed ring-1 ring-white/20">
            <HousePlus aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>
              <strong className="font-semibold">{donation.charityShare}</strong> {donation.charityNote}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:p-7 md:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] md:items-start">
        <div className="rounded-2xl border border-border bg-surface-2 p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            Official GCash QR
          </p>
          <div className="relative mx-auto mt-3 aspect-square w-full max-w-[20rem] overflow-hidden rounded-xl border-4 border-white bg-white shadow-[var(--shadow-md)]">
            {/* The source image is a full GCash QR card; crop to just the code (same as ResumeFlow). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={donation.qrImage}
              alt={`Official GCash QR code for ${brand.appName} donations`}
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-[-46%] w-[160%] max-w-none -translate-x-1/2 select-none"
            />
          </div>
          <p className="mx-auto mt-3 max-w-[20rem] text-xs leading-relaxed text-muted">
            Scan this code with GCash. Recipient details remain hidden here and appear only during
            confirmation in the GCash app.
          </p>
          <a
            href={donation.qrImage}
            download={donation.qrDownloadName}
            className="secondary-button mt-3 min-h-10 text-sm"
          >
            <Download aria-hidden="true" className="size-4" />
            Save QR to scan
          </a>
        </div>

        <div>
          <div className="flex gap-3 rounded-xl border border-gold-border bg-gold-bg p-4 text-xs leading-relaxed text-gold">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>
              Complete the transfer only in the official GCash app. {brand.appName} will never ask
              for your MPIN, OTP, password, or verification code.
            </p>
          </div>

          <div className="mt-5 rounded-xl border border-border bg-surface-2 p-4">
            <h3 className="text-sm font-semibold text-foreground">How to donate</h3>
            <ol className="mt-4 space-y-4 text-xs leading-relaxed text-muted">
              {donateSteps.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                    {index + 1}
                  </span>
                  <span className="pt-1">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <p className="mt-4 text-center text-[10px] leading-relaxed text-muted md:text-left">
            Please confirm the recipient name in GCash before sending.
          </p>
        </div>
      </div>
    </Sheet>
  );
}

/** Compact support prompt for the bottom of the Schedule tab. */
export function SupportCard({ onSupport }: { onSupport: () => void }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-gold-border bg-gold-bg p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Heart aria-hidden="true" className="mt-0.5 size-5 shrink-0 fill-current text-gold" />
        <div>
          <p className="text-sm font-semibold text-foreground">Enjoying {brand.appName}? It&apos;s free.</p>
          <p className="mt-0.5 text-sm text-muted">
            A small GCash donation keeps it running. {donation.charityShare} {donation.charityNote}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onSupport}
        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-gold-border bg-surface px-4 text-sm font-semibold text-gold transition hover:brightness-110 sm:self-auto"
      >
        <Heart aria-hidden="true" className="size-4 fill-current" />
        Support
      </button>
    </section>
  );
}
