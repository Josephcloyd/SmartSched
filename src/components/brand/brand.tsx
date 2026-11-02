import { ShieldCheck } from "lucide-react";
import { brand } from "@/lib/brand";

// Official GetLaunchPH mark (from launchph/src/components/brand.tsx) so every tool shares it.
const LOGO_HEX_PATH =
  "M24 2.6 43 13.5c1.2.7 2 2 2 3.4v14.2c0 1.4-.8 2.7-2 3.4L24 45.4 5 34.5a4 4 0 0 1-2-3.4V16.9c0-1.4.8-2.7 2-3.4L24 2.6Z";
const LOGO_NODES = [
  { cx: 24, cy: 12.2 },
  { cx: 14.5, cy: 20.2 },
  { cx: 33.8, cy: 19.2 },
];

/** GetLaunchPH hexagon with its "circuit tree" glyph; cream on dark, green on light. */
export function BrandMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <path d={LOGO_HEX_PATH} fill="var(--logo-hex)" />
      <g
        fill="none"
        stroke="var(--logo-ink)"
        strokeWidth="3.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M24 15.8v22.4M14.5 23.7v9.1H24M33.8 22.7v7H24" />
        {LOGO_NODES.map((node) => (
          <circle key={node.cx} {...node} r="4.5" fill="var(--logo-hex)" />
        ))}
      </g>
      <rect x="19.4" y="35.8" width="9.2" height="6.3" rx="1.9" fill="var(--logo-ink)" />
    </svg>
  );
}

/** "SmartSched" with the accent half in sage, and "BY GETLAUNCHPH" underneath. */
export function BrandLockup({ size = "sm" }: { size?: "sm" | "lg" }) {
  const large = size === "lg";
  return (
    <span className={`flex min-w-0 items-center ${large ? "flex-col gap-4 text-center" : "gap-3"}`}>
      <BrandMark size={large ? 72 : 38} />
      <span className="min-w-0">
        <span
          className={`block font-bold leading-tight tracking-tight text-foreground ${
            large ? "text-4xl" : "text-lg"
          }`}
        >
          {brand.nameLead}
          <span className="text-brand-sage">{brand.nameAccent}</span>
        </span>
        <span
          className={`block font-mono font-medium uppercase text-muted ${
            large ? "mt-2 text-xs tracking-[0.35em]" : "mt-0.5 text-[10px] tracking-[0.3em]"
          }`}
        >
          By <span className="text-foreground/80">{brand.company}</span>
        </span>
      </span>
    </span>
  );
}

/** Full-screen loading splash shown while the app starts. */
export function SplashScreen() {
  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-background px-6"
      role="status"
      aria-label={`Loading ${brand.appName}`}
    >
      <div className="animate-fade-in flex flex-col items-center">
        <BrandLockup size="lg" />
        <div className="mt-8 h-1 w-40 overflow-hidden rounded-full bg-surface-2">
          <div className="splash-progress h-full w-1/3 rounded-full bg-primary-fill" />
        </div>
        <p className="mt-6 flex items-center gap-1.5 text-xs text-muted">
          <ShieldCheck aria-hidden="true" className="size-3.5 text-primary" />
          Your schedule stays on this device
        </p>
      </div>
    </div>
  );
}
